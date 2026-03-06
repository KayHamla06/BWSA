'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Building2, Phone, ArrowRight, Check, Sparkles } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free Forever',
    price: 'R0',
    description: 'Perfect for testing & small shops',
    features: ['50 payments/month', 'WhatsApp links', 'Basic analytics', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R149',
    period: '/month',
    description: 'Best for growing businesses',
    features: ['Unlimited payments', 'Custom branding', 'Advanced analytics', 'Priority support', 'API access'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large teams & custom needs',
    features: ['Everything in Pro, Dedicated manager, Custom integrations, SLA, White-label'],
  },
];

export default function RegisterPage() {
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    whatsappNumber: '',
  });

  const { register } = useAuth();

  const handleChange = (e) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  const result = await register({
    ...formData,
    plan: selectedPlan,
  });

  if (!result.success) {
    toast.error(result.error || 'Registration failed');
  }

  setLoading(false);
};

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-black">
      <div className="w-full max-w-5xl">

        {/* Tabs */}
        <div className="flex gap-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl p-2 rounded-2xl mb-12 shadow-xl border border-white/20 dark:border-gray-700 mx-auto max-w-md">
          <Link
            href="/login"
            className="flex-1 py-3.5 text-center font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl transition-all transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="flex-1 py-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-900 rounded-xl shadow-lg border-2 border-emerald-500 ring-4 ring-emerald-500/20"
          >
            Sign Up
          </Link>
        </div>

        {/* Main Glass Card */}
        <div className="bg-white/90 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-8 lg:p-12 shadow-2xl border border-white/30 dark:border-gray-700">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent mb-4">
              Create Your Account
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Start accepting payments on WhatsApp in minutes with Ubuntu Market
            </p>
          </div>

          {/* Pricing Plans */}
          <div className="pricing mb-14">
            <h2 className="text-2xl lg:text-3xl font-bold text-center mb-10 text-gray-900 dark:text-white">
              Choose Your Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-8 rounded-2xl cursor-pointer transition-all duration-500 border-2 backdrop-blur-md ${
                    selectedPlan === plan.id
                      ? 'border-emerald-500 ring-4 ring-emerald-500/30 scale-105 shadow-2xl bg-white/95 dark:bg-gray-800/95'
                      : 'border-transparent bg-white/70 dark:bg-gray-800/70 hover:scale-105'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg">
                      MOST POPULAR
                    </span>
                  )}
                  <div className="text-center pt-4">
                    <h3 className="text-xl font-bold mb-3">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-5xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-lg text-gray-600 dark:text-gray-400 ml-2">
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{plan.description}</p>
                    <ul className="space-y-3 text-left">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {selectedPlan === plan.id && (
                      <div className="mt-8 inline-flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg">
                        <Check className="h-5 w-5" /> Selected
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    className="w-full pl-12 pr-5 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-12 pr-5 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                    className="w-full pl-12 pr-5 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Business Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="My Awesome Store"
                    required
                    className="w-full pl-12 pr-5 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  WhatsApp Business Number <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="+27812345678"
                    className="w-full pl-12 pr-5 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  We’ll send payment links to this number
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 py-5 text-lg font-bold text-white rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/40 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account & Start Free
                  <ArrowRight className="h-6 w-6" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 p-6 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/30 dark:to-cyan-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-700 text-center">
            <p className="text-emerald-900 dark:text-emerald-300 font-medium flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              No credit card required • Upgrade anytime • Cancel anytime
            </p>
          </div>

          <p className="mt-10 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}