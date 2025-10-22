// src/app/(dashboard)/customers/page.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link'; // Import Link for navigation
import CustomerList from './CustomerList';
import { PlusCircle } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Company {
  id: string;
  name: string;
  vat: string | null;
  category: string | null;
  contacts: Contact[];
}

export default function CustomersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // The state for form visibility is no longer needed
  // const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Impossible de charger les clients.');
      const data: Company[] = await response.json();
      setCompanies(data);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchCompanies();
  }, [fetchCompanies]);

  // The handler for adding a customer is removed as it will be on a separate page
  // const handleCustomerAdded = () => { ... };

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des Clients</h1>
        {/* This button is now a Link component to navigate to the new page */}
        <Link
          href="/customers/new"
          className="flex items-center space-x-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Nouveau Client</span>
        </Link>
      </div>
      
      {/* The form is no longer displayed on this page */}
      {/* {isFormVisible && <AddCustomerForm onCustomerAdded={handleCustomerAdded} />} */}

      <div className="mt-8">
        {isLoading ? (
          <p className="py-10 text-center text-gray-500">Chargement de la liste des clients...</p>
        ) : (
          <CustomerList companies={companies} />
        )}
      </div>
    </main>
  );
}