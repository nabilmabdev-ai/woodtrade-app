// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css'; // <-- ✅ CORRECTION : Importez le CSS global ici

export const metadata: Metadata = {
  title: 'WoodTrade - ERP',
  description: 'Gestion des opérations pour WoodTrade',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        {/* Ce layout ne contient que la structure de base. 
            Le layout du dashboard s'occupera d'ajouter la Sidebar et le Header. */}
        {children}
      </body>
    </html>
  );
}
