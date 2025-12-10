'use client';

export default function PaymentTable({ payments, loading }) {
  if (loading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  if (!payments?.length) {
    return <div className="text-center py-8 text-gray-500">No payments found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b dark:border-gray-800">
            <th className="text-left py-3 px-4 font-semibold">Customer</th>
            <th className="text-left py-3 px-4 font-semibold">Amount</th>
            <th className="text-left py-3 px-4 font-semibold">Date</th>
            <th className="text-left py-3 px-4 font-semibold">Status</th>
            <th className="text-left py-3 px-4 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment._id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-3 px-4">{payment.customerName}</td>
              <td className="py-3 px-4 font-semibold">R{payment.amount.toFixed(2)}</td>
              <td className="py-3 px-4">
                {new Date(payment.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`badge ${
                    payment.status === 'completed'
                      ? 'badge-success'
                      : payment.status === 'failed'
                      ? 'badge-danger'
                      : 'badge-warning'
                  }`}
                >
                  {payment.status}
                </span>
              </td>
              <td className="py-3 px-4">
                <a href={`/payments/${payment._id}`} className="text-emerald-500 hover:underline">
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}