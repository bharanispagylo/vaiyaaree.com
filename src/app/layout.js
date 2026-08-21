import './globals.css';
import { Providers } from './providers';
import { supabase } from '@/lib/supabaseClient';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import ComingSoonGuard from '@/components/ComingSoonGuard';

export const metadata = {
    title: "Vaiyaaree | Premium Saree Collection",
    description: "Discover the finest selection of premium sarees at Vaiyaaree. Hand-block prints, traditional weaves, and modern elegance.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RootLayout({ children }) {
    let initialComingSoon = null;

    try {
        const { data } = await supabase
            .from('app_settings')
            .select('key, value')
            .in('key', [
                'coming_soon_enabled',
                'coming_soon_title',
                'coming_soon_subtitle',
                'coming_soon_launch_date',
                'coming_soon_phone',
                'coming_soon_email',
                'coming_soon_whatsapp',
                'coming_soon_instagram',
                'coming_soon_facebook',
                'shop_logo',
                'shop_name'
            ]);

        if (data && data.length > 0) {
            const map = {};
            data.forEach(item => { map[item.key] = item.value; });

            const enabled = map.coming_soon_enabled === 'true' || 
                            map.coming_soon_enabled === '1' || 
                            map.coming_soon_enabled === true;

            if (enabled) {
                initialComingSoon = {
                    enabled: true,
                    title: map.coming_soon_title || 'We Are Weaving Something Extraordinary',
                    subtitle: map.coming_soon_subtitle || 'Experience the timeless grace of authentic handloom silk & cotton sarees. Our grand digital boutique is opening soon.',
                    launch_date: map.coming_soon_launch_date || '',
                    phone: map.coming_soon_phone || '8667793292',
                    email: map.coming_soon_email || 'vaiyaaree@gmail.com',
                    whatsapp: map.coming_soon_whatsapp || '8667793292',
                    instagram: map.coming_soon_instagram || 'https://instagram.com/vaiyaaree',
                    facebook: map.coming_soon_facebook || 'https://facebook.com/vaiyaaree',
                    logo: map.shop_logo || '/images/vaiyaaree-logo.png',
                    shop_name: map.shop_name || 'Vaiyaaree Sarees'
                };
            }
        }
    } catch (e) {
        console.error('[ROOT-LAYOUT-SSR-COMING-SOON-ERROR]', e);
    }

    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <ComingSoonGuard initialSettings={initialComingSoon}>
                    <Providers>
                        {children}
                        <WhatsAppWidget />
                    </Providers>
                </ComingSoonGuard>
            </body>
        </html>
    );
}
