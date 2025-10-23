// src/app/(dashboard)/inventory/adjust/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/src/app/auth/provider';
import * as permissions from '@/src/lib/permissions';
import { Role } from '@prisma/client';

// --- ✅ INTERFACES AJOUTÉES POUR LA SÉCURITÉ DE TYPE ---
// Interface pour les variantes de produit une fois aplaties pour la liste déroulante.
interface ProductVariant {
  id: string;
  unit: string;
  product: { name: string };
}

// Interface pour la structure des données reçues de l'API /api/products.
interface ProductWithVariants {
    id: string;
    name: string;
    variants: Array<{ id: string; unit: string; }>;
}

export default function AdjustInventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role as Role;

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error("Impossible de charger les produits");
        
        // ✅ CORRECTION : Les données sont maintenant fortement typées avec l'interface 'ProductWithVariants'.
        const productsData: ProductWithVariants[] = await res.json();
        
        const allVariants = productsData.flatMap((p) =>
          p.variants.length > 0
            ? p.variants.map((v) => ({ ...v, product: { name: p.name } }))
            : [{ id: p.id, product: { name: p.name }, unit: 'pièce' }] // Cas pour produits sans variante
        );
        setVariants(allVariants);
      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
      }
    };
    fetchVariants();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedVariantId || !quantity || parseFloat(quantity) === 0 || !reason) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    const promise = fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productVariantId: selectedVariantId,
        quantity: parseFloat(quantity),
        reason: reason,
      }),
    }).then(response => {
      if (!response.ok) {
        return response.json().then(err => Promise.reject(err.error));
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Ajustement en cours...',
      success: () => {
        setTimeout(() => router.push('/inventory'), 1500);
        return 'Stock mis à jour avec succès !';
      },
      error: (err) => `Erreur: ${err}`,
    });
  };

  if (!userRole) {
    return <p className="p-8 text-center">Chargement...</p>;
  }

  // Visible only to authorized roles
  if (!permissions.canManageWarehouse(userRole)) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Accès non autorisé</h1>
        <p className="mt-2">Vous n'avez pas la permission de voir cette page.</p>
        <Link href="/inventory" className="mt-4 inline-block text-blue-600 hover:underline">
          Retour à l'inventaire
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Ajustement de Stock</h1>

      <div className="max-w-xl mx-auto p-6 border rounded-lg bg-white shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="variant" className="block text-sm font-medium text-gray-700">Produit</label>
            <select
              id="variant"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="" disabled>-- Sélectionnez un produit --</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.product.name} ({v.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantité à ajouter (utilisez un nombre négatif pour retirer)
            </label>
            <input
              id="quantity"
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Raison de l&apos;ajustement</label>
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Ex: Réception fournisseur, Correction inventaire..."
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <Link href="/inventory" className="text-sm text-gray-600 hover:underline">
              Annuler
            </Link>
            <button
              type="submit"
              className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Confirmer l&apos;Ajustement
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}