// src/app/(dashboard)/pos-reports/expense-statement/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CashRegisterType } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- Interfaces ---
interface CashRegister {
  id: string;
  name: string;
  type: CashRegisterType;
}
interface Transaction {
  id: string;
  date: string;
  reason: string;
  user: string;
  amount: number;
  runningBalance: number;
}
interface Summary {
  openingBalance: number;
  totalPayIns: number;
  totalPayOuts: number;
  netChange: number;
  closingBalance: number;
}
interface ReportData {
  transactions: Transaction[];
  summary: Summary;
}

export default function ExpenseStatementPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // --- Form State ---
  const [expenseRegisters, setExpenseRegisters] = useState<CashRegister[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  useEffect(() => {
    const fetchRegisters = async () => {
      try {
        const res = await fetch('/api/cash-registers');
        if (!res.ok) throw new Error("Impossible de charger les caisses");
        const allRegisters: CashRegister[] = await res.json();
        const expenseRegs = allRegisters.filter(r => r.type === CashRegisterType.EXPENSE);
        setExpenseRegisters(expenseRegs);
        if (expenseRegs.length > 0) {
          setSelectedRegisterId(expenseRegs[0].id);
        }
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    fetchRegisters();
  }, []);

  const handleGenerateReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRegisterId || !selectedMonth) {
        toast.error("Veuillez sélectionner une caisse et un mois.");
        return;
    }
    setLoading(true);
    setReportData(null);
    const [year, month] = selectedMonth.split('-');
    const params = new URLSearchParams({ year, month, cashRegisterId: selectedRegisterId });
    
    try {
      const response = await fetch(`/api/pos/reports/expense-statement?${params.toString()}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors de la génération du rapport.');
      }
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = () => window.print();

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-3xl font-bold">Relevé de Dépenses Mensuel</h1>
      </div>

      <div className="p-6 border rounded-lg bg-gray-50 mb-8 print:hidden">
        <form onSubmit={handleGenerateReport} className="flex items-end space-x-4">
          <div>
            <label htmlFor="cashRegister" className="block text-sm font-medium text-gray-700">Caisse de Dépenses</label>
            <select id="cashRegister" value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              {expenseRegisters.length > 0 ? (
                expenseRegisters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
              ) : (
                <option disabled>Aucune caisse de dépenses trouvée</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700">Mois</label>
            <input id="month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <button type="submit" disabled={loading || expenseRegisters.length === 0} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Chargement...' : 'Générer le rapport'}
          </button>
        </form>
      </div>

      {reportData && (
        <div className="printable-area">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-2xl font-semibold">
                    Relevé pour {expenseRegisters.find(r=>r.id === selectedRegisterId)?.name} - {new Date(selectedMonth+'-02').toLocaleString('fr-FR', {month: 'long', year: 'numeric'})}
                </h2>
            </div>
            <button onClick={handlePrint} className="px-4 py-2 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 print:hidden">
                Imprimer
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <h3 className="text-xl font-semibold p-4 border-b">Journal des Mouvements</h3>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Raison</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Solde</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.transactions.map((tx) => (
                    <tr key={tx.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-gray-700">{tx.reason}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${tx.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>{tx.amount.toFixed(2)} {CURRENCY_LABEL}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">{tx.runningBalance.toFixed(2)} {CURRENCY_LABEL}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            <div className="p-6 border rounded-lg bg-white shadow-sm">
                <h3 className="text-xl font-semibold mb-4 border-b pb-2">Synthèse du Mois</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span>Solde d&apos;ouverture</span><span className="font-medium">{reportData.summary.openingBalance.toFixed(2)} {CURRENCY_LABEL}</span></div>
                    <hr className="my-2"/>
                    <div className="flex justify-between"><span>+ Total des apports</span><span className="font-medium text-green-600">{reportData.summary.totalPayIns.toFixed(2)} {CURRENCY_LABEL}</span></div>
                    <div className="flex justify-between"><span>- Total des dépenses</span><span className="font-medium text-red-600">{reportData.summary.totalPayOuts.toFixed(2)} {CURRENCY_LABEL}</span></div>
                    <hr className="my-2"/>
                    <div className="flex justify-between font-bold"><span>= Variation Nette</span><span>{reportData.summary.netChange.toFixed(2)} {CURRENCY_LABEL}</span></div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-gray-800 mt-4">
                        <span>SOLDE DE CLÔTURE</span>
                        <span>{reportData.summary.closingBalance.toFixed(2)} {CURRENCY_LABEL}</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
      
       <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </main>
  );
}
