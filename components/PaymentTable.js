'use client';

import { format } from 'date-fns';

export default function PaymentTable({ payments = [], loading }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  if (!payments?.length) {
    return <p className="text-gray-500 text-center py-8">No payments found</p>;
  }

  const statusColors = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b dark:border-gray-700">
            <th className="pb-3 text-sm font-semibold text-gray-500">Customer</th>
            <th className="pb-3 text-sm font-semibold text-gray-500">Amount</th>
            <th className="pb-3 text-sm font-semibold text-gray-500">Status</th>
            <th className="pb-3 text-sm font-semibold text-gray-500">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment._id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-3">{payment.customerName || payment.phone}</td>
              <td className="py-3 font-medium">R{Number(payment.amount).toFixed(2)}</td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status] || ''}`}>
                  {payment.status}
                </span>
              </td>
              <td className="py-3 text-sm text-gray-500">
                {payment.createdAt ? format(new Date(payment.createdAt), 'dd MMM yyyy') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
