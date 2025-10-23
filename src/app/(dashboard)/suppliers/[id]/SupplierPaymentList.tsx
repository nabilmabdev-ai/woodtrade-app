// src/app/(dashboard)/suppliers/[id]/SupplierPaymentList.tsx

"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SupplierPaymentStatus } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
interface SupplierPayment {
  id: string;
  status: SupplierPaymentStatus;
  paymentDate: string;
  method: string;
  amount: number;
  remainingAmount: number;
}

interface SupplierPaymentListProps {
  supplierId: string;
}

// --- SUB-COMPONENTS ---
const StatusBadge = ({ status }: { status: SupplierPaymentStatus }) => {
  const styles = {
    AVAILABLE: 'bg-green-100 text-green-800',
    PARTIALLY_ALLOCATED: 'bg-yellow-100 text-yellow-800',
    FULLY_ALLOCATED: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const PaymentRow = ({ payment }: { payment: SupplierPayment }) => (
  <tr>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
      #{payment.id.substring(0, 8).toUpperCase()}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{payment.method}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
      {payment.amount.toFixed(2)} {CURRENCY_LABEL}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
      {payment.remainingAmount.toFixed(2)} {CURRENCY_LABEL}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      <StatusBadge status={payment.status} />
    </td>
  </tr>
);

export default function SupplierPaymentList({ supplierId }: SupplierPaymentListProps) {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!supplierId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/suppliers/${supplierId}/payments`);
        if (!response.ok) {
          throw new Error("Impossible de charger les paiements du fournisseur.");
        }
        const data = await response.json();
        setPayments(data);
      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [supplierId]);

  if (loading) {
    return <p className="text-center p-4">Chargement des paiements...</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement N°</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Total</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Disponible</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {payments.length > 0 ? (
            payments.map(payment => <PaymentRow key={payment.id} payment={payment} />)
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                Aucun paiement enregistré pour ce fournisseur.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}