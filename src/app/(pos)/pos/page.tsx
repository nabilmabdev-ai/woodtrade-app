// src/app/(pos)/pos/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { CashRegisterType } from '@prisma/client';

// --- Interfaces (Mise à jour de CashRegister) ---
interface Price { price: number; }
interface Variant { id: string; unit: string; prices: Price[]; }
interface ProductSearchResult { id: string; name: string; sku: string; variants: Variant[]; }
interface CartItem { variantId: string; productName: string; quantity: number; unitPrice: number; unit: string; discount: number; }
interface CustomerSearchResult { id: string; name: string; contacts: { id: string }[]; }
type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
interface CashRegister { 
  id: string; 
  name: string; 
  type: CashRegisterType; 
}
interface ActiveSession { id: string; }
interface SplitPayment { method: PaymentMethod; amount: number; }

// --- Icônes ---
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );
const TagIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM15 5v2a2 2 0 002 2h2a2 2 0 00-2-2h-2zm0 0V3a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2z" /></svg> );

export default function PosPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', vat: '', firstName: '', lastName: '', email: '', phone: '' });
  const [payments, setPayments] = useState<SplitPayment[]>([]);
  const [paymentInput, setPaymentInput] = useState('');

  const customerSearchRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const paymentButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'F2') { event.preventDefault(); productSearchRef.current?.focus(); } if (event.key === 'F4') { event.preventDefault(); customerSearchRef.current?.focus(); } if (event.key === 'F10') { event.preventDefault(); if (paymentButtonRef.current && !paymentButtonRef.current.disabled) { paymentButtonRef.current.click(); } } }; document.addEventListener('keydown', handleKeyDown); return () => { document.removeEventListener('keydown', handleKeyDown); }; }, []);

  useEffect(() => { 
    const fetchRegisters = async () => { 
      try { 
        const res = await fetch('/api/cash-registers'); 
        if (!res.ok) throw new Error("Impossible de charger les caisses.");
        const allRegisters: CashRegister[] = await res.json();
        const salesRegisters = allRegisters.filter(r => r.type === CashRegisterType.SALES);
        setCashRegisters(salesRegisters);
      } catch(e) { 
        toast.error((e as Error).message);
      } finally { 
        setInitialLoading(false); 
      } 
    }; 
    fetchRegisters(); 
  }, []);

  const handleSelectRegister = async (register: CashRegister) => { setSelectedRegister(register); setIsCheckingSession(true); try { const res = await fetch(`/api/cash-register-sessions?cashRegisterId=${register.id}`); const sessionData = await res.json(); setActiveSession(sessionData); if (sessionData) toast.success(`Session active sur "${register.name}".`); } catch { toast.error("Erreur de vérification de session."); setActiveSession(null); } finally { setIsCheckingSession(false); } };
  useEffect(() => { if (customerSearchTerm.length < 2) { setCustomerSearchResults([]); return; } const fetchCustomers = async () => { setIsSearchingCustomers(true); try { const response = await fetch(`/api/customers/search?query=${customerSearchTerm}`); setCustomerSearchResults(await response.json()); } catch { toast.error("Erreur recherche clients."); } finally { setIsSearchingCustomers(false); } }; const delayDebounceFn = setTimeout(fetchCustomers, 300); return () => clearTimeout(delayDebounceFn); }, [customerSearchTerm]);
  useEffect(() => { if (productSearchTerm.length < 2) { setProductSearchResults([]); return; } const fetchProducts = async () => { try { const response = await fetch(`/api/products/search?query=${productSearchTerm}`); setProductSearchResults(await response.json()); } catch { console.error("Erreur recherche produits:"); } }; const delayDebounceFn = setTimeout(fetchProducts, 300); return () => clearTimeout(delayDebounceFn); }, [productSearchTerm]);
  const handleAddToCart = (product: ProductSearchResult) => { const variant = product.variants[0]; if (!variant) return; const price = variant.prices[0]?.price || 0; const existingItem = cart.find(item => item.variantId === variant.id); if (existingItem) { handleUpdateQuantity(variant.id, existingItem.quantity + 1); } else { const newItem: CartItem = { variantId: variant.id, productName: product.name, quantity: 1, unitPrice: price, unit: variant.unit, discount: 0 }; setCart([...cart, newItem]); } };
  
  // ✅ CORRECTION APPLIQUÉE ICI 
  // La logique est renforcée pour s'assurer que la quantité est toujours un entier.
  const handleUpdateQuantity = (variantId: string, newQuantity: number) => {
    // Si la nouvelle quantité n'est pas un nombre (par ex. input vide), la traiter comme 0.
    const intQuantity = isNaN(newQuantity) ? 0 : Math.floor(newQuantity);

    if (intQuantity <= 0) {
      // Supprimer l'article si la quantité est de 0 ou moins.
      setCart(cart.filter(item => item.variantId !== variantId));
    } else {
      // Mettre à jour la quantité pour l'article concerné.
      setCart(cart.map(item =>
        item.variantId === variantId ? { ...item, quantity: intQuantity } : item
      ));
    }
  };

  const handleClearCart = () => { setCart([]); setPayments([]); };
  const handleSelectCustomer = (customer: CustomerSearchResult) => { if (!customer.contacts || customer.contacts.length === 0) { toast.error(`Le client "${customer.name}" n'a aucun contact.`); return; } setSelectedCustomer(customer); };
  const handleChangeCustomer = () => { setSelectedCustomer(null); setCustomerSearchTerm(''); setCustomerSearchResults([]); };
  const openDiscountModal = (item: CartItem) => { setEditingItem(item); setDiscountInput(item.discount > 0 ? item.discount.toString() : ''); setDiscountType('fixed'); setIsDiscountModalOpen(true); };
  const closeDiscountModal = () => { setIsDiscountModalOpen(false); setEditingItem(null); setDiscountInput(''); };
  const applyDiscount = () => { if (!editingItem) return; const value = parseFloat(discountInput); if (isNaN(value) || value < 0) { toast.error("Valeur de réduction invalide."); return; } const itemTotal = editingItem.unitPrice * editingItem.quantity; const discountAmount = discountType === 'fixed' ? value : itemTotal * (value / 100); if (discountAmount > itemTotal) { toast.error("La réduction ne peut pas être supérieure au prix."); return; } setCart(cart.map(item => item.variantId === editingItem.variantId ? { ...item, discount: discountAmount } : item )); closeDiscountModal(); };
  const handleNewCustomerChange = (e: ChangeEvent<HTMLInputElement>) => { setNewCustomerData({ ...newCustomerData, [e.target.name]: e.target.value }); };
  const handleCreateCustomer = async (e: FormEvent) => { e.preventDefault(); if (!newCustomerData.name || !newCustomerData.firstName || !newCustomerData.lastName) { toast.error("Nom entreprise, prénom et nom du contact sont requis."); return; } const promise = fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCustomerData), }).then(async (response) => { if (!response.ok) { const err = await response.json(); return Promise.reject(err.error); } return response.json(); }); toast.promise(promise, { loading: 'Création du client...', success: (newlyCreatedCustomer) => { setIsCreateCustomerModalOpen(false); handleSelectCustomer(newlyCreatedCustomer); setNewCustomerData({ name: '', vat: '', firstName: '', lastName: '', email: '', phone: '' }); return 'Client créé et sélectionné !'; }, error: (err) => `Erreur : ${err}`, }); };
  const subtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const totalDiscount = cart.reduce((total, item) => total + item.discount, 0);
  const grandTotal = subtotal - totalDiscount;
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const amountDue = grandTotal - totalPaid;
  const addPayment = (method: PaymentMethod) => { const amount = parseFloat(paymentInput); if (isNaN(amount) || amount <= 0) { toast.error("Veuillez entrer un montant valide."); return; } if (amount > amountDue + 0.001) { toast.error("Le paiement ne peut pas dépasser le montant restant dû."); return; } setPayments([...payments, { method, amount }]); setPaymentInput(''); };
  const removePayment = (index: number) => { setPayments(payments.filter((_, i) => i !== index)); };
  useEffect(() => { if (amountDue > 0) { setPaymentInput(amountDue.toFixed(2)); } else { setPaymentInput(''); } }, [amountDue]);
  const handlePayment = async () => { if (Math.abs(amountDue) > 0.001) { toast.error('Le montant payé ne correspond pas au total.'); return; } if (cart.length === 0 || !selectedCustomer || !user || !activeSession) { toast.error('Veuillez vérifier le panier, le client et la session.'); return; } setIsProcessingPayment(true); const saleData = { cart: cart.map(({ variantId, quantity, unitPrice, discount }) => ({ variantId, quantity, unitPrice, discount })), companyId: selectedCustomer.id, contactId: selectedCustomer.contacts[0].id, userId: user.id, payments, cashRegisterSessionId: activeSession.id, }; const promise = fetch('/api/pos/sale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saleData) }).then(async (response) => { const data = await response.json(); if (!response.ok) return Promise.reject(data.error); return data; }); toast.promise(promise, { loading: 'Finalisation...', success: (data) => { setCart([]); setPayments([]); setProductSearchTerm(''); setProductSearchResults([]); return `Vente #${data.order.id.substring(0,8)} finalisée !`; }, error: (err) => `Erreur: ${err}`, }).finally(() => setIsProcessingPayment(false)); };

  if (authLoading || initialLoading) {
    return <div className="min-h-screen bg-gray-800 flex items-center justify-center"><p className="text-white text-2xl">Chargement...</p></div>;
  }
  
  if (!selectedRegister) {
    return (
      <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-8">WoodTrade POS</h1>
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700 text-center">1. Choisir une caisse de Vente</h2>
          <div className="space-y-4">
            {cashRegisters.map(register => (
              <button key={register.id} onClick={() => handleSelectRegister(register)} className="w-full text-left p-4 border rounded-lg text-lg font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all">{register.name}</button>
            ))}
            {cashRegisters.length === 0 && (
                <p className="text-center text-gray-500 py-4">Aucune caisse de type &quot;Vente&quot; n&apos;a été configurée. Veuillez en ajouter une dans la section Administration.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isCheckingSession) {
    return <div className="min-h-screen bg-gray-800 flex items-center justify-center"><p className="text-white text-2xl">Vérification de la session...</p></div>;
  }
  
  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Session Requise</h1>
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-4 text-red-600">Aucune session ouverte !</h2>
          <p className="text-gray-600 mb-6">
            Pour commencer à vendre sur &quot;{selectedRegister.name}&quot;, une session doit être ouverte par un manager.
          </p>
          <Link href={`/cash-registers/${selectedRegister.id}`} className="block w-full text-center p-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Aller à la Gestion de Caisse
          </Link>
          <button onClick={() => setSelectedRegister(null)} className="mt-4 text-sm text-gray-500 hover:underline">
            Retour au choix de la caisse
          </button>
        </div>
      </div>
    );
  }
  
  if (!selectedCustomer) {
    return (
      <>
        <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center p-4">
          <h1 className="text-4xl font-bold text-white mb-4">WoodTrade POS</h1>
          <p className="text-lg text-green-300 mb-4">Caisse: {selectedRegister.name} (Session active)</p>
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">2. Sélectionner un client (F4)</h2>
            <div className="flex space-x-4 mb-4">
              <input ref={customerSearchRef} type="text" placeholder="Rechercher un client existant..." className="w-full p-4 border rounded-lg text-lg" value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} />
              <button onClick={() => setIsCreateCustomerModalOpen(true)} className="px-6 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap">+ Nouveau Client</button>
            </div>
            <div className="h-64 overflow-y-auto">{isSearchingCustomers && <p className="text-center text-gray-500">Recherche...</p>}{customerSearchResults.length > 0 && (<ul className="divide-y divide-gray-200">{customerSearchResults.map(customer => (<li key={customer.id} onClick={() => handleSelectCustomer(customer)} className="p-4 hover:bg-blue-50 cursor-pointer"><p className="font-semibold">{customer.name}</p></li>))}</ul>)}</div>
          </div>
        </div>
        {isCreateCustomerModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg"><h2 className="text-2xl font-bold mb-6">Créer un nouveau client</h2><form onSubmit={handleCreateCustomer} className="space-y-4"><fieldset className="p-4 border rounded-md"><legend className="text-lg font-semibold px-2">Entreprise</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm">Nom *</label><input type="text" name="name" value={newCustomerData.name} onChange={handleNewCustomerChange} required className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">N° TVA</label><input type="text" name="vat" value={newCustomerData.vat} onChange={handleNewCustomerChange} className="w-full p-2 border rounded-md"/></div></div></fieldset><fieldset className="p-4 border rounded-md"><legend className="text-lg font-semibold px-2">Contact Principal</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm">Prénom *</label><input type="text" name="firstName" value={newCustomerData.firstName} onChange={handleNewCustomerChange} required className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">Nom *</label><input type="text" name="lastName" value={newCustomerData.lastName} onChange={handleNewCustomerChange} required className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">Email</label><input type="email" name="email" value={newCustomerData.email} onChange={handleNewCustomerChange} className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">Téléphone</label><input type="text" name="phone" value={newCustomerData.phone} onChange={handleNewCustomerChange} className="w-full p-2 border rounded-md"/></div></div></fieldset><div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={() => setIsCreateCustomerModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button><button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Créer et Sélectionner</button></div></form></div></div>)}
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-100 font-sans">
        <div className="w-3/5 flex flex-col p-4">
          <header className="mb-4 flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-800">WoodTrade POS</h1><p className="text-sm text-gray-500">Caisse: {selectedRegister.name}</p></div><div className="text-right"><p className="font-semibold text-lg text-gray-700">{selectedCustomer.name}</p><button onClick={handleChangeCustomer} className="text-sm text-blue-600 hover:underline">(Changer de client)</button></div></header>
          <div className="mb-4"><label htmlFor="product-search" className="sr-only">Rechercher un produit (F2)</label><input id="product-search" ref={productSearchRef} type="text" placeholder="Rechercher un produit (F2)..." className="w-full p-4 border rounded-lg text-lg" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} /></div>
          <div className="flex-1 bg-white p-4 rounded-lg shadow-inner overflow-y-auto"><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{productSearchResults.map((product) => (<div key={product.id} onClick={() => handleAddToCart(product)} className="border rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50 hover:shadow-md transition-all"><h3 className="font-semibold h-12">{product.name}</h3><p className="text-gray-500 text-sm">{product.sku}</p><p className="text-lg font-bold mt-2">{(product.variants[0]?.prices[0]?.price || 0).toFixed(2)} €</p></div>))}</div></div>
        </div>
        
        <div className="w-2/5 flex flex-col bg-white p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Vente en cours</h2><button onClick={handleClearCart} className="text-sm text-red-500 hover:underline">Vider</button></div>
          <div className="flex-1 overflow-y-auto border-t border-b py-4 space-y-3">{cart.length === 0 ? (<p className="text-center text-gray-500">Le panier est vide.</p>) : (cart.map(item => (<div key={item.variantId} className="p-2 rounded-md hover:bg-gray-50"><div className="flex justify-between items-center"><div className="flex-grow pr-2"><p className="font-semibold leading-tight">{item.productName}</p><p className="text-sm text-gray-500">{item.quantity} x {item.unitPrice.toFixed(2)} €</p></div><div className="flex items-center space-x-2">
            
            {/* ✅ CORRECTION APPLIQUÉE ICI : Remplacement du span par un input */}
            <button onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300">-</button>
            <input
                type="number"
                value={item.quantity}
                onChange={(e) => handleUpdateQuantity(item.variantId, parseInt(e.target.value, 10))}
                onFocus={(e) => e.target.select()} // Bonus: sélectionne tout le texte pour une modification facile
                className="w-12 text-center font-semibold border rounded-md"
            />
            <button onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300">+</button>
            
            </div><div className="font-bold text-lg w-24 text-right">{(item.unitPrice * item.quantity).toFixed(2)} €</div><div className="flex items-center space-x-2 ml-2"><button onClick={() => openDiscountModal(item)} className="text-gray-400 hover:text-blue-500"><TagIcon /></button><button onClick={() => handleUpdateQuantity(item.variantId, 0)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button></div></div>{item.discount > 0 && (<div className="text-right text-sm text-red-600">- {item.discount.toFixed(2)} € (remise)</div>)}</div>)))}</div>
          <div className="mt-auto pt-6">
            <div className="space-y-2 mb-4 text-lg"><div className="flex justify-between"><span>Sous-total</span><span>{subtotal.toFixed(2)} €</span></div><div className="flex justify-between text-red-600"><span>Remise</span><span>- {totalDiscount.toFixed(2)} €</span></div><div className="flex justify-between items-center text-2xl font-bold border-t pt-2 mt-2"><span>TOTAL</span><span>{grandTotal.toFixed(2)} €</span></div></div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between font-bold text-xl mb-4"><span>Montant Restant</span><span className={amountDue > 0 ? 'text-red-600' : 'text-green-600'}>{amountDue.toFixed(2)} €</span></div>
              {payments.map((p, index) => (<div key={index} className="flex justify-between items-center bg-white p-2 rounded-md mb-2"><span className="font-semibold">{p.method}</span><span>{p.amount.toFixed(2)} €</span><button onClick={() => removePayment(index)} className="text-red-500 hover:text-red-700">X</button></div>))}
              {amountDue > 0.001 && (<div className="mt-4"><input type="number" value={paymentInput} onChange={(e) => setPaymentInput(e.target.value)} className="w-full p-3 border rounded-md text-xl text-right mb-2" /><div className="grid grid-cols-3 gap-2"><button onClick={() => addPayment('CASH')} className="p-3 bg-blue-100 text-blue-800 font-semibold rounded-md hover:bg-blue-200">Espèces</button><button onClick={() => addPayment('CARD')} className="p-3 bg-blue-100 text-blue-800 font-semibold rounded-md hover:bg-blue-200">Carte</button><button onClick={() => addPayment('TRANSFER')} className="p-3 bg-blue-100 text-blue-800 font-semibold rounded-md hover:bg-blue-200">Virement</button></div></div>)}
            </div>
            <button ref={paymentButtonRef} onClick={handlePayment} disabled={isProcessingPayment || cart.length === 0 || Math.abs(amountDue) > 0.001} className="w-full bg-green-500 text-white font-bold text-xl py-6 rounded-lg hover:bg-green-600 disabled:bg-gray-400 mt-4">
              FINALISER (F10)
            </button>
          </div>
        </div>
      </div>
      {isDiscountModalOpen && editingItem && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm"><h2 className="text-2xl font-bold mb-4">Appliquer une remise</h2><p className="mb-4 text-gray-600">{editingItem.productName}</p><div className="flex mb-4"><button onClick={() => setDiscountType('fixed')} className={`flex-1 p-2 text-center rounded-l-md ${discountType === 'fixed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>€</button><button onClick={() => setDiscountType('percent')} className={`flex-1 p-2 text-center rounded-r-md ${discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>%</button></div><input type="number" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder={`Valeur en ${discountType === 'fixed' ? '€' : '%'}`} className="w-full p-3 border border-gray-300 rounded-md text-lg" autoFocus /><div className="flex justify-end space-x-4 mt-6"><button onClick={closeDiscountModal} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button><button onClick={applyDiscount} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Appliquer</button></div></div></div>)}
      {isCreateCustomerModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg"><h2 className="text-2xl font-bold mb-6">Créer un nouveau client</h2><form onSubmit={handleCreateCustomer} className="space-y-4"><fieldset className="p-4 border rounded-md"><legend className="text-lg font-semibold px-2">Entreprise</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm">Nom *</label><input type="text" name="name" value={newCustomerData.name} onChange={handleNewCustomerChange} required className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">N° TVA</label><input type="text" name="vat" value={newCustomerData.vat} onChange={handleNewCustomerChange} className="w-full p-2 border rounded-md"/></div></div></fieldset><fieldset className="p-4 border rounded-md"><legend className="text-lg font-semibold px-2">Contact Principal</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm">Prénom *</label><input type="text" name="firstName" value={newCustomerData.firstName} onChange={handleNewCustomerChange} required className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">Nom *</label><input type="text" name="lastName" value={newCustomerData.lastName} onChange={handleNewCustomerChange} required className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">Email</label><input type="email" name="email" value={newCustomerData.email} onChange={handleNewCustomerChange} className="w-full p-2 border rounded-md"/></div><div><label className="block text-sm">Téléphone</label><input type="text" name="phone" value={newCustomerData.phone} onChange={handleNewCustomerChange} className="w-full p-2 border rounded-md"/></div></div></fieldset><div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={() => setIsCreateCustomerModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button><button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Créer et Sélectionner</button></div></form></div></div>)}
    </>
  );
}