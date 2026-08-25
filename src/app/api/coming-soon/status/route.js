import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { data, error } = await mysqlClient
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

        if (error) {
            console.error('[COMING-SOON-GET-ERROR]', error);
        }

        const settings = {};
        (data || []).forEach(item => {
            settings[item.key] = item.value;
        });

        return NextResponse.json({
            success: true,
            enabled: settings.coming_soon_enabled === 'true' || settings.coming_soon_enabled === '1',
            title: settings.coming_soon_title || 'We Are Weaving Something Extraordinary',
            subtitle: settings.coming_soon_subtitle || 'Experience the timeless grace of authentic handloom silk & cotton sarees. Our grand digital boutique is opening soon.',
            launch_date: settings.coming_soon_launch_date || '',
            phone: settings.coming_soon_phone || '8667793292',
            email: settings.coming_soon_email || 'vaiyaaree@gmail.com',
            whatsapp: settings.coming_soon_whatsapp || '8667793292',
            instagram: settings.coming_soon_instagram || 'https://instagram.com/vaiyaaree',
            facebook: settings.coming_soon_facebook || 'https://facebook.com/vaiyaaree',
            logo: settings.shop_logo || '/images/vaiyaaree-logo.png',
            shop_name: settings.shop_name || 'Vaiyaaree Sarees'
        });
    } catch (err) {
        console.error('[COMING-SOON-STATUS-ERROR]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            enabled,
            title,
            subtitle,
            launch_date,
            phone,
            email,
            whatsapp,
            instagram,
            facebook
        } = body;

        const updates = [
            { key: 'coming_soon_enabled', value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() },
            { key: 'coming_soon_title', value: title || '', updated_at: new Date().toISOString() },
            { key: 'coming_soon_subtitle', value: subtitle || '', updated_at: new Date().toISOString() },
            { key: 'coming_soon_launch_date', value: launch_date || '', updated_at: new Date().toISOString() },
            { key: 'coming_soon_phone', value: phone || '', updated_at: new Date().toISOString() },
            { key: 'coming_soon_email', value: email || '', updated_at: new Date().toISOString() },
            { key: 'coming_soon_whatsapp', value: whatsapp || '', updated_at: new Date().toISOString() },
            { key: 'coming_soon_instagram', value: instagram || '', updated_at: new Date().toISOString() },
            { key: 'coming_soon_facebook', value: facebook || '', updated_at: new Date().toISOString() }
        ];

        const { error } = await mysqlClient
            .from('app_settings')
            .upsert(updates);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Coming Soon settings saved successfully' });
    } catch (err) {
        console.error('[COMING-SOON-SAVE-ERROR]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
