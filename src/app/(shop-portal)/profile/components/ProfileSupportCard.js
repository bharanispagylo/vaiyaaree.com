import React from 'react';
import { MessageCircle } from 'lucide-react';
import styles from '../profile.module.css';

export default function ProfileSupportCard() {
    return (
        <div className={styles.profileSupportCard}>
            <div className={styles.supportIconWrap}>
                <MessageCircle size={28} />
            </div>
            <h4>Need Assistance?</h4>
            <p>If you have any questions regarding your orders, returns, or refunds, chat directly with our customer support.</p>
            <a 
                href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '919876543210'}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.supportBtn}
            >
                <MessageCircle size={18} /> Chat via WhatsApp
            </a>
        </div>
    );
}
