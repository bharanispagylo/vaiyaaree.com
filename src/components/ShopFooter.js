'use client';
import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Instagram, Facebook } from 'lucide-react';
import styles from './ShopFooter.module.css';

const ShopFooter = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.footerInner}>
                {/* Column 1: Logo & Info */}
                <div className={styles.footerColumn}>
                    <div className={styles.footerLogo}>
                        <span className={styles.logoBrandName}>VAIYAAREE</span>
                    </div>
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
                    <h4 className={styles.columnHeader}>FOLLOW US</h4>
                    <nav className={styles.socialNav}>
                        <Link href="#" className={styles.socialLink}>
                            <Instagram size={20} /> Instagram
                        </Link>
                        <Link href="#" className={styles.socialLink}>
                            <Facebook size={20} /> Facebook
                        </Link>
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
