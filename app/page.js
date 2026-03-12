'use client';import { useState } from 'react';
import { ArrowRight, Smartphone, Lock, BarChart3, Check, Globe } from 'lucide-react';
import styles from './page.module.css';const plans = [
  {
    id: 'payg',
    name: 'Pay-as-you-go',
    price: 'Pay per request',
    description: 'No monthly commitment',
    features: ['Unlimited requests', 'No credit card required', 'Hourly payouts'],
  },
  {
    id: 'r100',
    name: '100 Requests',
    price: 'R89.99',
    period: 'per month',
    description: 'Perfect for starters',
    features: ['100 requests/month', 'Daily payouts', 'Email support', 'API access'],
    popular: true,
  },
  {
    id: 'r500',
    name: '500 Requests',
    price: 'R399',
    period: 'per month',
    description: 'For growing businesses',
    features: ['500 requests/month', 'Priority payouts', '24/7 support', 'Dedicated manager'],
  },
];export default function HomePage() {
  const [tab, setTab] = useState('signup');
  const [selectedPlan, setSelectedPlan] = useState('payg');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const form = Object.fromEntries(new FormData(e.target));
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Login failed');
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const form = Object.fromEntries(new FormData(e.target));
    form.plan = selectedPlan;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Signup failed');
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }  return (
    <div className={styles.hero}>
      {/* Top nav bar */}
      <header className="w-full px-4 sm:px-8 py-4 flex justify-between items-center">
        <div className="font-bold text-xl text-white flex items-center gap-2">
          <Globe size={28} />
          <span>Ubuntu Market</span>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.grid}>        {/* Left Side – Hero Content */}
        <div className="space-y-16">
          <div className="space-y-6">
            <h1 className={styles.title}>
              Ubuntu Market
            </h1>
            <p className={styles.subtitle}>
              Accept payments directly through WhatsApp. No app installation needed. Get paid instantly with our secure payment gateway powered by Ozow & PayShap.
            </p>
          </div>

          {/* Pricing */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Simple Pricing</h2>
            <div className={styles.pricingGrid}>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`${styles.pricingCard} ${selectedPlan === plan.id ? 'ring-2 ring-emerald-400 scale-105' : ''}`}
                >
                  {plan.popular && (
                    <span className={styles.popularBadge}>
                      MOST POPULAR
                    </span>
                  )}
                  <div className="pt-2 text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                    <div className="mb-3">
                      <span className={styles.price}>{plan.price}</span>
                      {plan.period && <span className="text-gray-600 dark:text-gray-400 ml-2">/{plan.period}</span>}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {selectedPlan === plan.id && (
                      <div className={styles.selectedBadge}>
                        ✓ Selected
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Why Choose Us</h3>
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <Smartphone className="w-8 h-8 mx-auto text-emerald-500 mb-3" />
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Instant Setup</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Start accepting payments in minutes</p>
              </div>
              <div className={styles.featureCard}>
                <Lock className="w-8 h-8 mx-auto text-emerald-500 mb-3" />
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Secure & Safe</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">PCI compliant with Ozow & PayShap</p>
              </div>
              <div className={styles.featureCard}>
                <BarChart3 className="w-8 h-8 mx-auto text-emerald-500 mb-3" />
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Real Analytics</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track payments and revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side – Auth Card */}
        <div className={styles.authCard}>
            {/* Tabs */}
            <div className={styles.authTabs}>
              <button
                onClick={() => setTab('signin')}
                className={`${styles.tab} ${tab === 'signin' ? styles.tabActive : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setTab('signup')}
                className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                Sign Up
              </button>
            </div>

            {/* Form Card */}
            <div className={styles.formCard}>
              {tab === 'signin' && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sign in to your account</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className={styles.input}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.button}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                    {!loading && <ArrowRight size={18} />}
                  </button>

                  {message && (
                    <div className={`text-sm text-center p-3 rounded-lg ${
                      message.includes('successful') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <a href="/forgot" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                      Forgot your password?
                    </a>
                  </div>
                </form>
              )}

              {tab === 'signup' && (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Start accepting payments today</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Business Name</label>
                    <input
                      name="businessName"
                      type="text"
                      required
                      placeholder="Your Business"
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="+27 123 456 7890"
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className={styles.input}
                    />
                  </div>

                  {/* Selected Plan Display */}
                  <div className={styles.planBox}>
                    <p className="text-sm text-emerald-900 dark:text-emerald-200">
                      <span className="font-semibold">Plan Selected:</span>{' '}
                      <span className="font-bold capitalize">
                        {plans.find(p => p.id === selectedPlan)?.name}
                      </span>
                    </p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      {plans.find(p => p.id === selectedPlan)?.description}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.button}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                    {!loading && <ArrowRight size={18} />}
                  </button>

                  {message && (
                    <div className={`text-sm text-center p-3 rounded-lg ${
                      message.includes('successful')
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {message}
                    </div>
                  )}
                </form>
              )}
            </div>
        </div>
      </div>
    </div>

    {/* CTA */}
    <div className={styles.ctaFooter}>
      <div className="max-w-3xl mx-auto text-center space-y-4 px-4">
        <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
        <p className={styles.ctaSubtitle}>Join 10,000+ businesses accepting payments on WhatsApp</p>
      </div>
    </div>
  </div>
  );
}

