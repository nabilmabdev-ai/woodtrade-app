// src/app/(dashboard)/customers/[id]/CustomerPaymentList.tsx

"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PaymentStatus } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
interface CustomerPayment {
  id: string;
  status: PaymentStatus;
  paymentDate: string;
  method: string;
  amount: number;
  remainingAmount: number;
}

interface CustomerPaymentListProps {
  companyId: string;
}

// --- SUB-COMPONENTS ---
const StatusBadge = ({ status }: { status: PaymentStatus }) => {
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

const PaymentRow = ({ payment }: { payment: CustomerPayment }) => (
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

export default function CustomerPaymentList({ companyId }: CustomerPaymentListProps) {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        // We use the existing endpoint without the ?status=available filter to get ALL payments
        const response = await fetch(`/api/customers/${companyId}/payments`);
        if (!response.ok) {
          throw new Error("Impossible de charger les paiements du client.");
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
  }, [companyId]);

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
                Ce client n&apos;a aucun paiement enregistré.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}