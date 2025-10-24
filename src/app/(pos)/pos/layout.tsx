// src/app/(pos)/layout.tsx
export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Ce layout ne fait qu'afficher ses enfants, sans ajouter de
    // barres de navigation, de pieds de page, etc.
    <>{children}</>
  );
}
