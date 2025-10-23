// src/app/(dashboard)/cash-registers/CashRegisterList.tsx

import Link from 'next/link';
import { CashRegisterType, Role } from '@prisma/client';
import { MoreVertical } from 'lucide-react';
import { useAuth } from '@/src/app/auth/provider';
import * as permissions from '@/src/lib/permissions';

interface CashRegisterWithBalance {
  id: string;
  name: string;
  type: CashRegisterType;
  currentBalance: number;
  session?: {
    id: string;
    openedBy?: { name: string | null; email: string; };
    openedAt: string;
  } | null;
}

interface CashRegisterListProps {
  registers: CashRegisterWithBalance[];
  onOpenSession: (id: string) => void;
  onCloseSession: (id: string) => void;
}


// --- SUB-COMPONENTS with VISUAL REFRESH ---

const SessionChip = ({ session }: { session?: CashRegisterWithBalance['session'] }) => {
  if (!session?.id) {
    // Styling for 'Closed' state
    return <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200">Closed</span>;
  }
  // ✅ NEW classes applied as per plan for 'Open' state
  return (
    <span 
      title={`Opened at ${new Date(session.openedAt).toLocaleString('fr-FR')}`} 
      className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
    >
      Open — {session.openedBy?.name || session.openedBy?.email}
    </span>
  );
};

const TypeBadge = ({ type }: { type: CashRegisterType }) => {
    const isSales = type === CashRegisterType.SALES;
    const styles = isSales
      ? 'bg-blue-100 text-blue-800'
      : 'bg-yellow-100 text-yellow-800';
    const text = isSales ? 'Register' : 'Expense Register';
    // This component was already modern, keeping consistent styles.
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles}`}>
        {text}
      </span>
    );
};

function BalanceCard({ 
  register, 
  onOpen, 
  onClose,
}: { 
  register: CashRegisterWithBalance,
  onOpen: (id: string) => void,
  onClose: (id: string) => void,
}) {
  const { user } = useAuth();
  const userRole = user?.role as Role;

  const isSessionOpen = !!register.session?.id;
  const isExpenseRegister = register.type === CashRegisterType.EXPENSE;

  // ✅ NEW classes applied for the main card container
  return (
    <div className="p-6 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 flex flex-col justify-between transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{register.name}</h3>
            <div className="mt-1"><TypeBadge type={register.type} /></div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-gray-900">
                {register.currentBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
            </div>
            {!isExpenseRegister && (
              <div className="mt-1 h-5"> 
                <SessionChip session={register.session} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-2 items-center">
        {/* ✅ NEW classes applied for the primary 'Manage' button */}
        <Link href={`/cash-registers/${register.id}`} className="px-5 py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition flex-grow text-center">
            Manage
        </Link>
        {/* Visible only to authorized roles */}
        {userRole && permissions.canManageCashRegisterSession(userRole) && !isExpenseRegister && (
            isSessionOpen ? (
                // ✅ NEW classes applied for secondary buttons
                <button onClick={() => onClose(register.id)} className="px-3 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition">Close</button>
            ) : (
                // ✅ NEW classes applied for secondary buttons
                <button onClick={() => onOpen(register.id)} className="px-3 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">Open</button>
            )
        )}
        <div className="relative">
            <button className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"><MoreVertical className="h-5 w-5"/></button>
        </div>
      </div>
    </div>
  );
}


// --- MAIN COMPONENT (unchanged) ---
export default function CashRegisterList({ 
  registers, 
  onOpenSession, 
  onCloseSession,
}: CashRegisterListProps) {
  if (registers.length === 0) {
    return (
      <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800">No registers found</h3>
        <p className="mt-1 text-sm text-gray-500">Start by adding a new cash register.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {registers.map((register) => (
        <BalanceCard 
          key={register.id} 
          register={register} 
          onOpen={onOpenSession}
          onClose={onCloseSession}
        />
      ))}
    </div>
  );
}