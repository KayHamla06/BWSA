import './style.css';
import { Providers } from './providers';

export const metadata = {
  title: 'WhatsApp PayShap - Payment Links for WhatsApp',
  description: 'Generate and send payment links through WhatsApp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 min-h-screen flex flex-col text-gray-900 dark:text-white">
        <Providers>
          <main className="w-full flex-1 flex flex-col">
            {children}
          </main>
          <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto py-8 px-4 w-full bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400 text-sm">
              <p>© 2025 WhatsApp PayShap. All rights reserved. | Securely powered by Ozow & PayShap</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}