'use client';

import PaymentForm from '@/components/PaymentForm';

export default function PaymentLinksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Create Payment Link</h1>
        <p className="text-gray-600 dark:text-gray-400">Generate and send payment requests</p>
      </div>

      <div className="glass rounded-xl p-4 sm:p-6 max-w-2xl">
        <PaymentForm />
      </div>
    </div>
  );
}