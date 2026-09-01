'use client';

import Link from 'next/link';
import { Check, MessageSquare } from 'lucide-react';
import { RangoliOrnament, LotusMotif } from '@/components/RangoliMotif';

export default function WhatsAppShoppingSection({ sec }) {
    const { title, subtitle, badge_text, settings = {} } = sec;
    const waPhone = settings.phone || process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292';
    const showQr = settings.show_qr !== false;
    const featuresList = settings.features || ['Live Fabric Video Preview & Draping Assistance', 'Personal Bridal & Festive Saree Styling', 'Instant Order Booking & Real-Time Tracking'];

    return (
        <section style={{ padding: '6rem 2rem', background: 'linear-gradient(135deg, #27302b 0%, #3e4742 50%, #543b32 100%)', color: '#fdfbf7', position: 'relative', borderTop: '1px solid rgba(212, 122, 6, 0.3)', borderBottom: '1px solid rgba(212, 122, 6, 0.3)' }}>
            <div style={{ maxWidth: '1350px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                <div>
                    <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.4rem 1.15rem',
                        borderRadius: '9999px',
                        background: 'rgba(253, 251, 247, 0.1)',
                        backdropFilter: 'blur(8px)',
                        color: '#fef8eb',
                        fontWeight: 800, 
                        marginBottom: '1.25rem', 
                        fontSize: '0.76rem', 
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        border: '1px solid rgba(212, 122, 6, 0.4)'
                    }}>
                        <RangoliOrnament size={14} color="#d47a06" />
                        {badge_text || 'PERSONAL BRIDAL & FESTIVE CONCIERGE'}
                    </span>

                    <h2 style={{ 
                        fontSize: 'clamp(2.2rem, 4vw, 3rem)', 
                        fontWeight: 700, 
                        fontFamily: 'var(--font-serif-royal), serif', 
                        lineHeight: 1.2, 
                        margin: '0 0 1rem',
                        color: '#ffffff'
                    }}>
                        {title || 'Shop Sarees via WhatsApp'}
                    </h2>

                    <div style={{ width: '60px', height: '2px', background: 'linear-gradient(90deg, #d47a06, transparent)', marginBottom: '1.5rem' }} />

                    <p style={{ color: 'rgba(253, 251, 247, 0.9)', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
                        {subtitle || 'Connect directly with our saree experts, view live fabric photos & video calls, and select customized falls and tassels via chat.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {featuresList.map((feat, i) => (
                            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ 
                                    width: '36px', 
                                    height: '36px', 
                                    borderRadius: '50%', 
                                    background: 'rgba(212, 122, 6, 0.25)', 
                                    border: '1px solid rgba(212, 122, 6, 0.5)',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: '#fde047',
                                    flexShrink: 0
                                }}>
                                    <Check size={18} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '0.96rem', fontFamily: 'var(--font-body)', color: '#fdfbf7' }}>{feat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem' }}>
                    {showQr && (
                        <div style={{ 
                            background: '#ffffff', 
                            padding: '2rem', 
                            borderRadius: '24px', 
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', 
                            border: '3px solid #d47a06', 
                            textAlign: 'center', 
                            width: '100%', 
                            maxWidth: '300px' 
                        }}>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://wa.me/${waPhone}`} 
                                style={{ width: '150px', height: '150px', margin: '0 auto 1rem', display: 'block', borderRadius: '8px' }} 
                                alt="WhatsApp QR Code" 
                            />
                            <div style={{ color: '#a06650', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em' }}>+{waPhone}</div>
                            <div style={{ color: '#7c8675', fontSize: '0.76rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase' }}>Scan to Chat with Stylist</div>
                        </div>
                    )}

                    <Link
                        href={`https://wa.me/${waPhone}`}
                        target="_blank"
                        style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem', 
                            padding: '1.1rem 2.25rem', 
                            background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)', 
                            color: '#ffffff', 
                            borderRadius: '10px', 
                            textDecoration: 'none', 
                            fontWeight: 800, 
                            fontSize: '0.9rem', 
                            letterSpacing: '0.1em',
                            width: '100%', 
                            maxWidth: '300px', 
                            justifyContent: 'center', 
                            boxShadow: '0 8px 25px rgba(37, 211, 102, 0.35)', 
                            transition: 'all 0.3s ease', 
                            fontFamily: 'var(--font-body)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 12px 30px rgba(37, 211, 102, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(37, 211, 102, 0.35)';
                        }}
                    >
                        <MessageSquare size={18} />
                        CONNECT ON WHATSAPP &rarr;
                    </Link>
                </div>
            </div>
        </section>
    );
}
