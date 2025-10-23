// src/app/(dashboard)/billing/reconciliation/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown, { DropdownItem } from '@/components/SearchableDropdown';
import { CURRENCY_LABEL } from '@/lib/constants';
import { useAuth } from '@/src/app/auth/provider';
import * as permissions from '@/src/lib/permissions';
import { Role } from '@prisma/client';

// --- INTERFACES ---

// CORRECTION: Ajout de types pour les données brutes de l'API afin de supprimer 'any'
interface ApiPayment {
  id: string;
  amount: number;
  remainingAmount: number;
  method: string;
}

interface ApiCreditNote {
  id: string;
  remainingAmount: number;
  reason: string;
  status: string;
}

interface PaymentSource {
  id: string;
  type: 'PAYMENT' | 'CREDIT_NOTE';
  label: string;
  remainingAmount: number;
}
interface UnpaidInvoice {
  id: string;
  issueDate: string;
  dueDate: string;
  total: number;
  remainingDue: number;
}

export default function CustomerReconciliationPage() {
  const { user } = useAuth();
  const userRole = user?.role as Role;

  // --- STATE MANAGEMENT ---
  const [customers, setCustomers] = useState<DropdownItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<DropdownItem | null>(null);
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([]);
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) throw new Error('Could not load customers.');
        setCustomers(await response.json());
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      const fetchData = async () => {
        setIsLoading(true);
        setSelectedSource(null);
        setSelectedInvoiceIds(new Set());
        try {
          const [paymentsRes, creditNotesRes, invoicesRes] = await Promise.all([
            fetch(`/api/customers/${selectedCustomer.id}/payments?status=available`),
            fetch(`/api/customers/${selectedCustomer.id}/credit-notes`),
            fetch(`/api/customers/${selectedCustomer.id}/invoices`)
          ]);

          if (!paymentsRes.ok || !creditNotesRes.ok || !invoicesRes.ok) {
              throw new Error('Could not load customer financial data.');
          }
          
          // CORRECTION @typescript-eslint/no-explicit-any: Typage des données JSON
          const paymentsData: ApiPayment[] = await paymentsRes.json();
          const creditNotesData: ApiCreditNote[] = await creditNotesRes.json();
          const invoicesData: UnpaidInvoice[] = await invoicesRes.json();

          const paymentSources: PaymentSource[] = paymentsData
            .filter((p) => p.remainingAmount > 0.01)
            .map((p) => ({ id: p.id, type: 'PAYMENT', label: `Paiement de ${p.amount.toFixed(2)}${CURRENCY_LABEL} (${p.method})`, remainingAmount: p.remainingAmount }));
          
          const creditNoteSources: PaymentSource[] = creditNotesData
            .filter((cn) => cn.remainingAmount > 0.01 && cn.status !== 'FULLY_USED')
            .map((cn) => ({ id: cn.id, type: 'CREDIT_NOTE', label: `Avoir (${cn.reason})`, remainingAmount: cn.remainingAmount }));

          setSources([...paymentSources, ...creditNoteSources]);
          setInvoices(invoicesData.filter((inv) => inv.remainingDue > 0.01));

        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setSources([]);
      setInvoices([]);
    }
  }, [selectedCustomer]);

  // --- EVENT HANDLERS ---
  const handleToggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) newSet.delete(invoiceId);
      else newSet.add(invoiceId);
      return newSet;
    });
  };

  const handleReconcile = async () => {
    if (!selectedSource || selectedInvoiceIds.size === 0) {
      toast.error("Please select a source and at least one invoice.");
      return;
    }
    
    setIsReconciling(true);
    const promise = fetch('/api/billing/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: selectedSource.id,
        sourceType: selectedSource.type,
        invoiceIds: Array.from(selectedInvoiceIds),
      }),
    }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));

    toast.promise(promise, {
      loading: 'Reconciliation in progress...',
      success: (data) => {
        if (selectedCustomer) setSelectedCustomer(current => ({...current!}));
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
    
    const canProceed = selectedSource && selectedInvoiceIds.size > 0 && selectedSource.remainingAmount > 0;

    return { totalSelectedInvoices: totalSelected, canReconcile: canProceed };
  }, [invoices, selectedInvoiceIds, selectedSource]);

  // --- RENDER ---
  if (!userRole) {
    return <p className="p-8 text-center">Chargement...</p>;
  }

  // Visible only to authorized roles
  if (!permissions.canViewReconciliation(userRole)) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Accès non autorisé</h1>
        <p className="mt-2">Vous n'avez pas la permission de voir cette page.</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Rapprochement Client</h1>
      <div className="max-w-xl mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-1">Sélectionner un Client</label>
        <SearchableDropdown
          items={customers}
          selected={selectedCustomer}
          onChange={setSelectedCustomer}
          placeholder="Rechercher un client..."
        />
      </div>

      {selectedCustomer && (
        isLoading ? <p>Loading data...</p> :
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PAYMENTS & CREDIT NOTES PANEL */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Paiements & Avoirs Disponibles</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {sources.map(s => (
                <div key={s.id} onClick={() => setSelectedSource(s)}
                  className={`p-4 border rounded-lg cursor-pointer ${selectedSource?.id === s.id ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{s.label}</span>
                    <span className="text-lg font-bold">{s.remainingAmount.toFixed(2)} {CURRENCY_LABEL}</span>
                  </div>
                </div>
              ))}
              {sources.length === 0 && <p className="text-sm text-gray-500">Aucun paiement ou avoir disponible.</p>}
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
                    <p className="font-medium">Facture #{inv.id.substring(0,8)}</p>
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