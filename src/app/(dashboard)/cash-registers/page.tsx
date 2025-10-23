// src/app/(dashboard)/cash-registers/page.tsx

"use client";

import { useState, useEffect, useCallback, Fragment } from 'react';
import toast from 'react-hot-toast';
import { Transition } from '@headlessui/react';
import { PlusCircle, X } from 'lucide-react';

import AddCashRegisterForm from './AddCashRegisterForm'; 
import CashRegisterList from './CashRegisterList';     
import OpenSessionModal from './[id]/components/OpenSessionModal';
import CloseSessionModal from './[id]/components/CloseSessionModal';
import { CashRegisterType } from '@prisma/client';

// --- INTERFACE (as per plan) ---
interface CashRegisterWithBalance {
  id: string;
  name: string;
  type: CashRegisterType;
  currentBalance: number;
  session?: {
    id: string;
    openingBalance: number;
    openedBy?: { name: string | null; email: string; };
    openedAt: string;
  } | null;
}

// --- DRAWER COMPONENT (as per plan) ---
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

  // --- ✅ NEW: State for modals and API submissions ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<CashRegisterWithBalance | null>(null);


  const fetchRegisters = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cash-registers');
      if (!response.ok) throw new Error('Network error');
      
      const { data }: { data: CashRegisterWithBalance[] } = await response.json();
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
  
  // --- ✅ MODIFIED: Placeholder handlers replaced with functional logic ---
  const handleOpenSessionModal = (registerId: string) => {
    const registerToOpen = registers.find(r => r.id === registerId);
    if (registerToOpen) {
        setSelectedRegister(registerToOpen);
        setIsOpenSessionModalOpen(true);
    }
  };
  
  const handleCloseSessionModal = (registerId: string) => {
    const registerToClose = registers.find(r => r.id === registerId);
    if (registerToClose) {
        setSelectedRegister(registerToClose);
        setIsCloseSessionModalOpen(true);
    }
  };

  const handleOpenSession = async (openingBalance: number) => {
    if (!selectedRegister) return;
    setIsSubmitting(true);
    const promise = fetch(`/api/cash-register-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashRegisterId: selectedRegister.id, openingBalance }),
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)));

    toast.promise(promise, {
        loading: 'Opening session...',
        success: () => { setIsOpenSessionModalOpen(false); fetchRegisters(); return 'Session opened!'; },
        error: (err) => `Error: ${err}`,
    }).finally(() => setIsSubmitting(false));
  };
  
  const handleCloseSession = async (payload: { closingBalance: number; createAdjustment: boolean }) => {
    if (!selectedRegister || !selectedRegister.session) return;
    setIsSubmitting(true);
     const promise = fetch(`/api/cash-register-sessions/${selectedRegister.session.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)));

    toast.promise(promise, {
        loading: 'Closing session...',
        success: () => { setIsCloseSessionModalOpen(false); fetchRegisters(); return 'Session closed!'; },
        error: (err) => `Error: ${err}`,
    }).finally(() => setIsSubmitting(false));
  };
  
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
            onOpenSession={handleOpenSessionModal}
            onCloseSession={handleCloseSessionModal}
          />
        )}
      </main>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Add New Register">
          <AddCashRegisterForm 
            onRegisterAdded={fetchRegisters}
            onClose={() => setIsDrawerOpen(false)}
          />
      </Drawer>

      {/* --- ✅ NEW: Modals are now included in the page render --- */}
      {selectedRegister && (
        <>
            <OpenSessionModal 
                isOpen={isOpenSessionModalOpen}
                onClose={() => setIsOpenSessionModalOpen(false)}
                onSubmit={handleOpenSession}
                isSubmitting={isSubmitting}
            />
            <CloseSessionModal 
                isOpen={isCloseSessionModalOpen}
                onClose={() => setIsCloseSessionModalOpen(false)}
                onSubmit={handleCloseSession}
                isSubmitting={isSubmitting}
                openingBalance={selectedRegister.session?.openingBalance || 0}
                systemRunningTotal={selectedRegister.currentBalance}
            />
        </>
      )}
    </>
  );
}