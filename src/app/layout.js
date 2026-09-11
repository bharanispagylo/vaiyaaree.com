import './globals.css';
import { Providers } from './providers';
import { mysqlClient } from '@/lib/mysqlClient';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import ComingSoonGuard from '@/components/ComingSoonGuard';
import StorefrontDynamicFontLoader from '@/components/StorefrontDynamicFontLoader';
import { getGoogleFontsStylesheetUrl } from '@/lib/googleFontsList';

export const metadata = {
    title: "Vaiyaaree | Premium Saree Collection",
    description: "Discover the finest selection of premium sarees at Vaiyaaree. Hand-block prints, traditional weaves, and modern elegance.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RootLayout({ children }) {
    let initialComingSoon = null;
    let themeFontBody = 'Plus Jakarta Sans';
    let themeFontHeading = 'Cinzel';

    try {
        const { data } = await mysqlClient
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
                'shop_name',
                'theme_font_body',
                'theme_font_heading'
            ]);

        if (data && data.length > 0) {
            const map = {};
            data.forEach(item => { map[item.key] = item.value; });

            if (map.theme_font_body && map.theme_font_body.trim()) {
                themeFontBody = map.theme_font_body.trim();
            }
            if (map.theme_font_heading && map.theme_font_heading.trim()) {
                themeFontHeading = map.theme_font_heading.trim();
            }

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
        console.error('[ROOT-LAYOUT-SSR-SETTINGS-ERROR]', e);
    }

    const googleFontsHref = getGoogleFontsStylesheetUrl(themeFontBody, themeFontHeading);

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link 
                    href={googleFontsHref}
                    rel="stylesheet" 
                />
                <style id="vaiyaaree-ssr-theme-fonts" dangerouslySetInnerHTML={{
                    __html: `
                        :root {
                            --font-body: "${themeFontBody}", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                            --font-primary: "${themeFontBody}", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                            --font-heading: "${themeFontHeading}", "${themeFontBody}", serif !important;
                            --font-serif-royal: "${themeFontHeading}", "Cinzel", serif !important;
                        }
                    `
                }} />
            </head>
            <body suppressHydrationWarning>
                <StorefrontDynamicFontLoader bodyFont={themeFontBody} headingFont={themeFontHeading} />
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
