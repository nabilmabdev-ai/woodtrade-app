// src/app/(dashboard)/products/page.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import AddProductForm from './AddProductForm'; // <-- Import the form component
import ProductList from './ProductList';     // <-- Import the list component

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  // --- LIGNES AJOUTÉES ---
  family: string | null;
  collection: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Erreur réseau');
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      const err = error as Error;
      toast.error(`Impossible de charger la liste des produits: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Produits</h1>
      
      {/* The form component handles adding new products */}
      <AddProductForm onProductAdded={fetchProducts} />
      
      {/* The list component displays the products */}
      {isLoading ? (
        <p>Chargement de la liste des produits...</p>
      ) : (
        <ProductList products={products} />
      )}
    </main>
  );
}
