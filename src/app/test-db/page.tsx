// src/app/test-db/page.tsx
"use client";

import { useState } from 'react';

export default function TestDbPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setLoading(true);
    setResult("Testing connection...");

    try {
      // CORRECTION MANUELLE ICI
      const response = await fetch('/api/test-db');
      const data = await response.json();

      if (response.ok) {
        setResult(`✅ SUCCESS!\n\n${data.message}`);
      } else {
        setResult(`❌ FAILED!\n\n${data.message}\nError details: ${data.error}`);
      }
    } catch (error) {
      const err = error as Error;
      setResult(`❌ NETWORK ERROR!\n\nCould not reach the API.\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Database Connection Test</h1>
      <p className="mb-4">
        Cliquez sur ce bouton pour tenter de vous connecter à la base de données configurée
        dans votre fichier <code>.env</code> et compter les utilisateurs.
      </p>
      <button
        onClick={handleTestConnection}
        disabled={loading}
        className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </main>
  );
}