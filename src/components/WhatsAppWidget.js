'use client';

import { MessageCircle, Mail, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { mysqlClient } from '@/lib/mysqlClient';

export default function WhatsAppWidget() {
    const pathname = usePathname();
    const { isEmailOnly, supportEmail, waChatbotEnabled } = useShop();
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [isComingSoon, setIsComingSoon] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Check if coming soon is active
        async function checkComingSoon() {
            try {
                const { data } = await mysqlClient
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'coming_soon_enabled')
                    .maybeSingle();
                if (data?.value === 'true' || data?.value === '1') {
                    setIsComingSoon(true);
                }
            } catch (e) {}
        }
        checkComingSoon();

        // Show after a short delay
        const timer = setTimeout(() => {
            setIsVisible(true);
            setShowTooltip(true);
        }, 2000);

        // Hide tooltip after some time
        const tooltipTimer = setTimeout(() => {
            setShowTooltip(false);
        }, 8000);

        return () => {
            clearTimeout(timer);
            clearTimeout(tooltipTimer);
        };
    }, []);

    if (!mounted || pathname?.startsWith('/admin') || isComingSoon) {
        return null;
    }

    const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292';
    const emailTarget = supportEmail || 'support@vaiyaaree.com';
    const supportHref = isEmailOnly 
        ? `mailto:${emailTarget}?subject=${encodeURIComponent('Vaiyaaree Store Support')}&body=${encodeURIComponent('Hi Vaiyaaree Team,\n\nI need assistance with my shopping/order.\n\nThank you!')}`
        : `https://wa.me/${businessPhone}`;

    const buttonBg = isEmailOnly ? '#5d0821' : '#25d366';
    const shadowColor = isEmailOnly ? 'rgba(93, 8, 33, 0.4)' : 'rgba(37, 211, 102, 0.4)';

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '1rem',
            pointerEvents: isVisible ? 'auto' : 'none',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Tooltip / Welcome Message */}
            {showTooltip && (
                <div style={{
                    background: '#fff',
                    padding: '1rem 1.5rem',
                    borderRadius: '16px 16px 4px 16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '0.9rem',
                    color: '#333',
                    maxWidth: '220px',
                    position: 'relative',
                    animation: 'widgetFadeInSlide 0.4s ease-out',
                    border: '1px solid #f0f0f0',
                    fontFamily: 'var(--font-roboto), sans-serif'
                }}>
                    <button 
                        onClick={() => setShowTooltip(false)}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}
                        aria-label="Close tooltip"
                    >
                        <X size={14} />
                    </button>
                    <p style={{ margin: 0, fontWeight: 600, color: '#5d0821', marginBottom: '4px' }}>Hi there!</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
                        {isEmailOnly 
                            ? 'Need assistance? Email our support concierge anytime!'
                            : (waChatbotEnabled 
                                ? 'Need help with an order? Chat with our assistant on WhatsApp!' 
                                : 'Need help with an order? Chat directly with us on WhatsApp!')}
                    </p>
                </div>
            )}

            {/* Main Button */}
            <a 
                href={supportHref} 
                target={isEmailOnly ? '_self' : '_blank'} 
                rel={isEmailOnly ? undefined : 'noopener noreferrer'}
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: buttonBg,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 8px 25px ${shadowColor}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                }}
                className="widget-floating-action-btn"
                onMouseEnter={() => setShowTooltip(true)}
                title={isEmailOnly ? "Email Support" : "WhatsApp Support"}
            >
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `2px solid ${buttonBg}`,
                    animation: 'widgetPulse 2s infinite'
                }} />
                {isEmailOnly ? (
                    <Mail size={28} />
                ) : (
                    <MessageCircle size={32} fill="currentColor" />
                )}
            </a>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes widgetPulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes widgetFadeInSlide {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .widget-floating-action-btn:hover {
                    transform: scale(1.08) rotate(3deg);
                }
            `}} />
        </div>
    );
}
