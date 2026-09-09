import React from 'react';
import { MessageCircle } from 'lucide-react';
import styles from '../profile.module.css';

export default function ProfileSupportCard() {
    const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292';
    const whatsappUrl = `https://wa.me/${businessPhone}?text=Hello%20Vaiyaaree%20Support,%20I%20need%20assistance%20with%20my%20order.`;

    return (
        <div className={styles.sidebarCard}>
            <div className={styles.helpIconWrapper}>
                <MessageCircle size={24} />
            </div>
            <h4>Need Assistance?</h4>
            <p>If you have any questions regarding your orders, returns, or refunds, chat directly with our customer support.</p>
            <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.supportBtn}
            >
                <MessageCircle size={18} /> Chat via WhatsApp
            </a>
        </div>
    );
}
