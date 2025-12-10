'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  Link as LinkIcon,
  Users,
  Settings,
  Shield,
  Zap,
  FileText,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/links', label: 'Payment Links', icon: LinkIcon },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/api-usage', label: 'API Usage', icon: Zap },
  { href: '/business', label: 'Business', icon: Settings },
  { href: '/billing', label: 'Billing', icon: FileText },
  { href: '/security', label: 'Security', icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 glass border-r h-screen sticky top-16 overflow-y-auto">
      <div className="p-6 space-y-8">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}