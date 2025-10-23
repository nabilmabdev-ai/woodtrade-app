// src/app/(dashboard)/purchasing/invoices/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import RecordSupplierPaymentModal from './RecordSupplierPaymentModal';
import ReceiveStockModal from './ReceiveStockModal';
import { CURRENCY_LABEL } from '@/lib/constants';
import { SupplierInvoiceStatus } from '@prisma/client';
import { Trash2, Truck } from 'lucide-react';

// --- INTERFACES ---
interface InvoiceLineDetails {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQuantity: number;
    productVariant: {
        unit: string;
        product: { name: string; }
    }
}
interface Allocation {
  id: string;
  amountAllocated: number;
  payment: { id: string; paymentDate: string; method: string; }
}
interface SupplierInvoiceDetails {
  id: string;
  status: SupplierInvoiceStatus;
  total: number;
  invoiceDate: string;
  dueDate: string;
  supplier: { id: string; name: string; };
  allocations: Allocation[];
  lines: InvoiceLineDetails[];
}

// --- SUB-COMPONENTS ---
const StatusBadge = ({ status }: { status: SupplierInvoiceStatus }) => {
    const styles = {
      UNPAID: 'bg-red-100 text-red-800', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800', VOID: 'bg-gray-100 text-gray-800',
      DRAFT: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 inline-flex text-lg leading-6 font-semibold rounded-full ${styles[status]}`}>{status.replace('_', ' ')}</span>;
};

export default function SupplierInvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<SupplierInvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<InvoiceLineDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); 

  const fetchInvoiceDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/purchasing/invoices/${id}`);
      if (!response.ok) throw new Error('Facture fournisseur non trouvée');
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInvoiceDetails(); }, [fetchInvoiceDetails]);

  const handleVoidInvoice = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette facture ? Cette action est irréversible et détachera tous les paiements affectés.")) return;
    setIsProcessing(true);
    const promise = fetch(`/api/purchasing/invoices/${id}/void`, { method: 'POST' })
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
    toast.promise(promise, {
      loading: 'Annulation en cours...',
      success: () => { fetchInvoiceDetails(); return 'Facture annulée !'; },
      error: (err) => `Erreur : ${err}`,
    }).finally(() => setIsProcessing(false));
  };

  const handleDetachPayment = async (allocationId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir détacher ce paiement ?")) return;
    setIsProcessing(true);
    const promise = fetch(`/api/purchasing/allocations/${allocationId}`, { method: 'DELETE' })
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
    toast.promise(promise, {
      loading: 'Détachement...',
      success: () => { fetchInvoiceDetails(); return 'Paiement détaché !'; },
      error: (err) => `Erreur : ${err}`,
    }).finally(() => setIsProcessing(false));
  };

  const handleOpenReceiveModal = (line: InvoiceLineDetails) => {
    setSelectedLine(line);
    setIsReceiveModalOpen(true);
  };

  if (loading) return <p className="p-8 text-center">Chargement...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;
  if (!invoice) return <p className="p-8 text-center">Facture non trouvée.</p>;

  const totalAllocated = invoice.allocations?.reduce((sum, alloc) => sum + alloc.amountAllocated, 0) || 0;
  const remainingDue = invoice.total - totalAllocated;
  const isVoidable = invoice.status !== SupplierInvoiceStatus.VOID;
  const isEditable = isVoidable && invoice.status !== SupplierInvoiceStatus.PAID;
  const isPayable = isVoidable && remainingDue > 0.01;

  return (
    <>
      <main className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
              <Link href="/purchasing/invoices" className="text-blue-600 hover:underline">&larr; Retour</Link>
              <div className="flex items-center space-x-4">
                {isEditable && <Link href={`/purchasing/invoices/${id}/edit`} className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Modifier</Link>}
                {isPayable && <button onClick={() => setIsPayModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Payer</button>}
                {isVoidable && <button onClick={handleVoidInvoice} disabled={isProcessing} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400">{isProcessing ? '...' : 'Annuler'}</button>}
              </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <header className="flex justify-between items-start pb-4 border-b">
              <div>
                <h1 className="text-3xl font-bold">Facture Fournisseur</h1>
                <p className="text-gray-500 mt-1">N°: #{invoice.id.substring(0, 8).toUpperCase()}</p>
                <p className="font-semibold text-lg mt-2">{invoice.supplier.name}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Total</p>
                <p className="text-4xl font-bold">{invoice.total.toFixed(2)} {CURRENCY_LABEL}</p>
                <div className="mt-2"><StatusBadge status={invoice.status} /></div>
              </div>
            </header>
            
            <section className="grid grid-cols-2 gap-8 my-6">
              <div>
                  <p><span className="font-semibold text-gray-600">Date de la facture:</span> {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
                  <p><span className="font-semibold text-gray-600">Date d&apos;échéance:</span> {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right font-semibold">
                  <p><span className="font-normal text-gray-600">Montant payé:</span> <span className="text-green-600">{totalAllocated.toFixed(2)} {CURRENCY_LABEL}</span></p>
                  <p><span className="font-normal text-gray-600">Solde dû:</span> <span className="text-red-600">{remainingDue.toFixed(2)} {CURRENCY_LABEL}</span></p>
              </div>
            </section>

            <section className="my-8">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Détail des Produits</h3>
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Produit</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-600">Commandé</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-600">Reçu</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-600">Restant</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoice.lines.map(line => {
                                const remaining = line.quantity - line.receivedQuantity;
                                const isFullyReceived = remaining <= 0;
                                return (
                                <tr key={line.id} className={isFullyReceived ? 'bg-green-50' : ''}>
                                    <td className="px-4 py-3 font-medium">{line.productVariant.product.name}</td>
                                    <td className="px-4 py-3 text-right">{line.quantity}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{line.receivedQuantity}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${isFullyReceived ? 'text-green-600' : 'text-blue-600'}`}>{remaining}</td>
                                    <td className="px-4 py-3 text-right">
                                        {!isFullyReceived && isVoidable && (
                                            <button onClick={() => handleOpenReceiveModal(line)} className="flex items-center space-x-2 px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                                <Truck className="h-4 w-4" />
                                                <span>Réceptionner</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {invoice.allocations.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Paiements Affectés</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Date Paiement</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Méthode</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Montant Affecté</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoice.allocations.map(alloc => (
                        <tr key={alloc.id}>
                          <td className="px-4 py-2">{new Date(alloc.payment.paymentDate).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-2">{alloc.payment.method}</td>
                          <td className="px-4 py-2 text-right font-medium">{alloc.amountAllocated.toFixed(2)} {CURRENCY_LABEL}</td>
                          <td className="px-4 py-2 text-right">
                            {isVoidable && (
                                <button onClick={() => handleDetachPayment(alloc.id)} disabled={isProcessing} title="Détacher le paiement" className="text-red-500 hover:text-red-700 disabled:text-gray-400">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <RecordSupplierPaymentModal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} onSuccess={fetchInvoiceDetails} invoiceId={invoice.id} supplierId={invoice.supplier.id} remainingDue={remainingDue} />
      <ReceiveStockModal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} onSuccess={fetchInvoiceDetails} lineItem={selectedLine} />
    </>
  );
}