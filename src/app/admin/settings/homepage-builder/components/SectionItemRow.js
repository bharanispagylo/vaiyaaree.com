'use client';

import React from 'react';
import {
    GripVertical,
    Eye,
    EyeOff,
    Trash2,
    ChevronUp,
    ChevronDown,
    Copy,
    ChevronRight
} from 'lucide-react';
import { getSectionIcon, getSectionTypeName } from './builderConstants';

export default function SectionItemRow({
    sec,
    index,
    totalCount,
    isSelected,
    isDragging,
    isDragOver,
    onSelect,
    onDragStart,
    onDragOver,
    onDragEnd,
    onMove,
    onToggleVisibility,
    onDuplicate,
    onDelete
}) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            onClick={() => onSelect && onSelect(sec)}
            style={{
                background: isSelected ? '#fff9fa' : '#ffffff',
                borderRadius: '12px',
                border: isDragOver
                    ? '2px solid #5d0821'
                    : isSelected
                    ? '2px solid #5d0821'
                    : sec.is_enabled
                    ? '1px solid #e2e8f0'
                    : '1px dashed #cbd5e1',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: isDragging
                    ? '0 15px 30px rgba(0,0,0,0.15)'
                    : isSelected
                    ? '0 4px 16px rgba(93, 8, 33, 0.12)'
                    : '0 2px 5px rgba(0,0,0,0.02)',
                opacity: isDragging ? 0.4 : sec.is_enabled ? 1 : 0.65,
                transform: isDragging ? 'scale(1.01)' : 'none',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                position: 'relative'
            }}
        >
            {/* Top row: Drag Handle, Icon, Title, and Selected Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                {/* Drag Handle */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        color: '#94a3b8',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px'
                    }}
                    title="Drag to reorder"
                >
                    <GripVertical size={18} />
                </div>

                {/* Section Type Icon */}
                <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: isSelected
                        ? '#5d0821'
                        : sec.is_enabled
                        ? 'rgba(93, 8, 33, 0.08)'
                        : '#f1f5f9',
                    color: isSelected
                        ? '#ffffff'
                        : sec.is_enabled
                        ? '#5d0821'
                        : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                }}>
                    {getSectionIcon(sec.section_type)}
                </div>

                {/* Title & Metadata */}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
                        <span style={{
                            background: isSelected ? 'rgba(93, 8, 33, 0.12)' : '#f1f5f9',
                            color: isSelected ? '#5d0821' : '#475569',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            letterSpacing: '0.04em'
                        }}>
                            #{index + 1}
                        </span>
                        <h4 style={{
                            margin: 0,
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            color: isSelected ? '#5d0821' : '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {sec.title || getSectionTypeName(sec.section_type)}
                        </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '0.72rem',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {getSectionTypeName(sec.section_type)}
                        </span>
                        {!sec.is_enabled && (
                            <span style={{
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '0.05rem 0.35rem',
                                borderRadius: '4px'
                            }}>
                                HIDDEN
                            </span>
                        )}
                    </div>
                </div>

                {/* Active Indicator Chevron */}
                {isSelected && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#5d0821',
                        flexShrink: 0
                    }}>
                        <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            background: '#5d0821',
                            color: '#ffffff',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            marginRight: '4px',
                            letterSpacing: '0.04em'
                        }}>
                            ACTIVE
                        </span>
                        <ChevronRight size={16} />
                    </div>
                )}
            </div>

            {/* Bottom Row: Quick Action Toolbar */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: isSelected ? '1px solid #fed7e2' : '1px solid #f1f5f9',
                    paddingTop: '0.5rem',
                    marginTop: '0.15rem'
                }}
            >
                {/* Reorder Up/Down */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMove(index, -1);
                        }}
                        disabled={index === 0}
                        style={{
                            background: 'none',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            color: index === 0 ? '#cbd5e1' : '#64748b',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Move Up"
                    >
                        <ChevronUp size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMove(index, 1);
                        }}
                        disabled={index === totalCount - 1}
                        style={{
                            background: 'none',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: index === totalCount - 1 ? 'not-allowed' : 'pointer',
                            color: index === totalCount - 1 ? '#cbd5e1' : '#64748b',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Move Down"
                    >
                        <ChevronDown size={13} />
                    </button>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Visibility Toggle */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(sec.id);
                        }}
                        style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: sec.is_enabled ? '#f8fafc' : '#fee2e2',
                            color: sec.is_enabled ? '#475569' : '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title={sec.is_enabled ? 'Hide Section' : 'Show Section'}
                    >
                        {sec.is_enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>

                    {/* Duplicate Section */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(sec);
                        }}
                        style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Duplicate Section"
                    >
                        <Copy size={13} />
                    </button>

                    {/* Delete Button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(sec.id);
                        }}
                        style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            background: '#fff1f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Remove Section"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
