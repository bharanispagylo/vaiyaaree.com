import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { DEFAULT_FOOTER_SETTINGS } from '@/app/api/footer-settings/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const { data, error } = await mysqlClient
            .from('app_settings')
            .select('key, value')
            .like('key', 'footer_%');

        if (error) {
            console.error('[ADMIN-FOOTER-SETTINGS-GET-ERROR]', error);
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

        return NextResponse.json({ success: true, settings: settingsMap });
    } catch (e) {
        console.error('[ADMIN-FOOTER-SETTINGS-GET-EXCEPTION]', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const settings = body.settings || {};

        const updates = Object.entries(settings).map(([key, value]) => ({
            key,
            value: typeof value === 'object' ? JSON.stringify(value) : (value?.toString() || ''),
            updated_at: new Date().toISOString()
        }));

        if (updates.length > 0) {
            const { error } = await mysqlClient
                .from('app_settings')
                .upsert(updates);

            if (error) {
                console.error('[ADMIN-FOOTER-SETTINGS-UPSERT-ERROR]', error);
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, message: 'Footer settings saved successfully!' });
    } catch (e) {
        console.error('[ADMIN-FOOTER-SETTINGS-POST-EXCEPTION]', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
