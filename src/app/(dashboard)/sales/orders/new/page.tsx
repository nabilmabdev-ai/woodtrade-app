// src/app/(dashboard)/sales/orders/new/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- ✅ INTERFACES AJOUTÉES POUR LA SÉCURITÉ DE TYPE ---
interface Company { id: string; name: string; }
interface ProductVariant { id: string; product: { name: string }; unit: string; }
interface OrderLine { productVariantId: string; productName: string; quantity: number; unitPrice: number; }
interface ProductWithVariants {
    id: string;
    name: string;
    variants: Array<{ id: string; unit: string; }>;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [currentLines, setCurrentLines] = useState<OrderLine[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, productsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products')
        ]);
        if (!companiesRes.ok || !productsRes.ok) throw new Error("Erreur de chargement des données");

        const companiesData: Company[] = await companiesRes.json();
        // ✅ CORRECTION : Les données des produits sont maintenant fortement typées.
        const productsData: ProductWithVariants[] = await productsRes.json();
        
        setCompanies(companiesData);
        const allVariants = productsData.flatMap((p) => 
          p.variants.length > 0 
            ? p.variants.map((v) => ({...v, product: {name: p.name}})) 
            // Cas pour les produits simples sans variantes définies
            : [{id: p.id, product: {name: p.name}, unit: 'pièce'}] 
        );
        setVariants(allVariants);
      } catch (error) {
        const err = error as Error;
        toast.error(err.message);
      }
    };
    fetchData();
  }, []);

  const handleAddLine = () => {
    if (!selectedVariantId || currentQuantity <= 0) {
      toast.error("Veuillez sélectionner un produit et une quantité valide.");
      return;
    }
    const variant = variants.find(v => v.id === selectedVariantId);
    if (!variant) return;

    const newLine: OrderLine = {
      productVariantId: variant.id,
      productName: `${variant.product.name} (${variant.unit})`,
      quantity: currentQuantity,
      unitPrice: 10, // PRIX FIXE POUR LE MOMENT (à remplacer par une logique de prix)
    };
    setCurrentLines([...currentLines, newLine]);
    setSelectedVariantId('');
    setCurrentQuantity(1);
  };

  const handleSubmitOrder = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedCompanyId || currentLines.length === 0) {
      toast.error("Veuillez sélectionner un client et ajouter au moins un produit.");
      return;
    }

    // TODO: Ces IDs devraient être dynamiques (basés sur l'utilisateur connecté, sélection de contact, etc.)
    const orderData = {
      companyId: selectedCompanyId,
      contactId: 'clxshma5w0004111122223333',
      userId: 'clxshm3z10000111122223333',
      lines: currentLines,
    };

    const promise = fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json();
        return Promise.reject(errorData.error);
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Enregistrement de la commande...',
      success: (newOrder) => {
        setTimeout(() => router.push(`/sales/orders/${newOrder.id}`), 1500);
        return 'Commande créée avec succès !';
      },
      error: (err) => `Erreur: ${err}`,
    });
  };

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Créer une nouvelle commande</h1>
      <form onSubmit={handleSubmitOrder} className="space-y-8">
        <div className="p-6 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">1. Choisir un client</h2>
          <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md">
            <option value="" disabled>-- Sélectionnez un client --</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="p-6 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">2. Ajouter des produits</h2>
          <div className="flex items-end space-x-4">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700">Produit</label>
              <select value={selectedVariantId} onChange={e => setSelectedVariantId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                <option value="" disabled>-- Sélectionnez un produit --</option>
                {variants.map(v => <option key={v.id} value={v.id}>{v.product.name} ({v.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantité</label>
              <input type="number" value={currentQuantity} onChange={e => setCurrentQuantity(Number(e.target.value))} min="1" className="w-24 p-2 border border-gray-300 rounded-md"/>
            </div>
            <button type="button" onClick={handleAddLine} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Ajouter</button>
          </div>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">3. Récapitulatif</h2>
          <div className="space-y-2">
            {currentLines.length > 0 ? (
              currentLines.map((line, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white rounded-md border">
                  <span>{line.productName}</span>
                  <span>{line.quantity} x {line.unitPrice.toFixed(2)} {CURRENCY_LABEL}</span>
                </div>
              ))
            ) : (<p className="text-gray-500">La commande est vide.</p>)}
          </div>
          <hr className="my-4"/>
          <div className="text-right font-bold text-lg">
            Total: {currentLines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0).toFixed(2)} {CURRENCY_LABEL}
          </div>
        </div>
        <button type="submit" className="w-full px-6 py-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 text-xl">
          Enregistrer la Commande
        </button>
      </form>
    </main>
  );
}
