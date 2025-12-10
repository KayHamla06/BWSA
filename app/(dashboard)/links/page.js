'use client';

import { useState } from 'react';
import PaymentForm from '@/components/PaymentForm';
import toast from 'react-hot-toast';
import QRCode from 'qrcode.react';

export default function Links() {
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const handleCreateLink = async (formData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create payment link');
        return;
      }

      setCreatedLink(data.payment);
      toast.success('Payment link created successfully!');
    } catch (error) {
      toast.error('An error occurred');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Generate Payment Links</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Create Payment Link</h2>
          <PaymentForm onSubmit={handleCreateLink} loading={loading} />
        </div>

        {/* Result */}
        {createdLink && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Payment Link Created</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={createdLink.paymentUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(createdLink.paymentUrl)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Amount: R{createdLink.amount}</p>
                <p className="text-sm text-gray-600 mb-2">Customer: {createdLink.customerName}</p>
                <p className="text-sm text-gray-600 mb-2">Status: {createdLink.status}</p>
              </div>

              {createdLink.qrCode && (
                <div>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </button>
                  {showQR && (
                    <div className="mt-4 p-4 bg-gray-50 rounded flex justify-center">
                      <img src={createdLink.qrCode} alt="QR Code" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
