// src/app/(dashboard)/billing/credit-notes/page.tsx
"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CreditNoteStatus, Role } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import * as permissions from '@/lib/permissions';

// --- INTERFACES ---
interface CreditNote {
  id: string;
  company: { name: string };
  initialAmount: number;
  remainingAmount: number;
  createdAt: string;
  status: CreditNoteStatus;
  reason: string;
}

// --- SUB-COMPONENTS ---
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

export default function CreditNotesPage() {
  const { user } = useAuth();
  const userRole = user?.role as Role;

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreditNotes = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/billing/credit-notes');
        if (!response.ok) throw new Error("Impossible de charger les avoirs.");
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
  }, []);

  if (loading) return <p className="p-8 text-center">Chargement des avoirs...</p>;

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Avoirs Clients</h1>
        {/* Visible only to authorized roles */}
        {userRole && permissions.canManageCreditNotes(userRole) && (
          <button
            // onClick={handleOpenModal} // To be implemented
            className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            disabled // Remove disabled when modal is ready
          >
            + Créer un Avoir
          </button>
        )}
      </div>

      {userRole === 'ACCOUNTANT' && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-md">
          Vue en lecture seule pour les comptables.
        </div>
      )}

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raison</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Initial</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Restant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {creditNotes.length > 0 ? (
              creditNotes.map((cn) => (
                <tr key={cn.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cn.company.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(cn.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{cn.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-800">{cn.initialAmount.toFixed(2)} {CURRENCY_LABEL}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">{cn.remainingAmount.toFixed(2)} {CURRENCY_LABEL}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusBadge status={cn.status} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">Aucun avoir trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
