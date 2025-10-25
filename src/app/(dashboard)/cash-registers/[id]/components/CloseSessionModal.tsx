// src/app/(dashboard)/cash-registers/[id]/components/CloseSessionModal.tsx
"use client";

import { useState, FormEvent, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

interface CloseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { closingBalance: number; createAdjustment: boolean }) => void;
  isSubmitting: boolean;
  openingBalance: number;
  systemRunningTotal: number;
}

const Stat = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
);


export default function CloseSessionModal({ isOpen, onClose, onSubmit, isSubmitting, openingBalance, systemRunningTotal }: CloseSessionModalProps) {
  const [countedBalance, setCountedBalance] = useState('');
  const [createAdjustment, setCreateAdjustment] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountedBalance('');
      setCreateAdjustment(true);
    }
  }, [isOpen]);

  const difference = useMemo(() => {
    const counted = parseFloat(countedBalance);
    if (isNaN(counted)) return 0;
    return counted - systemRunningTotal;
  }, [countedBalance, systemRunningTotal]);
  
  const hasDifference = Math.abs(difference) >= 0.01;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(countedBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error("The closing balance must be a positive number.");
      return;
    }
    onSubmit({ closingBalance: balance, createAdjustment: hasDifference ? createAdjustment : false });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Fermer la Session</h2>
        
        <div className="p-4 mb-4 bg-gray-50 rounded-lg border">
            <Stat label="Fonds de Caisse Initial" value={`${openingBalance.toLocaleString('fr-FR', {minimumFractionDigits: 2})} MAD`} />
            <Stat label="Total Actuel (Système)" value={`${systemRunningTotal.toLocaleString('fr-FR', {minimumFractionDigits: 2})} MAD`} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="closingBalance" className="block text-sm font-medium text-gray-700">
              Montant Compté en Caisse (MAD) *
            </label>
            {/* ✅ NEW classes applied for a modern input style */}
            <input
              id="closingBalance"
              type="number"
              step="0.01"
              min="0"
              value={countedBalance}
              onChange={(e) => setCountedBalance(e.target.value)}
              required
              autoFocus
              className="mt-1 block w-full px-4 py-3 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-300 placeholder-gray-400 text-lg focus:outline-none"
              placeholder="Enter the exact counted amount"
            />
          </div>

          {hasDifference && (
            <div className={`p-4 rounded-md ${difference > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <p className={`font-semibold ${difference > 0 ? 'text-green-800' : 'text-red-800'}`}>
                    Le montant déclaré diffère de {difference.toLocaleString('fr-FR', {minimumFractionDigits: 2})} MAD.
                </p>
                <div className="mt-3">
                    <div className="relative flex items-start">
                        <div className="flex h-5 items-center">
                            <input
                                id="createAdjustment"
                                name="createAdjustment"
                                type="checkbox"
                                checked={createAdjustment}
                                onChange={(e) => setCreateAdjustment(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="createAdjustment" className="font-medium text-gray-700">
                                Créer automatiquement un mouvement d&apos;ajustement
                            </label>
                            <p className="text-gray-500">Cela équilibrera la caisse pour la prochaine session.</p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Fermeture...' : 'Confirmer & Fermer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}