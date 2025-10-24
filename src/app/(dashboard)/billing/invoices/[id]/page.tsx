// src/app/(dashboard)/billing/invoices/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoiceDocument } from '@/components/pdf/InvoiceDocument';
import RecordPaymentModal from './RecordPaymentModal';
import { Trash2 } from 'lucide-react';
import { CURRENCY_LABEL } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import * as permissions from '@/lib/permissions';
import { Role } from '@prisma/client';

// --- INTERFACES ---
interface Allocation {
  id: string;
  amountAllocated: number;
}
interface PaymentAllocation extends Allocation {
  payment: { id: string; paymentDate: string; method: string; };
}
interface CreditNoteAllocation extends Allocation {
  creditNote: { id: string; createdAt: string; reason: string; };
}
interface InvoiceDetails {
  id: string;
  status: string;
  total: number;
  issueDate: string;
  dueDate: string;
  order: {
    id: string;
    company: { id: string; name: string; vat?: string | null };
    lines: Array<{
      id: string; quantity: number; unitPrice: number; totalPrice: number;
      productVariant: { unit: string; product: { name: string; sku: string }; };
    }>;
  };
  paymentAllocations: PaymentAllocation[];
  creditNoteAllocations: CreditNoteAllocation[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { user } = useAuth();
  const userRole = user?.role as Role;

  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchInvoiceDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) throw new Error('Facture non trouvée');
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setIsClient(true);
    fetchInvoiceDetails();
  }, [id, fetchInvoiceDetails]);

  const handleDetachAllocation = async (allocationId: string, type: 'payment' | 'credit_note') => {
    if (!window.confirm("Êtes-vous sûr de vouloir détacher cette allocation ?")) return;

    const url = type === 'payment'
      ? `/api/billing/payment-allocations/${allocationId}`
      : `/api/billing/credit-note-allocations/${allocationId}`;
      
    setIsProcessing(true);
    const promise = fetch(url, { method: 'DELETE' })
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
      
    toast.promise(promise, {
      loading: 'Détachement en cours...',
      success: () => { fetchInvoiceDetails(); return 'Allocation détachée !'; },
      error: (err) => `Erreur : ${err || 'Une erreur est survenue.'}`,
    }).finally(() => setIsProcessing(false));
  };


  if (loading) return <p className="p-8 text-center">Chargement de la facture...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;
  if (!invoice) return <p className="p-8 text-center">Facture non trouvée.</p>;

  const totalAllocated =
    (invoice.paymentAllocations?.reduce((sum, alloc) => sum + alloc.amountAllocated, 0) || 0) +
    (invoice.creditNoteAllocations?.reduce((sum, alloc) => sum + alloc.amountAllocated, 0) || 0);
  const remainingDue = invoice.total - totalAllocated;

  return (
    <>
      <main className="p-8 bg-gray-100 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <Link href="/billing/invoices" className="text-blue-600 hover:underline">&larr; Retour</Link>
            <div className="flex items-center space-x-4">
              {/* Visible only to authorized roles */}
              {userRole && permissions.canManagePayments(userRole) && remainingDue > 0.01 && (
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                  Enregistrer un Paiement
                </button>
              )}
              {isClient && (
                <PDFDownloadLink
                  document={<InvoiceDocument invoice={invoice} />}
                  fileName={`facture-${invoice.id.substring(0, 8)}.pdf`}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {({ loading: pdfLoading }) => pdfLoading ? '...' : 'Télécharger PDF'}
                </PDFDownloadLink>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <header className="flex justify-between items-start pb-4 border-b">
              <div>
                <h1 className="text-3xl font-bold">FACTURE</h1>
                <p className="text-gray-500 mt-1">N°: #{invoice.id.substring(0, 8).toUpperCase()}</p>
                <p className="font-semibold text-lg mt-2">{invoice.order.company.name}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{invoice.total.toFixed(2)} {CURRENCY_LABEL}</p>
                <div className={`mt-2 text-2xl font-bold ${invoice.status === 'PAID' ? 'text-green-600' : 'text-orange-500'}`}>
                  {invoice.status.replace('_', ' ')}
                </div>
              </div>
            </header>

            <section className="grid grid-cols-2 gap-8 my-6">
                <div>
                    <p><span className="font-semibold text-gray-600">Date:</span> {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</p>
                    <p><span className="font-semibold text-gray-600">Échéance:</span> {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right font-semibold">
                    <p><span className="font-normal text-gray-600">Payé:</span> <span className="text-green-600">{totalAllocated.toFixed(2)} {CURRENCY_LABEL}</span></p>
                    <p><span className="font-normal text-gray-600">Solde dû:</span> <span className="text-red-600">{remainingDue.toFixed(2)} {CURRENCY_LABEL}</span></p>
                </div>
            </section>

            <section className="my-8">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Articles Facturés</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Produit</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Qté</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">P.U.</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.order.lines.map(line => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">{line.productVariant.product.name}</td>
                        <td className="px-4 py-3 text-right">{line.quantity}</td>
                        <td className="px-4 py-3 text-right">{line.unitPrice.toFixed(2)} {CURRENCY_LABEL}</td>
                        <td className="px-4 py-3 text-right font-semibold">{line.totalPrice.toFixed(2)} {CURRENCY_LABEL}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {(invoice.paymentAllocations.length > 0 || invoice.creditNoteAllocations.length > 0) && (
              <section>
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Transactions Affectées</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Type/Raison</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Montant Affecté</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoice.paymentAllocations.map(alloc => (
                        <tr key={alloc.id}>
                          <td className="px-4 py-2">{new Date(alloc.payment.paymentDate).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-2">Paiement ({alloc.payment.method})</td>
                          <td className="px-4 py-2 text-right font-medium">{alloc.amountAllocated.toFixed(2)} {CURRENCY_LABEL}</td>
                          <td className="px-4 py-2 text-right">
                            {/* Visible only to authorized roles */}
                            {userRole && permissions.canManagePayments(userRole) && (
                              <button onClick={() => handleDetachAllocation(alloc.id, 'payment')} disabled={isProcessing} title="Détacher" className="text-red-500 hover:text-red-700 disabled:text-gray-400"><Trash2 className="h-4 w-4" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {invoice.creditNoteAllocations.map(alloc => (
                        <tr key={alloc.id}>
                            <td className="px-4 py-2">{new Date(alloc.creditNote.createdAt).toLocaleDateString('fr-FR')}</td>
                            <td className="px-4 py-2">Avoir ({alloc.creditNote.reason})</td>
                            <td className="px-4 py-2 text-right font-medium">{alloc.amountAllocated.toFixed(2)} {CURRENCY_LABEL}</td>
                            <td className="px-4 py-2 text-right">
                              {/* Visible only to authorized roles */}
                              {userRole && permissions.canManagePayments(userRole) && (
                                <button onClick={() => handleDetachAllocation(alloc.id, 'credit_note')} disabled={isProcessing} title="Détacher" className="text-red-500 hover:text-red-700 disabled:text-gray-400"><Trash2 className="h-4 w-4" /></button>
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

      <RecordPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchInvoiceDetails}
        invoiceId={invoice.id}
        companyId={invoice.order.company.id}
        remainingDue={remainingDue}
      />
    </>
  );
}