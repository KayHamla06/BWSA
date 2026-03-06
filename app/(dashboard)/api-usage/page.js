'use client';

import { useFetch } from '@/hooks/useFetch';
import { Zap, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApiUsagePage() {
  const { data, loading } = useFetch('/api/apikeys/generate');

  const handleGenerateKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/apikeys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'API Key' }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error);

      toast.success('API key generated!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Zap className="text-emerald-500" />
          API Usage
        </h1>
      </div>

      <div className="glass rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Your API Key</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Use this API key to authenticate requests to the Ubuntu Market API
        </p>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono break-all flex justify-between items-center gap-4">
          <span className="text-sm">•••••••••••••••••••••••••••••••••</span>
          <button
            onClick={() => toast.success('Check your dashboard')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <Copy size={18} />
          </button>
        </div>

        <button onClick={handleGenerateKey} className="mt-4 btn-primary">
          Generate New Key
        </button>
      </div>

      <div className="glass rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">API Documentation</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Create Payment Link</h3>
            <code className="bg-gray-100 dark:bg-gray-800 p-3 rounded block overflow-x-auto">
              POST /api/payments/create-link
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Required Headers</h3>
            <code className="bg-gray-100 dark:bg-gray-800 p-3 rounded block overflow-x-auto">
              x-api-key: YOUR_API_KEY
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}