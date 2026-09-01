'use client';

import { Truck, Sparkles, MessageSquare, ShieldCheck, Scissors } from 'lucide-react';
import { RangoliOrnament } from '@/components/RangoliMotif';

export default function FeaturePerksSection({ sec }) {
    const { settings = {} } = sec || {};

    const perksList = (settings.perks && settings.perks.length > 0) ? settings.perks : [
        { icon: 'Sparkles', title: "100% Pure Silk Mark", desc: "Certified pure zari & natural handloom silk" },
        { icon: 'Truck', title: "Free Pan-India Delivery", desc: "Insured express shipping to every doorstep" },
        { icon: 'Scissors', title: "Custom Fall & Pico", desc: "Tailored tassel finishing on all sarees" },
        { icon: 'MessageSquare', title: "Live WhatsApp Video Call", desc: "View real drape textures with our stylist" }
    ];

    const getPerkIcon = (name) => {
        if (name === 'Truck') return Truck;
        if (name === 'Sparkles') return Sparkles;
        if (name === 'MessageSquare') return MessageSquare;
        if (name === 'Scissors') return Scissors;
        return ShieldCheck;
    };

    return (
        <section style={{ background: '#f7f2ea', borderTop: '1px solid #ebdcd0', borderBottom: '1px solid #ebdcd0', padding: '3.5rem 1.5rem' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
                {perksList.map((perk, i) => {
                    const IconComponent = getPerkIcon(perk.icon);
                    return (
                        <div 
                            key={i} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1.25rem', 
                                padding: '1.25rem',
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #ebdcd0',
                                boxShadow: '0 4px 18px rgba(43, 38, 35, 0.04)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(160, 102, 80, 0.12)';
                                e.currentTarget.style.borderColor = '#d47a06';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 18px rgba(43, 38, 35, 0.04)';
                                e.currentTarget.style.borderColor = '#ebdcd0';
                            }}
                        >
                            <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '12px',
                                background: i % 2 === 0 ? 'rgba(160, 102, 80, 0.12)' : 'rgba(134, 163, 151, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: i % 2 === 0 ? '#a06650' : '#627e72',
                                flexShrink: 0,
                                border: `1px solid ${i % 2 === 0 ? 'rgba(160, 102, 80, 0.25)' : 'rgba(134, 163, 151, 0.35)'}`
                            }}>
                                <IconComponent size={24} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#27302b', fontFamily: 'var(--font-body)' }}>
                                    {perk.title}
                                </h4>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6e645e', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
                                    {perk.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
