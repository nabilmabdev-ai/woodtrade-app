// src/app/(dashboard)/sales/orders/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderSummary {
  id: string;
  company: {
    name: string;
  };
  grandTotal: number;
  status: string;
  createdAt: string;
}

export default function OrdersListPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) {
          // CORRECTION MANUELLE ICI
          throw new Error('Erreur lors du chargement des commandes');
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <p className="p-8">Chargement des commandes...</p>;
  if (error) return <p className="p-8 text-red-500">{error}</p>;

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Commandes Clients</h1>
        <Link href="/sales/orders/new" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          + Nouvelle Commande
        </Link>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.company.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.grandTotal.toFixed(2)} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href={`/sales/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900">
                      Voir
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Aucune commande trouvée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}