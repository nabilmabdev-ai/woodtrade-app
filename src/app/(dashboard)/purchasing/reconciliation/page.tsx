// src/app/(dashboard)/purchasing/reconciliation/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown, { DropdownItem } from '@/components/SearchableDropdown';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
interface AvailablePayment {
  id: string;
  amount: number;
  remainingAmount: number;
  paymentDate: string;
  method: string;
}

interface UnpaidInvoice {
  id: string;
  invoiceNumber: string | null;
  dueDate: string;
  total: number;
  remainingDue: number;
}

export default function ReconciliationPage() {
  // --- STATE MANAGEMENT ---
  const [suppliers, setSuppliers] = useState<DropdownItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<DropdownItem | null>(null);
  const [payments, setPayments] = useState<AvailablePayment[]>([]);
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    // Fetch all suppliers for the dropdown
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers');
        if (!response.ok) throw new Error('Could not load suppliers.');
        setSuppliers(await response.json());
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    // Fetch payments and invoices when a supplier is selected
    if (selectedSupplier) {
      const fetchData = async () => {
        setIsLoading(true);
        setSelectedPaymentId(null);
        setSelectedInvoiceIds(new Set());
        try {
          const [paymentsRes, invoicesRes] = await Promise.all([
            fetch(`/api/suppliers/${selectedSupplier.id}/payments?status=available`),
            fetch(`/api/suppliers/${selectedSupplier.id}/invoices?status=unpaid`)
          ]);
          if (!paymentsRes.ok) throw new Error('Could not load payments.');
          if (!invoicesRes.ok) throw new Error('Could not load invoices.');
          setPayments(await paymentsRes.json());
          setInvoices(await invoicesRes.json());
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setPayments([]);
      setInvoices([]);
    }
  }, [selectedSupplier]);

  // --- EVENT HANDLERS ---
  const handleToggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const handleReconcile = async () => {
    if (!selectedPaymentId || selectedInvoiceIds.size === 0) {
      toast.error("Please select a payment and at least one invoice.");
      return;
    }
    
    setIsReconciling(true);
    const promise = fetch('/api/purchasing/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: selectedPaymentId,
        invoiceIds: Array.from(selectedInvoiceIds),
      }),
    }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));

    toast.promise(promise, {
      loading: 'Reconciliation in progress...',
      success: (data) => {
        // Refresh data on success
        if (selectedSupplier) {
          setSelectedSupplier(current => ({...current!})); // Trigger useEffect
        }
        return `Successfully allocated ${data.totalAllocated.toFixed(2)} ${CURRENCY_LABEL}.`;
      },
      error: (err) => `Error: ${err}`,
    }).finally(() => setIsReconciling(false));
  };
  
  // --- MEMOIZED CALCULATIONS ---
  const { totalSelectedInvoices, canReconcile } = useMemo(() => {
    const totalSelected = invoices
      .filter(inv => selectedInvoiceIds.has(inv.id))
      .reduce((sum, inv) => sum + inv.remainingDue, 0);
    
    const selectedPayment = payments.find(p => p.id === selectedPaymentId);
    const canProceed = selectedPaymentId && selectedInvoiceIds.size > 0 && selectedPayment && selectedPayment.remainingAmount > 0;

    return { totalSelectedInvoices: totalSelected, canReconcile: canProceed };
  }, [invoices, selectedInvoiceIds, payments, selectedPaymentId]);

  // --- RENDER ---
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Rapprochement des Paiements Fournisseurs</h1>
      <div className="max-w-xl mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-1">Sélectionner un Fournisseur</label>
        <SearchableDropdown
          items={suppliers}
          selected={selectedSupplier}
          onChange={setSelectedSupplier}
          placeholder="Rechercher un fournisseur..."
        />
      </div>

      {selectedSupplier && (
        isLoading ? <p>Loading data...</p> :
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PAYMENTS PANEL */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Paiements Disponibles</h2>
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} onClick={() => setSelectedPaymentId(p.id)}
                  className={`p-4 border rounded-lg cursor-pointer ${selectedPaymentId === p.id ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{p.method} - {new Date(p.paymentDate).toLocaleDateString()}</span>
                    <span className="text-lg font-bold">{p.remainingAmount.toFixed(2)} {CURRENCY_LABEL}</span>
                  </div>
                </div>
              ))}
              {payments.length === 0 && <p className="text-sm text-gray-500">Aucun paiement disponible.</p>}
            </div>
          </div>
          
          {/* INVOICES PANEL */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Factures Impayées</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {invoices.map(inv => (
                <div key={inv.id} className="p-3 border rounded-md flex items-center">
                  <input type="checkbox" checked={selectedInvoiceIds.has(inv.id)} onChange={() => handleToggleInvoice(inv.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <div className="ml-4 flex-grow">
                    <p className="font-medium">Facture #{inv.invoiceNumber || inv.id.substring(0, 8)}</p>
                    <p className="text-sm text-gray-500">Échéance: {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <p className="font-semibold">{inv.remainingDue.toFixed(2)} {CURRENCY_LABEL}</p>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-sm text-gray-500">Aucune facture impayée.</p>}
            </div>
          </div>

          {/* ACTION FOOTER */}
          <div className="lg:col-span-2 mt-4 p-4 bg-gray-100 rounded-lg flex justify-between items-center">
            <div>
              <span className="font-semibold">Total Factures Sélectionnées: </span>
              <span className="text-xl font-bold ml-2">{totalSelectedInvoices.toFixed(2)} {CURRENCY_LABEL}</span>
            </div>
            <button onClick={handleReconcile} disabled={!canReconcile || isReconciling}
              className="px-6 py-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {isReconciling ? 'Rapprochement...' : 'Rapprocher'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
