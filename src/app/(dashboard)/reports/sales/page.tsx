// src/app/(dashboard)/reports/sales/page.tsx

"use client";

import { useState, FormEvent, useEffect } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown, { DropdownItem } from '@/components/SearchableDropdown';

// --- TypeScript Interfaces ---
interface SalesSummary {
  totalRevenue: number;
  totalItemsSold: number;
  numberOfOrders: number;
  averageOrderValue: number;
}

interface ProductReportDetail {
  productName: string;
  sku: string;
  quantitySold: number;
  totalRevenue: number;
}

interface SalesReportData {
  summary: SalesSummary;
  detailedReport: ProductReportDetail[];
}

const StatCard = ({ title, value }: { title: string, value: string }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
);

// The key is this line: it must be a default export.
export default function SalesReportPage() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<DropdownItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<DropdownItem | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) throw new Error('Impossible de charger la liste des clients.');
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
      }
    };
    fetchCustomers();
  }, []);

  const handleGenerateReport = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setReportData(null);

    const params = new URLSearchParams({ startDate, endDate });
    if (selectedCustomer) {
      params.append('customerId', selectedCustomer.id);
    }

    try {
      const response = await fetch(`/api/reports/sales?${params.toString()}`);
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
        <h1 className="text-3xl font-bold">Rapport des Ventes</h1>
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
          <div className="flex-grow">
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Client</label>
            <SearchableDropdown 
                items={[{id: '', name: 'Tous les clients'}, ...customers]}
                selected={selectedCustomer}
                onChange={(customer) => {
                    if (customer && customer.id === '') {
                        setSelectedCustomer(null);
                    } else {
                        setSelectedCustomer(customer);
                    }
                }}
                placeholder="Rechercher un client..."
            />
          </div>
          <button type="submit" disabled={loading} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Chargement...' : 'Générer le rapport'}
          </button>
        </form>
      </div>

      {reportData && (
        <div className="printable-area">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-semibold">
                Rapport du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
                </h2>
                {selectedCustomer && (
                    <p className="text-lg text-gray-600">Client: <span className="font-semibold">{selectedCustomer.name}</span></p>
                )}
            </div>
            <button onClick={handlePrint} className="px-4 py-2 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 print:hidden">
                Imprimer
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Chiffre d'affaires total" value={`${reportData.summary.totalRevenue.toFixed(2)} €`} />
            <StatCard title="Articles vendus" value={reportData.summary.totalItemsSold.toString()} />
            <StatCard title="Nombre de commandes" value={reportData.summary.numberOfOrders.toString()} />
            <StatCard title="Panier moyen" value={`${reportData.summary.averageOrderValue.toFixed(2)} €`} />
          </div>

          <div className="border rounded-lg overflow-hidden bg-white shadow">
            <h3 className="text-xl font-semibold p-4 border-b">Détail par produit</h3>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit (SKU)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantité Vendue</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Chiffre d&apos;affaires</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.detailedReport.length > 0 ? (
                    reportData.detailedReport.map((item, index) => (
                    <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            <div className="text-gray-500">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-700">{item.quantitySold}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-green-700">
                        {item.totalRevenue.toFixed(2)} €
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} className="text-center py-8 text-gray-500">Aucune vente trouvée pour cette sélection.</td>
                    </tr>
                )}
              </tbody>
            </table>
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