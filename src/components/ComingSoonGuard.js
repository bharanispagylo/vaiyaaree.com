'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { mysqlClient } from '@/lib/mysqlClient';
import ComingSoonPage from '@/components/ComingSoonPage';

export default function ComingSoonGuard({ children, initialSettings = null }) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/api');
    const [settings, setSettings] = useState(initialSettings);

    useEffect(() => {
        if (isAdminRoute) return;

        const checkStatus = async () => {
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
                        'shop_name'
                    ]);

                if (data && data.length > 0) {
                    const map = {};
                    data.forEach(item => { map[item.key] = item.value; });

                    const enabled = map.coming_soon_enabled === 'true' || 
                                    map.coming_soon_enabled === '1' || 
                                    map.coming_soon_enabled === true;

                    if (enabled) {
                        setSettings({
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
                        });
                    } else {
                        setSettings(null);
                    }
                } else {
                    setSettings(null);
                }
            } catch (err) {
                console.error('[COMING-SOON-CLIENT-SYNC-ERROR]', err);
            }
        };

        checkStatus();
    }, [pathname, isAdminRoute]);

    // Admin & API routes are never blocked
    if (isAdminRoute) {
        return <>{children}</>;
    }

    // Both Server and Client match 100% on the initial hydration pass!
    if (settings?.enabled) {
        return <ComingSoonPage settings={settings} />;
    }

    return <>{children}</>;
}
