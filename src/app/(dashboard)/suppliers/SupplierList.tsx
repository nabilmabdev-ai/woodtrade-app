// src/app/(dashboard)/suppliers/SupplierList.tsx

import Link from 'next/link';
// --- ✅ CORRECTION APPLIQUÉE ICI ---
// L'icône correcte est 'Building', et non 'Building2'.
import { ChevronRight, Building } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Supplier {
  id: string;
  name: string;
  vat: string | null;
  category: string | null;
  contacts: Contact[];
}

interface SupplierListProps {
  suppliers: Supplier[];
}

export default function SupplierList({ suppliers }: SupplierListProps) {
  return (
    <div className="bg-white border rounded-lg shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Principal</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                    <div className="text-sm text-gray-500">{supplier.vat || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.category || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supplier.contacts[0] ? `${supplier.contacts[0].firstName} ${supplier.contacts[0].lastName}` : 'Aucun contact'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/suppliers/${supplier.id}`} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Gérer
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
                <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center">
                            {/* The component now correctly references the imported 'Building' icon */}
                            <Building className="w-12 h-12 text-gray-300 mb-2" />
                            <h3 className="text-lg font-medium text-gray-800">Aucun fournisseur trouvé</h3>
                            <p className="mt-1">Commencez par ajouter un nouveau fournisseur.</p>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}