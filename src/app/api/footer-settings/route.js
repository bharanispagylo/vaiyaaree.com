import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const DEFAULT_FOOTER_SETTINGS = {
    footer_brand_name: 'VAIYAAREE',
    footer_brand_sub: 'AUTHENTIC HANDLOOM SILKS',
    footer_logo_image: '/images/vaiyaaree-logo.png',
    footer_tagline: 'Celebrating the timeless elegance of Indian handloom weaves, master artisans, and authentic silk craftsmanship.',
    footer_address: 'Coimbatore, Tamil Nadu - 641015.',
    footer_email: 'vaiyaaree@gmail.com',
    footer_phone: '+91 86677 93292',
    footer_col2_title: 'OUR BOUTIQUE',
    footer_nav_links: JSON.stringify([
        { label: 'Our Heritage & Story', href: '/about-us' },
        { label: 'Explore Collections', href: '/shop' },
        { label: 'Contact Our Stylists', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Return & Exchange Policy', href: '/return-policy' },
        { label: 'Shipping & Delivery Policy', href: '/shipping-policy' },
        { label: 'Terms & Conditions', href: '/terms-and-conditions' },
        { label: 'Refund Policy', href: '/refund-cancellation-policy' }
    ]),
    footer_col3_title: 'CONNECT WITH US',
    footer_instagram_handle: '@vaiyaaree',
    footer_instagram_url: 'https://www.instagram.com/vaiyaaree',
    footer_whatsapp_number: '+91 86677 93292',
    footer_whatsapp_link: 'https://wa.me/918667793292',
    footer_facebook_url: 'https://facebook.com/vaiyaaree',
    footer_youtube_url: '',
    footer_show_seal: 'true',
    footer_seal_title: '100% PURE SILK MARK',
    footer_seal_sub: 'Handloom Certified Drapes',
    footer_copyright_text: '© {year} Vaiyaaree. Handcrafted with devotion in South India.',
    footer_show_rangoli: 'true',
    footer_show_scroll_top: 'true'
};

export async function GET() {
    try {
        const { data, error } = await mysqlClient
            .from('app_settings')
            .select('key, value')
            .like('key', 'footer_%');

        if (error) {
            console.error('[FOOTER-SETTINGS-API-GET-ERROR]', error);
            return NextResponse.json({ success: true, settings: DEFAULT_FOOTER_SETTINGS });
        }

        const settingsMap = { ...DEFAULT_FOOTER_SETTINGS };

        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item && item.key && item.value !== null && item.value !== undefined) {
                    settingsMap[item.key] = item.value;
                }
            });
        }

        // Also check if shop_logo, shop_name, shop_address have been customized in general settings as fallback
        if (settingsMap.footer_logo_image === '/images/vaiyaaree-logo.png') {
            const { data: logoData } = await mysqlClient
                .from('app_settings')
                .select('value')
                .eq('key', 'shop_logo')
                .maybeSingle();
            if (logoData?.value) {
                settingsMap.fallback_logo = logoData.value;
            }
        }

        return NextResponse.json({ success: true, settings: settingsMap });
    } catch (e) {
        console.error('[FOOTER-SETTINGS-GET-EXCEPTION]', e);
        return NextResponse.json({ success: true, settings: DEFAULT_FOOTER_SETTINGS });
    }
}
