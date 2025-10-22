// src/app/(dashboard)/suppliers/[id]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
// --- LES IMPORTATIONS SONT MAINTENANT UTILISÉES ---
import { UserPlus, Edit, Trash2, PlusCircle, DollarSign } from 'lucide-react';

import SupplierInvoiceList from './SupplierInvoiceList';
import SupplierPaymentList from './SupplierPaymentList';

// --- Interfaces & Types (inchangées) ---
interface Contact { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; }
interface SupplierDetails { id: string; name: string; vat: string | null; category: string | null; contacts: Contact[]; }
type ContactFormData = Omit<Contact, 'id'>;
interface FinancialSummary { balance: number; overdueInvoiceCount: number; }
type SupplierTab = 'invoices' | 'payments' | 'details';

// --- UI Sub-Components (inchangés) ---
const StatCard = ({ title, value, colorClass = 'text-gray-900' }: { title: string, value: string, colorClass?: string }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
        <p className={`mt-1 text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const TabButton = ({ label, activeTab, tabName, setActiveTab }: { label: string; activeTab: SupplierTab; tabName: SupplierTab; setActiveTab: (tab: SupplierTab) => void; }) => (
    <button onClick={() => setActiveTab(tabName)} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === tabName ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
        {label}
    </button>
);

const QuickPaymentModal = ({ isOpen, onClose, onSuccess, supplierId, supplierName }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; supplierId: string; supplierName: string; }) => {
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('TRANSFER');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        const paymentData = { supplierId, amount: parseFloat(amount), paymentDate, method };
        const promise = fetch('/api/purchasing/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paymentData), })
            .then(async (response) => {
                if (!response.ok) return Promise.reject((await response.json()).error);
                return response.json();
            });
        toast.promise(promise, {
            loading: 'Enregistrement...',
            success: () => { onSuccess(); onClose(); return "Paiement enregistré."; },
            error: (err) => `Erreur : ${err}`,
        }).finally(() => setIsSubmitting(false));
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Enregistrer un Paiement</h2>
                <p className="text-gray-600 mb-6">Fournisseur: <span className="font-semibold">{supplierName}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Montant (€) *</label>
                            <input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Date du paiement *</label>
                            <input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="method" className="block text-sm font-medium text-gray-700">Méthode de paiement *</label>
                        <select id="method" value={method} onChange={(e) => setMethod(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                            <option value="TRANSFER">Virement Bancaire</option>
                            <option value="CARD">Carte de crédit</option>
                            <option value="CHECK">Chèque</option>
                            <option value="OTHER">Autre</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">{isSubmitting ? 'En cours...' : 'Enregistrer'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<SupplierDetails | null>(null);
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SupplierTab>('invoices');
  const [isQuickPayModalOpen, setIsQuickPayModalOpen] = useState(false);
  
  // --- LES VARIABLES SONT MAINTENANT UTILISÉES ---
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({ firstName: '', lastName: '', email: '', phone: '' });

  const fetchDetailsAndFinancials = useCallback(async () => {
    if (!supplierId) return;
    try {
      const [supplierRes, financialsRes] = await Promise.all([
        fetch(`/api/suppliers/${supplierId}`),
        fetch(`/api/suppliers/${supplierId}/balance`)
      ]);
      if (!supplierRes.ok) throw new Error('Fournisseur non trouvé');
      if (!financialsRes.ok) throw new Error('Impossible de charger les données financières');
      const supplierData = await supplierRes.json();
      const financialsData = await financialsRes.json();
      setSupplier(supplierData);
      setFinancials(financialsData);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => { setLoading(true); fetchDetailsAndFinancials(); }, [fetchDetailsAndFinancials]);

  // --- LES FONCTIONS SONT MAINTENANT UTILISÉES ---
  const handleOpenContactModal = (contact: Contact | null = null) => { setEditingContact(contact); setFormData(contact ? { firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone } : { firstName: '', lastName: '', email: '', phone: '' }); setIsContactModalOpen(true); };
  const handleCloseContactModal = () => { setIsContactModalOpen(false); setEditingContact(null); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleFormSubmit = async (event: FormEvent) => { event.preventDefault(); const url = editingContact ? `/api/suppliers/${supplierId}/contacts/${editingContact.id}` : `/api/suppliers/${supplierId}/contacts`; const method = editingContact ? 'PUT' : 'POST'; const promise = fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData), }).then(async response => { if (!response.ok) { const errData = await response.json(); return Promise.reject(errData.error); } return response.json(); }); toast.promise(promise, { loading: 'Enregistrement...', success: () => { fetchDetailsAndFinancials(); handleCloseContactModal(); return editingContact ? 'Contact mis à jour !' : 'Contact ajouté !'; }, error: (err) => `Erreur: ${err}`, }); };
  const handleDeleteContact = (contactId: string, contactName: string) => { if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le contact ${contactName} ?`)) return; const promise = fetch(`/api/suppliers/${supplierId}/contacts/${contactId}`, { method: 'DELETE', }).then(async response => { if (!response.ok) { const errData = await response.json(); return Promise.reject(errData.error); } }); toast.promise(promise, { loading: 'Suppression...', success: () => { fetchDetailsAndFinancials(); return 'Contact supprimé !'; }, error: (err) => `Erreur: ${err}`, }); };


  if (loading) return <p className="p-8 text-center text-gray-500">Chargement...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;
  if (!supplier || !financials) return <p className="p-8 text-center text-gray-500">Données introuvables.</p>;

  const balanceColor = financials.balance > 0 ? 'text-red-600' : (financials.balance < 0 ? 'text-green-600' : 'text-gray-900');
  const balanceLabel = financials.balance > 0 ? 'Solde Dû au fournisseur' : 'Avance/Crédit fournisseur';

  return (
    <>
      <main className="p-8">
        <div className="mb-6"><Link href="/suppliers" className="text-blue-600 hover:underline text-sm">&larr; Retour à la liste</Link></div>
        <header className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
            <p className="text-gray-500 mt-1">Catégorie: {supplier.category || 'N/A'}</p>
        </header>

        <div className="my-6 flex items-center space-x-4">
            <Link href={`/purchasing/invoices/new?supplierId=${supplier.id}&supplierName=${encodeURIComponent(supplier.name)}`} className="inline-flex items-center space-x-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusCircle className="h-5 w-5" />
                <span>Ajouter Facture</span>
            </Link>
            <button onClick={() => setIsQuickPayModalOpen(true)} className="inline-flex items-center space-x-2 px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <DollarSign className="h-5 w-5" />
                <span>Enregistrer Paiement</span>
            </button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard title={financials.balance === 0 ? "Solde" : balanceLabel} value={`${Math.abs(financials.balance).toFixed(2)} €`} colorClass={balanceColor} />
          <StatCard title="Factures en Retard" value={financials.overdueInvoiceCount.toString()} colorClass={financials.overdueInvoiceCount > 0 ? 'text-red-600' : 'text-gray-900'}/>
        </section>

        <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs"><TabButton label="Factures" activeTab={activeTab} tabName="invoices" setActiveTab={setActiveTab} /><TabButton label="Paiements" activeTab={activeTab} tabName="payments" setActiveTab={setActiveTab} /><TabButton label="Détails & Contacts" activeTab={activeTab} tabName="details" setActiveTab={setActiveTab} /></nav>
        </div>

        <div className="mt-8">
          {activeTab === 'invoices' && ( <SupplierInvoiceList supplierId={supplier.id} /> )}
          {activeTab === 'payments' && ( <SupplierPaymentList supplierId={supplier.id} /> )}
          {/* --- L'INTERFACE DE L'ONGLET DÉTAILS EST MAINTENANT COMPLÈTE --- */}
          {activeTab === 'details' && (
              <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
                  <section>
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Détails du fournisseur</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                          <p><span className="font-medium text-gray-500">N° TVA:</span> {supplier.vat || 'N/A'}</p>
                          <p><span className="font-medium text-gray-500">Catégorie:</span> {supplier.category || 'N/A'}</p>
                      </div>
                  </section>
                  <section>
                      <div className="flex justify-between items-center border-b pb-2 mb-4">
                          <h3 className="text-lg font-semibold text-gray-800">Contacts</h3>
                          <button onClick={() => handleOpenContactModal()} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                              <UserPlus className="h-4 w-4" /><span>Ajouter</span>
                          </button>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                  {supplier.contacts.map(c =>
                                      <tr key={c.id} className="hover:bg-gray-50">
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.email || 'N/A'}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.phone || 'N/A'}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-4">
                                              <button onClick={()=>handleOpenContactModal(c)} className="text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                                              <button onClick={()=>handleDeleteContact(c.id, `${c.firstName} ${c.lastName}`)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </section>
              </div>
          )}
        </div>
      </main>

      <QuickPaymentModal isOpen={isQuickPayModalOpen} onClose={() => setIsQuickPayModalOpen(false)} onSuccess={fetchDetailsAndFinancials} supplierId={supplier.id} supplierName={supplier.name} />

      {/* --- LE MODAL DE GESTION DES CONTACTS EST MAINTENANT ACTIF --- */}
      {isContactModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                    <h2 className="text-2xl font-bold mb-6">{editingContact ? 'Modifier le' : 'Ajouter un'} contact</h2>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm">Prénom *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                            <div><label className="block text-sm">Nom *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                            <div><label className="block text-sm">Email</label><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                            <div><label className="block text-sm">Téléphone</label><input type="text" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md border-gray-300"/></div>
                        </div>
                        <div className="flex justify-end space-x-4 pt-6">
                            <button type="button" onClick={handleCloseContactModal} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
                            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Enregistrer</button>
                        </div>
                    </form>
                </div>
            </div>
      )}
    </>
  );
}