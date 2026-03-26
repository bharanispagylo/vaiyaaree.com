
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const pages = [
    {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: `
            <h2>Privacy Policy</h2>
            <p>This privacy policy has been compiled to better serve those who are concerned with how their ‘personally identifiable information’ (PII) is being used online.</p>
            <h3>What personal information do we collect?</h3>
            <p>When ordering or registering on our site, you may be asked to enter your name, email address, phone number to help you with your experience.</p>
            <h3>When do we collect information?</h3>
            <p>We collect information from you when you register on our site, fill out a form or enter information on our site.</p>
            <h3>How do we protect visitor information?</h3>
            <ul>
                <li>Our website is scanned on a regular basis for security holes and known vulnerabilities.</li>
                <li>We use regular malware scanning.</li>
                <li>We use an SSL certificate.</li>
            </ul>
            <h3>Do we use ‘cookies’?</h3>
            <p>Yes. Cookies are small files that a site or its service provider transfers to your computer’s hard drive that enables the site’s systems to recognize your browser and capture and remember certain information.</p>
            <h3>Third party disclosure</h3>
            <p>We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information.</p>
            <h3>Contacting Us</h3>
            <p>If there are any questions regarding this privacy policy you may contact us at <strong>castprintzcbe@gmail.com</strong></p>
        `
    },
    {
        slug: 'terms-and-conditions',
        title: 'Terms and Conditions',
        content: `
            <h2>Terms and Conditions</h2>
            <p>Welcome to Castprintz. If you continue to browse and use this website, you are agreeing to comply with and be bound by the following terms and conditions of use.</p>
            <p>The term ‘Castprintz’ or ‘us’ or ‘we’ refers to the owner of the website whose registered office is 16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015. The term ‘you’ refers to the user or viewer of our website.</p>
            <h3>The use of this website is subject to the following terms:</h3>
            <ul>
                <li>The content of the pages of this website is for your general information and use only. It is subject to change without notice.</li>
                <li>This website uses cookies to monitor browsing preferences.</li>
                <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website.</li>
                <li>Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable.</li>
                <li>This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance and graphics.</li>
                <li>Unauthorised use of this website may give rise to a claim for damages and/or be a criminal offence.</li>
                <li>Your use of this website and any dispute arising out of such use is subject to the laws of India.</li>
            </ul>
        `
    },
    {
        slug: 'shipping-policy',
        title: 'Shipping Policy',
        content: `
            <h2>Shipping Policy</h2>
            <p>Castprintz endeavours to ship purchases within <strong>48 hours</strong> of receiving your order.</p>
            <p>Each address you instruct us to ship to, including gift-recipient addresses, is considered a separate order and is subject to applicable shipping charges.</p>
            <p><strong>Shipping within India is a complementary service.</strong></p>
            <p>Please note at the time of order creation you are clearing the freight charge only; any custom clearance if any will have to be borne by you or the recipient of the package.</p>
            <h3>Delivery Timelines:</h3>
            <ul>
                <li><strong>Shipping within India:</strong> Please allow 3 to 4 working days for delivery.</li>
                <li><strong>International Delivery:</strong> Please allow 10-12 working days.</li>
                <li><strong>Customization (Saree Finishing):</strong> Will take additional 7 to 15 working days depending on the customization.</li>
            </ul>
        `
    },
    {
        slug: 'return-policy',
        title: 'Return Policy',
        content: `
            <h2>Return Policy</h2>
            <p>Thank you for choosing Castprintz. We are committed to providing you with exquisite sarees and exceptional customer service.</p>
            <h3>1. Non-Returnable Items</h3>
            <p>Due to the unique nature of sarees and for hygiene reasons, <strong>we do not accept returns or exchanges</strong> for sarees once they have been purchased and delivered. This policy applies to all sarees variations available for purchase on our website.</p>
            <h3>2. Quality Assurance</h3>
            <p>We take pride in the quality and craftsmanship of our sarees. <strong>We will accept returns only if there is any damage or defect in the items.</strong></p>
            <h3>3. Order Changes and Cancellations</h3>
            <p>Once an order for a saree has been placed, changes or cancellations cannot be guaranteed. please contact us at +91 8048969312 as soon as possible.</p>
            <h3>4. Contact Us</h3>
            <p>If you have any questions, please contact our customer service team at <strong>+91 8048969312</strong> or email <strong>castprintzcbe@gmail.com</strong>.</p>
        `
    },
    {
        slug: 'refund-cancellation-policy',
        title: 'Refund and Cancellation Policy',
        content: `
            <h2>Refund and Cancellation Policy</h2>
            <p>Castprintz reserves the right to cancel the received order, or delay the order because of insufficient quantity, national holidays, or force-majeure events.</p>
            <ul>
                <li>In case Castprintz cancels an order, <strong>100% refund</strong> will be paid to the customer.</li>
                <li>Orders booked by the customer shall not be cancelled by the customer for refund. In case of cancellation, the amount received will be adjusted against the next transaction only (Valid for 1 month).</li>
                <li>Late payment, wrong bank details, or insufficient funds are at your own risk and you shall not be entitled to any refund.</li>
            </ul>
            <h3>Modifications</h3>
            <p>Reviewing of order placed, adjustment, change or modification of order, can be done through our customer care department by sending e-mail to <strong>castprintzcbe@gmail.com</strong> or by calling <strong>+91 8048969312</strong>.</p>
        `
    },
    {
        slug: 'disclaimer',
        title: 'Disclaimer',
        content: `
            <h2>Disclaimer</h2>
            <p>The information contained in this website is for general information purposes only. The information is provided by Castprintz and while we endeavour to keep the information up to date and correct, we make no representations or warranties of any kind.</p>
            <p>In no event will we be liable for any loss or damage including without limitation, indirect or consequential loss or damage arising out of, or in connection with, the use of this website.</p>
            <p>Through this website you are able to link to other websites which are not under the control of Castprintz. The inclusion of any links does not necessarily imply a recommendation or endorse the views expressed within them.</p>
            <p>Every effort is made to keep the website up and running smoothly. However, Castprintz takes no responsibility for the website being temporarily unavailable due to technical issues beyond our control.</p>
        `
    },
    {
        slug: 'about-us',
        title: 'About Us',
        content: `
            <h2>Hi there! We’re Castprintz</h2>
            <p>Passionate lovers of traditional fashion and culture, our aim is to bring the timeless elegance of sarees into the modern world.</p>
            <p>We believe that every woman should experience the magic of draping a saree, feeling the luxurious fabric flowing around her, and carrying herself with grace and confidence. We curate a beautiful collection of sarees that showcase the best of Indian craftsmanship and artistry.</p>
            <p>From vibrant hues and intricate weaves to delicate embroidery and embellishments, each piece in my collection is a masterpiece in its own right.</p>
            <p>Whether you’re looking for work wear, a festive occasion, or just to add to your wardrobe, you’ll find something that captures your heart in our collection.</p>
        `
    }
];

async function updatePages() {
    for (const page of pages) {
        console.log(`Updating ${page.slug}...`);
        const { error } = await supabase
            .from('cms_pages')
            .upsert({ 
                slug: page.slug, 
                title: page.title, 
                content: page.content,
                status: 'published',
                updated_at: new Date().toISOString()
            }, { onConflict: 'slug' });
        
        if (error) {
            console.error(`Error updating ${page.slug}:`, error);
        } else {
            console.log(`Successfully updated ${page.slug}`);
        }
    }
}

updatePages();
