// src/app/(dashboard)/sales/orders/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  status: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  createdAt: string;
  company: { name: string; vat?: string | null };
  contact: { firstName: string; lastName: string; email?: string | null };
  lines: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
    productVariant: {
      unit: string;
      product: { name: string };
    };
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/orders/${id}`);
        if (!response.ok) {
          // --- ✅ CORRECTION APPLIQUÉE ICI ---
          // On lance un 'new Error' pour une gestion d'erreur standard et cohérente.
          throw new Error('Commande non trouvée ou erreur serveur');
        }
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        // Le bloc catch peut maintenant correctement traiter l'objet Error.
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, [id]);

  if (loading) return <p className="p-8">Chargement des détails de la commande...</p>;
  if (error) return <p className="p-8 text-red-500">Erreur: {error}</p>;
  if (!order) return <p className="p-8">Commande non trouvée.</p>;

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Commande #{order.id.substring(0, 8)}</h1>
            <p className="text-gray-500">
              Date: {new Date(order.createdAt).toLocaleDateString('fr-FR')} | Statut: <span className="font-semibold text-blue-600">{order.status}</span>
            </p>
          </div>
          <Link href="/sales/orders" className="text-blue-600 hover:underline">
            &larr; Retour à la liste
          </Link>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Client</h2>
          <p className="font-bold text-lg">{order.company.name}</p>
          <p className="text-gray-600">Contact: {order.contact.firstName} {order.contact.lastName}</p>
          {order.contact.email && <p className="text-gray-600">Email: {order.contact.email}</p>}
        </div>

        <div>
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Articles</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qté</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">P.U.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Remise</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{line.productVariant.product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{line.quantity} {line.productVariant.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{line.unitPrice.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-sm text-red-500 text-right">- {line.discount.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{line.totalPrice.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
            <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-semibold">{order.subtotal.toFixed(2)} €</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-600">Remise totale</span>
                    <span className="font-semibold text-red-500">- {order.discount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                    <span>Total à Payer</span>
                    <span>{order.grandTotal.toFixed(2)} €</span>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}