// src/app/(dashboard)/cash-registers/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CashRegisterType, CashMovementType } from '@prisma/client';
import { Plus, ArrowRightLeft, Lock, Unlock } from 'lucide-react';

// --- COMPONENT IMPORTS ---
import OpenSessionModal from './components/OpenSessionModal';
import CloseSessionModal from './components/CloseSessionModal';
import MovementModal, { MovementSubmitPayload } from './components/MovementModal';
import TransferModal, { TransferSubmitPayload } from './components/TransferModal'; // <-- NEW IMPORT

// --- INTERFACES ---
interface RegisterDetails {
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

interface Movement {
    id: string;
    amount: number;
    type: CashMovementType;
    reason: string;
    createdAt: string;
    user: { name: string | null; email: string; };
}

interface RegisterOption {
    id: string;
    name: string;
}

// --- SUB-COMPONENTS (No changes here) ---

const SessionChip = ({ session }: { session?: RegisterDetails['session'] }) => {
  if (!session?.id) {
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Closed</span>;
  }
  return (
    <span 
      title={`Opened at ${new Date(session.openedAt).toLocaleString('fr-FR')}`} 
      className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
    >
      Open — {session.openedBy?.name || session.openedBy?.email}
    </span>
  );
};

const TypeBadge = ({ type }: { type: CashRegisterType }) => {
    const isSales = type === CashRegisterType.SALES;
    const styles = isSales ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';
    const text = isSales ? 'Register' : 'Expense Register';
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles}`}>{text}</span>;
};

const MovementItem = ({ movement }: { movement: Movement }) => {
    const isPositive = movement.amount >= 0;
    return (
        <li className="py-3 px-1 flex justify-between items-center">
            <div>
                <p className="font-medium text-sm text-gray-800">{movement.reason}</p>
                <p className="text-xs text-gray-500">
                    By {movement.user.name || movement.user.email} on {new Date(movement.createdAt).toLocaleDateString('fr-FR')}
                </p>
            </div>
            <span className={`font-bold text-base ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {movement.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
            </span>
        </li>
    );
};


// --- MAIN PAGE COMPONENT ---
export default function ManageRegisterPage() {
  const params = useParams();
  const cashRegisterId = params.id as string;

  const [register, setRegister] = useState<RegisterDetails | null>(null);
  const [allRegisters, setAllRegisters] = useState<RegisterOption[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddMovementModalOpen, setIsAddMovementModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!cashRegisterId) return;
    setLoading(true);
    setError(null);
    try {
      const [registerRes, movementsRes, allRegistersRes] = await Promise.all([
        fetch(`/api/cash-registers/${cashRegisterId}`),
        fetch(`/api/cash-registers/${cashRegisterId}/movements?limit=20`),
        fetch(`/api/cash-registers`) // <-- NEW: Fetch all registers for the transfer modal
      ]);

      if (!registerRes.ok) throw new Error('Register not found.');
      if (!movementsRes.ok) throw new Error('Could not load movements.');
      if (!allRegistersRes.ok) throw new Error('Could not load list of all registers.');
      
      const registerData = await registerRes.json();
      const movementsData = await movementsRes.json();
      const allRegistersData = await allRegistersRes.json();

      setRegister(registerData);
      setMovements(movementsData);
      setAllRegisters(allRegistersData);

    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [cashRegisterId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleOpenSession = async (openingBalance: number) => {
    setIsSubmitting(true);
    const promise = fetch(`/api/cash-registers/${cashRegisterId}/open-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance }),
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)));

    toast.promise(promise, {
        loading: 'Opening session...',
        success: () => { setIsOpenSessionModalOpen(false); fetchAllData(); return 'Session opened!'; },
        error: (err) => `Error: ${err}`,
    }).finally(() => setIsSubmitting(false));
  };
  
  const handleCloseSession = async (payload: { closingBalance: number; createAdjustment: boolean }) => {
    setIsSubmitting(true);
     const promise = fetch(`/api/cash-registers/${cashRegisterId}/close-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)));

    toast.promise(promise, {
        loading: 'Closing session...',
        success: () => { setIsCloseSessionModalOpen(false); fetchAllData(); return 'Session closed!'; },
        error: (err) => `Error: ${err}`,
    }).finally(() => setIsSubmitting(false));
  };

  const handleAddMovement = async (payload: MovementSubmitPayload) => {
    setIsSubmitting(true);
    const apiPayload = {
        amount: payload.amount, type: payload.type, reason: payload.reason,
        sessionId: (payload.applyToSession && register?.session?.id) ? register.session.id : undefined,
    };
    const promise = fetch(`/api/cash-registers/${cashRegisterId}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)));

    toast.promise(promise, {
        loading: 'Adding movement...',
        success: () => { setIsAddMovementModalOpen(false); fetchAllData(); return 'Movement added!'; },
        error: (err) => `Error: ${err}`,
    }).finally(() => setIsSubmitting(false));
  };
  
  // --- NEW: API Handler for Transferring Funds ---
  const handleTransfer = async (payload: TransferSubmitPayload) => {
    setIsSubmitting(true);
    const promise = fetch(`/api/cash-registers/${cashRegisterId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)));
    
    toast.promise(promise, {
        loading: 'Processing transfer...',
        success: () => { setIsTransferModalOpen(false); fetchAllData(); return 'Transfer successful!'; },
        error: (err) => `Error: ${err}`,
    }).finally(() => setIsSubmitting(false));
  };


  if (loading) return <p className="p-8 text-center">Loading register details...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Error: {error}</p>;
  if (!register) return null;

  const isSessionOpen = !!register.session?.id;
  const isExpenseRegister = register.type === CashRegisterType.EXPENSE;

  return (
    <>
      <main className="p-8 bg-gray-50 min-h-full">
        {/* Header and Summary (No changes here) */}
        <div className="mb-6"><Link href="/cash-registers" className="text-blue-600 hover:underline">&larr; Back to all registers</Link></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
                <div><h1 className="text-3xl font-bold text-gray-800">{register.name}</h1><div className="mt-2"><TypeBadge type={register.type} /></div></div>
                <div className="text-right"><p className="text-sm text-gray-500">Current Balance</p><p className="text-4xl font-extrabold text-gray-900">{register.currentBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</p>{!isExpenseRegister && (<div className="mt-2"><SessionChip session={register.session} /></div>)}</div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                <button onClick={() => setIsAddMovementModalOpen(true)} className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"><Plus className="h-5 w-5" /> Add Movement</button>
                <button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2 px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"><ArrowRightLeft className="h-5 w-5" /> Transfer</button>
                {!isExpenseRegister && (isSessionOpen ? (<button onClick={() => setIsCloseSessionModalOpen(true)} className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 ml-auto"><Lock className="h-5 w-5" /> Close Session</button>) : (<button onClick={() => setIsOpenSessionModalOpen(true)} className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 ml-auto"><Unlock className="h-5 w-5" /> Open Session</button>))}
            </div>
        </div>
        {/* Movements List (No changes here) */}
        <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Movements</h2><div className="flex items-center gap-2"><button className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">All</button></div></div>
            <ul className="divide-y divide-gray-200">{movements.length > 0 ? (movements.map(m => <MovementItem key={m.id} movement={m} />)) : (<p className="text-center text-gray-500 py-8">No movements recorded.</p>)}</ul>
            {movements.length > 19 && (<div className="mt-4 text-center"><button className="text-sm font-semibold text-blue-600 hover:underline">Load more</button></div>)}
        </div>
      </main>

      {/* --- RENDER ALL MODALS --- */}
      <OpenSessionModal isOpen={isOpenSessionModalOpen} onClose={() => setIsOpenSessionModalOpen(false)} onSubmit={handleOpenSession} isSubmitting={isSubmitting}/>
      <CloseSessionModal isOpen={isCloseSessionModalOpen} onClose={() => setIsCloseSessionModalOpen(false)} onSubmit={handleCloseSession} isSubmitting={isSubmitting} openingBalance={register.session?.openingBalance || 0} systemRunningTotal={register.currentBalance}/>
      <MovementModal isOpen={isAddMovementModalOpen} onClose={() => setIsAddMovementModalOpen(false)} onSubmit={handleAddMovement} isSubmitting={isSubmitting} isSessionActive={isSessionOpen}/>
      <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} onSubmit={handleTransfer} isSubmitting={isSubmitting} currentRegisterId={register.id} allRegisters={allRegisters} currentBalance={register.currentBalance} />
    </>
  );
}