'use client';
import React from 'react';
import { X, Check } from 'lucide-react';

/**
 * Premium Image Zoom Component
 * Standardized across the application for a consistent UX.
 * Matches Amazon/Flipkart style with a centered modal and background blur.
 */
export default function ImageZoom({ url, onClose }) {
    if (!url) return null;

    return (
        <div className="zoom-overlay" onClick={onClose}>
            <button className="zoom-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                <X size={24} />
            </button>

            <img
                src={url}
                alt="Zoomed Preview"
                className="zoom-image animate-zoom"
                onClick={(e) => e.stopPropagation()}
            />

            <div className="zoom-footer" onClick={(e) => e.stopPropagation()}>
                <button className="zoom-ok-btn" onClick={onClose}>
                    <X size={20} /> Cancel
                </button>
            </div>
        </div>
    );
}
