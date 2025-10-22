// src/app/(dashboard)/cash-registers/history/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ReportData {
  sessionId: string;
  cashRegisterName: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
  sales: {
    summary: Array<{ method: string; total: number; count: number }>;
    totalSales: number;
    transactionCount: number;
  };
  refunds: {
    summary: Array<{ method:string; total: number; count: number }>;
    totalRefunds: number;
  };
  cashMovements: {
    payIns: number;
    payOuts: number;
    withdrawals: number;
  };
  finalBalance: {
    openingBalance: number;
    expectedBalance: number | null;
    closingBalance: number | null;
    difference: number | null;
  };
}

const ReportRow = ({ label, value, isBold = false }: { label: string; value: string | number; isBold?: boolean }) => (
  <div className="flex justify-between py-2 border-b">
    <span className={`text-sm ${isBold ? 'font-bold' : 'text-gray-600'}`}>{label}</span>
    <span className={`text-sm text-right ${isBold ? 'font-bold text-gray-900' : 'text-gray-800'}`}>{value}</span>
  </div>
);

export default function SessionReportPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/cash-register-sessions/${sessionId}/report`);
        if (!response.ok) {
          // CORRECTION MANUELLE ICI
          throw new Error('Impossible de charger le rapport.');
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        const error = err as Error;
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);
  
  const handlePrint = () => {
    window.print();
  };

  if (loading) return <p className="p-8 text-center">Chargement du rapport...</p>;
  if (!report) return <p className="p-8 text-center text-red-500">Rapport introuvable.</p>;

  const formatCurrency = (amount: number | null | undefined) => (amount ?? 0).toFixed(2) + ' €';
  // CORRECTION MANUELLE ICI
  const formatDateTime = (date: string | null) => date ? new Date(date).toLocaleString('fr-FR') : 'N/A';

  return (
    <main className="p-8 bg-gray-100">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Rapport de Session (Z)</h1>
          <p className="text-gray-500">Caisse: {report.cashRegisterName}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/cash-registers/history" className="text-sm text-blue-600 hover:underline">
            &larr; Retour à l&apos;historique
          </Link>
          <button
            onClick={handlePrint}
            className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Imprimer
          </button>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md printable-area">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Rapport de Fin de Journée</h2>
          <p className="text-gray-600">{report.cashRegisterName}</p>
          <p className="text-sm text-gray-500">ID Session: {report.sessionId}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2 border-b pb-1">Informations</h3>
          <ReportRow label="Ouvert par" value={report.openedBy} />
          <ReportRow label="Date d'ouverture" value={formatDateTime(report.openedAt)} />
          <ReportRow label="Fermé par" value={report.closedBy ?? 'N/A'} />
          <ReportRow label="Date de fermeture" value={formatDateTime(report.closedAt)} />
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2 border-b pb-1">Ventes ({report.sales.transactionCount} transactions)</h3>
          {report.sales.summary.map(s => (
            <ReportRow key={s.method} label={`Total ${s.method}`} value={formatCurrency(s.total)} />
          ))}
          <ReportRow label="Chiffre d'affaires total" value={formatCurrency(report.sales.totalSales)} isBold />
        </div>
        
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2 border-b pb-1">Remboursements</h3>
           {report.refunds.summary.map(r => (
            <ReportRow key={r.method} label={`Total remboursé (${r.method})`} value={formatCurrency(r.total)} />
          ))}
          <ReportRow label="Total des remboursements" value={formatCurrency(report.refunds.totalRefunds)} isBold />
        </div>
        
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2 border-b pb-1">Mouvements de Caisse</h3>
          <ReportRow label="Entrées d'argent (Pay In)" value={formatCurrency(report.cashMovements.payIns)} />
          <ReportRow label="Sorties d'argent (Pay Out)" value={formatCurrency(report.cashMovements.payOuts)} />
          <ReportRow label="Retraits (Dépôt, etc.)" value={formatCurrency(report.cashMovements.withdrawals)} />
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2 border-b pb-1">Balance de Caisse</h3>
          <ReportRow label="Fonds de caisse initial" value={formatCurrency(report.finalBalance.openingBalance)} />
          <ReportRow label="Montant attendu en caisse" value={formatCurrency(report.finalBalance.expectedBalance)} isBold />
          <ReportRow label="Montant compté en caisse" value={formatCurrency(report.finalBalance.closingBalance)} isBold />
          <ReportRow 
            label="Différence" 
            value={formatCurrency(report.finalBalance.difference)} 
            isBold
          />
        </div>
      </div>
      
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}