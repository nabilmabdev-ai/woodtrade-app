// src/app/(dashboard)/purchasing/invoices/[id]/RecordSupplierPaymentModal.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  
  // State for existing payments tab
  const [availablePayments, setAvailablePayments] = useState<AvailablePayment[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [amountToApply, setAmountToApply] = useState<string>('');

  // State for new payment tab
  const [newAmount, setNewAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMethod, setNewMethod] = useState('TRANSFER');
  const [allocateNow, setAllocateNow] = useState(true);

  const [loading, setLoading] = useState(false);

  // Fetch available payments for the "existing" tab when the modal opens
  useEffect(() => {
    if (isOpen && supplierId) {
      const fetchAvailablePayments = async () => {
        try {
          const response = await fetch(`/api/suppliers/${supplierId}/payments?status=available`);
          if (!response.ok) throw new Error("Impossible de charger les paiements disponibles.");
          const data = await response.json();
          setAvailablePayments(data);
          // Default to the 'new' tab if no payments are available
          if (data.length === 0) {
            setActiveTab('new');
          }
        } catch (error) {
          const err = error as Error;
          toast.error(err.message);
        }
      };
      fetchAvailablePayments();
      // Pre-fill the new payment amount with the remaining due
      setNewAmount(remainingDue > 0 ? remainingDue.toFixed(2) : '');
    }
  }, [isOpen, supplierId, remainingDue]);

  // Auto-fill amount for the selected existing payment
  useEffect(() => {
    if (activeTab === 'existing' && selectedPaymentId) {
      const selected = availablePayments.find(p => p.id === selectedPaymentId);
      if (selected) {
        const applicableAmount = Math.min(selected.remainingAmount, remainingDue);
        setAmountToApply(applicableAmount.toFixed(2));
      }
    } else {
      setAmountToApply('');
    }
  }, [selectedPaymentId, availablePayments, remainingDue, activeTab]);

  const handleTabChange = (tab: 'existing' | 'new') => {
    setActiveTab(tab);
    // Reset selections when changing tabs
    setSelectedPaymentId('');
    setAmountToApply('');
  };
  
  const handleAllocateExisting = () => {
    const parsedAmount = parseFloat(amountToApply);
    if (!selectedPaymentId || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Veuillez sélectionner un paiement et entrer un montant valide.");
      return Promise.reject();
    }
    return fetch(`/api/purchasing/invoices/${invoiceId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: selectedPaymentId, amountToAllocate: parsedAmount }),
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json();
        return Promise.reject(errData.error || "L'affectation a échoué.");
      }
    });
  };

  const handleCreateAndAllocate = () => {
    const parsedAmount = parseFloat(newAmount);
     if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return Promise.reject();
    }
    // Step 1: Create the payment
    return fetch('/api/purchasing/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId, amount: parsedAmount, paymentDate: newPaymentDate, method: newMethod }),
    }).then(async (res) => {
      if (!res.ok) {
        const errData = await res.json();
        return Promise.reject(errData.error || "La création du paiement a échoué.");
      }
      const newPayment = await res.json();
      
      // Step 2: Allocate it if the checkbox is checked
      if (allocateNow) {
        const amountToAllocate = Math.min(parsedAmount, remainingDue);
        return fetch(`/api/purchasing/invoices/${invoiceId}/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: newPayment.id, amountToAllocate: amountToAllocate }),
        }).then(async (allocRes) => {
            if (!allocRes.ok) {
                const errData = await allocRes.json();
                // Even if allocation fails, the payment was created, so it's a partial success
                toast.error(`Paiement créé, mais l'affectation a échoué: ${errData.error}`);
                return Promise.reject();
            }
        });
      }
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const promise = activeTab === 'existing' ? handleAllocateExisting() : handleCreateAndAllocate();

    toast.promise(promise, {
      loading: 'Enregistrement en cours...',
      success: () => {
        onSuccess(); 
        onClose();   
        return 'Opération réussie !';
      },
      error: (err) => `Erreur : ${err || 'Une erreur est survenue.'}`,
    }).finally(() => {
      setLoading(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Payer la Facture</h2>
        <p className="text-lg mb-6">Solde dû : <span className="font-bold">{remainingDue.toFixed(2)} €</span></p>

        <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6">
                <button onClick={() => handleTabChange('existing')} disabled={availablePayments.length === 0} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'existing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} disabled:text-gray-300 disabled:cursor-not-allowed`}>
                    Paiement Existant
                </button>
                <button onClick={() => handleTabChange('new')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'new' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Nouveau Paiement
                </button>
            </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'existing' ? (
            <>
              <div className="p-4 border rounded-md bg-gray-50">
                  <label htmlFor="payment" className="block text-sm font-medium text-gray-700">Sélectionner un paiement disponible</label>
                  <select id="payment" value={selectedPaymentId} onChange={(e) => setSelectedPaymentId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="">-- Choisir un paiement --</option>
                    {availablePayments.map(p => ( <option key={p.id} value={p.id}>{`Paiement de ${p.amount.toFixed(2)}€ (${p.method}) du ${new Date(p.paymentDate).toLocaleDateString('fr-FR')} - Disponible: ${p.remainingAmount.toFixed(2)}€`}</option> ))}
                  </select>
              </div>
              {selectedPaymentId && (
                <div>
                  <label htmlFor="amountToApply" className="block text-sm font-medium text-gray-700">Montant à affecter</label>
                  <input id="amountToApply" type="number" step="0.01" min="0.01" value={amountToApply} onChange={(e) => setAmountToApply(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="newAmount" className="block text-sm font-medium text-gray-700">Montant (€) *</label>
                        <input id="newAmount" type="number" step="0.01" min="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="newPaymentDate" className="block text-sm font-medium text-gray-700">Date du paiement *</label>
                        <input id="newPaymentDate" type="date" value={newPaymentDate} onChange={(e) => setNewPaymentDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="newMethod" className="block text-sm font-medium text-gray-700">Méthode de paiement *</label>
                    <select id="newMethod" value={newMethod} onChange={(e) => setNewMethod(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                        <option value="TRANSFER">Virement Bancaire</option>
                        <option value="CARD">Carte de crédit</option>
                        <option value="CHECK">Chèque</option>
                        <option value="OTHER">Autre</option>
                    </select>
                </div>
                <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="allocateNow" name="allocateNow" type="checkbox" checked={allocateNow} onChange={(e) => setAllocateNow(e.target.checked)} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="allocateNow" className="font-medium text-gray-700">Affecter ce paiement à cette facture immédiatement</label>
                    </div>
                </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? 'En cours...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}