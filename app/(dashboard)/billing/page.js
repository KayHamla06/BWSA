'use client';

import { FileText } from 'lucide-react';

export default function BillingPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="space-y-6 animate-slide-in-left">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="text-emerald-500" />
          Billing & Plans
        </h1>
      </div>

      <div className="glass rounded-xl p-6 card-shadow max-w-2xl">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b">
            <span className="font-medium">Current Plan</span>
            <span className="text-xl font-bold capitalize text-emerald-500">{user.plan || 'Free'}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Monthly API Calls</p>
              <p className="text-2xl font-bold">{user.monthlyApiCalls || 0}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold">R{user.totalRevenueCollected?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <button className="w-full btn-primary mt-6">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}