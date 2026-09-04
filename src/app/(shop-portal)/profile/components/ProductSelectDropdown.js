'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ProductSelectDropdown({ products, selectedKey, onSelect, placeholder = "-- Select Product --" }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedProduct = products.find(p => p.key === selectedKey);

    const handleOptionClick = (productKey) => {
        if (selectedKey === productKey) {
            // Deselect on second click
            onSelect(null);
        } else {
            const item = products.find(p => p.key === productKey);
            onSelect(item);
        }
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'hsl(var(--text-main) / 0.03)',
                    border: isOpen ? '1.5px solid hsl(var(--primary))' : '1px solid hsl(var(--text-main) / 0.12)',
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem',
                    color: 'hsl(var(--text-main))',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: isOpen ? '0 0 0 3px hsl(var(--primary) / 0.15)' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedProduct ? 'hsl(var(--primary))' : '#94a3b8' }}>
                        {selectedProduct ? '✓' : '•'}
                    </span>
                    <span style={{ fontWeight: selectedProduct ? 700 : 500, color: selectedProduct ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))' }}>
                        {selectedProduct 
                            ? `Order #${selectedProduct.orderId} - ${selectedProduct.productName}${selectedProduct.price ? ` (₹${Number(selectedProduct.price).toLocaleString('en-IN')})` : ''}` 
                            : placeholder}
                    </span>
                </div>
                <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: 'hsl(var(--text-muted))', flexShrink: 0 }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: '#ffffff',
                    border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '0.4rem'
                }}>
                    {products.length === 0 ? (
                        <div style={{ padding: '0.85rem', color: 'hsl(var(--text-muted))', fontSize: '0.88rem', textAlign: 'center' }}>
                            No eligible products available
                        </div>
                    ) : (
                        <>
                            <div 
                                onClick={() => { onSelect(null); setIsOpen(false); }}
                                style={{
                                    padding: '0.65rem 0.9rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    color: 'hsl(var(--text-muted))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    borderBottom: '1px solid #f1f5f9',
                                    marginBottom: '0.25rem',
                                    fontWeight: 500
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}>•</span>
                                <span>{placeholder}</span>
                            </div>

                            {products.map(p => {
                                const isSelected = selectedKey === p.key;
                                return (
                                    <div
                                        key={p.key}
                                        onClick={() => handleOptionClick(p.key)}
                                        style={{
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            background: isSelected ? '#f1f5f9' : 'transparent',
                                            color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--text-main))',
                                            fontWeight: isSelected ? 700 : 500,
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isSelected ? 'hsl(var(--primary))' : '#cbd5e1' }}>
                                            {isSelected ? '✓' : '•'}
                                        </span>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.9rem', color: isSelected ? 'hsl(var(--primary))' : '#0f172a' }}>
                                                Order #{p.orderId} - {p.productName}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                {p.price ? `Price: ₹${Number(p.price).toLocaleString('en-IN')} • ` : ''}Date: {p.orderDate}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                                                Click to Deselect
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
