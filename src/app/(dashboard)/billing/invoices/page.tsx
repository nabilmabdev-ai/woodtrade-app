// src/app/(dashboard)/billing/invoices/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { InvoiceStatus } from '@prisma/client';

// --- Définition du type pour une facture dans la liste ---
interface InvoiceListItem {
  id: string;
  orderId: string;
  companyName: string;
  issueDate: string;
  status: string;
  total: number;
}

// --- SOUS-COMPOSANT AMÉLIORÉ pour les badges de statut ---
const StatusBadge = ({ status }: { status: string }) => {
  const styles: { [key: string]: string } = {
    UNPAID: 'bg-red-100 text-red-800',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-blue-100 text-blue-800',
    VOID: 'bg-gray-100 text-gray-800',
    DRAFT: 'bg-gray-100 text-gray-800',
  };
  const style = styles[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // --- NOUVEL ÉTAT POUR LE FILTRE ---
  const [filterStatus, setFilterStatus] = useState<string>('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      // On construit l'URL avec le paramètre de filtre si un statut est sélectionné
      const url = filterStatus 
        ? `/api/invoices?status=${filterStatus}` 
        : '/api/invoices';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur réseau');
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]); // La fonction se redéclenche si le filtre change

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // --- COMPOSANT POUR LES BOUTONS DE FILTRE ---
  const FilterButton = ({ status, label }: { status: string, label: string }) => {
    const isActive = filterStatus === status;
    return (
      <button
        onClick={() => setFilterStatus(status)}
        className={`px-3 py-1 text-sm font-medium rounded-md ${
          isActive 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Factures</h1>
      </div>

      {/* --- SECTION DES FILTRES AJOUTÉE --- */}
      <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-100 rounded-lg">
        <FilterButton status="" label="Toutes" />
        <FilterButton status={InvoiceStatus.UNPAID} label="Impayées" />
        <FilterButton status={InvoiceStatus.PARTIALLY_PAID} label="Partiellement Payées" />
        <FilterButton status={InvoiceStatus.PAID} label="Payées" />
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture N°</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date d&apos;émission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10">Chargement...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center py-10 text-red-500">{error}</td></tr>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">#{invoice.id.substring(0, 8)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.companyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-semibold">{invoice.total.toFixed(2)} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href={`/billing/invoices/${invoice.id}`} className="text-indigo-600 hover:text-indigo-900">
                      Détails
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucune facture ne correspond à ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}