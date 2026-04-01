const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'sb_publishable_feSSpEm4OCNKEAB0SOgx0A_nuYPeW-v';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLogo() {
    console.log('Updating logo setting...');
    const { error } = await supabase.from('app_settings').upsert({
        key: 'shop_logo',
        value: '/images/cp-logo.png'
    });
    if (error) console.error('Error:', error);
    else console.log('Logo setting updated to local path.');
}

updateLogo();
