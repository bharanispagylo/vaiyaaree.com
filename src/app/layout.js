import './globals.css';
import { Providers } from './providers';
export const metadata = {
    title: "Cast Printz | Premium Saree Collection",
    description: "Discover the finest selection of premium sarees at Cast Printz. Hand-block prints, traditional weaves, and modern elegance.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import WhatsAppWidget from '@/components/WhatsAppWidget';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <WhatsAppWidget />
        </Providers>
      </body>
    </html>
  );
}
