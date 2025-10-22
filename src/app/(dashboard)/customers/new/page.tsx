// src/app/(dashboard)/customers/new/page.tsx

"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewCustomerPage() {
  const router = useRouter();

  // State for both company and its primary contact
  const [name, setName] = useState('');
  const [vat, setVat] = useState('');
  const [category, setCategory] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const promise = fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, vat, category, firstName, lastName, email, phone }),
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json();
        return Promise.reject(errorData.error || 'Impossible de créer le client');
      }
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Ajout du client...',
      success: () => {
        // On successful creation, redirect the user back to the customer list
        router.push('/customers'); 
        router.refresh(); // Ensures the list is updated
        return 'Client ajouté avec succès !';
      },
      error: (err) => `Erreur: ${err}`,
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Nouveau Client</h1>
        <Link href="/customers" className="text-sm text-blue-600 hover:underline">
          &larr; Annuler et retourner à la liste
        </Link>
      </div>
      <div className="max-w-4xl mx-auto p-8 border rounded-lg bg-white shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Informations sur l&apos;entreprise</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom de l&apos;entreprise *</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
              </div>
              <div>
                <label htmlFor="vat" className="block text-sm font-medium text-gray-700">N° de TVA</label>
                <input id="vat" type="text" value={vat} onChange={(e) => setVat(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Catégorie</label>
                <input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Artisan, Particulier" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
              </div>
            </div>
          </fieldset>
          
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Contact Principal</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Prénom *</label>
                  <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
              </div>
              <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Nom *</label>
                  <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
              </div>
              <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
              </div>
              <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
                  <input id="phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
              </div>
            </div>
          </fieldset>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isSubmitting} className="px-6 py-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le Client'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}