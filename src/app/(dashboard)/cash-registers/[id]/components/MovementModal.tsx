// src/app/(dashboard)/cash-registers/[id]/components/MovementModal.tsx
"use client";

import { useState, FormEvent, useEffect } from 'react';
import toast from 'react-hot-toast';

type MovementType = 'IN' | 'OUT';

export interface MovementSubmitPayload {
  type: MovementType;
  amount: number;
  reason: string;
  applyToSession: boolean;
}

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: MovementSubmitPayload) => void;
  isSubmitting: boolean;
  isSessionActive: boolean;
}

export default function MovementModal({ isOpen, onClose, onSubmit, isSubmitting, isSessionActive }: MovementModalProps) {
  const [type, setType] = useState<MovementType>('OUT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [applyToSession, setApplyToSession] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setType('OUT');
      setAmount('');
      setReason('');
      setApplyToSession(true);
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !reason) {
      toast.error("Please enter a valid amount and reason.");
      return;
    }
    onSubmit({ type, amount: parsedAmount, reason, applyToSession });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Add a Cash Movement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Movement Type</label>
            <div className="mt-1 grid grid-cols-2 gap-2 rounded-md bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`px-3 py-2 text-sm font-semibold rounded ${type === 'IN' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-white/50'}`}
              >
                Cash In
              </button>
              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`px-3 py-2 text-sm font-semibold rounded ${type === 'OUT' ? 'bg-white shadow text-red-600' : 'text-gray-600 hover:bg-white/50'}`}
              >
                Cash Out
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (MAD) *</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason *</label>
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder={type === 'OUT' ? "e.g., Office supplies, petty cash..." : "e.g., Owner contribution, float top-up..."}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {isSessionActive && (
             <div className="relative flex items-start pt-2">
                <div className="flex h-5 items-center">
                    <input
                        id="applyToSession"
                        name="applyToSession"
                        type="checkbox"
                        checked={applyToSession}
                        onChange={(e) => setApplyToSession(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="applyToSession" className="font-medium text-gray-700">
                        Apply to current session
                    </label>
                    <p className="text-gray-500">Uncheck this if the movement is not part of the current session's cash flow.</p>
                </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Adding...' : 'Add Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}