import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';

export async function getAdminSettings() {
    try {
        const { data, error } = await mysqlClient
            .from('app_settings')
            .select('*')
            .in('key', ['admin_username', 'admin_password', 'admin_recovery_pin', 'admin_email']);

        if (error) throw error;

        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });

        // Use database value if it exists, otherwise fall back to environment variables
        return {
            admin_username: settings.admin_username || process.env.ADMIN_USERNAME,
            admin_password: settings.admin_password || process.env.ADMIN_PASSWORD,
            admin_recovery_pin: settings.admin_recovery_pin || process.env.ADMIN_RECOVERY_PIN,
            admin_email: settings.admin_email || process.env.ADMIN_EMAIL
        };
    } catch (err) {
        console.error('Error in getAdminSettings:', err);
        return {
            admin_username: process.env.ADMIN_USERNAME,
            admin_password: process.env.ADMIN_PASSWORD,
            admin_recovery_pin: process.env.ADMIN_RECOVERY_PIN,
            admin_email: process.env.ADMIN_EMAIL
        };
    }
}

export async function getGatewaySettings() {
    try {
        const { data, error } = await mysqlClient
            .from('app_settings')
            .select('*')
            .in('key', [
                'razorpay_mode', 'razorpay_enabled', 'razorpay_title', 'razorpay_logo',
                'razorpay_test_key_id', 'razorpay_test_key_secret',
                'razorpay_live_key_id', 'razorpay_live_key_secret',
                'razorpay_key_id', 'razorpay_key_secret',
                'default_gateway'
            ]);

        if (error) throw error;

        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });

        const mode = settings.razorpay_mode || 'test';
        const activeKeyId = mode === 'live'
            ? (settings.razorpay_live_key_id || settings.razorpay_key_id || process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID)
            : (settings.razorpay_test_key_id || settings.razorpay_key_id || process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID);

        const activeKeySecret = mode === 'live'
            ? (settings.razorpay_live_key_secret || settings.razorpay_key_secret || process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
            : (settings.razorpay_test_key_secret || settings.razorpay_key_secret || process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET);

        return {
            razorpay_mode: mode,
            razorpay_key_id: activeKeyId,
            razorpay_key_secret: activeKeySecret,
            razorpay_test_key_id: settings.razorpay_test_key_id || settings.razorpay_key_id || '',
            razorpay_test_key_secret: settings.razorpay_test_key_secret || settings.razorpay_key_secret || '',
            razorpay_live_key_id: settings.razorpay_live_key_id || '',
            razorpay_live_key_secret: settings.razorpay_live_key_secret || '',
            razorpay_enabled: settings.razorpay_enabled !== 'false',
            razorpay_title: settings.razorpay_title || 'Pay Online (UPI, Cards, NetBanking)',
            default_gateway: settings.default_gateway || 'razorpay'
        };
    } catch (err) {
        console.error('Error in getGatewaySettings:', err);
        return {
            razorpay_mode: 'test',
            razorpay_key_id: process.env.RAZORPAY_KEY_ID,
            razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET,
            razorpay_enabled: true
        };
    }
}
