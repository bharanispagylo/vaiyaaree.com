import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DEFAULT_FOOTER_SETTINGS } from '@/lib/footerConstants';
export { DEFAULT_FOOTER_SETTINGS };

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

        // Validate footer_nav_links is valid JSON array, otherwise restore default
        if (settingsMap.footer_nav_links) {
            try {
                const parsed = typeof settingsMap.footer_nav_links === 'string' ? JSON.parse(settingsMap.footer_nav_links) : settingsMap.footer_nav_links;
                if (!Array.isArray(parsed)) {
                    settingsMap.footer_nav_links = DEFAULT_FOOTER_SETTINGS.footer_nav_links;
                }
            } catch (e) {
                settingsMap.footer_nav_links = DEFAULT_FOOTER_SETTINGS.footer_nav_links;
            }
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
