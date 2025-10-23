// src/app/(dashboard)/purchasing/invoices/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupplierInvoiceStatus } from '@prisma/client';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { CURRENCY_LABEL } from '@/lib/constants';

interface SupplierInvoiceListItem {
  id: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  total: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: { [key: string]: string } = {
    UNPAID: 'bg-red-100 text-red-800',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
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

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterStatus
        ? `/api/purchasing/invoices?status=${filterStatus}`
        : '/api/purchasing/invoices';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur réseau lors du chargement des factures.');
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading('Génération du fichier CSV...');
    try {
        const response = await fetch('/api/purchasing/invoices/export');
        if (!response.ok) throw new Error('Échec de l\'exportation.');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `export_factures_${new Date().toISOString().split('T')[0]}.csv`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch.length > 1) filename = filenameMatch[1];
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success('Exportation réussie !');
    // --- ✅ FIX APPLIED HERE ---
    // The unused 'error' variable is now removed from the catch block.
    } catch {
        toast.dismiss();
        toast.error('Une erreur est survenue lors de l\'exportation.');
    } finally {
        setIsExporting(false);
    }
  };

  const FilterButton = ({ status, label }: { status: string, label: string }) => {
    const isActive = filterStatus === status;
    return (
      <button
        onClick={() => setFilterStatus(status)}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Factures Fournisseurs</h1>
        <div className="flex items-center space-x-4">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-200"
            >
                <Download className="h-5 w-5" />
                <span>{isExporting ? 'Exportation...' : 'Exporter en CSV'}</span>
            </button>
            <Link
                href="/purchasing/invoices/new"
                className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
                + Nouvelle Facture
            </Link>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-100 rounded-lg">
        <FilterButton status="" label="Toutes" />
        <FilterButton status={SupplierInvoiceStatus.UNPAID} label="Impayées" />
        <FilterButton status={SupplierInvoiceStatus.PARTIALLY_PAID} label="Partiellement Payées" />
        <FilterButton status={SupplierInvoiceStatus.PAID} label="Payées" />
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Facture</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Échéance</th>
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
              invoices.map((invoice) => {
                const dueDate = new Date(invoice.dueDate);
                const today = new Date();
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(today.getDate() + 7);
                today.setHours(0,0,0,0);
                let dateClass = 'text-gray-500';
                if (dueDate < today && invoice.status !== 'PAID' && invoice.status !== 'VOID') {
                    dateClass = 'text-red-600 font-bold';
                } else if (dueDate <= sevenDaysFromNow && invoice.status !== 'PAID' && invoice.status !== 'VOID') {
                    dateClass = 'text-orange-500 font-semibold';
                }
                return (
                    <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.supplierName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${dateClass}`}>{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={invoice.status} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-semibold">{invoice.total.toFixed(2)} {CURRENCY_LABEL}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <a href={`/purchasing/invoices/${invoice.id}`} className="text-indigo-600 hover:text-indigo-900">Détails</a>
                        </td>
                    </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Aucune facture ne correspond à ce filtre.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}