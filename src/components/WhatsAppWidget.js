'use client';

import { MessageCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function WhatsAppWidget() {
    const [isVisible, setIsVisible] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
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
                    animation: 'fadeInSlide 0.4s ease-out',
                    border: '1px solid #f0f0f0'
                }}>
                    <button 
                        onClick={() => setShowTooltip(false)}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}
                    >
                        <X size={14} />
                    </button>
                    <p style={{ margin: 0, fontWeight: 600, color: '#5d0821', marginBottom: '4px' }}>Hi there! 👋</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>Need help with an order? Chat with us on WhatsApp!</p>
                </div>
            )}

            {/* Main Button */}
            <a 
                href="https://wa.me/15551678232" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#25d366',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 25px rgba(37, 211, 102, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                }}
                className="whatsapp-float-btn"
                onMouseEnter={() => setShowTooltip(true)}
            >
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '2px solid #25d366',
                    animation: 'pulse 2s infinite'
                }} />
                <MessageCircle size={32} fill="currentColor" />
            </a>

            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .whatsapp-float-btn:hover {
                    transform: scale(1.1) rotate(5deg);
                }
            `}</style>
        </div>
    );
}
