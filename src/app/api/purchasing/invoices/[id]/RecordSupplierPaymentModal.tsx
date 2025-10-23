// src/app/(dashboard)/purchasing/invoices/[id]/RecordSupplierPaymentModal.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
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
  supplierId: string;
  remainingDue: number;
}

export default function RecordSupplierPaymentModal({ isOpen, onClose, onSuccess, invoiceId, supplierId, remainingDue }: RecordPaymentModalProps) {
  const [availablePayments, setAvailablePayments] = useState<AvailablePayment[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [amountToApply, setAmountToApply] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch available payments for the specific supplier when the modal opens
    if (isOpen && supplierId) {
      const fetchAvailablePayments = async () => {
        try {
          const response = await fetch(`/api/suppliers/${supplierId}/payments?status=available`);
          if (!response.ok) throw new Error("Impossible de charger les paiements disponibles.");
          
          const data = await response.json();
          setAvailablePayments(data);
        } catch (error) {
          const err = error as Error;
          toast.error(err.message);
        }
      };
      fetchAvailablePayments();
    }
  }, [isOpen, supplierId]);

  useEffect(() => {
    // Auto-fill the amount field when a payment is selected
    if (selectedPaymentId) {
      const selected = availablePayments.find(p => p.id === selectedPaymentId);
      if (selected) {
        // Apply the smaller of the two: what's left on the payment vs what's left on the invoice
        const applicableAmount = Math.min(selected.remainingAmount, remainingDue);
        setAmountToApply(applicableAmount.toFixed(2));
      }
    } else {
      setAmountToApply('');
    }
  }, [selectedPaymentId, availablePayments, remainingDue]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseFloat(amountToApply);
    
    if (!selectedPaymentId || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Veuillez sélectionner un paiement et entrer un montant valide.");
      return;
    }

    setLoading(true);
    const promise = fetch(`/api/purchasing/invoices/${invoiceId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: selectedPaymentId,
        amountToAllocate: parsedAmount,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json();
        return Promise.reject(errData.error || "L'affectation a échoué.");
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Enregistrement de l\'affectation...',
      success: () => {
        onSuccess(); // Refresh parent page data
        onClose();   // Close the modal
        return 'Paiement affecté avec succès !';
      },
      error: (err) => `Erreur : ${err}`,
    }).finally(() => {
      setLoading(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Affecter un Paiement</h2>
        <p className="text-lg mb-6">Solde dû sur la facture : <span className="font-bold">{remainingDue.toFixed(2)} {CURRENCY_LABEL}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border rounded-md bg-gray-50">
              {availablePayments.length > 0 ? (
                <>
                  <label htmlFor="payment" className="block text-sm font-medium text-gray-700">Sélectionner un paiement disponible</label>
                  <select id="payment" value={selectedPaymentId} onChange={(e) => setSelectedPaymentId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="">-- Choisir un paiement --</option>
                    {availablePayments.map(p => (
                      <option key={p.id} value={p.id}>
                        {`Paiement de ${p.amount.toFixed(2)}${CURRENCY_LABEL} (${p.method}) du ${new Date(p.paymentDate).toLocaleDateString('fr-FR')} - Disponible: ${p.remainingAmount.toFixed(2)}${CURRENCY_LABEL}`}
                      </option>
                    ))}
                  </select>
                </>
              ) : <p className="text-sm text-center text-gray-500 py-4">Aucun paiement disponible pour ce fournisseur.</p>}
            </div>

          {selectedPaymentId && (
            <div>
              <label htmlFor="amountToApply" className="block text-sm font-medium text-gray-700">Montant à affecter</label>
              <input id="amountToApply" type="number" step="0.01" min="0.01" value={amountToApply} onChange={(e) => setAmountToApply(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
            <button type="submit" disabled={loading || !amountToApply} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? 'En cours...' : 'Affecter le Paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}