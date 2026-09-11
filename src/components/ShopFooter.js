'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Instagram, Facebook, Youtube, ChevronUp } from 'lucide-react';
import { RangoliOrnament, LotusMotif } from '@/components/RangoliMotif';
import { DEFAULT_FOOTER_SETTINGS } from '@/app/api/footer-settings/route';
import styles from './ShopFooter.module.css';

const WhatsAppIcon = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

const ShopFooter = () => {
    const currentYear = new Date().getFullYear();
    const [footerConfig, setFooterConfig] = useState(DEFAULT_FOOTER_SETTINGS);
    const [navLinks, setNavLinks] = useState(() => {
        try {
            return JSON.parse(DEFAULT_FOOTER_SETTINGS.footer_nav_links);
        } catch (e) {
            return [];
        }
    });

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/footer-settings', { cache: 'no-store' });
            const data = await res.json();
            if (data.success && data.settings) {
                const cfg = { ...DEFAULT_FOOTER_SETTINGS, ...data.settings };
                setFooterConfig(cfg);
                try {
                    const parsed = typeof cfg.footer_nav_links === 'string'
                        ? JSON.parse(cfg.footer_nav_links)
                        : (cfg.footer_nav_links || []);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setNavLinks(parsed);
                    }
                } catch (err) {
                    console.error('Error parsing footer nav links:', err);
                }
            }
        } catch (e) {
            // Silently fallback to default state
        }
    };

    useEffect(() => {
        loadSettings();

        const handleSettingsUpdate = () => {
            loadSettings();
        };

        window.addEventListener('vaiyaaree_settings_updated', handleSettingsUpdate);
        window.addEventListener('storage', handleSettingsUpdate);

        return () => {
            window.removeEventListener('vaiyaaree_settings_updated', handleSettingsUpdate);
            window.removeEventListener('storage', handleSettingsUpdate);
        };
    }, []);

    // Brand and logo info
    const logoSrc = footerConfig.footer_logo_image || footerConfig.fallback_logo || '/images/vaiyaaree-logo.png';
    const brandName = footerConfig.footer_brand_name || 'VAIYAAREE';
    const brandSub = footerConfig.footer_brand_sub || 'AUTHENTIC HANDLOOM SILKS';
    const tagline = footerConfig.footer_tagline || 'Celebrating the timeless elegance of Indian handloom weaves, master artisans, and authentic silk craftsmanship.';

    // Contact info
    const address = footerConfig.footer_address || 'Coimbatore, Tamil Nadu - 641015.';
    const email = footerConfig.footer_email || 'vaiyaaree@gmail.com';
    const phone = footerConfig.footer_phone || '+91 86677 93292';

    // Social links
    const instagramHandle = footerConfig.footer_instagram_handle || '@vaiyaaree';
    const instagramUrl = footerConfig.footer_instagram_url || 'https://www.instagram.com/vaiyaaree';
    const whatsappNum = footerConfig.footer_whatsapp_number || '+91 86677 93292';
    const whatsappLink = footerConfig.footer_whatsapp_link || 'https://wa.me/918667793292';
    const facebookUrl = footerConfig.footer_facebook_url;
    const youtubeUrl = footerConfig.footer_youtube_url;

    // Silk Mark Badge
    const showSeal = footerConfig.footer_show_seal !== 'false';
    const sealTitle = footerConfig.footer_seal_title || '100% PURE SILK MARK';
    const sealSub = footerConfig.footer_seal_sub || 'Handloom Certified Drapes';

    // Copyright & Toggles
    const showRangoli = footerConfig.footer_show_rangoli !== 'false';
    const showScrollTop = footerConfig.footer_show_scroll_top !== 'false';
    const copyrightText = (footerConfig.footer_copyright_text || '© {year} Vaiyaaree. Handcrafted with devotion in South India.')
        .replace('{year}', currentYear);

    return (
        <footer className={styles.footer}>
            {/* Ornate Rangoli Top Divider */}
            {showRangoli && (
                <div className={styles.footerRangoliDivider}>
                    <span className={styles.footerRangoliLine} />
                    <RangoliOrnament size={24} color="#d47a06" />
                    <span className={styles.footerRangoliLine} />
                </div>
            )}

            <div className={styles.footerInner}>
                {/* Column 1: Logo & Heritage Story */}
                <div className={styles.footerColumn}>
                    <Link href="/" className={styles.footerLogo}>
                        <img 
                            src={logoSrc} 
                            alt={brandName} 
                            className={styles.logoImg} 
                            onError={(e) => {
                                if (e.currentTarget.src !== '/images/vaiyaaree-logo.png') {
                                    e.currentTarget.src = '/images/vaiyaaree-logo.png';
                                }
                            }}
                        />
                        <div className={styles.footerBrandGroup}>
                            <span className={styles.footerBrandName}>{brandName}</span>
                            <span className={styles.footerBrandSub}>{brandSub}</span>
                        </div>
                    </Link>

                    {tagline && (
                        <p className={styles.footerTagline}>
                            {tagline}
                        </p>
                    )}

                    <div className={styles.contactInfo}>
                        {address && (
                            <div className={styles.infoItem}>
                                <MapPin size={18} className={styles.infoIcon} />
                                <p>{address}</p>
                            </div>
                        )}
                        {email && (
                            <div className={styles.infoItem}>
                                <Mail size={18} className={styles.infoIcon} />
                                <a href={`mailto:${email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                    <p>{email}</p>
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Quick Links & Policies */}
                <div className={styles.footerColumn}>
                    <h4 className={styles.columnHeader}>
                        <span>{footerConfig.footer_col2_title || 'OUR BOUTIQUE'}</span>
                        <div className={styles.headerUnderline} />
                    </h4>
                    <nav className={styles.footerNav}>
                        {navLinks.map((item, idx) => (
                            <Link key={idx} href={item.href || '/'}>
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Column 3: Follow & Connect */}
                <div className={styles.footerColumn}>
                    <h4 className={styles.columnHeader}>
                        <span>{footerConfig.footer_col3_title || 'CONNECT WITH US'}</span>
                        <div className={styles.headerUnderline} />
                    </h4>
                    <nav className={styles.socialNav}>
                        {instagramUrl && (
                            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <Instagram size={20} className={styles.socialIcon} /> {instagramHandle}
                            </a>
                        )}
                        {whatsappLink && (
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <WhatsAppIcon size={20} className={styles.socialIcon} /> {whatsappNum}
                            </a>
                        )}
                        {facebookUrl && (
                            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <Facebook size={20} className={styles.socialIcon} /> Facebook Page
                            </a>
                        )}
                        {youtubeUrl && (
                            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <Youtube size={20} className={styles.socialIcon} /> YouTube Channel
                            </a>
                        )}
                    </nav>

                    {showSeal && (
                        <div className={styles.artisanSealBadge}>
                            <LotusMotif size={24} color="#d47a06" />
                            <div>
                                <div className={styles.sealTitle}>{sealTitle}</div>
                                <div className={styles.sealSub}>{sealSub}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.copyrightBar}>
                <div className={styles.copyrightInner}>
                    <p>{copyrightText}</p>
                </div>
            </div>
            
            {showScrollTop && (
                <button 
                    className={styles.scrollToTop} 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    aria-label="Scroll to top of page"
                >
                    <ChevronUp size={20} />
                </button>
            )}
        </footer>
    );
};

export default ShopFooter;
