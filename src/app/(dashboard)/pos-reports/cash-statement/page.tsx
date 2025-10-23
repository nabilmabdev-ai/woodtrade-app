// src/app/(dashboard)/pos-reports/cash-statement/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CURRENCY_LABEL } from '@/lib/constants';
// ✅ NOUVEAU: Importer le type pour le filtrage
import { CashRegisterType } from '@prisma/client';

// --- Interfaces (Mise à jour pour inclure les transferts) ---
interface CashRegister {
  id: string;
  name: string;
  // ✅ NOUVEAU: Le type est nécessaire pour le filtrage
  type: CashRegisterType;
}
interface Transaction {
  date: string; type: string; transactionId: string; cashRegister: string;
  user: string; customer: string; paymentMethod: string; amount: number;
}
interface Summary {
  openingBalance: number; totalOpeningFundsInPeriod: number;
  totalSales: number; salesByMethod: Record<string, number>;
  totalRefunds: number; refundsByMethod: Record<string, number>;
  totalPayIns: number; totalPayOuts: number; totalWithdrawals: number;
  totalTransfersIn: number; totalTransfersOut: number;
  netCashFlow: number; closingBalance: number;
}
interface ReportData {
  transactions: Transaction[];
  summary: Summary;
}

export default function CashStatementReportPage() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  // ✅ MODIFIÉ: Le state stocke maintenant uniquement les caisses de vente
  const [salesRegisters, setSalesRegisters] = useState<CashRegister[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCashRegisters = async () => {
      try {
        const res = await fetch('/api/cash-registers');
        if (!res.ok) throw new Error("Impossible de charger les caisses");
        const data: CashRegister[] = await res.json();
        
        // ✅ MODIFIÉ: On filtre pour ne garder que les caisses de type SALES
        const salesRegs = data.filter(r => r.type === CashRegisterType.SALES);
        setSalesRegisters(salesRegs);

        if (salesRegs.length > 0) {
            setSelectedRegisterId(salesRegs[0].id);
        }
      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
      }
    };
    fetchCashRegisters();
  }, []);

  const handleGenerateReport = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setReportData(null);
    const params = new URLSearchParams({ startDate, endDate });
    if (selectedRegisterId) {
      params.append('caisseIds', selectedRegisterId);
    }
    try {
      const response = await fetch(`/api/pos/reports/cash-statement?${params.toString()}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors de la génération du rapport.');
      }
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = () => window.print();

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6 print:hidden">
        {/* ✅ MODIFIÉ: Titre clarifié */}
        <h1 className="text-3xl font-bold">Relevé de Session de Vente (Journal Z)</h1>
      </div>

      <div className="p-6 border rounded-lg bg-gray-50 mb-8 print:hidden">
        <form onSubmit={handleGenerateReport} className="flex items-end space-x-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Date de début</label>
            <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Date de fin</label>
            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            {/* ✅ MODIFIÉ: Le label est plus précis */}
            <label htmlFor="cashRegister" className="block text-sm font-medium text-gray-700">Caisse de Vente</label>
            <select id="cashRegister" value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="">Toutes les caisses de vente</option>
              {/* ✅ MODIFIÉ: On itère sur la liste filtrée */}
              {salesRegisters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Chargement...' : 'Générer le rapport'}
          </button>
        </form>
      </div>

      {reportData && (
        <div className="printable-area">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">
              Journal du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
            </h2>
            <button onClick={handlePrint} className="px-4 py-2 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 print:hidden">
                Imprimer
            </button>
          </div>
          
          <div className="border rounded-lg overflow-hidden mb-8">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">N° Transac.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Caisse / Caissier</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client/Raison</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.transactions.map((tx, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(tx.date).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600">{tx.transactionId}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><div>{tx.cashRegister}</div><div className="text-gray-500">{tx.user}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{tx.customer}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{tx.paymentMethod}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${tx.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>{tx.amount.toFixed(2)} {CURRENCY_LABEL}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 border rounded-lg bg-white shadow-sm max-w-md ml-auto">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Synthèse de la période</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Solde d&apos;ouverture</span><span className="font-medium">{reportData.summary.openingBalance.toFixed(2)} {CURRENCY_LABEL}</span></div>
                <hr className="my-2"/>
                <div className="flex justify-between"><span>+ Fonds de caisse initiaux (sessions)</span><span className="font-medium">{reportData.summary.totalOpeningFundsInPeriod.toFixed(2)} {CURRENCY_LABEL}</span></div>
                {Object.entries(reportData.summary.salesByMethod).map(([method, total]) => (
                    <div key={method} className="flex justify-between pl-4"><span>+ Ventes ({method})</span><span className="font-medium">{total.toFixed(2)} {CURRENCY_LABEL}</span></div>
                ))}
                {Object.entries(reportData.summary.refundsByMethod).map(([method, total]) => (
                    <div key={method} className="flex justify-between pl-4"><span>- Remboursements ({method})</span><span className="font-medium text-red-600">{total.toFixed(2)} {CURRENCY_LABEL}</span></div>
                ))}
                <div className="flex justify-between"><span>+ Apports (Pay-in)</span><span className="font-medium">{reportData.summary.totalPayIns.toFixed(2)} {CURRENCY_LABEL}</span></div>
                <div className="flex justify-between"><span>- Dépenses (Pay-out)</span><span className="font-medium text-red-600">{reportData.summary.totalPayOuts.toFixed(2)} {CURRENCY_LABEL}</span></div>
                <div className="flex justify-between"><span>- Retraits (Dépôt, etc.)</span><span className="font-medium text-red-600">{reportData.summary.totalWithdrawals.toFixed(2)} {CURRENCY_LABEL}</span></div>
                <div className="flex justify-between"><span>+ Transferts Reçus</span><span className="font-medium text-purple-600">{reportData.summary.totalTransfersIn.toFixed(2)} {CURRENCY_LABEL}</span></div>
                <div className="flex justify-between"><span>- Transferts Envoyés</span><span className="font-medium text-purple-600">-{reportData.summary.totalTransfersOut.toFixed(2)} {CURRENCY_LABEL}</span></div>
                
                <hr className="my-2"/>
                <div className="flex justify-between font-bold"><span>= Flux de caisse net</span><span>{reportData.summary.netCashFlow.toFixed(2)} {CURRENCY_LABEL}</span></div>
                <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-gray-800">
                    <span>SOLDE DE CLÔTURE ATTENDU</span>
                    <span>{reportData.summary.closingBalance.toFixed(2)} {CURRENCY_LABEL}</span>
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