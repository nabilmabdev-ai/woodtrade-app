// src/app/(dashboard)/users/UserList.tsx

"use client";

// Enum and Interface definitions are co-located with the component that uses them.
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

interface UserListProps {
  users: User[];
  onRoleChange: (userId: string, newRole: Role) => void;
}

export default function UserList({ users, onRoleChange }: UserListProps) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de création</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <select
                  value={user.role}
                  onChange={(e) => onRoleChange(user.id, e.target.value as Role)}
                  className="p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  {Object.values(Role).map(roleValue => (
                    <option key={roleValue} value={roleValue}>{roleValue}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}