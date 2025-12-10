'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, QrCode } from 'lucide-react';

export default function PaymentForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    amount: '',
    description: '',
    sendWhatsApp: false,
    paymentMethod: 'ozow',
  });
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data.payment);
      toast.success('Payment link created!');
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        amount: '',
        description: '',
        sendWhatsApp: false,
        paymentMethod: 'ozow',
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="customerName"
            placeholder="Customer Name"
            value={formData.customerName}
            onChange={handleChange}
            required
            className="px-4 py-2 border rounded-lg input-focus dark:bg-gray-800 dark:border-gray-700"
          />
          <input
            type="email"
            name="customerEmail"
            placeholder="Email (optional)"
            value={formData.customerEmail}
            onChange={handleChange}
            className="px-4 py-2 border rounded-lg input-focus dark:bg-gray-800 dark:border-gray-700"
          />
          <input
            type="tel"
            name="customerPhone"
            placeholder="WhatsApp Number"
            value={formData.customerPhone}
            onChange={handleChange}
            required
            className="px-4 py-2 border rounded-lg input-focus dark:bg-gray-800 dark:border-gray-700"
          />
          <input
            type="number"
            name="amount"
            placeholder="Amount (R)"
            value={formData.amount}
            onChange={handleChange}
            required
            step="0.01"
            className="px-4 py-2 border rounded-lg input-focus dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <textarea
          name="description"
          placeholder="Payment description (optional)"
          value={formData.description}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800 dark:border-gray-700"
          rows="3"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            className="px-4 py-2 border rounded-lg input-focus dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="ozow">Ozow</option>
            <option value="payshap">PayShap</option>
          </select>

          <label className="flex items-center gap-2 px-4 py-2">
            <input
              type="checkbox"
              name="sendWhatsApp"
              checked={formData.sendWhatsApp}
              onChange={handleChange}
            />
            <span>Send via WhatsApp</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Payment Link'}
        </button>
      </form>

      {result && (
        <div className="glass rounded-lg p-6 space-y-4">
          <h3 className="font-bold text-lg">Payment Link Created ✅</h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment URL:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={result.paymentUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.paymentUrl);
                  toast.success('Copied!');
                }}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>

          {result.qrCode && (
            <div className="flex flex-col items-center gap-2">
              <img src={result.qrCode} alt="QR Code" className="w-48 h-48" />
              <p className="text-sm text-gray-500">Scan to pay</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}