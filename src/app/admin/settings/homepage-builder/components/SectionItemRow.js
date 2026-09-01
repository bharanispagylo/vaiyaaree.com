'use client';

import React from 'react';
import {
    GripVertical,
    Eye,
    EyeOff,
    Edit2,
    Trash2,
    ChevronUp,
    ChevronDown,
    Copy
} from 'lucide-react';
import { getSectionIcon, getSectionTypeName } from './builderConstants';

export default function SectionItemRow({
    sec,
    index,
    totalCount,
    isDragging,
    isDragOver,
    onDragStart,
    onDragOver,
    onDragEnd,
    onMove,
    onToggleVisibility,
    onDuplicate,
    onCustomize,
    onDelete
}) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: isDragOver ? '2px solid #5d0821' : sec.is_enabled ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
                padding: '1.1rem 1.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.25rem',
                boxShadow: isDragging ? '0 15px 30px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                opacity: isDragging ? 0.4 : sec.is_enabled ? 1 : 0.65,
                transform: isDragging ? 'scale(1.01)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'grab'
            }}
        >
            {/* Left Side: Drag Handle & Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
                <div style={{ color: '#94a3b8', cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                    <GripVertical size={20} />
                </div>

                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: sec.is_enabled ? 'rgba(93, 8, 33, 0.08)' : '#f1f5f9',
                    color: sec.is_enabled ? '#5d0821' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    {getSectionIcon(sec.section_type)}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                        <span style={{
                            background: '#f1f5f9', color: '#475569', fontSize: '0.72rem',
                            fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px',
                            textTransform: 'uppercase', letterSpacing: '0.04em'
                        }}>
                            #{index + 1}
                        </span>
                        <h3 style={{
                            margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                            {sec.title || getSectionTypeName(sec.section_type)}
                        </h3>
                        {sec.badge_text && (
                            <span style={{
                                background: 'rgba(93, 8, 33, 0.08)', color: '#5d0821',
                                fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.5rem',
                                borderRadius: '6px', textTransform: 'uppercase'
                            }}>
                                {sec.badge_text}
                            </span>
                        )}
                        {!sec.is_enabled && (
                            <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                                HIDDEN
                            </span>
                        )}
                    </div>

                    <p style={{
                        margin: 0, fontSize: '0.82rem', color: '#64748b',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {sec.subtitle || `Section Type: ${sec.section_type}`}
                    </p>
                </div>
            </div>

            {/* Right Side: Actions Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {/* Reorder Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={() => onMove(index, -1)}
                        disabled={index === 0}
                        style={{
                            background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px',
                            padding: '2px 6px', cursor: index === 0 ? 'not-allowed' : 'pointer',
                            color: index === 0 ? '#cbd5e1' : '#64748b'
                        }}
                        title="Move Up"
                    >
                        <ChevronUp size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMove(index, 1)}
                        disabled={index === totalCount - 1}
                        style={{
                            background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px',
                            padding: '2px 6px', cursor: index === totalCount - 1 ? 'not-allowed' : 'pointer',
                            color: index === totalCount - 1 ? '#cbd5e1' : '#64748b'
                        }}
                        title="Move Down"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>

                {/* Visibility Toggle */}
                <button
                    type="button"
                    onClick={() => onToggleVisibility(sec.id)}
                    style={{
                        padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                        background: sec.is_enabled ? '#f8fafc' : '#fee2e2',
                        color: sec.is_enabled ? '#475569' : '#dc2626',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title={sec.is_enabled ? 'Hide Section' : 'Show Section'}
                >
                    {sec.is_enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                {/* Duplicate Section */}
                <button
                    type="button"
                    onClick={() => onDuplicate(sec)}
                    style={{
                        padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                        background: '#f8fafc', color: '#475569', cursor: 'pointer'
                    }}
                    title="Duplicate Section"
                >
                    <Copy size={16} />
                </button>

                {/* Customize / Edit Button */}
                <button
                    type="button"
                    onClick={() => onCustomize(sec)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.5rem 0.9rem', borderRadius: '8px', border: 'none',
                        background: '#5d0821', color: '#ffffff', fontWeight: 700,
                        fontSize: '0.82rem', cursor: 'pointer'
                    }}
                >
                    <Edit2 size={14} /> Customize
                </button>

                {/* Delete Button */}
                <button
                    type="button"
                    onClick={() => onDelete(sec.id)}
                    style={{
                        padding: '0.5rem', borderRadius: '8px', border: '1px solid #fecaca',
                        background: '#fff1f2', color: '#dc2626', cursor: 'pointer'
                    }}
                    title="Remove Section"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
