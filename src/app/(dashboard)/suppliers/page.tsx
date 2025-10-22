// src/app/(dashboard)/suppliers/page.tsx

"use client";

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link'; // Import Link for navigation
import SupplierList from './SupplierList';
import { PlusCircle, Search } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Supplier {
  id: string;
  name: string;
  vat: string | null;
  category: string | null;
  contacts: Contact[];
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // The isFormVisible state is no longer needed
  // const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchSuppliers = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const url = query ? `/api/suppliers?q=${encodeURIComponent(query)}` : '/api/suppliers';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Impossible de charger les fournisseurs.');
      const data: Supplier[] = await response.json();
      setSuppliers(data);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchSuppliers]);

  // This handler is no longer needed on this page
  // const handleSupplierAdded = () => { ... };

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des Fournisseurs</h1>
        {/* This button is now a Link component for navigation */}
        <Link
          href="/suppliers/new"
          className="flex items-center space-x-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Nouveau Fournisseur</span>
        </Link>
      </div>
      
      {/* The AddSupplierForm component is no longer rendered here */}
      {/* {isFormVisible && <AddSupplierForm onSupplierAdded={handleSupplierAdded} />} */}

      <div className="my-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom de fournisseur ou de contact..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="py-10 text-center text-gray-500">Chargement...</p>
        ) : (
          <SupplierList suppliers={suppliers} />
        )}
      </div>
    </main>
  );
}