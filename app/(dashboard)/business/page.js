'use client';

import { useFetch } from '@/hooks/useFetch';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';

export default function BusinessPage() {
  const { data, loading } = useFetch('/api/business');
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  const business = data?.business || {};

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success('Business information updated!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 animate-slide-in-left">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="text-emerald-500" />
          Business Information
        </h1>
      </div>

      <div className="glass rounded-xl p-6 card-shadow max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              name="businessName"
              value={formData?.businessName || business.name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Business Description</label>
            <textarea
              name="businessDescription"
              value={formData?.businessDescription || business.description || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
              rows="4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">WhatsApp Number</label>
            <input
              type="tel"
              name="whatsappNumber"
              value={formData?.whatsappNumber || business.whatsappNumber || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Payout Email</label>
            <input
              type="email"
              name="payoutEmail"
              value={formData?.payoutEmail || business.payoutEmail || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Support Email</label>
            <input
              type="email"
              name="supportEmail"
              value={formData?.supportEmail || business.supportEmail || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}