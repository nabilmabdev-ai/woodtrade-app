// --- Content for: src/app/(dashboard)/products/ProductList.tsx ---

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  // --- LIGNES AJOUTÉES ---
  family: string | null;
  collection: string | null;
}

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Liste des produits existants</h2>
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              {/* --- LIGNES AJOUTÉES --- */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Famille</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                  {/* --- LIGNES AJOUTÉES --- */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.family || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.collection || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 truncate">{product.description || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                {/* --- LIGNE MODIFIÉE --- */}
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Aucun produit trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
