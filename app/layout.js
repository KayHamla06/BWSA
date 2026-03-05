import './globals.css'; // Only Tailwind only
import { Providers } from './providers';

export const metadata = {
  title: 'WhatsApp PayShap - Payment Links for WhatsApp',
  description: 'Generate and send payment links through WhatsApp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 min-h-screen text-gray-900 dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}