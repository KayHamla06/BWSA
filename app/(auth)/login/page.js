'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (!result.success) {
      toast.error(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        {/* Tabs */}
        <div className={styles.tabs}>
          <Link href="/login" className={`${styles.tab} ${styles.tabActive}`}>
            Sign In
          </Link>
          <Link href="/register" className={`${styles.tab} ${styles.tabInactive}`}>
            Sign Up
          </Link>
        </div>

        {/* Main Card */}
        <div className={styles.glassCard}>
          <div className="text-center mb-10">
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>Sign in to your Ubuntu Market account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={22} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={22} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={22} />
                </>
              )}
            </button>
          </form>

          <div className={styles.demoBox}>
            <p className={styles.demoText}>
              Demo: Use any email + any password to test instantly
            </p>
          </div>

          <p className={styles.footerLink}>
            Don't have an account?{' '}
            <Link href="/register">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}