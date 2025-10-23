// src/app/(dashboard)/cash-registers/[id]/components/TransferModal.tsx
"use client";

import { useState, FormEvent, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface TransferSubmitPayload {
  destinationId: string;
  amount: number;
  reason: string;
}

interface RegisterOption {
    id: string;
    name: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: TransferSubmitPayload) => void;
  isSubmitting: boolean;
  currentRegisterId: string;
  allRegisters: RegisterOption[];
  currentBalance: number;
}

export default function TransferModal({ isOpen, onClose, onSubmit, isSubmitting, currentRegisterId, allRegisters, currentBalance }: TransferModalProps) {
  const [destinationId, setDestinationId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Filter out the current register from the list of possible destinations
  const availableDestinations = allRegisters.filter(r => r.id !== currentRegisterId);

  // Reset form state when the modal opens and pre-select the first available destination
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setReason('');
      if (availableDestinations.length > 0) {
        setDestinationId(availableDestinations[0].id);
      } else {
        setDestinationId('');
      }
    }
  }, [isOpen, availableDestinations]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!destinationId) {
      toast.error("Please select a destination register.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid, positive amount.");
      return;
    }
    if (parsedAmount > currentBalance) {
      toast.error(`Transfer amount cannot exceed the current balance of ${currentBalance.toLocaleString('fr-FR')} MAD.`);
      return;
    }
    if (!reason) {
      toast.error("A reason for the transfer is required.");
      return;
    }
    
    onSubmit({ destinationId, amount: parsedAmount, reason });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Transfer Funds</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700">Destination Register *</label>
            {/* ✅ NEW classes applied for a modern select style */}
            <select
              id="destination"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-300 bg-white focus:outline-none"
            >
              {availableDestinations.length > 0 ? (
                availableDestinations.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
              ) : (
                <option disabled>No other registers available for transfer</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount to Transfer (MAD) *</label>
            {/* ✅ NEW classes applied for a modern input style */}
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={currentBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-300 placeholder-gray-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason *</label>
            {/* ✅ NEW classes applied for a modern input style */}
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="e.g., Balancing registers, end of day..."
              className="mt-1 block w-full px-4 py-3 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-300 placeholder-gray-400 focus:outline-none"
            />
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
              disabled={isSubmitting || availableDestinations.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}