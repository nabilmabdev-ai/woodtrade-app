// src/app/(dashboard)/customers/[id]/CustomerCreditNoteList.tsx

"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CreditNoteStatus } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
interface CreditNote {
  id: string;
  status: CreditNoteStatus;
  initialAmount: number;
  remainingAmount: number;
  reason: string;
  createdAt: string;
}

interface CustomerCreditNoteListProps {
  companyId: string;
}

// --- SUB-COMPONENTS FOR READABILITY ---
const StatusBadge = ({ status }: { status: CreditNoteStatus }) => {
  const styles = {
    AVAILABLE: 'bg-green-100 text-green-800',
    PARTIALLY_USED: 'bg-yellow-100 text-yellow-800',
    FULLY_USED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const CreditNoteRow = ({ note }: { note: CreditNote }) => (
  <tr>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
      #{note.id.substring(0, 8).toUpperCase()}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {new Date(note.createdAt).toLocaleDateString('fr-FR')}
    </td>
    <td className="px-6 py-4 text-sm text-gray-800">{note.reason}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
      {note.initialAmount.toFixed(2)} {CURRENCY_LABEL}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
      {note.remainingAmount.toFixed(2)} {CURRENCY_LABEL}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      <StatusBadge status={note.status} />
    </td>
  </tr>
);

export default function CustomerCreditNoteList({ companyId }: CustomerCreditNoteListProps) {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreditNotes = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/customers/${companyId}/credit-notes`);
        if (!response.ok) {
          throw new Error("Impossible de charger les avoirs du client.");
        }
        const data = await response.json();
        setCreditNotes(data);
      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditNotes();
  }, [companyId]);

  if (loading) {
    return <p className="text-center p-4">Chargement des avoirs...</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avoir N°</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raison</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Initial</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Restant</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {creditNotes.length > 0 ? (
            creditNotes.map(note => <CreditNoteRow key={note.id} note={note} />)
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                Ce client n&apos;a aucun avoir enregistré.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}