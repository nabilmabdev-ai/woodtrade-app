// src/app/(dashboard)/reports/purchasing-forecast/page.tsx
"use client";

import { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- TypeScript Interfaces ---
interface WeeklyForecast {
  weekStartDate: string;
  amountDue: number;
}

interface ForecastReportData {
  totalDueInPeriod: number;
  weeklyReport: WeeklyForecast[];
}

// --- UI Sub-Components ---
const StatCard = ({ title, value }: { title: string, value: string }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
);

// A simple bar chart component to visualize the data
const ForecastChart = ({ data }: { data: WeeklyForecast[] }) => {
    const maxValue = Math.max(...data.map(d => d.amountDue), 0);
    if (maxValue === 0) {
        return <div className="text-center text-gray-500 py-10">No data to display in chart.</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Prévisionnel Visuel</h3>
            <div className="flex justify-around items-end h-64 space-x-2">
                {data.map(item => (
                    <div key={item.weekStartDate} className="flex-1 flex flex-col items-center">
                        <div 
                            className="w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                            style={{ height: `${(item.amountDue / maxValue) * 100}%` }}
                            title={`${item.amountDue.toFixed(2)} ${CURRENCY_LABEL}`}
                        ></div>
                        <span className="text-xs text-gray-500 mt-2">
                            {new Date(item.weekStartDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function PurchasingForecastPage() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2); // Default to a 2-month forecast
    return d.toISOString().split('T')[0];
  });

  const [reportData, setReportData] = useState<ForecastReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setReportData(null);

    const params = new URLSearchParams({ startDate, endDate });

    try {
      const response = await fetch(`/api/reports/purchasing-forecast?${params.toString()}`);
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
        <h1 className="text-3xl font-bold">Prévisionnel des Paiements Fournisseurs</h1>
      </div>

      <div className="p-6 border rounded-lg bg-gray-50 mb-8 print:hidden">
        <form onSubmit={handleGenerateReport} className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Date de début</label>
            <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Date de fin</label>
            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <button type="submit" disabled={loading} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Chargement...' : 'Générer le rapport'}
          </button>
        </form>
      </div>

      {reportData && (
        <div className="printable-area space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Rapport du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
            </h2>
            <button onClick={handlePrint} className="px-4 py-2 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 print:hidden">
                Imprimer
            </button>
          </div>
          
          <StatCard title="Total à Payer sur la Période" value={`${reportData.totalDueInPeriod.toFixed(2)} ${CURRENCY_LABEL}`} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="border rounded-lg overflow-hidden bg-white shadow">
              <h3 className="text-xl font-semibold p-4 border-b">Détail par Semaine</h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Semaine du</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant Dû</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.weeklyReport.length > 0 ? (
                      reportData.weeklyReport.map((item) => (
                      <tr key={item.weekStartDate}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                            {new Date(item.weekStartDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-red-700">
                            {item.amountDue.toFixed(2)} {CURRENCY_LABEL}
                          </td>
                      </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan={2} className="text-center py-8 text-gray-500">Aucun paiement à prévoir pour cette période.</td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <ForecastChart data={reportData.weeklyReport} />
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