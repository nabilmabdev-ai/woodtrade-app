// src/app/(dashboard)/cash-registers/AddCashRegisterForm.tsx

"use client";

import { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
// ✅ NOUVEAU : Importer le type depuis Prisma pour le champ de sélection
import { CashRegisterType } from '@prisma/client';

interface AddCashRegisterFormProps {
  onRegisterAdded: () => void;
}

export default function AddCashRegisterForm({ onRegisterAdded }: AddCashRegisterFormProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  // ✅ NOUVEAU : État pour gérer le type de caisse, avec 'SALES' par défaut.
  const [type, setType] = useState<CashRegisterType>(CashRegisterType.SALES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const promise = fetch('/api/cash-registers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // ✅ MODIFIÉ : On envoie le nouveau champ 'type' à l'API.
      body: JSON.stringify({ name, location, type }),
    }).then(async (response) => {
      if (response.ok) {
        setName('');
        setLocation('');
        setType(CashRegisterType.SALES); // Reset du formulaire
        onRegisterAdded();
        return 'Caisse ajoutée avec succès !';
      } else {
        const errorData = await response.json();
        return Promise.reject(errorData.error || 'Impossible de créer la caisse');
      }
    });

    toast.promise(promise, {
      loading: 'Ajout de la caisse...',
      success: (message) => message,
      error: (err) => `Erreur: ${err}`,
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    <div className="mb-8 p-6 border rounded-lg bg-gray-50">
      <h2 className="text-2xl font-semibold mb-4">Ajouter une nouvelle caisse</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Champ Nom (légèrement ajusté pour la grille) */}
          <div className="md:col-span-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom de la caisse (unique) *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Caisse Principale"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* ✅ NOUVEAU : Champ de sélection pour le Type */}
          <div className="md:col-span-1">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type de caisse *</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as CashRegisterType)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value={CashRegisterType.SALES}>Caisse de Ventes (POS)</option>
              <option value={CashRegisterType.EXPENSE}>Caisse de Dépenses</option>
            </select>
          </div>

          {/* Champ Emplacement */}
          <div className="md:col-span-1">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Emplacement (Optionnel)</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Comptoir d'accueil"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
          {isSubmitting ? 'Ajout en cours...' : 'Ajouter la caisse'}
        </button>
      </form>
    </div>
  );
}