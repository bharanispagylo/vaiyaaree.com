const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'sb_publishable_feSSpEm4OCNKEAB0SOgx0A_nuYPeW-v';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogo() {
    const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'shop_logo').single();
    if (error) console.error('Error:', error);
    else console.log(JSON.stringify(data, null, 2));
}

checkLogo();
