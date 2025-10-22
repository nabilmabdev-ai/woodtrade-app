// --- Content from: src/app/(dashboard)/users/page.tsx ---

"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import UserList from './UserList'; // <-- Import the new list component

// Keep types here as the page component still needs to know the shape of the data it's managing.
enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  WAREHOUSE = 'WAREHOUSE',
  ACCOUNTANT = 'ACCOUNTANT',
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Impossible de charger la liste des utilisateurs');
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // The logic for handling the role change remains in the container component,
  // as it's responsible for API interactions.
  const handleRoleChange = async (userId: string, newRole: Role) => {
    const originalUsers = [...users];
    
    // Optimistic UI update
    const updatedUsers = users.map(user =>
      user.id === userId ? { ...user, role: newRole } : user
    );
    setUsers(updatedUsers);

    // Using toast.promise to handle the API call state
    const promise = fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    }).then(async (response) => {
        if (!response.ok) {
            const errorData = await response.json();
            return Promise.reject(errorData.error || 'La mise à jour a échoué');
        }
    });

    toast.promise(promise, {
        loading: 'Mise à jour du rôle...',
        success: 'Rôle mis à jour avec succès !',
        error: (err) => {
            setUsers(originalUsers); // Revert on error
            return `Erreur: ${err.toString()}`;
        }
    });
  };

  if (loading) return <p className="p-8 text-center">Chargement des utilisateurs...</p>;
  if (error) return <p className="p-8 text-center text-red-500">Erreur: {error}</p>;

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Utilisateurs</h1>
      <p className="mb-6 text-gray-600">
        Modifiez le rôle d&apos;un utilisateur en le sélectionnant dans la liste déroulante. La mise à jour est automatique.
      </p>

      {/* Render the UserList component, passing state and handlers as props */}
      <UserList users={users} onRoleChange={handleRoleChange} />
    </main>
  );
}