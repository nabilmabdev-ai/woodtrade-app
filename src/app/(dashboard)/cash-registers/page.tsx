// src/app/(dashboard)/cash-registers/page.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import AddCashRegisterForm from './AddCashRegisterForm'; 
import CashRegisterList from './CashRegisterList';     
// ✅ NOUVEAU : Importer le type pour l'interface
import { CashRegisterType } from '@prisma/client';

// ✅ MODIFIÉ : L'interface inclut maintenant le type de caisse.
interface CashRegister {
  id: string;
  name: string;
  location: string | null;
  type: CashRegisterType;
}

export default function CashRegistersPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRegisters = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cash-registers');
      if (!response.ok) throw new Error('Erreur réseau');
      // Les données de l'API incluent maintenant le 'type', donc cela correspondra à la nouvelle interface.
      const data: CashRegister[] = await response.json();
      setRegisters(data);
    } catch (error) {
      const err = error as Error;
      toast.error(`Impossible de charger la liste des caisses: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegisters();
  }, [fetchRegisters]);

  // Aucune modification n'est nécessaire dans le JSX de ce composant.
  // Il passe simplement les données (qui contiennent maintenant le 'type')
  // aux sous-composants qui savent comment les gérer.
  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des Caisses</h1>
      </div>

      <AddCashRegisterForm onRegisterAdded={fetchRegisters} />
      
      {isLoading ? (
        <p>Chargement des caisses...</p>
      ) : (
        <CashRegisterList registers={registers} />
      )}
    </main>
  );
}