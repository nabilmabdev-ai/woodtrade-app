// src/components/FilterBar.tsx
"use client";

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';

interface FilterBarProps {
  search?: string;
  onSearch: (value: string) => void;
  from?: string;
  to?: string;
  onDateChange: (from: string, to: string) => void;
  onClear: () => void;
  // We can add props for type filters, etc., here in the future
}

export default function FilterBar({
  search,
  onSearch,
  from,
  to,
  onDateChange,
  onClear,
}: FilterBarProps) {
  // Local state for immediate input feedback while typing
  const [localSearch, setLocalSearch] = useState(search || '');
  const [localFrom, setLocalFrom] = useState(from || '');
  const [localTo, setLocalTo] = useState(to || '');

  // Debounce the search input to avoid triggering a fetch on every keystroke
  const [debouncedSearch] = useDebounce(localSearch, 300);

  // Effect to call the parent's onSearch handler only when the debounced value changes
  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  // Effect to call the parent's onDateChange handler immediately when dates change
  useEffect(() => {
    onDateChange(localFrom, localTo);
  }, [localFrom, localTo, onDateChange]);

  // Effect to sync local state if the parent component's state changes (e.g., on clear)
  useEffect(() => {
    setLocalSearch(search || '');
    setLocalFrom(from || '');
    setLocalTo(to || '');
  }, [search, from, to]);
  
  const handleClear = () => {
      // Clear local state immediately for a responsive UI
      setLocalSearch('');
      setLocalFrom('');
      setLocalTo('');
      // Notify the parent to clear its state and trigger a refetch
      onClear();
  }

  const areFiltersActive = search || from || to;

  return (
    <div className="flex flex-wrap gap-4 items-center bg-gray-100 p-3 rounded-lg border">
      {/* Search Input */}
      <div className="relative flex-grow min-w-[250px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Rechercher par raison, utilisateur..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Date Range Inputs */}
      <div className="flex items-center gap-2">
        <div>
          <label htmlFor="from-date" className="sr-only">De</label>
          <input id="from-date" type="date" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <span className="text-gray-500">-</span>
        <div>
            <label htmlFor="to-date" className="sr-only">À</label>
            <input id="to-date" type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} className="p-2 border border-gray-300 rounded-md text-sm" />
        </div>
      </div>

      {/* Clear Button (only visible when filters are active) */}
      {areFiltersActive && (
        <button onClick={handleClear} aria-label="Clear filters" className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          <X className="h-4 w-4" />
          <span>Effacer</span>
        </button>
      )}
    </div>
  );
}
