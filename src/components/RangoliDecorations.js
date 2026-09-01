'use client';

import React from 'react';

/**
 * Ornate Multi-Layered Rotating Rangoli / Kolam Mandala
 * Floats on section left or right with smooth continuous rotation
 */
export function RotatingRangoliMandala({
    size = 420,
    position = 'right', // 'left' | 'right' | 'center'
    top = '50%',
    opacity = 0.07,
    speed = 60, // seconds for 360 deg
    color = '#d47a06',
    zIndex = 0
}) {
    const isLeft = position === 'left';
    const isRight = position === 'right';

    return (
        <div
            className="rotating-rangoli-wrapper"
            style={{
                position: 'absolute',
                top: top,
                [isLeft ? 'left' : isRight ? 'right' : 'left']: isLeft ? `-${size * 0.38}px` : isRight ? `-${size * 0.38}px` : '50%',
                transform: `translateY(-50%) ${!isLeft && !isRight ? 'translateX(-50%)' : ''}`,
                width: `${size}px`,
                height: `${size}px`,
                pointerEvents: 'none',
                zIndex: zIndex,
                opacity: opacity,
                overflow: 'hidden'
            }}
            aria-hidden="true"
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="rangoli-spin-anim"
                style={{
                    width: '100%',
                    height: '100%',
                    animation: `spinRangoli ${speed}s linear infinite`
                }}
            >
                {/* Outer Delicate Concentric Radiance Rings */}
                <circle cx="200" cy="200" r="190" stroke={color} strokeWidth="1" strokeDasharray="3 4" />
                <circle cx="200" cy="200" r="182" stroke={color} strokeWidth="1.5" />
                <circle cx="200" cy="200" r="174" stroke={color} strokeWidth="0.8" strokeDasharray="6 3" />

                {/* 16 Outer Temple Arch Petals */}
                {[...Array(16)].map((_, i) => {
                    const angle = (i * 360) / 16;
                    return (
                        <g key={`outer-${i}`} transform={`rotate(${angle} 200 200)`}>
                            <path
                                d="M200 18 C192 40, 185 65, 195 90 C200 80, 200 80, 205 90 C215 65, 208 40, 200 18 Z"
                                fill={color}
                                opacity="0.85"
                            />
                            <circle cx="200" cy="14" r="3" fill={color} />
                            <path
                                d="M190 90 Q200 110 210 90"
                                stroke={color}
                                strokeWidth="1.2"
                                fill="none"
                            />
                        </g>
                    );
                })}

                {/* Middle Concentric Ring */}
                <circle cx="200" cy="200" r="115" stroke={color} strokeWidth="2" />
                <circle cx="200" cy="200" r="108" stroke={color} strokeWidth="1" strokeDasharray="4 4" />

                {/* 12 Middle Lotus Petals */}
                {[...Array(12)].map((_, i) => {
                    const angle = (i * 360) / 12;
                    return (
                        <g key={`mid-${i}`} transform={`rotate(${angle} 200 200)`}>
                            <path
                                d="M200 88 C188 115, 180 140, 200 155 C220 140, 212 115, 200 88 Z"
                                fill={color}
                                opacity="0.9"
                            />
                            <path
                                d="M200 100 L200 145"
                                stroke="#ffffff"
                                strokeWidth="1"
                                opacity="0.6"
                            />
                        </g>
                    );
                })}

                {/* Inner Ring */}
                <circle cx="200" cy="200" r="62" stroke={color} strokeWidth="1.5" />
                <circle cx="200" cy="200" r="54" stroke={color} strokeWidth="0.8" strokeDasharray="2 2" />

                {/* 8 Inner Core Petals */}
                {[...Array(8)].map((_, i) => {
                    const angle = (i * 360) / 8;
                    return (
                        <g key={`inner-${i}`} transform={`rotate(${angle} 200 200)`}>
                            <path
                                d="M200 146 C192 165, 192 180, 200 186 C208 180, 208 165, 200 146 Z"
                                fill={color}
                            />
                        </g>
                    );
                })}

                {/* Sacred Center Bindu & Lotus Core */}
                <circle cx="200" cy="200" r="14" fill={color} />
                <circle cx="200" cy="200" r="8" fill="#ffffff" opacity="0.8" />
                <circle cx="200" cy="200" r="4" fill={color} />
            </svg>

            <style jsx>{`
                @keyframes spinRangoli {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Horizontal Intricate Indian Rangoli & Temple Zari Border
 * Positioned seamlessly above the footer and between major sections
 */
export function HorizontalRangoliBorder({ 
    color = '#d47a06', 
    accentColor = '#a06650',
    height = 54 
}) {
    return (
        <div 
            className="horizontal-rangoli-strip" 
            style={{ 
                width: '100%', 
                overflow: 'hidden', 
                background: 'linear-gradient(180deg, transparent 0%, rgba(212, 122, 6, 0.04) 50%, transparent 100%)',
                padding: '1.25rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}
        >
            {/* Top Fine Gold Line */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(212, 122, 6, 0.4) 25%, rgba(160, 102, 80, 0.7) 50%, rgba(212, 122, 6, 0.4) 75%, transparent 100%)'
            }} />

            {/* Seamless Repeating Ornate SVG Pattern */}
            <svg
                width="100%"
                height={height}
                viewBox="0 0 1200 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="repeat-x"
                style={{ width: '100%', height: `${height}px`, display: 'block' }}
            >
                <defs>
                    <pattern id="rangoli-h-pattern" width="120" height="48" patternUnits="userSpaceOnUse">
                        {/* Center Lotus Motif */}
                        <path
                            d="M60 6 C56 16, 54 26, 60 36 C66 26, 64 16, 60 6 Z"
                            fill={color}
                            opacity="0.9"
                        />
                        <path
                            d="M52 14 C44 22, 46 32, 58 36 C53 30, 50 22, 52 14 Z"
                            fill={accentColor}
                            opacity="0.85"
                        />
                        <path
                            d="M68 14 C76 22, 74 32, 62 36 C67 30, 70 22, 68 14 Z"
                            fill={accentColor}
                            opacity="0.85"
                        />
                        
                        {/* Connecting Temple Arch Garland */}
                        <path
                            d="M0 24 Q30 42 60 36 Q90 42 120 24"
                            stroke={color}
                            strokeWidth="1.5"
                            fill="none"
                        />
                        <path
                            d="M0 20 Q30 36 60 32 Q90 36 120 20"
                            stroke={accentColor}
                            strokeWidth="0.8"
                            strokeDasharray="2 3"
                            fill="none"
                            opacity="0.6"
                        />

                        {/* Top Crest Drops */}
                        <circle cx="60" cy="4" r="2.5" fill={color} />
                        <circle cx="0" cy="24" r="3" fill={color} />
                        <circle cx="120" cy="24" r="3" fill={color} />
                        <circle cx="30" cy="36" r="2" fill={accentColor} />
                        <circle cx="90" cy="36" r="2" fill={accentColor} />

                        {/* Traditional Auspicious Dots (Kolam Pulli) */}
                        <circle cx="42" cy="24" r="1.5" fill={color} opacity="0.7" />
                        <circle cx="78" cy="24" r="1.5" fill={color} opacity="0.7" />
                        <circle cx="60" cy="44" r="2" fill={color} />
                    </pattern>
                </defs>

                <rect width="100%" height="48" fill="url(#rangoli-h-pattern)" />
            </svg>

            {/* Bottom Fine Gold Line */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(212, 122, 6, 0.4) 25%, rgba(160, 102, 80, 0.7) 50%, rgba(212, 122, 6, 0.4) 75%, transparent 100%)'
            }} />
        </div>
    );
}

/**
 * Subtle Cultural Saree Texture Background wrapper
 */
export function CulturalSectionWrapper({ children, style = {}, className = '', hasMandala = true, mandalaPos = 'right' }) {
    return (
        <div
            className={`cultural-section-relative ${className}`}
            style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(ellipse at 85% 15%, rgba(212, 122, 6, 0.04) 0%, transparent 60%), radial-gradient(ellipse at 15% 85%, rgba(160, 102, 80, 0.04) 0%, transparent 60%), #fdfbf7',
                ...style
            }}
        >
            {hasMandala && (
                <RotatingRangoliMandala
                    position={mandalaPos}
                    size={460}
                    opacity={0.08}
                    speed={mandalaPos === 'left' ? 70 : 55}
                    color="#d47a06"
                />
            )}
            {children}
        </div>
    );
}
