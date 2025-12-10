'use client';

import { useFetch } from '@/hooks/useFetch';
import PaymentTable from '@/components/PaymentTable';
import { useState } from 'react';

export default function PaymentsPage() {
  const [status, setStatus] = useState('');
  const { data, loading } = useFetch(
    `/api/payments/list?${status ? `status=${status}` : ''}`
  );

  return (
    <div className="space-y-6 animate-slide-in-left">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage all your payments</p>
      </div>

      <div className="flex gap-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="glass rounded-xl p-6 card-shadow">
        <PaymentTable payments={data?.payments} loading={loading} />
      </div>
    </div>
  );
}