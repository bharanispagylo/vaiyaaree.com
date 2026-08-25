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
                'razorpay_key_id', 'razorpay_key_secret', 'razorpay_enabled', 'razorpay_title', 'razorpay_logo',
                'phonepe_merchant_id', 'phonepe_salt_key', 'phonepe_salt_index', 'phonepe_env', 'phonepe_enabled', 'phonepe_title', 'phonepe_logo',
                'default_gateway'
            ]);

        if (error) throw error;

        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });

        // Fallback to defaults
        return {
            razorpay_key_id: settings.razorpay_key_id || process.env.RAZORPAY_KEY_ID,
            razorpay_key_secret: settings.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET,
            razorpay_enabled: settings.razorpay_enabled !== 'false', // Default true if not explicitly false
            razorpay_title: settings.razorpay_title || 'Pay with Razorpay',
            razorpay_logo: settings.razorpay_logo || '/favicon.ico',
            phonepe_merchant_id: settings.phonepe_merchant_id || process.env.PHONEPE_MERCHANT_ID,
            phonepe_salt_key: settings.phonepe_salt_key || process.env.PHONEPE_SALT_KEY,
            phonepe_salt_index: settings.phonepe_salt_index || process.env.PHONEPE_SALT_INDEX || '1',
            phonepe_env: settings.phonepe_env || process.env.PHONEPE_ENV || 'sandbox',
            phonepe_enabled: settings.phonepe_enabled !== 'false', // Default true
            phonepe_title: settings.phonepe_title || 'Pay with PhonePe',
            phonepe_logo: settings.phonepe_logo || '/favicon.ico',
            default_gateway: settings.default_gateway || 'razorpay'
        };
    } catch (err) {
        console.error('Error in getGatewaySettings:', err);
        return {
            razorpay_key_id: process.env.RAZORPAY_KEY_ID,
            razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET,
            phonepe_merchant_id: process.env.PHONEPE_MERCHANT_ID,
            phonepe_salt_key: process.env.PHONEPE_SALT_KEY,
            phonepe_salt_index: process.env.PHONEPE_SALT_INDEX || '1',
            phonepe_env: process.env.PHONEPE_ENV || 'sandbox'
        };
    }
}
