// src/app/(dashboard)/inventory/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/app/auth/provider';
import * as permissions from '@/src/lib/permissions';
import { Role } from '@prisma/client';

interface InventoryItem {
  id: string;
  quantity: number;
  location: string | null;
  lotNumber: string | null;
  productVariant: {
    id: string;
    unit: string;
    product: {
      name: string;
      sku: string;
    };
  };
}

export default function InventoryPage() {
  const { user } = useAuth();
  const userRole = user?.role as Role;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!userRole) {
    return <p className="p-8 text-center">Chargement...</p>;
  }

  // Visible only to authorized roles
  if (!permissions.canManageWarehouse(userRole)) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Accès non autorisé</h1>
        <p className="mt-2">Vous n'avez pas la permission de voir cette page.</p>
      </main>
    );
  }

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory');
        if (!response.ok) {
          // --- ✅ CORRECTION APPLIQUÉE ICI ---
          // On lance un 'new Error' pour une gestion d'erreur cohérente.
          throw new Error('Erreur réseau lors du chargement des stocks');
        }
        const data = await response.json();
        setInventory(data);
      } catch (err) {
        // Le bloc catch peut maintenant correctement traiter l'objet Error.
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  if (loading) return <p className="p-8 text-center">Chargement de l&apos;inventaire...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        {/* --- ✅ CORRECTION APPLIQUÉE ICI (apostrophe) --- */}
        <h1 className="text-3xl font-bold">Gestion de l&apos;Inventaire</h1>
        {/* Visible only to authorized roles */}
        {userRole && permissions.canManageWarehouse(userRole) && (
          <Link
            href="/inventory/adjust"
            className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            + Nouvel Ajustement
          </Link>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit (SKU)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité en stock</th>
              {/* --- ✅ CORRECTION APPLIQUÉE ICI (apostrophe) --- */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emplacement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° de Lot</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.length > 0 ? (
              inventory.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.productVariant.product.name}</div>
                    <div className="text-sm text-gray-500">{item.productVariant.product.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-semibold text-gray-800">{item.quantity}</span>
                    <span className="ml-2 text-sm text-gray-500">{item.productVariant.unit}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.lotNumber || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucun article en inventaire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}