// src/app/(dashboard)/returns/page.tsx
"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { Role } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- INTERFACES ---
interface FoundOrder {
  id: string;
  createdAt: string;
  grandTotal: number;
  company: { name: string };
  lines: OrderLine[];
  invoices: Array<{ id: string }>;
}

interface OrderLine {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  productVariant: {
    product: { name: string };
  };
}

interface ReturnCartItem {
  productVariantId: string;
  productName: string;
  maxQuantity: number;
  returnQuantity: number;
  unitPrice: number;
}

interface CashRegister {
    id: string;
    name: string;
}

interface ActiveSession {
    id: string;
    cashRegisterId: string;
}

type ReturnOutcomeOption = 'REFUND_CASH' | 'REFUND_CARD' | 'CREATE_CREDIT_NOTE';

// --- ✅ FIX APPLIED HERE ---
// Define the allowed roles using the imported 'Role' enum, not plain strings.
// This ensures type safety and resolves the TypeScript compilation error.
const ALLOWED_ROLES_FOR_CASH_REFUND: Role[] = [
    Role.CASHIER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.MANAGER,
];


export default function ReturnsPage() {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FoundOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<FoundOrder | null>(null);
  const [returnCart, setReturnCart] = useState<ReturnCartItem[]>([]);
  const [outcomeOption, setOutcomeOption] = useState<ReturnOutcomeOption>('CREATE_CREDIT_NOTE');
  
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>('');
  
  useEffect(() => {
    if (searchTerm.length < 4) {
      setSearchResults([]);
      return;
    }
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/orders/search?query=${searchTerm}`);
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        toast.error(`Erreur lors de la recherche: ${(error as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };
    const debounce = setTimeout(fetchOrders, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);
  
  useEffect(() => {
    const fetchRegistersAndSessions = async () => {
        try {
            const res = await fetch('/api/cash-registers');
            if (!res.ok) throw new Error("Impossible de charger les caisses.");
            const registers: CashRegister[] = await res.json();
            setCashRegisters(registers);
            
            const sessionPromises = registers.map(r => 
                fetch(`/api/cash-register-sessions?cashRegisterId=${r.id}`).then(res => res.json())
            );
            const sessions = (await Promise.all(sessionPromises)).filter(s => s !== null);
            setActiveSessions(sessions);
            
            if (sessions.length > 0) {
                setSelectedCashRegisterId(sessions[0].cashRegisterId);
            } else if (registers.length > 0) {
                setSelectedCashRegisterId(registers[0].id);
            }
        } catch(e) {
            toast.error((e as Error).message);
        }
    }
    fetchRegistersAndSessions();
  }, []);

  const handleSelectOrder = (order: FoundOrder) => {
    if (!order.invoices || order.invoices.length === 0) {
        toast.error("Cette commande n'a pas de facture associée et ne peut pas être retournée.");
        return;
    }
    setSelectedOrder(order);
    const cartItems: ReturnCartItem[] = order.lines.map(line => ({
      productVariantId: line.productVariantId,
      productName: line.productVariant.product.name,
      maxQuantity: line.quantity,
      returnQuantity: 0,
      unitPrice: line.unitPrice,
    }));
    setReturnCart(cartItems);
  };

  const handleQuantityChange = (variantId: string, newQuantity: number) => {
    setReturnCart(prevCart =>
      prevCart.map(item => {
        if (item.productVariantId === variantId) {
          const validatedQuantity = Math.max(0, Math.min(item.maxQuantity, newQuantity));
          return { ...item, returnQuantity: validatedQuantity };
        }
        return item;
      })
    );
  };

  const handleReset = () => {
    setSelectedOrder(null);
    setSearchTerm('');
    setSearchResults([]);
    setReturnCart([]);
  };

  const totalRefundAmount = returnCart.reduce((acc, item) => acc + item.returnQuantity * item.unitPrice, 0);

  // This comparison now works correctly because both sides of the '.includes()' are of the same type.
  const canRefundCash = user?.role && ALLOWED_ROLES_FOR_CASH_REFUND.includes(user.role);

  const handleProcessReturn = async () => {
    if (totalRefundAmount <= 0) {
      toast.error("Veuillez sélectionner au moins un article à retourner.");
      return;
    }
    if (!user || !selectedOrder) {
      toast.error("Données utilisateur ou commande manquantes.");
      return;
    }

    let outcomePayload;
    
    switch (outcomeOption) {
      case 'REFUND_CASH':
        const activeSessionForRegister = activeSessions.find(s => s.cashRegisterId === selectedCashRegisterId);
        if (!activeSessionForRegister) {
            toast.error("Aucune session active n'a été trouvée pour la caisse sélectionnée. Impossible de rembourser en espèces.");
            return;
        }
        outcomePayload = { 
          type: 'REFUND', 
          method: 'CASH',
          cashRegisterSessionId: activeSessionForRegister.id,
        };
        break;
      case 'REFUND_CARD':
        outcomePayload = { type: 'REFUND', method: 'CARD' };
        break;
      case 'CREATE_CREDIT_NOTE':
        outcomePayload = { type: 'CREDIT_NOTE' };
        break;
    }

    const returnData = {
      originalOrderId: selectedOrder.id,
      originalInvoiceId: selectedOrder.invoices[0].id,
      items: returnCart.filter(item => item.returnQuantity > 0).map(item => ({
          productVariantId: item.productVariantId,
          quantity: item.returnQuantity,
          unitPrice: item.unitPrice,
      })),
      processedByUserId: user.id, 
      outcome: outcomePayload,
    };

    const promise = fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnData),
    }).then(async (response) => {
      if (!response.ok) return Promise.reject((await response.json()).error);
      return response.json();
    });

    toast.promise(promise, {
      loading: 'Traitement du retour...',
      success: () => { handleReset(); return 'Retour traité avec succès !'; },
      error: (err) => `Erreur : ${err}`,
    });
  };

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Retours</h1>
      
      {!selectedOrder ? (
        <div className="max-w-xl mx-auto p-6 border rounded-lg bg-white shadow-sm">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Rechercher par ID de commande
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Entrez au moins 4 caractères de l'ID..."
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <div className="mt-4">
            {isLoading && <p>Recherche...</p>}
            <ul className="divide-y divide-gray-200">
              {searchResults.map(order => (
                <li key={order.id} onClick={() => handleSelectOrder(order)} className="p-3 hover:bg-blue-50 cursor-pointer">
                  <p className="font-semibold">{order.company.name} - {order.grandTotal.toFixed(2)} {CURRENCY_LABEL}</p>
                  <p className="text-sm text-gray-500">
                    ID: {order.id} | Date: {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-semibold">Retour pour la commande</h2>
                    <p className="text-gray-600">Client: {selectedOrder.company.name}</p>
                    <p className="text-sm text-gray-500">ID: {selectedOrder.id}</p>
                </div>
                <button onClick={handleReset} className="text-sm text-blue-600 hover:underline">
                    &larr; Changer de commande
                </button>
            </div>
          </div>
          <div className="p-6 border rounded-lg bg-white shadow-sm">
             <h3 className="text-xl font-semibold mb-4">Sélectionner les articles à retourner</h3>
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Q. Achetée</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Q. à Retourner</th>
                    </tr>
                </thead>
                <tbody>
                    {returnCart.map(item => (
                        <tr key={item.productVariantId}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.maxQuantity}</td>
                            <td className="px-4 py-3">
                                <input 
                                    type="number"
                                    value={item.returnQuantity}
                                    onChange={e => handleQuantityChange(item.productVariantId, parseInt(e.target.value, 10) || 0)}
                                    min="0"
                                    max={item.maxQuantity}
                                    className="w-24 p-1 border border-gray-300 rounded-md text-center mx-auto block"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
          <div className="p-6 border rounded-lg bg-white shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Finaliser le retour</h3>
            <div className="flex justify-between items-start">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action à effectuer</label>
                    <div className="space-y-2">
                        <label className="flex items-center"><input type="radio" name="outcome" value="CREATE_CREDIT_NOTE" checked={outcomeOption === 'CREATE_CREDIT_NOTE'} onChange={(e) => setOutcomeOption(e.target.value as ReturnOutcomeOption)} className="h-4 w-4" /> <span className="ml-2">Générer un avoir</span></label>
                        <label className="flex items-center"><input type="radio" name="outcome" value="REFUND_CARD" checked={outcomeOption === 'REFUND_CARD'} onChange={(e) => setOutcomeOption(e.target.value as ReturnOutcomeOption)} className="h-4 w-4" /> <span className="ml-2">Rembourser par Carte</span></label>
                        <label className={`flex items-center ${!canRefundCash ? 'text-gray-400 cursor-not-allowed' : ''}`}>
                            <input type="radio" name="outcome" value="REFUND_CASH" checked={outcomeOption === 'REFUND_CASH'} onChange={(e) => setOutcomeOption(e.target.value as ReturnOutcomeOption)} disabled={!canRefundCash} className="h-4 w-4" />
                            <span className="ml-2">Rembourser en Espèces</span>
                        </label>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-gray-600">Montant total du retour</p>
                    <p className="text-3xl font-bold">{totalRefundAmount.toFixed(2)} {CURRENCY_LABEL}</p>
                </div>
            </div>

            {outcomeOption === 'REFUND_CASH' && canRefundCash && (
                <div className="mt-4 pt-4 border-t">
                    <label htmlFor="cash-register" className="block text-sm font-medium text-gray-700">Sélectionner la caisse de remboursement</label>
                    <select id="cash-register" value={selectedCashRegisterId} onChange={e => setSelectedCashRegisterId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        {cashRegisters.map(r => (
                            <option key={r.id} value={r.id} disabled={!activeSessions.some(s => s.cashRegisterId === r.id)}>
                                {r.name} {!activeSessions.some(s => s.cashRegisterId === r.id) && '(Session fermée)'}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            
             <button
                onClick={handleProcessReturn}
                disabled={totalRefundAmount <= 0}
                className="w-full mt-6 px-6 py-3 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
                Confirmer le Retour
            </button>
          </div>
        </div>
      )}
    </main>
  );
}