// src/app/(dashboard)/page.tsx
"use client";

// ... (imports remain the same)
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { CircleDollarSign, ShoppingCart, TrendingUp, TriangleAlert, AlertCircle, CalendarClock } from 'lucide-react';
import { CURRENCY_LABEL } from '@/lib/constants';

// --- TYPE DEFINITIONS ---
interface DashboardStats {
  salesLast7Days: {
    revenue: number;
    count: number;
  };
  lowStockProducts: Array<{
    quantity: number;
    productVariant: {
      product: { name: string };
    };
  }>;
  topSellingProducts: Array<{
    name: string;
    totalSold: number | null;
  }>;
}

interface PurchasingStats {
  overdueAmount: number;
  dueThisWeekAmount: number;
}


// --- UI SUB-COMPONENTS ---
const StatCard = ({ title, value, icon: Icon, color = 'blue' }: { title: string, value: string, icon: React.ElementType, color?: 'blue' | 'red' | 'orange' }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        red: 'bg-red-100 text-red-600',
        orange: 'bg-orange-100 text-orange-600',
    };
    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className={`p-3 rounded-full ${selectedColor.split(' ')[0]}`}>
            <Icon className={`h-8 w-8 ${selectedColor.split(' ')[1]}`} />
            </div>
            <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
};

const WelcomeBanner = ({ userName }: { userName: string }) => (
    <div className="mb-8 p-6 bg-blue-600 rounded-lg shadow-lg text-white">
        <h1 className="text-3xl font-bold">Bienvenue, {userName} !</h1>
        <p className="mt-2 text-blue-100">Voici un aperçu de l&apos;activité de votre entreprise.</p>
    </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [purchasingStats, setPurchasingStats] = useState<PurchasingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        const [statsResponse, purchasingResponse] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/purchasing-stats')
        ]);
        
        if (!statsResponse.ok) throw new Error('Erreur réseau lors de la récupération des statistiques de ventes.');
        if (!purchasingResponse.ok) throw new Error('Erreur réseau lors de la récupération des statistiques d\'achats.');

        const statsData = await statsResponse.json();
        const purchasingData = await purchasingResponse.json();
        
        setStats(statsData);
        setPurchasingStats(purchasingData);

      } catch (err) {
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllStats();
  }, []);
  
  if (loading) return <div className="p-8 text-center text-gray-500">Chargement du tableau de bord...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Erreur: {error}</div>;
  if (!stats || !purchasingStats) return <div className="p-8 text-center text-gray-500">Aucune donnée à afficher.</div>;
  
  const userName = user?.user_metadata?.full_name || user?.email || 'Utilisateur';

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-full">
      
      <WelcomeBanner userName={userName} />

      {/* MODIFIED: This grid will now be 1 column on small screens, 2 on medium, and 4 on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Chiffre d'affaires (7j)"
          value={`${stats.salesLast7Days.revenue.toFixed(2)} ${CURRENCY_LABEL}`}
          icon={CircleDollarSign}
        />
        <StatCard 
          title="Ventes (7j)" 
          value={stats.salesLast7Days.count.toString()}
          icon={ShoppingCart}
        />
        <StatCard 
          title="Montant Fournisseurs en Retard" 
          value={`${purchasingStats.overdueAmount.toFixed(2)} ${CURRENCY_LABEL}`}
          icon={AlertCircle}
          color="red"
        />
        <StatCard 
          title="À Payer cette Semaine" 
          value={`${purchasingStats.dueThisWeekAmount.toFixed(2)} ${CURRENCY_LABEL}`}
          icon={CalendarClock}
          color="orange"
        />
      </div>

      {/* MODIFIED: This grid will now be 1 column on small screens and 2 on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
            <TrendingUp className="w-6 h-6 mr-3 text-green-500" />
            Top 5 des produits vendus
          </h2>
          {/* ... (rest of the component is the same) */}
          {(stats.topSellingProducts || []).length > 0 ? (
            <ul className="space-y-3">
              {(stats.topSellingProducts || []).map((product, index) => (
                <li key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="font-medium text-gray-700">{product.name}</span>
                  <span className="font-bold text-lg text-blue-600">{product.totalSold} vendus</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-4">Pas assez de données de vente.</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
            <TriangleAlert className="w-6 h-6 mr-3 text-red-500" />
            Alertes de stock bas
          </h2>
          {/* ... (rest of the component is the same) */}
          {(stats.lowStockProducts || []).length > 0 ? (
            <ul className="space-y-3">
              {(stats.lowStockProducts || []).map((item, index) => (
                <li key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="font-medium text-gray-700">{item.productVariant.product.name}</span>
                  <span className="font-bold text-lg text-red-600">{item.quantity} restants</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-4">Aucun produit en stock bas.</p>
          )}
        </div>
      </div>
    </div>
  );
}