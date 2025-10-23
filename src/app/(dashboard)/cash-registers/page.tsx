// src/app/(dashboard)/cash-registers/page.tsx

"use client";

import { useState, useEffect, useCallback, Fragment } from 'react';
import toast from 'react-hot-toast';
import { Transition } from '@headlessui/react';
import { PlusCircle, X } from 'lucide-react';

import AddCashRegisterForm from './AddCashRegisterForm'; 
import CashRegisterList from './CashRegisterList';     
import { CashRegisterType } from '@prisma/client';

// --- NEW INTERFACE ---
// Aligned with the new API expectation from the plan
interface CashRegisterWithBalance {
  id: string;
  name: string;
  type: CashRegisterType;
  currentBalance: number;
  session?: {
    id: string;
    openedBy?: { name: string | null; email: string; };
    openedAt: string;
  } | null;
}

// --- NEW COMPONENT ---
// A simple Drawer component to host the form, as per the plan
const Drawer = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    return (
        <Transition show={isOpen} as={Fragment}>
            <div className="fixed inset-0 z-40">
                {/* Overlay */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-black/30" onClick={onClose} />
                </Transition.Child>

                {/* Drawer Panel */}
                <Transition.Child
                    as={Fragment}
                    enter="transform transition ease-out duration-300"
                    enterFrom="translate-x-full"
                    enterTo="translate-x-0"
                    leave="transform transition ease-in duration-200"
                    leaveFrom="translate-x-0"
                    leaveTo="translate-x-full"
                >
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
                        <header className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-semibold">{title}</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                                <X className="h-6 w-6 text-gray-600" />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto">
                           {children}
                        </div>
                    </div>
                </Transition.Child>
            </div>
        </Transition>
    );
};


export default function CashRegistersPage() {
  const [registers, setRegisters] = useState<CashRegisterWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchRegisters = useCallback(async () => {
    setIsLoading(true);
    try {
      // This API endpoint is now expected to return the new data structure
      const response = await fetch('/api/cash-registers');
      if (!response.ok) throw new Error('Network error');
      const data: CashRegisterWithBalance[] = await response.json();
      setRegisters(data);
    } catch (error) {
      const err = error as Error;
      toast.error(`Could not load registers: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegisters();
  }, [fetchRegisters]);
  
  // --- PLACEHOLDER HANDLERS ---
  // These will be wired up to modals in subsequent steps.
  const handleOpenSession = (id: string) => { console.log(`TODO: Open session modal for ${id}`); toast.success("Placeholder: Open session modal.") };
  const handleCloseSession = (id: string) => { console.log(`TODO: Close session modal for ${id}`); toast.success("Placeholder: Close session modal.") };
  const handleAddMovement = (id: string) => { console.log(`TODO: Add movement modal for ${id}`); toast.success("Placeholder: Add movement modal.") };
  const handleTransfer = (id: string) => { console.log(`TODO: Transfer modal for ${id}`); toast.success("Placeholder: Transfer modal.") };

  return (
    <>
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Cash Registers</h1>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Add Register</span>
          </button>
        </div>
        
        {isLoading ? (
          <p className="py-10 text-center text-gray-500">Loading registers...</p>
        ) : (
          <CashRegisterList 
            registers={registers}
            onOpenSession={handleOpenSession}
            onCloseSession={handleCloseSession}
            onAddMovement={handleAddMovement}
            onTransfer={handleTransfer}
          />
        )}
      </main>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Add New Register">
          <AddCashRegisterForm 
            onRegisterAdded={fetchRegisters}
            onClose={() => setIsDrawerOpen(false)}
          />
      </Drawer>
    </>
  );
}