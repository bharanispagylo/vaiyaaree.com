import dotenv from 'dotenv';
import fs from 'fs';
if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

import { sendOrderStatusEmail } from '../src/lib/emailService.js';

async function testOrderStatusEmails() {
    console.log('--- Testing Order Status Email Sending ---');

    const testOrder = {
        id: 'ORD-0028',
        invoice_no: 'INV-0028',
        customer_name: 'Mano Sebastin',
        customer_email: 'manosebastin7@gmail.com',
        customer_phone: '918190952901',
        total_amount: 2499,
        subtotal: 2499,
        payment_method: 'UPI',
        status: 'SHIPPED',
        courier_name: 'Blue Dart',
        tracking_number: 'BD987654321',
        tracking_url: 'https://www.bluedart.com',
        order_items: [
            {
                product_name: 'Pure Kanjivaram Silk Saree',
                variant_name: 'Maroon / Gold Zari',
                quantity: 1,
                price_at_time: 2499,
                image_url: 'https://vaiyaaree.com/images/products/saree-1.jpg'
            }
        ]
    };

    console.log('Sending SHIPPED status email with PDF attachment...');
    const result = await sendOrderStatusEmail(testOrder, 'SHIPPED');
    console.log('Result:', result);

    if (result.success) {
        console.log('✅ SHIPPED status email successfully sent to customer!');
    } else {
        console.error('❌ Failed to send status email:', result.error);
        process.exit(1);
    }
}

testOrderStatusEmails().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
