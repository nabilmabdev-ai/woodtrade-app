// src/app/(dashboard)/cash-registers/CashRegisterList.tsx

import Link from 'next/link';
// ✅ NOUVEAU : Importer le type pour la props 'register'
import { CashRegisterType } from '@prisma/client';

interface CashRegister {
  id: string;
  name: string;
  location: string | null;
  // ✅ NOUVEAU : Ajouter la propriété 'type' à l'interface
  type: CashRegisterType;
}

interface CashRegisterListProps {
  registers: CashRegister[];
}

// ✅ NOUVEAU : Un sous-composant pour afficher un badge de statut clair
const TypeBadge = ({ type }: { type: CashRegisterType }) => {
    const isSales = type === CashRegisterType.SALES;
    const styles = isSales
      ? 'bg-blue-100 text-blue-800'
      : 'bg-yellow-100 text-yellow-800';
    const text = isSales ? 'Ventes (POS)' : 'Dépenses';
  
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles}`}>
        {text}
      </span>
    );
};


export default function CashRegisterList({ registers }: CashRegisterListProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Liste des caisses existantes</h2>
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              {/* ✅ NOUVEAU : Ajout de la colonne "Type" */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emplacement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {registers.length > 0 ? (
              registers.map((register) => (
                <tr key={register.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{register.name}</td>
                  {/* ✅ NOUVEAU : Cellule affichant le badge de type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TypeBadge type={register.type} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{register.location || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/cash-registers/${register.id}`} className="text-indigo-600 hover:text-indigo-900">
                      Gérer
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                {/* ✅ MODIFIÉ : colSpan ajusté pour la nouvelle colonne */}
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Aucune caisse enregistrée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}