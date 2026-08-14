'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';

const DEFAULT_POLICIES = {
    'privacy-policy': {
        title: 'Privacy Policy',
        content: `
            <p>This privacy policy has been compiled to better serve those who are concerned with how their personally identifiable information (PII) is being used online. PII is information that can be used on its own or with other information to identify, contact, or locate a single person, or to identify an individual in context. Please read our privacy policy carefully to get a clear understanding of how we collect, use, protect or otherwise handle your personally identifiable information in accordance with our website and applications.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">What personal information do we collect from the people that visit our blog, website or app?</h2>
            <p>When ordering or registering on our site, as appropriate, you may be asked to enter your name, email address, mailing address, phone number or other details to help you with your shopping experience.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">When do we collect information?</h2>
            <p>We collect information from you when you register on our site, place an order, subscribe to a newsletter, fill out a form, or enter information on our site.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">How do we protect visitor information?</h2>
            <p>Our website is scanned on a regular basis for security holes and known vulnerabilities in order to make your visit to our site as safe as possible.</p>
            <p>We use regular malware scanning and SSL encryption for all transaction data.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Do we use 'cookies'?</h2>
            <p>Yes. Cookies are small files that a site or its service provider transfers to your computer's hard drive through your web browser (if you allow) that enables the site's or service provider's systems to recognize your browser and capture and remember certain information. For instance, we use cookies to help us remember and process the items in your shopping cart. They are also used to help us understand your preferences based on previous or current site activity, which enables us to provide you with improved services.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">We use cookies to:</h2>
            <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">
                <li>Compile aggregate data about site traffic and site interactions in order to offer better site experiences and tools in the future. We may also use trusted third-party services that track this information on our behalf.</li>
                <li>You can choose to have your computer warn you each time a cookie is being sent, or you can choose to turn off all cookies. You do this through your browser settings.</li>
                <li>If you disable cookies, some features will be disabled. Some of our services may not function properly. However, you can still place orders.</li>
            </ul>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Third-party disclosure</h2>
            <p>We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information unless we provide users with advance notice.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Opting out</h2>
            <p>If at any time you would like to unsubscribe from receiving future emails, you can email us at <strong>vaiyaaree.cbe@gmail.com</strong> and we will promptly remove you from all correspondence.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Contacting Us</h2>
            <p>If there are any questions regarding this privacy policy, you may contact us using the information below:</p>
            <p style="background: #fdfbf7; border: 1px solid #f0e6d2; padding: 1.25rem; border-radius: 8px; margin-top: 1rem;">
                <strong>Vaiyaaree Sarees</strong><br />
                16, Dhanalakshmi Nagar Extension, Masakalipalayam Road,<br />
                Uppili Palayam, Coimbatore, Tamil Nadu - 641015<br />
                Email: <strong>vaiyaaree.cbe@gmail.com</strong>
            </p>
        `
    },
    'return-policy': {
        title: 'Return Policy',
        content: `
            <p>Thank you for choosing <strong>Vaiyaaree</strong> for your saree purchase. We are committed to providing you with exquisite sarees and exceptional customer service. Please review our return policy carefully, as it outlines our procedures regarding saree orders.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">1. Non-Returnable Items</h2>
            <p>Due to the unique nature of handcrafted sarees and for hygiene and fabric preservation reasons, we do not accept returns or exchanges for sarees once they have been purchased and delivered.</p>
            <p>This policy applies to all sarees, including printed cotton sarees, designer sarees, silk sarees, and any other saree variations available for purchase on our website.</p>
            <p>We will accept returns or replacements <strong>only if there is any genuine damage or defect in the received items</strong>, accompanied by an opening unboxing video.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">2. Quality Assurance</h2>
            <p>We take pride in the quality and craftsmanship of our sarees. Each saree undergoes thorough inspection before shipment to ensure that it meets our high quality standards.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">3. Sizing and Descriptions</h2>
            <p>We strive to provide accurate sizing information and detailed descriptions for each saree listed on our website. Minor variations in shade or weave are inherent to traditional saree weaving processes. Please review product information carefully before making your purchase.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">4. Order Changes and Cancellations</h2>
            <p>Once an order for a saree has been placed, changes or cancellations cannot be guaranteed. If you need to modify or cancel your order, please contact us as soon as possible before dispatch, and we will do our best to accommodate your request.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">5. Contact Us</h2>
            <p>If you have any questions or concerns regarding our return policy or any aspect of your saree purchase, please don’t hesitate to contact our customer service team at <strong>vaiyaaree.cbe@gmail.com</strong>. We are here to assist you in any way we can.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">6. Changes to the Return Policy</h2>
            <p><strong>Vaiyaaree</strong> reserves the right to update or modify this return policy at any time without prior notice. Any changes will be effective immediately upon posting on our website.</p>
            <p>By completing a purchase on our website, you acknowledge that you have read, understood, and agreed to our return policy regarding sarees.</p>
        `
    },
    'shipping-policy': {
        title: 'Shipping Policy',
        content: `
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Processing Time</h2>
            <p>Orders are typically processed and shipped within 1-3 business days from the date of purchase.<br />Orders placed on weekends or holidays will be processed on the next business day.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Shipping Rates</h2>
            <p>We offer flat-rate shipping to domestic and international destinations.<br />
            Domestic shipping rates may vary based on location and weight of the package.<br />
            International shipping rates are calculated based on destination and weight of the package.<br />
            Any customs duties or taxes incurred upon international shipping are the responsibility of the customer.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Shipping Times</h2>
            <p>Domestic orders in India typically arrive within 3-7 business days from the date of shipment, depending on the destination.<br />
            International orders may take 7-21 business days to arrive, depending on the destination and customs processing times.<br />
            Please note that these are estimated shipping times and actual delivery may vary based on factors beyond our control, such as customs delays or unforeseen weather circumstances.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Order Tracking</h2>
            <p>Once your order has been shipped, you will receive a confirmation message with tracking information.<br />
            Customers can track their orders using the provided tracking number through the carrier's website or link.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Shipping Address</h2>
            <p>Customers are responsible for providing accurate shipping information.<br />
            We are not liable for any delays or non-delivery of orders due to incorrect or incomplete shipping addresses provided by the customer.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Shipping Restrictions</h2>
            <p>We currently do not ship to P.O. boxes or APO/FPO addresses.<br />
            Certain items may be restricted from international shipping due to customs regulations or other restrictions.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Lost or Damaged Shipments</h2>
            <p>In the rare event that your order is lost or damaged during transit, please contact us immediately.<br />
            We will work with the shipping carrier to investigate the issue and resolve it as quickly as possible.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Contact Information</h2>
            <p>If you have any questions or concerns regarding our shipping policy, please contact us at <strong>vaiyaaree.cbe@gmail.com</strong>.</p>
        `
    },
    'terms-conditions': {
        title: 'Terms and Conditions',
        content: `
            <p>Welcome to <strong>Vaiyaaree</strong> (vaiyaaree.com). If you continue to browse and use this website, you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern Vaiyaaree's relationship with you in relation to this website. If you disagree with any part of these terms and conditions, please do not use our website.</p>
            
            <p>The term 'Vaiyaaree' or 'us' or 'we' refers to the owner of the website whose registered office is at Coimbatore, Tamil Nadu. The term 'you' refers to the user or viewer of www.vaiyaaree.com.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Terms of Use</h2>
            <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">
                <li style="margin-bottom: 0.5rem;">The content of the pages of this website is for your general information and use only. It is subject to change without notice.</li>
                <li style="margin-bottom: 0.5rem;">This website uses cookies to monitor browsing preferences. If you do allow cookies to be used, personal information such as email address and phone number may be stored by us for processing your order.</li>
                <li style="margin-bottom: 0.5rem;">Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
                <li style="margin-bottom: 0.5rem;">Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through this website meet your specific requirements.</li>
                <li style="margin-bottom: 0.5rem;">This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance, images and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</li>
                <li style="margin-bottom: 0.5rem;">All trademarks reproduced in this website which are not the property of, or licensed to, the operator are acknowledged on the website.</li>
                <li style="margin-bottom: 0.5rem;">Unauthorised use of this website may give rise to a claim for damages and/or be a criminal offence.</li>
                <li style="margin-bottom: 0.5rem;">Your use of this website and any dispute arising out of such use is subject to the laws of India and the jurisdiction of Coimbatore, Tamil Nadu.</li>
            </ul>
        `
    },
    'terms-and-conditions': {
        title: 'Terms and Conditions',
        content: `
            <p>Welcome to <strong>Vaiyaaree</strong> (vaiyaaree.com). If you continue to browse and use this website, you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern Vaiyaaree's relationship with you in relation to this website. If you disagree with any part of these terms and conditions, please do not use our website.</p>
            
            <p>The term 'Vaiyaaree' or 'us' or 'we' refers to the owner of the website whose registered office is at Coimbatore, Tamil Nadu. The term 'you' refers to the user or viewer of www.vaiyaaree.com.</p>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Terms of Use</h2>
            <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">
                <li style="margin-bottom: 0.5rem;">The content of the pages of this website is for your general information and use only. It is subject to change without notice.</li>
                <li style="margin-bottom: 0.5rem;">This website uses cookies to monitor browsing preferences. If you do allow cookies to be used, personal information such as email address and phone number may be stored by us for processing your order.</li>
                <li style="margin-bottom: 0.5rem;">Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
                <li style="margin-bottom: 0.5rem;">Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through this website meet your specific requirements.</li>
                <li style="margin-bottom: 0.5rem;">This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance, images and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</li>
                <li style="margin-bottom: 0.5rem;">All trademarks reproduced in this website which are not the property of, or licensed to, the operator are acknowledged on the website.</li>
                <li style="margin-bottom: 0.5rem;">Unauthorised use of this website may give rise to a claim for damages and/or be a criminal offence.</li>
                <li style="margin-bottom: 0.5rem;">Your use of this website and any dispute arising out of such use is subject to the laws of India and the jurisdiction of Coimbatore, Tamil Nadu.</li>
            </ul>
        `
    },
    'refund-cancellation': {
        title: 'Refund Cancellation Policy',
        content: `
            <p><strong>Vaiyaaree</strong> reserves the right to cancel the received order, or delay the order because of insufficient quantity, national holidays, courier interruptions, or force-majeure events (like floods, earthquakes, political instability, strikes etc.)</p>
            
            <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">
                <li style="margin-bottom: 0.5rem;">In case <strong>Vaiyaaree</strong> cancels an order from our end, a 100% full refund will be paid back to the customer.</li>
                <li style="margin-bottom: 0.5rem;">The order booked by the customer for the purchase of any of our products shall not be cancelled by the customer once dispatched.</li>
                <li style="margin-bottom: 0.5rem;">In case of cancellation of purchase of any of our product/services prior to dispatch, the amount once received by Vaiyaaree will be adjusted against your next transaction or refunded. This facility is valid up to 1 month from the date of cancellation of order.</li>
                <li style="margin-bottom: 0.5rem;">Late payment, wrong bank, debit or credit card details, invalid credit/debit cards or insufficient funds are at your own risk and account and you shall not be entitled to any refund of any prepaid amount.</li>
                <li style="margin-bottom: 0.5rem;">Vaiyaaree will not be liable to customer or to any other person for any direct, indirect, incidental, punitive or consequential loss, damage, cost or expense of any kind whatsoever and howsoever caused from out of the information derived by you through your usage of this site.</li>
            </ul>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Deviation, Change, or Modification of Order</h2>
            <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">
                <li style="margin-bottom: 0.5rem;">Vaiyaaree doesn't support/accept changes, modifications and cancellation to online bookings once they are shipped.</li>
                <li style="margin-bottom: 0.5rem;">Reviewing of order placed, adjustment, change or modification of order, can be done through our customer care department by sending e-mail to <strong>vaiyaaree.cbe@gmail.com</strong>, subject to receipt of full payment against such modified orders.</li>
                <li style="margin-bottom: 0.5rem;">If you wish to review or adjust your purchase, please revert to the confirmation email/WhatsApp message and follow the instructions therein.</li>
            </ul>
        `
    },
    'refund-cancellation-policy': {
        title: 'Refund Cancellation Policy',
        content: `
            <p><strong>Vaiyaaree</strong> reserves the right to cancel the received order, or delay the order because of insufficient quantity, national holidays, courier interruptions, or force-majeure events (like floods, earthquakes, political instability, strikes etc.)</p>
            
            <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">
                <li style="margin-bottom: 0.5rem;">In case <strong>Vaiyaaree</strong> cancels an order from our end, a 100% full refund will be paid back to the customer.</li>
                <li style="margin-bottom: 0.5rem;">The order booked by the customer for the purchase of any of our products shall not be cancelled by the customer once dispatched.</li>
                <li style="margin-bottom: 0.5rem;">In case of cancellation of purchase of any of our product/services prior to dispatch, the amount once received by Vaiyaaree will be adjusted against your next transaction or refunded. This facility is valid up to 1 month from the date of cancellation of order.</li>
                <li style="margin-bottom: 0.5rem;">Late payment, wrong bank, debit or credit card details, invalid credit/debit cards or insufficient funds are at your own risk and account and you shall not be entitled to any refund of any prepaid amount.</li>
                <li style="margin-bottom: 0.5rem;">Vaiyaaree will not be liable to customer or to any other person for any direct, indirect, incidental, punitive or consequential loss, damage, cost or expense of any kind whatsoever and howsoever caused from out of the information derived by you through your usage of this site.</li>
            </ul>
            
            <h2 style="font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #111;">Deviation, Change, or Modification of Order</h2>
            <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">
                <li style="margin-bottom: 0.5rem;">Vaiyaaree doesn't support/accept changes, modifications and cancellation to online bookings once they are shipped.</li>
                <li style="margin-bottom: 0.5rem;">Reviewing of order placed, adjustment, change or modification of order, can be done through our customer care department by sending e-mail to <strong>vaiyaaree.cbe@gmail.com</strong>, subject to receipt of full payment against such modified orders.</li>
                <li style="margin-bottom: 0.5rem;">If you wish to review or adjust your purchase, please revert to the confirmation email/WhatsApp message and follow the instructions therein.</li>
            </ul>
        `
    },
    'disclaimer': {
        title: 'Disclaimer',
        content: `
            <p>The information contained in this website is for general information purposes only. The information is provided by <strong>Vaiyaaree</strong> and while we endeavour to keep the information up to date and correct, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability or availability with respect to the website or the information, products, services, or related graphics contained on the website for any purpose. Any reliance you place on such information is therefore strictly at your own risk.</p>
            
            <p>In no event will we be liable for any loss or damage including without limitation, indirect or consequential loss or damage, or any loss or damage whatsoever arising from loss of data or profits arising out of, or in connection with, the use of this website.</p>
            
            <p>Through this website you are able to link to other websites which are not under the control of Vaiyaaree. We have no control over the nature, content and availability of those sites. The inclusion of any links does not necessarily imply a recommendation or endorse the views expressed within them.</p>
            
            <p>Every effort is made to keep the website up and running smoothly. However, Vaiyaaree takes no responsibility for, and will not be liable for, the website being temporarily unavailable due to technical issues beyond our control.</p>
        `
    }
};

export default function PolicyPage({ slug, title: fallbackTitle }) {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const { data } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', slug)
                    .single();
                if (data && data.content) {
                    setPage(data);
                    document.title = `${data.seo_title || data.title} | Vaiyaaree`;
                } else if (DEFAULT_POLICIES[slug]) {
                    setPage(DEFAULT_POLICIES[slug]);
                    document.title = `${DEFAULT_POLICIES[slug].title} | Vaiyaaree`;
                }
            } catch (err) {
                console.error(`Error fetching CMS page (${slug}):`, err);
                if (DEFAULT_POLICIES[slug]) {
                    setPage(DEFAULT_POLICIES[slug]);
                    document.title = `${DEFAULT_POLICIES[slug].title} | Vaiyaaree`;
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, [slug]);

    const activePage = page || DEFAULT_POLICIES[slug];

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)' }}>
            <ShopHeader />
            <div style={{ padding: '8rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading policy...</div>
            </div>
            <ShopFooter />
        </div>
    );

    if (!activePage) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ShopHeader />
            <div style={{ flex: 1, padding: '8rem 2rem', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h1>
                <p>We couldn't find the page you're looking for.</p>
            </div>
            <ShopFooter />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)' }}>
            <ShopHeader />
            <div style={{ padding: '5rem 2rem 8rem', maxWidth: '850px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 600, marginBottom: '2.5rem', color: '#111', borderBottom: '2px solid #f0e6d2', paddingBottom: '1rem' }}>
                    {activePage.title}
                </h1>
                <div 
                    className="cms-content"
                    dangerouslySetInnerHTML={{ __html: activePage.content }} 
                    style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: 1.85, 
                        color: '#333' 
                    }} 
                />
            </div>
            <ShopFooter />
        </div>
    );
}
