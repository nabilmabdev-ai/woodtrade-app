// src/app/(dashboard)/cash-registers/CashRegisterList.tsx

import Link from 'next/link';
import { CashRegisterType } from '@prisma/client';
import { MoreVertical } from 'lucide-react';

// --- NEW INTERFACE ---
// Aligned with the new API expectation from the plan
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
  onAddMovement: (id: string) => void;
  onTransfer: (id: string) => void;
}

// --- NEW SUB-COMPONENTS based on the plan ---

// SessionChip Component (as per plan)
const SessionChip = ({ session }: { session?: CashRegisterWithBalance['session'] }) => {
  if (!session?.id) {
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Closed</span>;
  }
  return (
    <span 
      title={`Opened at ${new Date(session.openedAt).toLocaleString('fr-FR')}`} 
      className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
    >
      Open — {session.openedBy?.name || session.openedBy?.email}
    </span>
  );
};

// TypeBadge maps the DB enum to the neutral UI label specified in the plan.
const TypeBadge = ({ type }: { type: CashRegisterType }) => {
    const isSales = type === CashRegisterType.SALES;
    const styles = isSales
      ? 'bg-blue-100 text-blue-800'
      : 'bg-yellow-100 text-yellow-800';
    // ✅ MODIFIED: Use neutral terms as per plan
    const text = isSales ? 'Register' : 'Expense Register';
  
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles}`}>
        {text}
      </span>
    );
};

// BalanceCard Component (based on plan's skeleton)
function BalanceCard({ 
  register, 
  onOpen, 
  onClose, 
  onAddMovement, 
  onTransfer 
}: { 
  register: CashRegisterWithBalance,
  onOpen: (id: string) => void,
  onClose: (id: string) => void,
  onAddMovement: (id: string) => void,
  onTransfer: (id: string) => void
}) {
  const isSessionOpen = !!register.session?.id;
  const isExpenseRegister = register.type === CashRegisterType.EXPENSE;

  return (
    <div className="p-5 rounded-xl shadow-sm bg-white border border-gray-200 flex flex-col justify-between">
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
              <div className="mt-1 h-5"> {/* Height placeholder */}
                <SessionChip session={register.session} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-2 items-center">
        <Link href={`/cash-registers/${register.id}`} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 flex-grow text-center">
            Manage
        </Link>
        {!isExpenseRegister && (
            isSessionOpen ? (
                <button onClick={() => onClose(register.id)} className="px-4 py-2 text-sm font-semibold bg-red-50 text-red-700 rounded-md hover:bg-red-100">Close</button>
            ) : (
                <button onClick={() => onOpen(register.id)} className="px-4 py-2 text-sm font-semibold bg-green-50 text-green-700 rounded-md hover:bg-green-100">Open</button>
            )
        )}
         {/* Dropdown for other actions */}
        <div className="relative">
            <button className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"><MoreVertical className="h-5 w-5"/></button>
            {/* Dropdown menu logic would go here */}
        </div>
      </div>
    </div>
  );
}


// --- MAIN COMPONENT REFACTORED to use the new card grid ---
export default function CashRegisterList({ 
  registers, 
  onOpenSession, 
  onCloseSession,
  onAddMovement,
  onTransfer
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
          onAddMovement={onAddMovement}
          onTransfer={onTransfer}
        />
      ))}
    </div>
  );
}