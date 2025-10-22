// src/app/(dashboard)/purchasing/invoices/[id]/ReceiveStockModal.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';

// --- INTERFACES ---
interface InvoiceLineForReception {
    id: string;
    quantity: number;
    receivedQuantity: number;
    productVariant: {
        product: {
            name: string;
        }
    }
}

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lineItem: InvoiceLineForReception | null;
}

export default function ReceiveStockModal({ isOpen, onClose, onSuccess, lineItem }: ReceiveStockModalProps) {
  const [quantityToReceive, setQuantityToReceive] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const remainingToReceive = lineItem ? lineItem.quantity - lineItem.receivedQuantity : 0;

  useEffect(() => {
    // Pré-remplit le champ avec la quantité restante à chaque ouverture
    if (lineItem) {
      setQuantityToReceive(remainingToReceive.toString());
    } else {
      setQuantityToReceive('');
      setLocation('');
    }
  }, [lineItem, remainingToReceive]);

  if (!isOpen || !lineItem) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedQuantity = parseFloat(quantityToReceive);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast.error("Veuillez entrer une quantité positive.");
      return;
    }
    if (parsedQuantity > remainingToReceive + 0.001) { // Tolérance pour les nombres à virgule
      toast.error(`La quantité ne peut pas dépasser la quantité restante (${remainingToReceive}).`);
      return;
    }

    setLoading(true);
    const promise = fetch(`/api/purchasing/invoices/lines/${lineItem.id}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantityToReceive: parsedQuantity,
        location: location || undefined,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json();
        return Promise.reject(errData.error || "La réception a échoué.");
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Enregistrement de la réception...',
      success: () => {
        onSuccess(); // Rafraîchit la page parente
        onClose();   // Ferme le modal
        return "Réception enregistrée, stock mis à jour."; // Microcopy
      },
      error: (err) => `Erreur : ${err}`,
    }).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-2">Réceptionner le Stock</h2>
        <p className="text-gray-600 mb-6">Produit : <span className="font-semibold">{lineItem.productVariant.product.name}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border rounded-md bg-gray-50">
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <div className="text-sm text-gray-500">Commandé</div>
                    <div className="text-2xl font-bold">{lineItem.quantity}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">Restant à recevoir</div>
                    <div className="text-2xl font-bold text-blue-600">{remainingToReceive}</div>
                </div>
            </div>
          </div>

          <div>
            <label htmlFor="quantityToReceive" className="block text-sm font-medium text-gray-700">Quantité à réceptionner *</label>
            <input
              id="quantityToReceive"
              type="number"
              step="any"
              min="0.01"
              max={remainingToReceive}
              value={quantityToReceive}
              onChange={(e) => setQuantityToReceive(e.target.value)}
              required
              autoFocus
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Emplacement de stockage (Optionnel)</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Allée A, Rack 3B"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? 'En cours...' : 'Confirmer la Réception'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}