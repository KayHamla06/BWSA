'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function ServiceStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch service status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 card-shadow">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Clock size={18} className="animate-spin" />
          Loading service status...
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-6 card-shadow">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span>🔧 Integration Status</span>
      </h3>

      <div className="space-y-3">
        {/* Ozow Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            {status.services.ozow.available ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <AlertCircle className="text-red-500" size={20} />
            )}
            <div>
              <p className="font-semibold text-sm">Ozow Payment Service</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {status.services.ozow.message}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status.services.ozow.available
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {status.services.ozow.status}
          </span>
        </div>

        {/* WhatsApp Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            {status.services.whatsapp.available ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <AlertCircle className="text-red-500" size={20} />
            )}
            <div>
              <p className="font-semibold text-sm">WhatsApp Messaging Service</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {status.services.whatsapp.message}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status.services.whatsapp.available
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {status.services.whatsapp.status}
          </span>
        </div>
      </div>

      {/* Configuration Help */}
      {(status.summary.unavailableServices.length > 0) && (
        <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
            Missing Configuration
          </p>
          <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
            {status.summary.unavailableServices.includes('ozow') && (
              <li>
                • <strong>Ozow</strong>: Add OZOW_SITE_CODE and OZOW_PRIVATE_KEY to .env.local
              </li>
            )}
            {status.summary.unavailableServices.includes('whatsapp') && (
              <li>
                • <strong>WhatsApp</strong>: Add WHATSAPP_PHONE_ID and WHATSAPP_TOKEN to .env.local
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
