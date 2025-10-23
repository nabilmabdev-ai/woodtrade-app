// src/app/(dashboard)/cash-registers/AddCashRegisterForm.tsx

"use client";

import { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CashRegisterType } from '@prisma/client';

interface AddCashRegisterFormProps {
  onRegisterAdded: () => void;
  // Prop to close the drawer/modal from the parent
  onClose?: () => void;
}

export default function AddCashRegisterForm({ onRegisterAdded, onClose }: AddCashRegisterFormProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<CashRegisterType>(CashRegisterType.SALES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const promise = fetch('/api/cash-registers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, type }),
    }).then(async (response) => {
      if (response.ok) {
        setName('');
        setLocation('');
        setType(CashRegisterType.SALES);
        onRegisterAdded();
        if (onClose) onClose(); // Close the drawer on success
        return 'Register added successfully!';
      } else {
        const errorData = await response.json();
        return Promise.reject(errorData.error || 'Failed to create register');
      }
    });

    toast.promise(promise, {
      loading: 'Adding register...',
      success: (message) => message,
      error: (err) => `Error: ${err}`,
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    // The form is now self-contained, ready to be placed in a drawer/modal.
    <form onSubmit={handleSubmit} className="flex flex-col h-full p-6 space-y-6">
      <div className="flex-1 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Register Name (unique) *</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g., Main Register"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">Register Type *</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as CashRegisterType)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            {/* ✅ MODIFIED according to plan: Neutral microcopy */}
            <option value={CashRegisterType.SALES}>Register</option>
            <option value={CashRegisterType.EXPENSE}>Expense Register</option>
          </select>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location (Optional)</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Front Desk"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
      
      <div className="flex-shrink-0 flex justify-end space-x-4">
        {onClose && (
           <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
             Cancel
           </button>
        )}
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
          {isSubmitting ? 'Adding...' : 'Add Register'}
        </button>
      </div>
    </form>
  );
}