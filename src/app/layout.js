import './globals.css';
import { Providers } from './providers';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata = {
    title: "Cast Print | Premium Saree Collection",
    description: "Discover the finest selection of premium sarees at Cast Print. Hand-block prints, traditional weaves, and modern elegance.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import WhatsAppWidget from '@/components/WhatsAppWidget';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <Providers>
          {children}
          <WhatsAppWidget />
        </Providers>
      </body>
    </html>
  );
}
