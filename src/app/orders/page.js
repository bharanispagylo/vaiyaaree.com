'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrdersRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/profile?tab=orders');
    }, [router]);

    return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#666' }}>Redirecting to your orders...</p>
        </div>
    );
}
