'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function PaymentForm({ onSubmit, loading: externalLoading }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    amount: '',
    description: '',
  });

  const isLoading = externalLoading ?? loading;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (onSubmit) {
      onSubmit(formData);
      return;
    }

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
        toast.error(data.error || 'Failed to create payment');
        return;
      }

      toast.success('Payment link created!');
      setFormData({ customerName: '', phone: '', amount: '', description: '' });
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Customer Name</label>
        <input
          type="text"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
          placeholder="Enter customer name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone Number</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
          placeholder="e.g. 27612345678"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Amount (ZAR)</label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          required
          min="1"
          step="0.01"
          className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
          placeholder="0.00"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
          placeholder="Payment description"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create Payment Link'}
      </button>
    </form>
  );
}
