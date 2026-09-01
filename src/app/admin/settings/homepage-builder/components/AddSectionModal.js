'use client';

import React from 'react';
import { X } from 'lucide-react';
import { SECTION_TEMPLATES } from './builderConstants';

export default function AddSectionModal({ isOpen, onClose, onSelectTemplate }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
            <div style={{
                background: '#ffffff', borderRadius: '20px', maxWidth: '880px', width: '100%',
                maxHeight: '88vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                            Add New Homepage Section
                        </h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                            Choose from curated components to insert into your storefront layout.
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {SECTION_TEMPLATES.map(tmpl => {
                        const IconComp = tmpl.icon;
                        return (
                            <div
                                key={tmpl.type}
                                onClick={() => onSelectTemplate(tmpl)}
                                style={{
                                    padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0',
                                    background: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#5d0821';
                                    e.currentTarget.style.background = '#ffffff';
                                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(93, 8, 33, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(93, 8, 33, 0.08)', color: '#5d0821', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <IconComp size={20} />
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{tmpl.name}</h4>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                                        {tmpl.desc}
                                    </p>
                                </div>

                                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #edf2f7', paddingTop: '0.75rem' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#5d0821', letterSpacing: '0.04em' }}>{tmpl.badge}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5d0821' }}>+ Insert Section</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
