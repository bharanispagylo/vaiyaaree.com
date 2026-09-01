'use client';

import React from 'react';

/**
 * Exact Lotus Flower from the base of the Vaiyaaree Logo
 * Multi-petaled rose-terracotta petals with sage green sepals
 */
export function LogoLotusFlower({ size = 48, className = '' }) {
    return (
        <svg
            width={size}
            height={Math.round(size * 0.72)}
            viewBox="0 0 100 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
        >
            {/* Sage Green Base Sepals */}
            <path
                d="M50 56 C34 56, 20 62, 10 68 C24 66, 38 62, 50 62 C62 62, 76 66, 90 68 C80 62, 66 56, 50 56 Z"
                fill="#7c8675"
                opacity="0.95"
            />
            <path
                d="M28 58 C15 54, 8 62, 6 67 C16 66, 26 62, 34 58 Z"
                fill="#86a397"
            />
            <path
                d="M72 58 C85 54, 92 62, 94 67 C84 66, 74 62, 66 58 Z"
                fill="#86a397"
            />

            {/* Outer Pink/Terracotta Lotus Petals */}
            <path
                d="M16 48 C10 32, 22 20, 36 34 C30 42, 24 48, 16 48 Z"
                fill="#d89178"
                stroke="#a06650"
                strokeWidth="1.2"
                opacity="0.9"
            />
            <path
                d="M84 48 C90 32, 78 20, 64 34 C70 42, 76 48, 84 48 Z"
                fill="#d89178"
                stroke="#a06650"
                strokeWidth="1.2"
                opacity="0.9"
            />

            {/* Mid Pink/Terracotta Lotus Petals */}
            <path
                d="M28 44 C22 24, 38 12, 48 30 C40 38, 34 42, 28 44 Z"
                fill="#e4a894"
                stroke="#a06650"
                strokeWidth="1.4"
            />
            <path
                d="M72 44 C78 24, 62 12, 52 30 C60 38, 66 42, 72 44 Z"
                fill="#e4a894"
                stroke="#a06650"
                strokeWidth="1.4"
            />

            {/* Center Dominant Crown Petal */}
            <path
                d="M50 4 C40 18, 40 36, 50 54 C60 36, 60 18, 50 4 Z"
                fill="#f2c0b0"
                stroke="#a06650"
                strokeWidth="1.5"
            />

            {/* Inner Delicate Petal Vein Lines */}
            <path d="M50 14 L50 46" stroke="#a06650" strokeWidth="0.9" opacity="0.6" />
            <path d="M36 28 Q42 36 46 44" stroke="#a06650" strokeWidth="0.8" opacity="0.5" />
            <path d="M64 28 Q58 36 54 44" stroke="#a06650" strokeWidth="0.8" opacity="0.5" />
        </svg>
    );
}

/**
 * Temple Jharokha Arch Outline (Matching the exact brand logo outer frame)
 */
export function LogoJharokhaArchOutline({ 
    width = 300, 
    height = 380, 
    color = "#a06650", 
    children 
}) {
    return (
        <div style={{ position: 'relative', width: `${width}px`, height: `${height}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg
                width={width}
                height={height}
                viewBox="0 0 300 380"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
                {/* Traditional Multi-Lobed Temple Arch */}
                <path
                    d="M150 12 
                       C168 34, 192 48, 220 54 
                       C256 62, 282 92, 282 136 
                       C282 172, 258 200, 276 244 
                       C290 278, 278 322, 240 354 
                       C214 374, 180 376, 150 376 
                       C120 376, 86 374, 60 354 
                       C22 322, 10 278, 24 244 
                       C42 200, 18 172, 18 136 
                       C18 92, 44 62, 80 54 
                       C108 48, 132 34, 150 12 Z"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Inner Thin Gold Trim Ring */}
                <path
                    d="M150 20 
                       C166 40, 188 52, 214 58 
                       C248 65, 272 94, 272 134 
                       C272 168, 250 196, 266 238 
                       C280 270, 268 312, 232 342 
                       C208 360, 178 364, 150 364 
                       C122 364, 92 360, 68 342 
                       C32 312, 20 270, 34 238 
                       C50 196, 28 168, 28 134 
                       C28 94, 52 65, 86 58 
                       C112 52, 134 40, 150 20 Z"
                    stroke="#d47a06"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                    opacity="0.85"
                />

                {/* Top Point Ornament */}
                <circle cx="150" cy="8" r="3.5" fill={color} />
            </svg>

            {/* Base Lotus Flower Ornament */}
            <div style={{ position: 'absolute', bottom: '-18px', left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
                <LogoLotusFlower size={74} />
            </div>

            {/* Inset Child Content */}
            <div style={{ position: 'relative', zIndex: 2, padding: '2rem 1.5rem', width: '80%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </div>
        </div>
    );
}

/**
 * Artistic Indian Saree Maiden & Parrot Watermark / Silhouette
 * Inspired directly by the classical lineart woman in the Vaiyaaree Logo
 */
export function MaidenWithParrotArtwork({ 
    size = 280, 
    color = "#a06650", 
    opacity = 0.85,
    showLotusStalk = true 
}) {
    return (
        <div 
            style={{ 
                width: `${size}px`, 
                height: `${Math.round(size * 1.25)}px`, 
                position: 'relative', 
                display: 'inline-block',
                opacity: opacity 
            }}
            aria-label="Vaiyaaree Classical Saree Maiden with Parrot and Lotus"
        >
            <img
                src="/images/vaiyaaree-logo.png"
                alt="Vaiyaaree Classical Maiden"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 8px 24px rgba(160, 102, 80, 0.2))'
                }}
            />
        </div>
    );
}

/**
 * Floating Saree Maiden & Lotus Decorative Corner Badge
 */
export function MaidenEmblemBadge({ title = "Handcrafted by Weavers", sub = "Pure South Indian Silks" }) {
    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '0.6rem 1.2rem 0.6rem 0.75rem',
            borderRadius: '9999px',
            border: '1.5px solid rgba(212, 122, 6, 0.4)',
            boxShadow: '0 8px 25px rgba(160, 102, 80, 0.15)'
        }}>
            <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#fdfbf7',
                border: '1px solid #a06650',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
            }}>
                <img
                    src="/images/vaiyaaree-logo.png"
                    alt="Logo Emblem"
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                />
            </div>
            <div>
                <div style={{ fontFamily: 'var(--font-serif-royal), serif', fontSize: '0.82rem', fontWeight: 800, color: '#27302b', letterSpacing: '0.04em' }}>
                    {title}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#7c8675', fontWeight: 600 }}>
                    {sub}
                </div>
            </div>
        </div>
    );
}
