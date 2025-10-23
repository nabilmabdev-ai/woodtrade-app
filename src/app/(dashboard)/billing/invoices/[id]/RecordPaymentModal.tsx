// src/app/(dashboard)/billing/invoices/[id]/RecordPaymentModal.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
interface CreditNote {
  id: string;
  remainingAmount: number;
  reason: string;
}

interface AvailablePayment {
  id: string;
  amount: number;
  remainingAmount: number;
  paymentDate: string;
  method: string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceId: string;
  companyId: string;
  remainingDue: number;
}

export default function RecordPaymentModal({ isOpen, onClose, onSuccess, invoiceId, companyId, remainingDue }: RecordPaymentModalProps) {
  // --- STATE EXTENDED FOR TABS ---
  const [activeTab, setActiveTab] = useState<'payment' | 'credit_note'>('payment');
  
  const [availableCreditNotes, setAvailableCreditNotes] = useState<CreditNote[]>([]);
  const [availablePayments, setAvailablePayments] = useState<AvailablePayment[]>([]);

  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState<string>('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');

  const [amountToApply, setAmountToApply] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      const fetchData = async () => {
        try {
          // Fetch both payment sources in parallel
          const [paymentsRes, creditNotesRes] = await Promise.all([
            fetch(`/api/customers/${companyId}/payments?status=available`),
            fetch(`/api/customers/${companyId}/credit-notes`)
          ]);

          if (!paymentsRes.ok) throw new Error("Could not load available payments.");
          if (!creditNotesRes.ok) throw new Error("Could not load credit notes.");

          const paymentsData = await paymentsRes.json();
          const notesData = await creditNotesRes.json();
          
          setAvailablePayments(paymentsData);
          // Filter out used or expired credit notes
          setAvailableCreditNotes(notesData.filter((n: CreditNote) => n.remainingAmount > 0.01));

        } catch (error) {
          const err = error as Error;
          toast.error(err.message);
        }
      };
      fetchData();
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    // Logic to pre-fill the amount based on the active tab and selection
    let applicableAmount = 0;
    if (activeTab === 'payment' && selectedPaymentId) {
      const selected = availablePayments.find(p => p.id === selectedPaymentId);
      if (selected) applicableAmount = Math.min(selected.remainingAmount, remainingDue);
    } else if (activeTab === 'credit_note' && selectedCreditNoteId) {
      const selected = availableCreditNotes.find(n => n.id === selectedCreditNoteId);
      if (selected) applicableAmount = Math.min(selected.remainingAmount, remainingDue);
    }
    setAmountToApply(applicableAmount > 0 ? applicableAmount.toFixed(2) : '');
  }, [selectedPaymentId, selectedCreditNoteId, availablePayments, availableCreditNotes, remainingDue, activeTab]);
  
  const handleTabChange = (tab: 'payment' | 'credit_note') => {
    setActiveTab(tab);
    // Reset selections when changing tabs
    setSelectedPaymentId('');
    setSelectedCreditNoteId('');
    setAmountToApply('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseFloat(amountToApply);
    
    // Determine the source based on the active tab
    const sourceType = activeTab === 'payment' ? 'PAYMENT' : 'CREDIT_NOTE';
    const sourceId = activeTab === 'payment' ? selectedPaymentId : selectedCreditNoteId;

    if (!sourceId || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please select a source and enter a valid amount.");
      return;
    }

    setLoading(true);
    const promise = fetch(`/api/invoices/${invoiceId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceType,
        sourceId,
        amountToAllocate: parsedAmount,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json();
        return Promise.reject(errData.error || "The operation failed.");
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Applying funds...',
      success: () => {
        onSuccess(); // Refresh parent page
        onClose();   // Close modal
        return 'Payment successfully applied!';
      },
      error: (err) => `Error: ${err}`,
    }).finally(() => {
      setLoading(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Record a Payment</h2>
        <p className="text-lg mb-6">Remaining due: <span className="font-bold">{remainingDue.toFixed(2)} {CURRENCY_LABEL}</span></p>

        {/* --- TABS SYSTEM --- */}
        <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6">
                <button onClick={() => handleTabChange('payment')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'payment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Use a Payment</button>
                <button onClick={() => handleTabChange('credit_note')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'credit_note' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Apply Credit Note</button>
            </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* --- PAYMENT TAB CONTENT --- */}
          {activeTab === 'payment' && (
            <div className="p-4 border rounded-md bg-gray-50">
              {availablePayments.length > 0 ? (
                <>
                  <label htmlFor="payment" className="block text-sm font-medium text-gray-700">Select an available payment</label>
                  <select id="payment" value={selectedPaymentId} onChange={(e) => setSelectedPaymentId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="">-- Choose a payment --</option>
                    {availablePayments.map(p => (
                      <option key={p.id} value={p.id}>
                        {`Payment of ${p.amount.toFixed(2)}${CURRENCY_LABEL} (${p.method}) - Available: ${p.remainingAmount.toFixed(2)}${CURRENCY_LABEL}`}
                      </option>
                    ))}
                  </select>
                </>
              ) : <p className="text-sm text-gray-500">No available payments for this customer.</p>}
            </div>
          )}

          {/* --- CREDIT NOTE TAB CONTENT --- */}
          {activeTab === 'credit_note' && (
            <div className="p-4 border rounded-md bg-gray-50">
              {availableCreditNotes.length > 0 ? (
                <>
                  <label htmlFor="creditNote" className="block text-sm font-medium text-gray-700">Select a credit note</label>
                  <select id="creditNote" value={selectedCreditNoteId} onChange={(e) => setSelectedCreditNoteId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="">-- Choose a credit note --</option>
                    {availableCreditNotes.map(note => (
                      <option key={note.id} value={note.id}>
                        {`Credit of ${note.remainingAmount.toFixed(2)}${CURRENCY_LABEL} (${note.reason})`}
                      </option>
                    ))}
                  </select>
                </>
              ) : <p className="text-sm text-gray-500">No available credit notes for this customer.</p>}
            </div>
          )}

          {/* --- COMMON AMOUNT FIELD --- */}
          {(selectedPaymentId || selectedCreditNoteId) && (
            <div>
              <label htmlFor="amountToApply" className="block text-sm font-medium text-gray-700">Amount to Apply</label>
              <input id="amountToApply" type="number" step="0.01" min="0.01" value={amountToApply} onChange={(e) => setAmountToApply(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading || !amountToApply} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? 'Processing...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}