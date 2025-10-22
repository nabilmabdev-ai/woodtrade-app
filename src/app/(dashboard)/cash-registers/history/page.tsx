// src/app/(dashboard)/cash-registers/history/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// ✅ NOUVEAU: Importer le type pour l'interface
import { CashRegisterType } from '@prisma/client';

interface SessionHistory {
  id: string;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  // ✅ MODIFIÉ: L'objet cashRegister inclut maintenant le type
  cashRegister: { 
    name: string;
    type: CashRegisterType;
   };
  openedByUser: { name: string | null; email: string };
  closedByUser: { name: string | null; email: string } | null;
}

// Composant pour la cellule "Différence" (inchangé)
const DifferenceCell = ({ value }: { value: number | null }) => {
  if (value === null) {
    return <span className="text-gray-500">N/A</span>;
  }
  const formattedValue = value.toFixed(2);
  let colorClass = 'text-gray-800';
  if (value > 0.01) { // Tolérance pour les erreurs de virgule flottante
    colorClass = 'text-green-600';
  } else if (value < -0.01) {
    colorClass = 'text-red-600';
  }

  return (
    <span className={`font-bold ${colorClass}`}>
      {value > 0 ? `+${formattedValue}` : formattedValue} €
    </span>
  );
};

export default function SessionsHistoryPage() {
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/cash-register-sessions/history');
        if (!response.ok) {
          throw new Error('Erreur lors du chargement de l\'historique');
        }
        const data = await response.json();
        // On s'assure de ne montrer que les sessions de vente, même si l'API le fait déjà
        setHistory(data.filter((session: SessionHistory) => session.cashRegister.type === CashRegisterType.SALES));
      } catch (err) {
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);
  
  const handleRowClick = (sessionId: string) => {
    // Le lien vers le rapport de session détaillé reste valide
    router.push(`/cash-registers/history/${sessionId}`);
  };

  if (loading) return <p className="p-8 text-center">Chargement de l&apos;historique...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        {/* ✅ MODIFIÉ: Titre plus spécifique */}
        <h1 className="text-3xl font-bold">Historique des Sessions de Vente</h1>
        <Link href="/cash-registers" className="text-sm text-blue-600 hover:underline">
          &larr; Retour à la gestion des caisses
        </Link>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caisse / Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateurs (Ouvert/Fermé)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fonds Initial</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Attendu</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Compté</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Différence</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.length > 0 ? (
              history.map((session) => (
                <tr 
                  key={session.id} 
                  onClick={() => handleRowClick(session.id)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{session.cashRegister.name}</div>
                    <div className="text-sm text-gray-500">{session.closedAt ? new Date(session.closedAt).toLocaleDateString('fr-FR') : 'En cours'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Ouvert: {session.openedByUser.name || session.openedByUser.email}</div>
                    <div>Fermé: {session.closedByUser?.name || session.closedByUser?.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{session.openingBalance.toFixed(2)} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{session.expectedBalance?.toFixed(2) ?? 'N/A'} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{session.closingBalance?.toFixed(2) ?? 'N/A'} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <DifferenceCell value={session.difference} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucune session de vente fermée dans l&apos;historique.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}