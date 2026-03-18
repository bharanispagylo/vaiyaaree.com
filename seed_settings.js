const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupSettingsTable() {
    console.log('--- Setting up App Settings Table ---');

    // Check if table exists
    const { error: checkError } = await supabase.from('app_settings').select('count', { count: 'exact', head: true });

    if (checkError) {
        console.log('Table might not exist. Please run the SQL manually in Supabase SQL Editor if this script fails to insert data.');
        console.log('Since we cannot create tables via JS client without Service Role (usually), we will attempt to just insert data if table exists, or warn user.');
    }

    const defaultSettings = [
        { key: 'wa_welcome_message', value: "🌸 *Welcome to Cast Prince Premium* 🌸\n\nHow may we assist you today?", description: 'Main greeting message sent on Hi/Menu' },
        { key: 'wa_welcome_image', value: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85', description: 'Image URL for the welcome message' },
        { key: 'wa_contact_message', value: "📞 *Contact Support*\n\nFor assistance, please call us at:\n+91 75581 89732\n\nOr email:\ncastprinceofficial@gmail.com", description: 'Contact support message' },
        { key: 'wa_catalog_header', value: 'PREMIUM COLLECTIONS', description: 'Header for the main catalog list' },
        { key: 'wa_catalog_body', value: 'Curated just for you:', description: 'Body text for the main catalog list' }
    ];

    for (const setting of defaultSettings) {
        const { error } = await supabase.from('app_settings').upsert(setting, { onConflict: 'key' });
        if (error) console.error(`Failed to upsert ${setting.key}:`, error.message);
        else console.log(`Configured: ${setting.key}`);
    }
}

setupSettingsTable();
