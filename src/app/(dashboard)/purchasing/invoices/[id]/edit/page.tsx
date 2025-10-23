// src/app/(dashboard)/purchasing/invoices/[id]/edit/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { SupplierInvoiceStatus } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

interface InvoiceEditData {
  supplier: { name: string };
  total: number;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string;
  status: SupplierInvoiceStatus;
}

export default function EditSupplierInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Form state
  const [invoice, setInvoice] = useState<InvoiceEditData | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/purchasing/invoices/${id}`);
        if (!response.ok) throw new Error('Impossible de charger les données de la facture.');
        
        const data: InvoiceEditData = await response.json();
        
        if (data.status === SupplierInvoiceStatus.PAID || data.status === SupplierInvoiceStatus.VOID) {
            toast.error(`Cette facture est déjà ${data.status} et ne peut pas être modifiée.`);
            router.push(`/purchasing/invoices/${id}`);
            return;
        }

        setInvoice(data);
        setInvoiceNumber(data.invoiceNumber || '');
        setInvoiceDate(new Date(data.invoiceDate).toISOString().split('T')[0]);
        setDueDate(new Date(data.dueDate).toISOString().split('T')[0]);

      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
        router.push('/purchasing/invoices');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!invoiceDate || !dueDate) {
      toast.error('Veuillez remplir les dates.');
      return;
    }

    setIsSubmitting(true);
    const promise = fetch(`/api/purchasing/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceNumber,
        invoiceDate,
        dueDate,
      }),
    }).then(response => {
      if (!response.ok) {
        return response.json().then(err => Promise.reject(err.error));
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Mise à jour de la facture...',
      success: () => {
        setTimeout(() => router.push(`/purchasing/invoices/${id}`), 1000);
        return 'Facture mise à jour avec succès !';
      },
      error: (err) => `Erreur : ${err}`,
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  if (loading) return <p className="p-8 text-center">Chargement du formulaire...</p>;
  if (!invoice) return <p className="p-8 text-center">Facture non trouvée.</p>;

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Modifier la Facture Fournisseur</h1>
        <Link href={`/purchasing/invoices/${id}`} className="text-sm text-blue-600 hover:underline">
          &larr; Annuler et retourner aux détails
        </Link>
      </div>

      <div className="max-w-2xl mx-auto p-8 border rounded-lg bg-white shadow-md">
        <div className="mb-6 p-4 bg-gray-50 rounded-md border">
            <div className="grid grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-500">Fournisseur</label>
                    <p className="text-lg font-semibold text-gray-800">{invoice.supplier.name}</p>
                </div>
                <div className="text-right">
                    <label className="block text-sm font-medium text-gray-500">Montant Total (Non modifiable)</label>
                    <p className="text-lg font-semibold text-gray-800">{invoice.total.toFixed(2)} {CURRENCY_LABEL}</p>
                </div>
            </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">N° de Facture Fournisseur</label>
            <input
              id="invoiceNumber"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700">Date de la facture *</label>
              <input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Date d&apos;échéance *</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer les Modifications'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}