import { Roboto } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  display: 'swap',
});

export const metadata = {
    title: "Cast Printz | Premium Saree Collection",
    description: "Discover the finest selection of premium sarees at Cast Printz. Hand-block prints, traditional weaves, and modern elegance.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import WhatsAppWidget from '@/components/WhatsAppWidget';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.className}>
      <body className={roboto.className}>
        <Providers>
          {children}
          <WhatsAppWidget />
        </Providers>
      </body>
    </html>
  );
}
