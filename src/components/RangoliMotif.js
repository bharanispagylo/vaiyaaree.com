'use client';

import React from 'react';

export function RangoliOrnament({ size = 28, color = 'var(--clr-gold-ochre, #d47a06)' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
        >
            {/* Center Auspicious Bindu */}
            <circle cx="24" cy="24" r="3" fill={color} />
            <circle cx="24" cy="24" r="5" stroke={color} strokeWidth="1" strokeDasharray="1.5 1.5" />
            
            {/* 4 Cardinal Lotus Petals */}
            <path
                d="M24 8 C22 14, 22 18, 24 20 C26 18, 26 14, 24 8 Z"
                fill={color}
                opacity="0.9"
            />
            <path
                d="M24 40 C22 34, 22 30, 24 28 C26 30, 26 34, 24 40 Z"
                fill={color}
                opacity="0.9"
            />
            <path
                d="M8 24 C14 22, 18 22, 20 24 C18 26, 14 26, 8 24 Z"
                fill={color}
                opacity="0.9"
            />
            <path
                d="M40 24 C34 22, 30 22, 28 24 C30 26, 34 26, 40 24 Z"
                fill={color}
                opacity="0.9"
            />

            {/* 4 Diagonal Lotus Petals */}
            <path
                d="M12.7 12.7 C17.5 16, 19.5 18.5, 21.2 21.2 C18.5 19.5, 16 17.5, 12.7 12.7 Z"
                fill={color}
                opacity="0.75"
            />
            <path
                d="M35.3 35.3 C30.5 32, 28.5 29.5, 26.8 26.8 C29.5 28.5, 32 30.5, 35.3 35.3 Z"
                fill={color}
                opacity="0.75"
            />
            <path
                d="M35.3 12.7 C32 17.5, 29.5 19.5, 26.8 21.2 C28.5 18.5, 30.5 16, 35.3 12.7 Z"
                fill={color}
                opacity="0.75"
            />
            <path
                d="M12.7 35.3 C16 30.5, 18.5 28.5, 21.2 26.8 C19.5 29.5, 17.5 32, 12.7 35.3 Z"
                fill={color}
                opacity="0.75"
            />

            {/* Outer Sacred Geometry Ring */}
            <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="0.8" opacity="0.4" />
        </svg>
    );
}

export function LotusMotif({ size = 32, color = 'var(--clr-terracotta, #a06650)' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
        >
            {/* Center Bloom Petal */}
            <path
                d="M32 12 C28 24, 27 36, 32 46 C37 36, 36 24, 32 12 Z"
                fill={color}
                opacity="0.95"
            />
            {/* Left Inner Petal */}
            <path
                d="M26 20 C18 28, 20 40, 30 46 C25 40, 22 30, 26 20 Z"
                fill={color}
                opacity="0.8"
            />
            {/* Right Inner Petal */}
            <path
                d="M38 20 C46 28, 44 40, 34 46 C39 40, 42 30, 38 20 Z"
                fill={color}
                opacity="0.8"
            />
            {/* Left Outer Petal */}
            <path
                d="M20 28 C12 36, 16 46, 28 47 C20 44, 16 38, 20 28 Z"
                fill={color}
                opacity="0.65"
            />
            {/* Right Outer Petal */}
            <path
                d="M44 28 C52 36, 48 46, 36 47 C44 44, 48 38, 44 28 Z"
                fill={color}
                opacity="0.65"
            />
            {/* Lotus Base */}
            <path
                d="M16 48 C24 52, 40 52, 48 48 C44 50, 20 50, 16 48 Z"
                fill={color}
                opacity="0.9"
            />
        </svg>
    );
}

export function SectionDivider({ 
    title, 
    badge, 
    subtitle, 
    align = 'center',
    badgeType = 'sage' 
}) {
    return (
        <div style={{ textAlign: align, marginBottom: '3.5rem', position: 'relative' }}>
            {badge && (
                <div style={{ marginBottom: '0.75rem' }}>
                    <span className={badgeType === 'gold' ? 'zari-gold-pill' : 'indian-badge-pill'}>
                        <RangoliOrnament size={14} color={badgeType === 'gold' ? '#b86503' : '#627e72'} />
                        {badge}
                    </span>
                </div>
            )}

            <h2 style={{
                fontFamily: 'var(--font-serif-royal), var(--font-heading), serif',
                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                fontWeight: 700,
                color: 'var(--clr-slate-dark, #27302b)',
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
                margin: '0 auto',
                maxWidth: '850px'
            }}>
                {title}
            </h2>

            {/* Symmetrical Lotus Motif Divider Line */}
            <div className="rangoli-motif-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '0.85rem auto' }}>
                <span className="rangoli-line" style={{ height: '1px', width: '90px', background: 'linear-gradient(90deg, transparent, #d47a06)' }} />
                <LotusMotif size={28} color="#d47a06" />
                <span className="rangoli-line" style={{ height: '1px', width: '90px', background: 'linear-gradient(90deg, #d47a06, transparent)' }} />
            </div>

            {subtitle && (
                <p style={{
                    color: 'var(--clr-text-muted, #6e645e)',
                    fontSize: '1.05rem',
                    lineHeight: 1.65,
                    maxWidth: '620px',
                    margin: '0 auto',
                    fontFamily: 'var(--font-body), sans-serif'
                }}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}
