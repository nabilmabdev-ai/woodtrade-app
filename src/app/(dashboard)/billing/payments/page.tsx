// src/app/(dashboard)/billing/payments/page.tsx
"use client";

import { useState, useEffect, useCallback, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { PaymentStatus, Role } from '@prisma/client';
import SearchableDropdown, { DropdownItem } from '@/components/SearchableDropdown';
import { CURRENCY_LABEL } from '@/lib/constants';
import { useAuth } from '@/src/app/auth/provider';
import * as permissions from '@/src/lib/permissions';

// --- INTERFACES ---
interface Payment {
  id: string;
  company: { name: string };
  amount: number;
  remainingAmount: number;
  paymentDate: string;
  method: string;
  status: PaymentStatus;
}

// --- SOUS-COMPOSANTS ---
const StatusBadge = ({ status }: { status: PaymentStatus }) => {
  const styles = {
    AVAILABLE: 'bg-green-100 text-green-800',
    PARTIALLY_ALLOCATED: 'bg-yellow-100 text-yellow-800',
    FULLY_ALLOCATED: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const userRole = user?.role as Role;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- FORM STATE ---
  const [selectedCustomer, setSelectedCustomer] = useState<DropdownItem | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('TRANSFER');

  const fetchPaymentsAndCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, customersRes] = await Promise.all([
        fetch('/api/billing/payments'),
        fetch('/api/customers')
      ]);
      if (!paymentsRes.ok) throw new Error("Impossible de charger les paiements.");
      if (!customersRes.ok) throw new Error("Impossible de charger les clients.");
      
      const paymentsData = await paymentsRes.json();
      const customersData = await customersRes.json();

      setPayments(paymentsData);
      setCustomers(customersData);

    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentsAndCustomers();
  }, [fetchPaymentsAndCustomers]);

  const resetForm = () => {
    setSelectedCustomer(null);
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setMethod('TRANSFER');
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCustomer || !amount || parseFloat(amount) <= 0) {
      toast.error("Veuillez sélectionner un client et entrer un montant valide.");
      return;
    }

    const paymentData = {
      companyId: selectedCustomer.id,
      amount: parseFloat(amount),
      paymentDate,
      method,
    };

    const promise = fetch('/api/billing/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json();
        return Promise.reject(errData.error);
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Enregistrement du paiement...',
      success: () => {
        fetchPaymentsAndCustomers();
        handleCloseModal();
        return 'Paiement enregistré avec succès !';
      },
      error: (err) => `Erreur : ${err}`,
    });
  };

  if (loading) return <p className="p-8 text-center">Chargement des paiements...</p>;

  return (
    <>
      <main className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Paiements Clients</h1>
          {/* Visible only to authorized roles */}
          {userRole && permissions.canManagePayments(userRole) && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              + Enregistrer un Paiement
            </button>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Disponible</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.company.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-800">{p.amount.toFixed(2)} {CURRENCY_LABEL}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">{p.remainingAmount.toFixed(2)} {CURRENCY_LABEL}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusBadge status={p.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">Aucun paiement enregistré.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6">Enregistrer un nouveau paiement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client *</label>
                <SearchableDropdown
                    items={customers}
                    selected={selectedCustomer}
                    onChange={setSelectedCustomer}
                    placeholder="Rechercher un client..."
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Montant ({CURRENCY_LABEL}) *</label>
                    <input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                 </div>
                 <div>
                    <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Date du paiement *</label>
                    <input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                 </div>
               </div>
               <div>
                  <label htmlFor="method" className="block text-sm font-medium text-gray-700">Méthode de paiement *</label>
                  <select id="method" value={method} onChange={(e) => setMethod(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="TRANSFER">Virement Bancaire</option>
                    <option value="CARD">Carte de crédit</option>
                    <option value="CASH">Espèces</option>
                    <option value="CHECK">Chèque</option>
                    <option value="OTHER">Autre</option>
                  </select>
               </div>
              <div className="flex justify-end space-x-4 pt-6">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}