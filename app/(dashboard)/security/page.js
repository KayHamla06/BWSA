'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';

export default function SecurityPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Implement password change API
      toast.success('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in-left">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="text-emerald-500" />
          Security Settings
        </h1>
      </div>

      <div className="glass rounded-xl p-6 card-shadow max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg input-focus dark:bg-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="glass rounded-xl p-6 card-shadow max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Two-Factor Authentication</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Add an extra layer of security to your account
        </p>
        <button className="btn-primary">Enable 2FA</button>
      </div>

      <div className="glass rounded-xl p-6 card-shadow max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Login Activity</h2>
        <div className="text-center py-8 text-gray-500">
          No recent login activity
        </div>
      </div>
    </div>
  );
}