'use client';

import { useState, useEffect } from 'react';
import { 
    Sparkles, Send, CheckCircle2, Phone, Mail, 
    Instagram, Facebook, MessageCircle, Lock, ArrowRight, Loader2
} from 'lucide-react';
import Link from 'next/link';
import styles from './ComingSoonPage.module.css';

export default function ComingSoonPage({ settings = {} }) {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [subscribing, setSubscribing] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [responseMsg, setResponseMsg] = useState('');

    const title = settings.title || 'We Are Weaving Something Extraordinary';
    const subtitle = settings.subtitle || 'Experience the timeless grace of authentic handloom silk & cotton sarees. Our grand digital boutique is opening soon.';
    const phone = settings.phone || '8667793292';
    const email = settings.email || 'vaiyaaree@gmail.com';
    const whatsapp = settings.whatsapp || '8667793292';
    const instagram = settings.instagram || 'https://instagram.com/vaiyaaree';
    const facebook = settings.facebook || 'https://facebook.com/vaiyaaree';
    const logo = settings.logo || '/images/vaiyaaree-logo.png';
    const launchDate = settings.launch_date;

    const [mounted, setMounted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00'
    });

    useEffect(() => {
        setMounted(true);
        // Calculate target timestamp
        let targetTime;
        if (launchDate) {
            targetTime = new Date(launchDate).getTime();
        } else {
            // Default 14 days from now if not explicitly set
            targetTime = Date.now() + 14 * 24 * 60 * 60 * 1000;
        }

        const updateTimer = () => {
            const now = Date.now();
            const difference = targetTime - now;

            if (difference <= 0) {
                setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            setTimeLeft({
                days: String(days).padStart(2, '0'),
                hours: String(hours).padStart(2, '0'),
                minutes: String(minutes).padStart(2, '0'),
                seconds: String(seconds).padStart(2, '0')
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [launchDate]);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!emailOrPhone.trim()) return;

        setSubscribing(true);
        try {
            const isEmail = emailOrPhone.includes('@');
            const res = await fetch('/api/coming-soon/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: isEmail ? emailOrPhone.trim() : '',
                    phone: !isEmail ? emailOrPhone.trim() : ''
                })
            });

            const data = await res.json();
            if (data.success) {
                setSubscribed(true);
                setResponseMsg(data.message || "Thank you! You've been added to our VIP launch list.");
            } else {
                setResponseMsg(data.message || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            setResponseMsg('Unable to connect. Please try again later.');
        } finally {
            setSubscribing(false);
        }
    };

    const waText = encodeURIComponent("Hello Vaiyaaree Sarees! I would like to inquire about your upcoming collections and early VIP access.");
    const waUrl = `https://wa.me/91${whatsapp.replace(/\D/g, '')}?text=${waText}`;

    return (
        <div className={styles.comingSoonContainer}>
            <div className={styles.orbTop}></div>
            <div className={styles.orbBottom}></div>
            <div className={styles.patternOverlay}></div>

            {/* Header / Brand Logo */}
            <header className={styles.headerSection}>
                <div className={styles.logoBadge}>
                    <img 
                        src={logo.startsWith('http') || logo.startsWith('/') ? logo : `/images/${logo}`} 
                        alt="Vaiyaaree Sarees" 
                        className={styles.logoImg} 
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.mainContent}>
                <div className={styles.statusPill}>
                    <span className={styles.statusDot}></span>
                    <span>Grand Unveiling Soon</span>
                </div>

                <h1 className={styles.title}>{title}</h1>
                <p className={styles.subtitle}>{subtitle}</p>

                {/* Countdown Timer */}
                <div className={styles.countdownGrid}>
                    <div className={styles.timerCard}>
                        <span className={styles.timerValue} suppressHydrationWarning>{mounted ? timeLeft.days : '00'}</span>
                        <span className={styles.timerLabel}>Days</span>
                    </div>
                    <div className={styles.timerCard}>
                        <span className={styles.timerValue} suppressHydrationWarning>{mounted ? timeLeft.hours : '00'}</span>
                        <span className={styles.timerLabel}>Hours</span>
                    </div>
                    <div className={styles.timerCard}>
                        <span className={styles.timerValue} suppressHydrationWarning>{mounted ? timeLeft.minutes : '00'}</span>
                        <span className={styles.timerLabel}>Minutes</span>
                    </div>
                    <div className={styles.timerCard}>
                        <span className={styles.timerValue} suppressHydrationWarning>{mounted ? timeLeft.seconds : '00'}</span>
                        <span className={styles.timerLabel}>Seconds</span>
                    </div>
                </div>



                {/* Direct Action Buttons */}
                <div className={styles.actionsRow}>
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
                        <MessageCircle size={18} />
                        <span>Chat with Us on WhatsApp</span>
                    </a>
                    {phone && (
                        <a href={`tel:+91${phone.replace(/\D/g, '')}`} className={styles.callBtn}>
                            <Phone size={16} />
                            <span>+91 {phone}</span>
                        </a>
                    )}
                </div>
            </main>

            {/* Footer & Socials */}
            <footer className={styles.footerSection}>
                <div className={styles.socialRow}>
                    {instagram && (
                        <a href={instagram} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Instagram">
                            <Instagram size={18} />
                        </a>
                    )}
                    {facebook && (
                        <a href={facebook} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Facebook">
                            <Facebook size={18} />
                        </a>
                    )}
                    {email && (
                        <a href={`mailto:${email}`} className={styles.socialLink} title="Email Us">
                            <Mail size={18} />
                        </a>
                    )}
                </div>

                <p className={styles.copyrightText} suppressHydrationWarning>
                    &copy; {new Date().getFullYear()} Vaiyaaree Sarees. All rights reserved. Handcrafted with love.
                </p>

                <Link href="/admin/login" className={styles.adminLink}>
                    <Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Admin Portal
                </Link>
            </footer>
        </div>
    );
}
