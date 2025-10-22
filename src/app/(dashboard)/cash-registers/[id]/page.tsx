// src/app/(dashboard)/cash-registers/[id]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { CashMovementType, CashRegisterType } from '@prisma/client';

// --- Interfaces ---
interface CashRegister { id: string; name: string; type: CashRegisterType; }
interface OpenSession { id: string; openingBalance: number; openedAt: string; openedByUser: { name: string | null; email: string; };}
interface CashMovement { id: string; amount: number; type: CashMovementType; reason: string; createdAt: string; user: { name: string | null; email: string; };}

// --- Modals ---
const CloseSessionModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean; onClose: () => void; onSubmit: (closingBalance: number) => void; }) => {
  const [closingBalance, setClosingBalance] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); const balance = parseFloat(closingBalance); if (isNaN(balance) || balance < 0) { toast.error("Veuillez entrer un montant valide."); return; } onSubmit(balance); };
  return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"> <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md"> <h2 className="text-2xl font-bold mb-6">Clôturer la session</h2> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="closingBalance" className="block text-sm font-medium text-gray-700"> Montant total compté en caisse (€) </label> <input id="closingBalance" type="number" step="0.01" min="0" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} required autoFocus className="mt-1 block w-full p-3 border border-gray-300 rounded-md text-lg" placeholder="Ex: 2350.55" /> <p className="text-xs text-gray-500 mt-1">Entrez le montant exact que vous avez compté dans le tiroir-caisse.</p> </div> <div className="flex justify-end space-x-4 pt-6"> <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200" > Annuler </button> <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700" > Confirmer la clôture </button> </div> </form> </div> </div> );
};
const WithdrawalModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean; onClose: () => void; onSubmit: (amount: number, reason: string) => void; }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    if (!isOpen) return null;
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); const parsedAmount = parseFloat(amount); if (isNaN(parsedAmount) || parsedAmount <= 0 || !reason) { toast.error("Veuillez entrer un montant et une raison valides."); return; } onSubmit(parsedAmount, reason); };
    return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"> <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md"> <h2 className="text-2xl font-bold mb-6">Effectuer un retrait d&apos;espèces</h2> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="withdrawalAmount" className="block text-sm font-medium text-gray-700">Montant du retrait (€)</label> <input id="withdrawalAmount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus className="mt-1 block w-full p-3 border border-gray-300 rounded-md" /> </div> <div> <label htmlFor="withdrawalReason" className="block text-sm font-medium text-gray-700">Motif du retrait (obligatoire)</label> <input id="withdrawalReason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Ex: Dépôt en banque, Avance fournisseur" className="mt-1 block w-full p-3 border border-gray-300 rounded-md" /> </div> <div className="flex justify-end space-x-4 pt-6"> <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button> <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Confirmer le Retrait</button> </div> </form> </div> </div> );
};
const TransferModal = ({ isOpen, onClose, onSubmit, allRegisters, currentRegisterId }: { isOpen: boolean; onClose: () => void; onSubmit: (amount: number, destinationRegisterId: string, reason: string) => void; allRegisters: CashRegister[]; currentRegisterId: string; }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [destinationId, setDestinationId] = useState('');
    const availableRegisters = allRegisters.filter(r => r.id !== currentRegisterId);
    useEffect(() => {
        if (availableRegisters.length > 0) { setDestinationId(availableRegisters[0].id); }
    }, [availableRegisters]);
    if (!isOpen) return null;
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); const parsedAmount = parseFloat(amount); if (isNaN(parsedAmount) || parsedAmount <= 0 || !reason || !destinationId) { toast.error("Veuillez remplir tous les champs correctement."); return; } onSubmit(parsedAmount, destinationId, reason); };
    return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"> <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md"> <h2 className="text-2xl font-bold mb-6">Transférer des fonds</h2> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label className="block text-sm font-medium text-gray-700">Caisse de destination</label> <select value={destinationId} onChange={e => setDestinationId(e.target.value)} required className="mt-1 block w-full p-3 border border-gray-300 rounded-md"> {availableRegisters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)} </select> {availableRegisters.length === 0 && <p className="text-xs text-gray-500 mt-1">Aucune autre caisse disponible pour un transfert.</p>} </div> <div> <label className="block text-sm font-medium text-gray-700">Montant à transférer (€)</label> <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 block w-full p-3 border border-gray-300 rounded-md" /> </div> <div> <label className="block text-sm font-medium text-gray-700">Motif du transfert</label> <input type="text" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Ex: Équilibrage des caisses" className="mt-1 block w-full p-3 border border-gray-300 rounded-md" /> </div> <div className="flex justify-end space-x-4 pt-6"> <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button> <button type="submit" disabled={availableRegisters.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">Confirmer le Transfert</button> </div> </form> </div> </div> );
};

const ExpenseRegisterView = ({ register }: { register: CashRegister }) => {
    const [movements, setMovements] = useState<CashMovement[]>([]);
    const [loadingMovements, setLoadingMovements] = useState(true);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<CashMovementType>(CashMovementType.PAY_OUT);
    const [reason, setReason] = useState('');

    const fetchMovements = useCallback(async () => {
        setLoadingMovements(true);
        try {
            const response = await fetch(`/api/cash-registers/${register.id}/movements`);
            if (!response.ok) throw new Error("Impossible de charger les mouvements.");
            setMovements(await response.json());
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setLoadingMovements(false);
        }
    }, [register.id]);

    useEffect(() => {
        fetchMovements();
    }, [fetchMovements]);

    const handleAddMovement = (e: FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0 || !reason) {
            toast.error("Veuillez saisir un montant et une raison valides.");
            return;
        }

        const promise = fetch(`/api/cash-registers/${register.id}/movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: parsedAmount, type, reason }),
        }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));

        toast.promise(promise, {
            loading: 'Enregistrement...',
            success: () => {
                setAmount('');
                setReason('');
                fetchMovements();
                return 'Mouvement enregistré !';
            },
            error: err => `Erreur: ${err}`,
        });
    };
    
    const balance = movements.reduce((acc, mov) => acc + mov.amount, 0);

    return (
        <div className="space-y-8">
            <div className="p-6 border rounded-lg bg-white shadow-sm">
                <h2 className="text-2xl font-semibold text-yellow-700 mb-4">Caisse de Dépenses</h2>
                <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="font-bold text-xl">Solde Actuel (Mois en cours)</p>
                    <p className={`text-3xl font-bold ${balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                        {balance.toFixed(2)} €
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Ce solde est calculé en continu. Pas de session à gérer.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-6 border rounded-lg bg-white shadow-sm">
                    <h3 className="text-xl font-semibold mb-4">Ajouter un Mouvement</h3>
                    <form onSubmit={handleAddMovement} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select value={type} onChange={e => setType(e.target.value as CashMovementType)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                <option value={CashMovementType.PAY_OUT}>Sortie (Dépense)</option>
                                <option value={CashMovementType.PAY_IN}>Entrée (Apport)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Montant (€)</label>
                            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Raison</label>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Ex: Achat fournitures, Remboursement frais..." className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            Enregistrer
                        </button>
                    </form>
                </div>
                 <div className="p-6 border rounded-lg bg-white shadow-sm">
                    <h3 className="text-xl font-semibold mb-4">Journal du Mois</h3>
                    {loadingMovements ? <p>Chargement...</p> : (
                        <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        {movements.length > 0 ? movements.map(m => (
                            <li key={m.id} className="py-3">
                            <div className="flex justify-between items-center">
                                <div>
                                <p className="font-medium text-sm">{m.reason}</p>
                                <p className="text-xs text-gray-500">Par {m.user.name || m.user.email} le {new Date(m.createdAt).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <span className={`font-bold text-base ${m.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.amount.toFixed(2)} €</span>
                            </div>
                            </li>
                        )) : <p className="text-sm text-gray-500 text-center py-4">Aucun mouvement ce mois-ci.</p>}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

const SalesRegisterView = ({ register, allRegisters, onDataChange }: { register: CashRegister, allRegisters: CashRegister[], onDataChange: () => void }) => {
    const { session: authSession } = useAuth();
    const [session, setSession] = useState<OpenSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [openingBalance, setOpeningBalance] = useState('');
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [movements, setMovements] = useState<CashMovement[]>([]);
    const [movementAmount, setMovementAmount] = useState('');
    const [movementType, setMovementType] = useState<CashMovementType>(CashMovementType.PAY_IN);
    const [movementReason, setMovementReason] = useState('');

    const fetchDataForSession = useCallback(async () => {
        setLoadingSession(true);
        try {
            const res = await fetch(`/api/cash-register-sessions?cashRegisterId=${register.id}`);
            if (!res.ok) throw new Error('Failed to fetch session data.');
            const sessionData = await res.json();
            setSession(sessionData);

            if (sessionData) {
                const movementsRes = await fetch(`/api/cash-register-sessions/${sessionData.id}/movements`);
                if (movementsRes.ok) setMovements(await movementsRes.json());
            } else {
                setMovements([]);
            }
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setLoadingSession(false);
        }
    }, [register.id]);

    useEffect(() => {
        fetchDataForSession();
    }, [fetchDataForSession]);

    const handleOpenSession = async (event: FormEvent) => {
        event.preventDefault();
        if (!authSession) { toast.error("Votre session est invalide, veuillez vous reconnecter."); return; }
        const balance = parseFloat(openingBalance);
        if (isNaN(balance) || balance < 0) { toast.error("Le fonds de caisse doit être un nombre positif."); return; }
        const requestBody = { cashRegisterId: register.id, openingBalance: balance };
        const promise = fetch('/api/cash-register-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) })
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
        toast.promise(promise, { loading: 'Ouverture...', success: () => { fetchDataForSession(); return 'Session ouverte !'; }, error: (err) => `Erreur: ${err}` });
    };

    const handleCloseSession = async (closingBalance: number) => {
        if (!authSession || !session) { toast.error("Session invalide."); return; }
        const promise = fetch(`/api/cash-register-sessions/${session.id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closingBalance }) })
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
        toast.promise(promise, {
            loading: 'Clôture en cours...',
            success: (closedSession) => {
                setIsCloseModalOpen(false);
                onDataChange(); // Refresh parent to get latest session status
                const difference = closedSession.difference.toFixed(2);
                if (Math.abs(closedSession.difference) < 0.01) toast.success(`Session fermée. La caisse est juste ! (${difference} €)`);
                else if (closedSession.difference > 0) toast.success(`Session fermée. Excédent de ${difference} €.`);
                else toast.error(`Session fermée. Manquant de ${difference} €.`);
                return 'Clôture terminée.';
            },
            error: (err) => `Erreur: ${err}`,
        });
    };

    const handleAddMovement = async (event: FormEvent) => {
        event.preventDefault();
        if (!authSession || !session) { toast.error("Aucune session active."); return; }
        const amount = parseFloat(movementAmount);
        if (isNaN(amount) || amount <= 0 || !movementReason) { toast.error("Veuillez entrer un montant et une raison valides."); return; }
        const promise = fetch(`/api/cash-register-sessions/${session.id}/movements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, type: movementType, reason: movementReason }) })
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
        toast.promise(promise, {
            loading: 'Enregistrement...',
            success: () => { setMovementAmount(''); setMovementReason(''); fetchDataForSession(); return 'Mouvement enregistré !'; },
            error: err => `Erreur: ${err}`
        });
    };

    const handleWithdrawal = async (amount: number, reason: string) => {
        if (!authSession || !session) { toast.error("Session invalide."); return; }
        const promise = fetch(`/api/cash-register-sessions/${session.id}/movements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, reason, type: CashMovementType.WITHDRAWAL }) })
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
        toast.promise(promise, {
            loading: 'Enregistrement...',
            success: () => { setIsWithdrawalModalOpen(false); fetchDataForSession(); return 'Retrait enregistré !'; },
            error: err => `Erreur: ${err}`
        });
    };
    
    const handleTransfer = async (amount: number, destinationRegisterId: string, reason: string) => {
        if (!authSession || !session) { toast.error("Session invalide."); return; }
        const promise = fetch(`/api/cash-registers/transfer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, reason, sourceSessionId: session.id, destinationRegisterId }) })
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
        toast.promise(promise, {
            loading: 'Transfert en cours...',
            success: () => { setIsTransferModalOpen(false); fetchDataForSession(); return 'Transfert effectué !'; },
            error: (err) => `Erreur: ${err}`
        });
    };

    if (loadingSession) return <p className="text-center p-8">Chargement de la session...</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                {session ? (
                    <div className="p-6 border rounded-lg bg-white shadow-sm">
                        <h2 className="text-2xl font-semibold text-green-600 mb-4">Session Active</h2>
                        <div className="space-y-3">
                            <p><strong>Ouverte par:</strong> {session.openedByUser.name || session.openedByUser.email}</p>
                            <p><strong>Date d&apos;ouverture:</strong> {new Date(session.openedAt).toLocaleString('fr-FR')}</p>
                            <p className="text-lg"><strong>Fonds de caisse initial:</strong> <span className="font-bold ml-2">{session.openingBalance.toFixed(2)} €</span></p>
                        </div>
                        <div className="mt-6 pt-6 border-t space-y-3">
                            <button onClick={() => setIsTransferModalOpen(true)} className="w-full px-6 py-2 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700">Effectuer un transfert</button>
                            <button onClick={() => setIsWithdrawalModalOpen(true)} className="w-full px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Effectuer un retrait (Dépôt banque...)</button>
                            <button onClick={() => setIsCloseModalOpen(true)} className="w-full px-6 py-3 font-bold text-white bg-red-600 rounded-md hover:bg-red-700">Fermer la Session</button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 border rounded-lg bg-gray-50 shadow-sm">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Ouvrir une nouvelle session</h2>
                        <form onSubmit={handleOpenSession} className="space-y-4">
                            <div>
                                <label htmlFor="openingBalance" className="block text-sm font-medium text-gray-700">Fonds de caisse initial (€)</label>
                                <input id="openingBalance" type="number" step="0.01" min="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} required autoFocus className="mt-1 block w-full p-3 border border-gray-300 rounded-md text-lg" placeholder="Ex: 150.00" />
                                <p className="text-xs text-gray-500 mt-1">Montant de départ dans le tiroir-caisse.</p>
                            </div>
                            <button type="submit" className="w-full px-6 py-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700">Ouvrir la Session</button>
                        </form>
                    </div>
                )}
            </div>
            {session && (
                <div className="space-y-6">
                    <div className="p-6 border rounded-lg bg-white shadow-sm">
                        <h3 className="text-xl font-semibold mb-4">Journal : Ajouter une Dépense / un Apport</h3>
                        <form onSubmit={handleAddMovement} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Type de mouvement</label>
                                <select value={movementType} onChange={e => setMovementType(e.target.value as CashMovementType)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    <option value={CashMovementType.PAY_IN}>Entrée d&apos;argent (Apport)</option>
                                    <option value={CashMovementType.PAY_OUT}>Sortie d&apos;argent (Dépense)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Montant (€)</label>
                                <input type="number" step="0.01" min="0" value={movementAmount} onChange={e => setMovementAmount(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Raison</label>
                                <input type="text" value={movementReason} onChange={e => setMovementReason(e.target.value)} required placeholder="Ex: Achat de fournitures, Ajout de monnaie" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <button type="submit" className="w-full px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Enregistrer le mouvement</button>
                        </form>
                    </div>
                    <div className="p-6 border rounded-lg bg-white shadow-sm">
                        <h3 className="text-xl font-semibold mb-4">Mouvements de la Session</h3>
                        <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {movements.length > 0 ? movements.map(m => (
                                <li key={m.id} className="py-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                    <p className="font-medium">{m.reason}</p>
                                    <p className="text-sm text-gray-500">Par {m.user.name || m.user.email} le {new Date(m.createdAt).toLocaleTimeString('fr-FR')}</p>
                                    </div>
                                    <span className={`font-bold text-lg ${m.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.amount.toFixed(2)} €</span>
                                </div>
                                </li>
                            )) : <p className="text-sm text-gray-500 text-center py-4">Aucun mouvement manuel pour cette session.</p>}
                        </ul>
                    </div>
                </div>
            )}
            <CloseSessionModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} onSubmit={handleCloseSession} />
            <WithdrawalModal isOpen={isWithdrawalModalOpen} onClose={() => setIsWithdrawalModalOpen(false)} onSubmit={handleWithdrawal} />
            <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} onSubmit={handleTransfer} allRegisters={allRegisters} currentRegisterId={register.id} />
        </div>
    );
};

export default function ManageSessionPage() {
  const params = useParams();
  const cashRegisterId = params.id as string;

  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [allCashRegisters, setAllCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!cashRegisterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cash-registers`);
      if (!res.ok) throw new Error('Impossible de charger les caisses.');
      const allRegistersData = await res.json();
      const currentRegisterData = allRegistersData.find((r: CashRegister) => r.id === cashRegisterId);
      if (!currentRegisterData) throw new Error('Caisse introuvable.');

      setAllCashRegisters(allRegistersData);
      setCashRegister(currentRegisterData);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [cashRegisterId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (loading) return <p className="p-8 text-center">Chargement de la caisse...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;
  if (!cashRegister) return null;

  return (
    <main className="p-8">
      <div className="mb-6">
        <Link href="/cash-registers" className="text-blue-600 hover:underline">&larr; Retour à la liste des caisses</Link>
      </div>
      <h1 className="text-3xl font-bold mb-8">
        Gestion de la Caisse: <span className="text-indigo-600">{cashRegister.name}</span>
      </h1>

      {cashRegister.type === CashRegisterType.SALES ? (
        <SalesRegisterView 
            register={cashRegister} 
            allRegisters={allCashRegisters} 
            onDataChange={fetchInitialData} 
        />
      ) : (
        <ExpenseRegisterView 
            register={cashRegister}
        />
      )}
    </main>
  );
}