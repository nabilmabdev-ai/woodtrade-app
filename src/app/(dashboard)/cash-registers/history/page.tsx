// src/app/(dashboard)/cash-registers/history/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CashRegisterType } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';
import FilterBar from '@/components/FilterBar';

interface SessionHistory {
  id: string;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  cashRegister: { name: string; type: CashRegisterType; };
  openedByUser: { name: string | null; email: string };
  closedByUser: { name: string | null; email: string } | null;
}

// Sub-component for the "Difference" cell (unchanged)
const DifferenceCell = ({ value }: { value: number | null }) => {
  if (value === null) return <span className="text-gray-500">N/A</span>;
  const formattedValue = value.toFixed(2);
  let colorClass = 'text-gray-800';
  if (value > 0.01) colorClass = 'text-green-600';
  else if (value < -0.01) colorClass = 'text-red-600';
  return ( <span className={`font-bold ${colorClass}`}>{value > 0 ? `+${formattedValue}` : formattedValue} {CURRENCY_LABEL}</span> );
};

// --- PAGINATION COMPONENT ---
// ✅ FIX APPLIED HERE: Added totalItems, limit, and onLimitChange to the props.
const PaginationControls = ({ currentPage, totalPages, onPageChange, totalItems, limit, onLimitChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void, totalItems: number, limit: number, onLimitChange: (limit: number) => void }) => {
    if (totalPages <= 1 && totalItems <= limit) return null;
    return (
        <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
             <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                    Total: <span className="font-medium">{totalItems}</span>
                </span>
                <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="p-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                </select>
            </div>
            <div className="flex flex-1 justify-between sm:justify-end">
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Précédent</button>
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="relative ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Suivant</button>
            </div>
        </nav>
    );
};


export default function SessionsHistoryPage() {
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- STATE FOR FILTERS & PAGINATION ---
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 20);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: searchQuery,
        from: dateFrom,
        to: dateTo,
    });
    // Use replace to avoid polluting browser history on every state change
    router.replace(`?${params.toString()}`, { scroll: false });

    try {
      const response = await fetch(`/api/cash-register-sessions/history?${params.toString()}`);
      if (!response.ok) throw new Error('Erreur lors du chargement de l\'historique');
      
      const { data, meta } = await response.json();
      setHistory(data.filter((session: SessionHistory) => session.cashRegister.type === CashRegisterType.SALES));
      setTotal(meta.total);

    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, dateFrom, dateTo, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = () => {
    if(page !== 1) setPage(1);
  };
  
  const handleRowClick = (sessionId: string) => {
    router.push(`/cash-registers/history/${sessionId}`);
  };

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Historique des Sessions de Vente</h1>
        <Link href="/cash-registers" className="text-sm text-blue-600 hover:underline">
          &larr; Retour à la gestion des caisses
        </Link>
      </div>

      <div className="mb-4">
          <FilterBar
            search={searchQuery}
            onSearch={(val: string) => { setSearchQuery(val); handleFilterChange(); }}
            from={dateFrom}
            to={dateTo}
            onDateChange={(from: string, to: string) => { setDateFrom(from); setDateTo(to); handleFilterChange(); }}
            onClear={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); handleFilterChange(); }}
          />
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
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
            {loading ? (
                <tr><td colSpan={6} className="text-center py-10">Chargement...</td></tr>
            ) : error ? (
                <tr><td colSpan={6} className="text-center py-10 text-red-500">Erreur: {error}</td></tr>
            ) : history.length > 0 ? (
              history.map((session) => (
                <tr key={session.id} onClick={() => handleRowClick(session.id)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{session.cashRegister.name}</div><div className="text-sm text-gray-500">{session.closedAt ? new Date(session.closedAt).toLocaleDateString('fr-FR') : 'En cours'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div>Ouvert: {session.openedByUser.name || session.openedByUser.email}</div><div>Fermé: {session.closedByUser?.name || session.closedByUser?.email || 'N/A'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{session.openingBalance.toFixed(2)} {CURRENCY_LABEL}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{session.expectedBalance?.toFixed(2) ?? 'N/A'} {CURRENCY_LABEL}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{session.closingBalance?.toFixed(2) ?? 'N/A'} {CURRENCY_LABEL}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right"><DifferenceCell value={session.difference} /></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">Aucune session ne correspond aux filtres.</td></tr>
            )}
          </tbody>
        </table>
        {/* ✅ FIX APPLIED HERE: Pass the new props to the pagination component, including onLimitChange which uses setLimit. */}
        <PaginationControls 
            currentPage={page} 
            totalPages={totalPages} 
            onPageChange={setPage} 
            totalItems={total} 
            limit={limit} 
            onLimitChange={(l) => { setLimit(l); handleFilterChange(); }} 
        />
      </div>
    </main>
  );
}
