'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function FeaturePerksEditor({ settings, updateSettings }) {
    const perks = Array.isArray(settings?.perks) ? settings.perks : [];

    const handleAddPerk = () => {
        const newPerk = {
            icon: "Sparkles",
            title: "New Feature Highlight",
            desc: "Description of your feature or benefit"
        };
        updateSettings('perks', [...perks, newPerk]);
    };

    const handleUpdatePerk = (index, field, value) => {
        const newPerks = [...perks];
        newPerks[index] = { ...newPerks[index], [field]: value };
        updateSettings('perks', newPerks);
    };

    const handleDeletePerk = (index) => {
        const newPerks = perks.filter((_, i) => i !== index);
        updateSettings('perks', newPerks);
    };

    return (
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Trust Badges & Perks ({perks.length})</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Customize the highlight cards shown across the boutique storefront.</p>
                </div>
                <button
                    type="button"
                    onClick={handleAddPerk}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: '#5d0821', color: '#ffffff', border: 'none',
                        padding: '0.45rem 0.85rem', borderRadius: '8px',
                        fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                    }}
                >
                    <Plus size={14} /> Add Perk
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {perks.map((perk, idx) => (
                    <div
                        key={`perk-edit-${idx}`}
                        style={{
                            background: '#ffffff', borderRadius: '10px',
                            border: '1px solid #cbd5e1', padding: '0.85rem',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                        }}
                    >
                        <div style={{ width: '110px', flexShrink: 0 }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                Icon Name
                            </label>
                            <select
                                value={perk.icon || 'Sparkles'}
                                onChange={(e) => handleUpdatePerk(idx, 'icon', e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                            >
                                <option value="Truck">Truck (Shipping)</option>
                                <option value="Sparkles">Sparkles (Authentic)</option>
                                <option value="MessageSquare">Message (WhatsApp)</option>
                                <option value="ShieldCheck">Shield (Warranty)</option>
                                <option value="Award">Award (Certified)</option>
                                <option value="HeartHandshake">Handshake (Artisan)</option>
                            </select>
                        </div>

                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                Title
                            </label>
                            <input
                                type="text"
                                value={perk.title || ''}
                                onChange={(e) => handleUpdatePerk(idx, 'title', e.target.value)}
                                placeholder="Perk title"
                                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', marginBottom: '4px' }}
                            />
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                                Description
                            </label>
                            <input
                                type="text"
                                value={perk.desc || ''}
                                onChange={(e) => handleUpdatePerk(idx, 'desc', e.target.value)}
                                placeholder="Short description"
                                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => handleDeletePerk(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                            title="Remove Perk"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
