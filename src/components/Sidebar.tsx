// src/components/Sidebar.tsx
"use client";

import { useState, Fragment } from 'react'; // <-- NEW: Import Fragment
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Transition } from '@headlessui/react'; // <-- NEW: Import Transition
import {
  LayoutDashboard, Box, ShoppingCart, Warehouse, FileText, UserCog,
  Wallet, Undo2, LineChart, Truck, Building, ArrowRightLeft,
  ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, Store,
  GanttChartSquare, ClipboardCheck, ClipboardList, Users, X, // <-- NEW: Import X icon
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import * as permissions from '@/lib/permissions';
import { Role } from '@prisma/client';

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title?: string;
  icon: React.ElementType;
  href?: string;
  label: string;
  subLinks?: NavLink[];
  isVisible: (role: Role) => boolean;
}

const navSections: Omit<NavSection, 'isVisible'>[] = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/pos', label: 'Point de Vente (POS)', icon: Store },
  {
    label: 'Ventes', icon: ShoppingCart,
    subLinks: [
      { href: '/customers', label: 'Clients', icon: Users },
      { href: '/sales/orders', label: 'Commandes', icon: ShoppingCart },
      { href: '/billing/invoices', label: 'Factures', icon: FileText },
      { href: '/billing/payments', label: 'Paiements', icon: Wallet },
      { href: '/returns', label: 'Retours / Avoirs', icon: Undo2 },
      { href: '/billing/reconciliation', label: 'Rapprochement Paiements', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Achats', icon: Truck,
    subLinks: [
      { href: '/suppliers', label: 'Fournisseurs', icon: Building },
      { href: '/purchasing/invoices', label: 'Factures d\'achat', icon: FileText },
      { href: '/purchasing/payments', label: 'Paiements Fournisseurs', icon: ArrowRightLeft },
      { href: '/purchasing/reconciliation', label: 'Rapprochement Paiements', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Produits & Inventaire', icon: Box,
    subLinks: [
      { href: '/products', label: 'Produits', icon: Box },
      { href: '/inventory', label: 'Inventaire', icon: Warehouse },
    ],
  },
  {
    label: 'Gestion de Caisse', icon: Wallet,
    subLinks: [
      { href: '/cash-registers', label: 'Gérer les Caisses', icon: Wallet },
      { href: '/cash-registers/history', label: 'Historique des Sessions', icon: LineChart },
    ],
  },
  {
    label: 'Rapports', icon: LineChart,
    subLinks: [
      { href: '/reports/sales', label: 'Rapports de Ventes', icon: LineChart },
      { href: '/pos-reports/cash-statement', label: 'Rapports de Session (Ventes)', icon: LineChart },
      { href: '/pos-reports/expense-statement', label: 'Relevé de Dépenses', icon: ClipboardList },
      { href: '/reports/purchasing-forecast', label: 'Prévisionnel d\'Achats', icon: GanttChartSquare },
    ],
  },
  {
    label: 'Administration', icon: UserCog,
    subLinks: [
      { href: '/users', label: 'Utilisateurs & Rôles', icon: UserCog },
    ],
  },
];

// ... (Interfaces remain the same)

// NEW: Add props for mobile state
interface SidebarProps {
  isMobileOpen: boolean;
  setMobileOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isMobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role as Role;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ 'Ventes': true, 'Achats': true });

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  if (!userRole) {
    return null;
  }
  
  // Visible only to authorized roles
  const filteredNavSections = navSections.map(section => {
    let isVisible = true;
    if (section.label === 'Administration') isVisible = permissions.canViewUsers(userRole);
    if (section.label === 'Ventes') isVisible = permissions.canViewBilling(userRole);
    if (section.label === 'Achats') isVisible = permissions.canViewWarehouse(userRole);
    if (section.label === 'Gestion de Caisse') isVisible = permissions.canViewCashRegisters(userRole);
    if (section.label === 'Produits & Inventaire') isVisible = permissions.canViewWarehouse(userRole);

    const subLinks = section.subLinks?.filter(subLink => {
      if (subLink.href.startsWith('/billing') || subLink.href.startsWith('/returns')) return permissions.canViewBilling(userRole);
      if (subLink.href.startsWith('/inventory')) return permissions.canViewWarehouse(userRole);
      if (subLink.href.startsWith('/users')) return permissions.canViewUsers(userRole);
      if (subLink.href.startsWith('/cash-registers')) return permissions.canViewCashRegisters(userRole);
      return true; // Default to visible if no specific rule
    });

    return { ...section, isVisible, subLinks };
  }).filter(section => section.isVisible && (section.href || (section.subLinks && section.subLinks.length > 0)));

  const SidebarContent = () => (
    <div className={`bg-gray-800 text-white flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`h-16 flex items-center border-b border-gray-700 ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
        <div className="flex items-center justify-center">
          <Truck className={`w-8 h-8 text-blue-400 transition-transform duration-300 ${isCollapsed ? 'transform scale-110' : 'mr-2'}`} />
          {!isCollapsed && ( <span className="text-2xl font-bold">WoodTrade</span> )}
        </div>
        {/* NEW: Close button for mobile overlay */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 -mr-2">
            <X className="h-6 w-6"/>
        </button>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavSections.map((section) => (
          <div key={section.label}>
            {section.subLinks ? (
              <>
                <button 
                  onClick={() => toggleSection(section.label)} 
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''} ${section.subLinks.some(link => pathname.startsWith(link.href)) ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="h-5 w-5" />
                    {!isCollapsed && <span>{section.label}</span>}
                  </div>
                  {!isCollapsed && ( openSections[section.label] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" /> )}
                  {isCollapsed && ( <span className="absolute left-full ml-4 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-0 group-hover:scale-100 origin-left">{section.label}</span> )}
                </button>
                {(!isCollapsed && openSections[section.label]) && (
                  <div className="pl-6 pt-1 pb-1 space-y-1">
                    {section.subLinks.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link key={link.href} href={link.href} className={`group flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                          <link.icon className="h-4 w-4" />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <Link 
                href={section.href!}
                className={`group relative flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === section.href ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`}
              >
                <section.icon className="h-5 w-5" />
                {!isCollapsed && <span>{section.label}</span>}
                {isCollapsed && ( <span className="absolute left-full ml-4 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-0 group-hover:scale-100 origin-left">{section.label}</span> )}
              </Link>
            )}
          </div>
        ))}
      </nav>
      
      <div className="p-2 border-t border-gray-700">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className={`w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          {isCollapsed ? <ChevronsRight className="h-6 w-6" /> : <ChevronsLeft className="h-6 w-6 mr-2" />}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* --- DESKTOP SIDEBAR (hidden on mobile) --- */}
      <aside className="hidden lg:flex flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* --- MOBILE SIDEBAR (overlay) --- */}
      <Transition show={isMobileOpen} as={Fragment}>
        <div className="fixed inset-0 flex z-40 lg:hidden" role="dialog" aria-modal="true">
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setMobileOpen(false)} />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="relative flex-1 flex flex-col max-w-xs w-full">
              <SidebarContent />
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </>
  );
}