import './globals.css';
import { Providers } from './providers';
export const metadata = {
    title: "Vaiyaaree | Premium Saree Collection",
    description: "Discover the finest selection of premium sarees at Vaiyaaree. Hand-block prints, traditional weaves, and modern elegance.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import WhatsAppWidget from '@/components/WhatsAppWidget';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <WhatsAppWidget />
        </Providers>
      </body>
    </html>
  );
}

