// src/app/(dashboard)/purchasing/invoices/new/page.tsx
"use client";

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import SearchableDropdown, { DropdownItem } from '@/components/SearchableDropdown';
import { Trash2 } from 'lucide-react';

// --- INTERFACES ---
interface ProductWithVariants { id: string; name: string; variants: Array<{ id: string; unit: string; }>; }
interface ProductVariantDropdownItem extends DropdownItem { unit: string; }
interface InvoiceLine { productVariantId: string; productName: string; quantity: number; unitPrice: number; }

function NewInvoiceForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [suppliers, setSuppliers] = useState<DropdownItem[]>([]);
    const [productVariants, setProductVariants] = useState<ProductVariantDropdownItem[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<DropdownItem | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [lines, setLines] = useState<InvoiceLine[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariantDropdownItem | null>(null);
    const [currentQuantity, setCurrentQuantity] = useState('1');
    const [currentUnitPrice, setCurrentUnitPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [suppliersRes, productsRes] = await Promise.all([ fetch('/api/suppliers'), fetch('/api/products') ]);
                if (!suppliersRes.ok || !productsRes.ok) throw new Error("Erreur de chargement des données initiales.");
                const suppliersData = await suppliersRes.json();
                const productsData: ProductWithVariants[] = await productsRes.json();
                setSuppliers(suppliersData);
                const variantsData: ProductVariantDropdownItem[] = productsData.flatMap(p => p.variants.map(v => ({ id: v.id, name: `${p.name} (${v.unit})`, unit: v.unit })));
                setProductVariants(variantsData);
                const supplierIdFromUrl = searchParams.get('supplierId');
                if (supplierIdFromUrl) {
                    const supplierFromUrl = suppliersData.find((s: DropdownItem) => s.id === supplierIdFromUrl);
                    if (supplierFromUrl) setSelectedSupplier(supplierFromUrl);
                }
            } catch (error) {
                const err = error as Error;
                toast.error(err.message);
            }
        };
        fetchData();
    }, [searchParams]);

    const handleVariantChange = (item: DropdownItem | null) => { setSelectedVariant(item as ProductVariantDropdownItem | null); };

    const handleAddLine = () => {
        const quantity = parseFloat(currentQuantity);
        const unitPrice = parseFloat(currentUnitPrice);
        if (!selectedVariant || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
          toast.error("Veuillez sélectionner un produit et entrer une quantité/prix valides.");
          return;
        }
        if (lines.some(line => line.productVariantId === selectedVariant.id)) {
            toast.error("Ce produit est déjà dans la liste.");
            return;
        }
        const newLine: InvoiceLine = { productVariantId: selectedVariant.id, productName: selectedVariant.name, quantity, unitPrice };
        setLines([...lines, newLine]);
        setSelectedVariant(null);
        setCurrentQuantity('1');
        setCurrentUnitPrice('');
    };

    const handleRemoveLine = (variantId: string) => { setLines(lines.filter(line => line.productVariantId !== variantId)); };

    const subtotal = lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedSupplier || !invoiceDate || !dueDate || lines.length === 0) {
            toast.error('Veuillez sélectionner un fournisseur, remplir les dates et ajouter au moins un produit.');
            return;
        }
        setIsSubmitting(true);
        const invoiceData = { supplierId: selectedSupplier.id, invoiceNumber, invoiceDate, dueDate, lines: lines.map(({ productVariantId, quantity, unitPrice }) => ({ productVariantId, quantity, unitPrice })) };
        const promise = fetch('/api/purchasing/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoiceData) })
            .then(response => {
                if (!response.ok) return response.json().then(err => Promise.reject(err.error));
                return response.json();
            });
        toast.promise(promise, {
          loading: 'Enregistrement de la facture...',
          success: (newInvoice) => {
            router.push(`/purchasing/invoices/${newInvoice.id}`);
            return 'Facture enregistrée avec succès !';
          },
          error: (err) => `Erreur : ${err}`,
        }).finally(() => setIsSubmitting(false));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="p-6 border rounded-lg bg-white shadow-sm">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Informations Générales</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
                  <SearchableDropdown items={suppliers} selected={selectedSupplier} onChange={setSelectedSupplier} placeholder="Rechercher un fournisseur..."/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">N° de Facture Fournisseur</label>
                    <input id="invoiceNumber" type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700">Date de la facture *</label>
                    <input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Date d&apos;échéance *</label>
                    <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border rounded-lg bg-white shadow-sm">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Lignes de la Facture</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
                        <SearchableDropdown items={productVariants} selected={selectedVariant} onChange={handleVariantChange} placeholder="Rechercher un produit..."/>
                    </div>
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantité *</label>
                        {/* --- CORRECTION : 'required' A ÉTÉ SUPPRIMÉ --- */}
                        <input id="quantity" type="number" step="any" value={currentQuantity} onChange={(e) => setCurrentQuantity(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">Prix d&apos;Achat (€) *</label>
                        {/* --- CORRECTION : 'required' A ÉTÉ SUPPRIMÉ --- */}
                        <input id="unitPrice" type="number" step="0.01" value={currentUnitPrice} onChange={(e) => setCurrentUnitPrice(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                </div>
                <div className="text-right mt-4">
                    <button type="button" onClick={handleAddLine} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Ajouter Ligne</button>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left">Produit</th><th className="px-6 py-3 text-right">Quantité</th><th className="px-6 py-3 text-right">P.U.</th><th className="px-6 py-3 text-right">Total</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                        {lines.map(line => (
                            <tr key={line.productVariantId}>
                                <td className="px-6 py-4">{line.productName}</td>
                                <td className="px-6 py-4 text-right">{line.quantity}</td>
                                <td className="px-6 py-4 text-right">{line.unitPrice.toFixed(2)} €</td>
                                <td className="px-6 py-4 text-right font-semibold">{(line.quantity * line.unitPrice).toFixed(2)} €</td>
                                <td className="px-6 py-4 text-right">
                                    <button type="button" onClick={() => handleRemoveLine(line.productVariantId)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50 font-bold">
                            <td colSpan={3} className="px-6 py-3 text-right">Total</td>
                            <td className="px-6 py-3 text-right">{subtotal.toFixed(2)} €</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-10">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <span className="text-gray-600">Total de la Facture:</span>
                        <span className="text-2xl font-bold ml-4">{subtotal.toFixed(2)} €</span>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-lg">
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer la facture'}
                    </button>
                </div>
            </div>
      </form>
    );
}

export default function NewSupplierInvoicePage() {
    return (
        <main className="p-8 pb-32">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Nouvelle Facture Fournisseur</h1>
                <Link href="/purchasing/invoices" className="text-sm text-blue-600 hover:underline">&larr; Annuler</Link>
            </div>
            <Suspense fallback={<p className="text-center p-8">Chargement du formulaire...</p>}>
                <NewInvoiceForm />
            </Suspense>
        </main>
    );
}