'use client';

import { useFetch } from '@/hooks/useFetch';
import DashboardCard from '@/components/DashboardCard';
import PaymentTable from '@/components/PaymentTable';
import ServiceStatus from '@/components/ServiceStatus';
import { BarChart3, CreditCard, Users, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { data: paymentData, loading: paymentLoading } = useFetch('/api/payments/list?limit=5');
  const { data: customerData, loading: customerLoading } = useFetch('/api/customers');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="space-y-8 animate-slide-in-left">
      <div>
        <h1 className="text-4xl font-bold gradient-text">Welcome back, {user.name}! 👋</h1>
        <p className="text-gray-600 dark:text-gray-400">Here's your business overview</p>
      </div>

      <div className="grid-responsive">
        <DashboardCard
          title="Total Revenue"
          value={`R${user.totalRevenueCollected?.toFixed(2) || '0.00'}`}
          icon={TrendingUp}
          color="emerald"
        />
        <DashboardCard
          title="Total Payments"
          value={(paymentData?.payments?.length || 0).toString()}
          icon={CreditCard}
          color="blue"
        />
        <DashboardCard
          title="Customers"
          value={(customerData?.customers?.length || 0).toString()}
          icon={Users}
          color="purple"
        />
        <DashboardCard
          title="API Calls"
          value={user.monthlyApiCalls?.toString() || '0'}
          icon={BarChart3}
          color="orange"
        />
      </div>

      <ServiceStatus />

      <div className="glass rounded-xl p-6 card-shadow">
        <h2 className="text-xl font-bold mb-4">Recent Payments</h2>
        <PaymentTable payments={paymentData?.payments} loading={paymentLoading} />
      </div>
    </div>
  );
}