'use client';
import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Instagram } from 'lucide-react';
import styles from './ShopFooter.module.css';

const WhatsAppIcon = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

const ShopFooter = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.footerInner}>
                {/* Column 1: Logo & Info */}
                <div className={styles.footerColumn}>
                    <Link href="/" className={styles.footerLogo}>
                        <img 
                            src="/images/cp-logo.png" 
                            alt="Vaiyaaree" 
                            className={styles.logoImg} 
                            onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} 
                        />
                    </Link>
                    <div className={styles.contactInfo}>
                        <div className={styles.infoItem}>
                            <MapPin size={18} className={styles.infoIcon} />
                            <p>16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.</p>
                        </div>
                        <div className={styles.infoItem}>
                            <Mail size={18} className={styles.infoIcon} />
                            <p>vaiyaaree.cbe@gmail.com</p>
                        </div>
                    </div>
                </div>

                {/* Column 2: About Us */}
                <div className={styles.footerColumn}>
                    <h4 className={styles.columnHeader}>ABOUT US</h4>
                    <nav className={styles.footerNav}>
                        <Link href="/about-us">About Us</Link>
                        <Link href="/contact">Contact Us</Link>
                        <Link href="/privacy-policy">Privacy Policy</Link>
                        <Link href="/return-policy">Return Policy</Link>
                        <Link href="/shipping-policy">Shipping Policy</Link>
                        <Link href="/terms-and-conditions">Terms and Conditions</Link>
                        <Link href="/refund-cancellation-policy">Refund Cancellation Policy</Link>
                        <Link href="/disclaimer">Disclaimer</Link>
                    </nav>
                </div>

                {/* Column 3: Follow Us */}
                <div className={styles.footerColumn}>
                    <h4 className={styles.columnHeader}>CONNECT WITH US</h4>
                    <nav className={styles.socialNav}>
                        <a href="https://www.instagram.com/vaiyaaree" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                            <Instagram size={20} /> @vaiyaaree
                        </a>
                        <a href="https://wa.me/918667793292" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                            <WhatsAppIcon size={20} /> +91 86677 93292
                        </a>
                    </nav>
                </div>
            </div>

            <div className={styles.copyrightBar}>
                <p>&copy; {currentYear} — Vaiyaaree. All Rights Reserved.</p>
            </div>
            
            <button className={styles.scrollToTop} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className={styles.chevronUp}></div>
            </button>
        </footer>
    );
};

export default ShopFooter;
