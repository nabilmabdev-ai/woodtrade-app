// src/app/(dashboard)/customers/[id]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { UserPlus, Edit, Trash2, DollarSign, FileText } from 'lucide-react';

// --- Child Components for Tabs ---
import CustomerCreditNoteList from './CustomerCreditNoteList'; 
import CustomerInvoiceList from './CustomerInvoiceList';
import CustomerPaymentList from './CustomerPaymentList';

// --- Interfaces & Types ---
interface Contact { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; }
interface CompanyDetails { id: string; name: string; vat: string | null; category: string | null; contacts: Contact[]; }
type ContactFormData = Omit<Contact, 'id'>;
interface FinancialSummary { balance: number; availableCredit: number; overdueInvoiceCount: number; }
type CustomerTab = 'invoices' | 'payments' | 'credit_notes' | 'details';

// --- UI Sub-Components ---
const StatCard = ({ title, value, colorClass = 'text-gray-900' }: { title: string, value: string, colorClass?: string }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
        <p className={`mt-1 text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const TabButton = ({ label, activeTab, tabName, setActiveTab }: { label: string; activeTab: CustomerTab; tabName: CustomerTab; setActiveTab: (tab: CustomerTab) => void; }) => (
    <button onClick={() => setActiveTab(tabName)} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === tabName ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
        {label}
    </button>
);

const QuickActionModal = ({ isOpen, onClose, onSuccess, companyId, companyName }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; companyId: string; companyName: string; }) => {
    const [activeTab, setActiveTab] = useState<'payment' | 'credit_note'>('payment');
    
    // Payment State
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('TRANSFER');

    // Credit Note State
    const [creditAmount, setCreditAmount] = useState('');
    const [creditReason, setCreditReason] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePaymentSubmit = (event: FormEvent) => {
        event.preventDefault();
        const paymentData = { companyId, amount: parseFloat(amount), paymentDate, method };
        const promise = fetch('/api/billing/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paymentData) })
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));
        
        toast.promise(promise, {
            loading: 'Enregistrement...', success: () => { onSuccess(); onClose(); return "Paiement enregistré."; },
            error: (err) => `Erreur: ${err}`,
        }).finally(() => setIsSubmitting(false));
    };
    
    const handleCreditNoteSubmit = (event: FormEvent) => {
        event.preventDefault();
        const creditData = { amount: parseFloat(creditAmount), reason: creditReason };
        const promise = fetch(`/api/customers/${companyId}/credit-notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creditData) })
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err.error)));

        toast.promise(promise, {
            loading: 'Enregistrement...', success: () => { onSuccess(); onClose(); return "Avoir créé."; },
            error: (err) => `Erreur: ${err}`,
        }).finally(() => setIsSubmitting(false));
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Action Rapide pour {companyName}</h2>
                <div className="border-b border-gray-200 mb-4">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('payment')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'payment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Enregistrer un Paiement</button>
                        <button onClick={() => setActiveTab('credit_note')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'credit_note' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Créer un Avoir</button>
                    </nav>
                </div>
                {activeTab === 'payment' ? (
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        {/* Payment Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Montant (€) *</label>
                                <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date *</label>
                                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Méthode *</label>
                            <select value={method} onChange={(e) => setMethod(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                <option value="TRANSFER">Virement</option><option value="CARD">Carte</option><option value="CHECK">Chèque</option><option value="CASH">Espèces</option><option value="OTHER">Autre</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-4 pt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">Annuler</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white bg-blue-600 rounded-md">{isSubmitting ? '...' : 'Enregistrer Paiement'}</button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleCreditNoteSubmit} className="space-y-4">
                        {/* Credit Note Form Fields */}
                        <div>
                            {/* CORRECTION: 'l'avoir' remplacé par 'l&apos;avoir' */}
                            <label className="block text-sm font-medium text-gray-700">Montant de l&apos;avoir (€) *</label>
                            <input type="number" step="0.01" min="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} required autoFocus className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Raison *</label>
                            <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} required placeholder="Ex: Geste commercial, Avoir sur retour..." className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div className="flex justify-end space-x-4 pt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">Annuler</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white bg-blue-600 rounded-md">{isSubmitting ? '...' : 'Créer Avoir'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};


export default function CustomerDetailPage() {
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CustomerTab>('invoices');
  
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({ firstName: '', lastName: '', email: '', phone: '' });

  const fetchDetailsAndFinancials = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [companyRes, financialsRes] = await Promise.all([
        fetch(`/api/customers/${companyId}`),
        fetch(`/api/customers/${companyId}/balance`)
      ]);
      if (!companyRes.ok) throw new Error('Client non trouvé');
      if (!financialsRes.ok) throw new Error('Impossible de charger les données financières');
      const companyData = await companyRes.json();
      const financialsData = await financialsRes.json();
      setCompany(companyData);
      setFinancials(financialsData);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchDetailsAndFinancials(); }, [fetchDetailsAndFinancials]);
  
  const handleOpenContactModal = (contact: Contact | null = null) => { setEditingContact(contact); setFormData(contact ? { firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone } : { firstName: '', lastName: '', email: '', phone: '' }); setIsContactModalOpen(true); };
  const handleCloseContactModal = () => { setIsContactModalOpen(false); setEditingContact(null); };
  const handleContactFormSubmit = async (event: FormEvent) => { event.preventDefault(); const url = editingContact ? `/api/customers/${companyId}/contacts/${editingContact.id}` : `/api/customers/${companyId}/contacts`; const method = editingContact ? 'PUT' : 'POST'; const promise = fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData), }).then(async response => { if (!response.ok) { const errData = await response.json(); return Promise.reject(errData.error); } return response.json(); }); toast.promise(promise, { loading: 'Enregistrement...', success: () => { fetchDetailsAndFinancials(); handleCloseContactModal(); return editingContact ? 'Contact mis à jour !' : 'Contact ajouté !'; }, error: (err) => `Erreur: ${err}`, }); };
  const handleDeleteContact = (contactId: string, contactName: string) => { if (!window.confirm(`Supprimer le contact ${contactName} ?`)) return; const promise = fetch(`/api/customers/${companyId}/contacts/${contactId}`, { method: 'DELETE' }).then(async response => { if (!response.ok) { const errData = await response.json(); return Promise.reject(errData.error); } }); toast.promise(promise, { loading: 'Suppression...', success: () => { fetchDetailsAndFinancials(); return 'Contact supprimé !'; }, error: (err) => `Erreur: ${err}`, }); };

  if (loading) return <p className="p-8 text-center">Chargement...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;
  if (!company || !financials) return <p className="p-8 text-center">Données introuvables.</p>;
  
  const balanceColor = financials.balance > 0 ? 'text-red-600' : 'text-green-600';
  const balanceLabel = financials.balance > 0 ? 'Solde Dû par le client' : 'Avance/Crédit client';

  return (
    <>
      <main className="p-8">
        <div className="mb-6"><Link href="/customers" className="text-blue-600 hover:underline text-sm">&larr; Retour</Link></div>
        <header className="mb-4">
            <h1 className="text-3xl font-bold">{company.name}</h1>
            <p className="text-gray-500 mt-1">Catégorie: {company.category || 'N/A'}</p>
        </header>

        <div className="my-6 flex items-center space-x-4">
            <Link href={`/sales/orders/new?companyId=${company.id}`} className="inline-flex items-center space-x-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <FileText className="h-5 w-5" /><span>Nouvelle Commande</span>
            </Link>
            <button onClick={() => setIsQuickActionModalOpen(true)} className="inline-flex items-center space-x-2 px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <DollarSign className="h-5 w-5" /><span>Action Rapide</span>
            </button>
        </div>
        
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard title={financials.balance === 0 ? "Solde" : balanceLabel} value={`${Math.abs(financials.balance).toFixed(2)} €`} colorClass={balanceColor} />
            <StatCard title="Avoirs Disponibles" value={`${financials.availableCredit.toFixed(2)} €`} colorClass="text-blue-600" />
            <StatCard title="Factures en Retard" value={financials.overdueInvoiceCount.toString()} colorClass={financials.overdueInvoiceCount > 0 ? 'text-red-600' : 'text-gray-900'} />
        </section>

        <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8"><TabButton label="Factures" activeTab={activeTab} tabName="invoices" setActiveTab={setActiveTab} /><TabButton label="Paiements" activeTab={activeTab} tabName="payments" setActiveTab={setActiveTab} /><TabButton label="Avoirs" activeTab={activeTab} tabName="credit_notes" setActiveTab={setActiveTab} /><TabButton label="Détails & Contacts" activeTab={activeTab} tabName="details" setActiveTab={setActiveTab} /></nav>
        </div>
      
        <div className="mt-8">
            {activeTab === 'invoices' && <CustomerInvoiceList companyId={company.id} />}
            {activeTab === 'payments' && <CustomerPaymentList companyId={company.id} />}
            {activeTab === 'credit_notes' && <CustomerCreditNoteList companyId={company.id} />}
            {activeTab === 'details' && ( 
                <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Détails</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <p><span className="font-medium text-gray-500">N° TVA:</span> {company.vat || 'N/A'}</p>
                            <p><span className="font-medium text-gray-500">Catégorie:</span> {company.category || 'N/A'}</p>
                        </div>
                    </section>
                    <section>
                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                            <h3 className="text-lg font-semibold">Contacts</h3>
                            <button onClick={() => handleOpenContactModal()} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-white bg-green-600 rounded-md"><UserPlus className="h-4 w-4" /><span>Ajouter</span></button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {company.contacts.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{c.firstName} {c.lastName}</td><td className="px-6 py-4 text-sm text-gray-500">{c.email || 'N/A'}</td><td className="px-6 py-4 text-sm text-gray-500">{c.phone || 'N/A'}</td><td className="px-6 py-4 text-sm text-right space-x-4"><button onClick={()=>handleOpenContactModal(c)} className="text-blue-600"><Edit className="h-4 w-4" /></button><button onClick={()=>handleDeleteContact(c.id, `${c.firstName} ${c.lastName}`)} className="text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div> 
            )}
        </div>
        
        {isContactModalOpen && ( 
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                    <h2 className="text-2xl font-bold mb-6">{editingContact ? 'Modifier' : 'Ajouter'} un contact</h2>
                    <form onSubmit={handleContactFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm">Prénom *</label><input type="text" name="firstName" value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} required className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                            <div><label className="block text-sm">Nom *</label><input type="text" name="lastName" value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} required className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                            <div><label className="block text-sm">Email</label><input type="email" name="email" value={formData.email || ''} onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                            <div><label className="block text-sm">Téléphone</label><input type="text" name="phone" value={formData.phone || ''} onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                        </div>
                        <div className="flex justify-end space-x-4 pt-6">
                            <button type="button" onClick={handleCloseContactModal} className="px-4 py-2 bg-gray-100 rounded-md">Annuler</button>
                            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Enregistrer</button>
                        </div>
                    </form>
                </div>
            </div> 
        )}
        <QuickActionModal isOpen={isQuickActionModalOpen} onClose={() => setIsQuickActionModalOpen(false)} onSuccess={fetchDetailsAndFinancials} companyId={company.id} companyName={company.name} />
      </main>
    </>
  );
}