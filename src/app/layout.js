import './globals.css';
import { Providers } from './providers';

export const metadata = {
    title: "Cast Print | Premium Saree Collection",
    description: "Discover the finest selection of premium sarees at Cast Print. Hand-block prints, traditional weaves, and modern elegance.",
};

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
