// src/app/(dashboard)/layout.tsx
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Role } from '@prisma/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (user?.role === Role.CASHIER) {
        // Register the service worker for cashiers
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('Service Worker registered with scope:', registration.scope))
          .catch(error => console.error('Service Worker registration failed:', error));
      } else {
        // Unregister the service worker for other roles or when logged out
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('Service Worker unregistered.');
          }
        });
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <p className="text-gray-600">Chargement de la session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex-grow overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}