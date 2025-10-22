// src/components/Header.tsx
"use client";

import { Fragment } from 'react';
import { useRouter } from 'next/navigation'; // Link n'est plus nécessaire ici
import { supabase } from '@/lib/supabase-browser';
import { useAuth } from '@/hooks/use-auth';
import { Menu, Transition } from '@headlessui/react';
// --- ExternalLink a été retiré car le lien POS est supprimé ---
import { Search, Bell, UserCircle, LogOut } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } else {
      router.push('/login');
    }
  };

  return (
    <header className="bg-white shadow-sm p-4 border-b flex justify-between items-center sticky top-0 z-10">
      {/* Barre de recherche globale (inchangée) */}
      <div className="relative flex-1 max-w-xs">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Rechercher..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions de droite */}
      <div className="flex items-center space-x-4">
        
        {/* --- ✅ BLOC SUPPRIMÉ ---
            Le lien direct vers le POS a été enlevé pour suivre la nouvelle architecture.
            L'accès se fait maintenant via la barre latérale.
        */}

        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-6 w-6" />
        </button>

        {/* Menu déroulant du profil (inchangé) */}
        <Menu as="div" className="relative">
          <div>
            <Menu.Button className="flex text-sm bg-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <span className="sr-only">Open user menu</span>
              <UserCircle className="h-9 w-9 text-gray-500" />
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-3 border-b">
                    <p className="text-sm text-gray-700">Connecté en tant que</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.email}
                    </p>
                </div>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleSignOut}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } group flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                  >
                    <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    Se déconnecter
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}