import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const DEFAULT_HEADER_SETTINGS = {
    shop_logo: '/images/vaiyaaree-logo.png',
    header_logo_text: 'VAIYAAREE',
    header_logo_caption: 'SILKS & WEAVES',
    header_announcement_text: 'FREE ALL-INDIA SHIPPING • 100% AUTHENTIC HANDLOOM SILKS',
    header_phone: '+91 86677 93292'
};

export async function GET() {
    try {
        const { data, error } = await mysqlClient
            .from('app_settings')
            .select('key, value')
            .in('key', [
                'shop_logo',
                'shop_name',
                'header_logo_text',
                'header_logo_caption',
                'header_announcement_text',
                'header_phone',
                'support_phone'
            ]);

        if (error) {
            console.error('[HEADER-SETTINGS-API-GET-ERROR]', error);
            return NextResponse.json({ success: true, settings: DEFAULT_HEADER_SETTINGS });
        }

        const settingsMap = { ...DEFAULT_HEADER_SETTINGS };

        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item && item.key && item.value !== null && item.value !== undefined && item.value !== '') {
                    settingsMap[item.key] = item.value;
                }
            });
        }

        // Fallbacks if header specific keys are not set
        if (!settingsMap.header_logo_text && settingsMap.shop_name) {
            settingsMap.header_logo_text = settingsMap.shop_name;
        }
        if (!settingsMap.header_phone && settingsMap.support_phone) {
            settingsMap.header_phone = settingsMap.support_phone;
        }

        return NextResponse.json({ success: true, settings: settingsMap });
    } catch (e) {
        console.error('[HEADER-SETTINGS-GET-EXCEPTION]', e);
        return NextResponse.json({ success: true, settings: DEFAULT_HEADER_SETTINGS });
    }
}
