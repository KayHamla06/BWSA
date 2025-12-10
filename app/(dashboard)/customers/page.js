'use client';

import PaymentForm from '@/components/PaymentForm';

export default function PaymentLinksPage() {
  return (
    <div className="space-y-6 animate-slide-in-left">
      <div>
        <h1 className="text-3xl font-bold">Create Payment Link</h1>
        <p className="text-gray-600 dark:text-gray-400">Generate and send payment requests</p>
      </div>

      <div className="glass rounded-xl p-6 card-shadow">
        <PaymentForm />
      </div>
    </div>
  );
}