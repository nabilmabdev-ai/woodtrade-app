// src/app/(dashboard)/products/AddProductForm.tsx

"use client";

import { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';

interface AddProductFormProps {
  onProductAdded: () => void;
}

export default function AddProductForm({ onProductAdded }: AddProductFormProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // --- LIGNES AJOUTÉES ---
  const [family, setFamily] = useState('');
  const [collection, setCollection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    const promise = fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // --- LIGNE MODIFIÉE ---
      body: JSON.stringify({ sku, name, description, family, collection }),
    }).then(async (response) => {
      if (response.ok) {
        setSku('');
        setName('');
        setDescription('');
        // --- LIGNES AJOUTÉES ---
        setFamily('');
        setCollection('');
        onProductAdded(); // Notify parent to refresh the product list
        return 'Produit ajouté avec succès !';
      } else {
        const errorData = await response.json();
        return Promise.reject(errorData.error || 'Impossible de créer le produit');
      }
    });

    toast.promise(promise, {
      loading: 'Ajout du produit...',
      success: (message) => message,
      error: (err) => `Erreur: ${err}`,
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    <div className="mb-8 p-6 border rounded-lg bg-gray-50">
      <h2 className="text-2xl font-semibold mb-4">Ajouter un nouveau produit</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700">SKU (Référence unique)</label>
            <input
              id="sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom du produit</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {/* --- BLOC AJOUTÉ --- */}
          <div>
            <label htmlFor="family" className="block text-sm font-medium text-gray-700">Famille (Optionnel)</label>
            <input
              id="family"
              type="text"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="Ex: Bois de Structure"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {/* --- BLOC AJOUTÉ --- */}
          <div>
            <label htmlFor="collection" className="block text-sm font-medium text-gray-700">Collection (Optionnel)</label>
            <input
              id="collection"
              type="text"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              placeholder="Ex: Classique, Extérieur"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optionnel)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
          {isSubmitting ? 'Ajout en cours...' : 'Ajouter le produit'}
        </button>
      </form>
    </div>
  );
}