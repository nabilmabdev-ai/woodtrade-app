// src/app/(dashboard)/cash-registers/[id]/components/OpenSessionModal.tsx
"use client";

import { useState, FormEvent, useEffect } from 'react';
import toast from 'react-hot-toast';

interface OpenSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (openingBalance: number) => void;
  isSubmitting: boolean;
}

export default function OpenSessionModal({ isOpen, onClose, onSubmit, isSubmitting }: OpenSessionModalProps) {
  const [openingBalance, setOpeningBalance] = useState('');

  // Reset the input when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setOpeningBalance('');
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error("The opening balance must be a positive number.");
      return;
    }
    onSubmit(balance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Open a New Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="openingBalance" className="block text-sm font-medium text-gray-700">
              Opening Balance (MAD)
            </label>
            {/* ✅ NEW classes applied for a modern input style */}
            <input
              id="openingBalance"
              type="number"
              step="0.01"
              min="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              required
              autoFocus
              className="mt-1 block w-full px-4 py-3 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-300 placeholder-gray-400 text-lg focus:outline-none"
              placeholder="e.g., 150.00"
            />
            <p className="text-xs text-gray-500 mt-1">Amount to start with in the cash drawer.</p>
          </div>
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
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Opening...' : 'Confirm & Open'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}