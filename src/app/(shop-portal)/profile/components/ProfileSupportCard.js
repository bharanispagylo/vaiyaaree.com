'use client';

import React from 'react';
import { MessageCircle, Mail } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from '../profile.module.css';

export default function ProfileSupportCard() {
    const { isEmailOnly, supportEmail } = useShop();
    const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292';
    const whatsappUrl = `https://wa.me/${businessPhone}?text=Hello%20Vaiyaaree%20Support,%20I%20need%20assistance%20with%20my%20order.`;
    const emailAddress = supportEmail || 'support@vaiyaaree.com';
    const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent('Vaiyaaree Customer Support Assistance')}&body=${encodeURIComponent('Hello Vaiyaaree Team,\n\nI need assistance with my order.\n\nThank you!')}`;

    return (
        <div className={styles.sidebarCard}>
            <div className={styles.helpIconWrapper}>
                {isEmailOnly ? <Mail size={24} /> : <MessageCircle size={24} />}
            </div>
            <h4>Need Assistance?</h4>
            <p>
                {isEmailOnly 
                    ? 'If you have any questions regarding your orders, returns, or refunds, email our concierge team directly.'
                    : 'If you have any questions regarding your orders, returns, or refunds, chat directly with our customer support.'}
            </p>
            {isEmailOnly ? (
                <a 
                    href={mailtoUrl}
                    className={styles.supportBtn}
                    style={{ background: '#5d0821', color: '#ffffff' }}
                >
                    <Mail size={18} /> Email Support
                </a>
            ) : (
                <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.supportBtn}
                >
                    <MessageCircle size={18} /> Chat via WhatsApp
                </a>
            )}
        </div>
    );
}
