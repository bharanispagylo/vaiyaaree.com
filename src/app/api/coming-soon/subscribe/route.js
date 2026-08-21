import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'coming_soon_subscribers')
            .maybeSingle();

        let subscribers = [];
        if (data?.value) {
            try {
                subscribers = JSON.parse(data.value);
            } catch (e) {
                subscribers = [];
            }
        }

        return NextResponse.json({ success: true, subscribers, count: subscribers.length });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, phone } = body;

        if (!email && !phone) {
            return NextResponse.json({ success: false, message: 'Please provide an email or phone number' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'coming_soon_subscribers')
            .maybeSingle();

        let subscribers = [];
        if (data?.value) {
            try {
                subscribers = JSON.parse(data.value);
            } catch (e) {
                subscribers = [];
            }
        }

        // Check if already subscribed
        const normalizedEmail = (email || '').trim().toLowerCase();
        const normalizedPhone = (phone || '').replace(/\D/g, '');

        const alreadyExists = subscribers.some(s => 
            (normalizedEmail && s.email?.toLowerCase() === normalizedEmail) ||
            (normalizedPhone && s.phone?.replace(/\D/g, '') === normalizedPhone)
        );

        if (!alreadyExists) {
            subscribers.unshift({
                email: normalizedEmail,
                phone: normalizedPhone,
                subscribed_at: new Date().toISOString()
            });

            await supabase
                .from('app_settings')
                .upsert({
                    key: 'coming_soon_subscribers',
                    value: JSON.stringify(subscribers),
                    updated_at: new Date().toISOString()
                });
        }

        return NextResponse.json({
            success: true,
            message: alreadyExists 
                ? "You're already on our VIP list! We will notify you first." 
                : "Thank you! You've been added to our VIP launch list."
        });
    } catch (err) {
        console.error('[COMING-SOON-SUBSCRIBE-ERROR]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
