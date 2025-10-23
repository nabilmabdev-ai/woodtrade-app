// src/app/(dashboard)/customers/[id]/CustomerInvoiceList.tsx

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { InvoiceStatus } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
interface CustomerInvoice {
  id: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  total: number;
  remainingDue: number;
}

interface CustomerInvoiceListProps {
  companyId: string;
}

// --- SUB-COMPONENTS ---
const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const styles = {
    UNPAID: 'bg-red-100 text-red-800',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-blue-100 text-blue-800',
    VOID: 'bg-gray-100 text-gray-800',
    DRAFT: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const InvoiceRow = ({ invoice, onRowClick }: { invoice: CustomerInvoice; onRowClick: (id: string) => void; }) => {
  const isOverdue = invoice.status !== 'PAID' && new Date(invoice.dueDate) < new Date();
  
  return (
    <tr onClick={() => onRowClick(invoice.id)} className="hover:bg-gray-50 cursor-pointer">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
        #{invoice.id.substring(0, 8).toUpperCase()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
        {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
        {invoice.total.toFixed(2)} {CURRENCY_LABEL}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
        {invoice.remainingDue.toFixed(2)} {CURRENCY_LABEL}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <StatusBadge status={invoice.status} />
      </td>
    </tr>
  );
};


export default function CustomerInvoiceList({ companyId }: CustomerInvoiceListProps) {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/customers/${companyId}/invoices`);
        if (!response.ok) {
          throw new Error("Impossible de charger les factures du client.");
        }
        const data = await response.json();
        setInvoices(data);
      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [companyId]);

  const handleRowClick = (invoiceId: string) => {
    router.push(`/billing/invoices/${invoiceId}`);
  };

  if (loading) {
    return <p className="text-center p-4">Chargement des factures...</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facture N°</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date d&apos;émission</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date d&apos;échéance</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde Dû</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.length > 0 ? (
            invoices.map(invoice => <InvoiceRow key={invoice.id} invoice={invoice} onRowClick={handleRowClick} />)
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                Ce client n&apos;a aucune facture enregistrée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}