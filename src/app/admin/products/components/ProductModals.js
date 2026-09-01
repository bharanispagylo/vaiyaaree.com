'use client';

import { useState } from 'react';
import {
    Check, X, AlertTriangle, Upload, FileDown, Loader2, Search,
    Facebook, Instagram, ThumbsUp, MessageSquare, Share2, Heart
} from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';

/**
 * Excel Bulk Import Modal
 */
export function ExcelImportModal({
    isOpen,
    onClose,
    onFileChange,
    importing
}) {
    if (!isOpen) return null;

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            <div className="card shadow-premium" style={{
                maxWidth: '600px',
                margin: '0 auto',
                padding: 0,
                borderRadius: '32px',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid hsl(var(--border-subtle))',
                textAlign: 'center'
            }}>
                <div style={{ padding: '4rem' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2.5rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                        color: '#0f172a',
                        border: '1px solid #f1f5f9'
                    }}>
                        <Upload size={44} strokeWidth={1.5} />
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a', letterSpacing: '-0.04em' }}>
                        Bulk Catalog Import
                    </h2>
                    <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: '1.6', marginBottom: '3rem' }}>
                        Upload your inventory spreadsheet to synchronize your collection in seconds.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            key={`file-import-${Date.now()}`}
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            id="bulk-import-input"
                            style={{ display: 'none' }}
                            onChange={onFileChange}
                        />
                        <label htmlFor="bulk-import-input" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            height: '64px',
                            background: '#0f172a',
                            borderRadius: '16px',
                            color: 'white',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: '0.2s',
                            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.3)',
                            fontSize: '1.1rem'
                        }}>
                            {importing ? (
                                <><Loader2 size={24} className="animate-spin" /> Processing Spreadsheet...</>
                            ) : (
                                <><FileDown size={22} /> Choose Spreadsheet</>
                            )}
                        </label>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                marginTop: '1rem'
                            }}
                        >
                            Cancel and Go Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Watermark Detection & Confirmation Modal
 */
export function WatermarkModal({ watermarkModal, onClose }) {
    const [confirmChecked, setConfirmChecked] = useState(false);
    if (!watermarkModal) return null;

    return (
        <ModalPortal>
            <div className="modal-overlay">
                {watermarkModal.type === 'existing' ? (
                    <div className="modal-box shadow-premium" style={{
                        maxWidth: '520px', padding: 0, borderRadius: '32px',
                        overflow: 'hidden', background: '#ffffff',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.12)',
                        textAlign: 'center', maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ padding: '2rem' }}>
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%',
                                background: '#eff6ff', color: '#2563eb',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.25rem',
                                border: '1px solid #bfdbfe'
                            }}>
                                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </div>

                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.025em' }}>
                                Existing Watermark Found
                            </h3>
                            <p style={{ color: '#64748b', lineHeight: '1.5', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                                This image already has catalog watermark <span style={{ color: '#2563eb', fontWeight: 800 }}>{watermarkModal.detectedCode}</span>.
                            </p>

                            {watermarkModal.url && (
                                <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '1.25rem', position: 'relative' }}>
                                    <img
                                        src={watermarkModal.url}
                                        alt=""
                                        style={{ width: '100%', height: '170px', objectFit: 'contain' }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '10px',
                                        right: '10px',
                                        background: 'rgba(0,0,0,0.85)',
                                        color: '#38bdf8',
                                        padding: '4px 12px',
                                        borderRadius: '50px',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {watermarkModal.detectedCode}
                                    </div>
                                </div>
                            )}

                            {/* Required Checkbox to Allow Upload / Use */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 14px',
                                background: confirmChecked ? '#f0fdf4' : '#f8fafc',
                                border: confirmChecked ? '2px solid #16a34a' : '1px solid #cbd5e1',
                                borderRadius: '12px',
                                marginBottom: '1.5rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }} onClick={() => setConfirmChecked(prev => !prev)}>
                                <input
                                    type="checkbox"
                                    id="watermark-confirm-check"
                                    checked={confirmChecked}
                                    onChange={(e) => setConfirmChecked(e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        accentColor: '#16a34a',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                />
                                <label htmlFor="watermark-confirm-check" style={{ cursor: 'pointer', fontSize: '0.86rem', fontWeight: 800, color: confirmChecked ? '#15803d' : '#334155', margin: 0, lineHeight: '1.4', userSelect: 'none' }}>
                                    Use existing watermark image for this product
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        flex: 1, height: '48px', borderRadius: '14px',
                                        fontSize: '0.88rem', fontWeight: 700, border: '1px solid #cbd5e1',
                                        color: '#475569', background: '#f8fafc', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={!confirmChecked}
                                    onClick={() => {
                                        if (confirmChecked && watermarkModal.onUseExisting) {
                                            watermarkModal.onUseExisting();
                                        }
                                    }}
                                    style={{
                                        flex: 1.6, height: '48px', borderRadius: '14px',
                                        fontSize: '0.88rem', fontWeight: 800, border: 'none',
                                        color: '#ffffff',
                                        background: confirmChecked ? '#16a34a' : '#94a3b8',
                                        boxShadow: confirmChecked ? '0 4px 14px rgba(22, 163, 74, 0.3)' : 'none',
                                        cursor: confirmChecked ? 'pointer' : 'not-allowed',
                                        opacity: confirmChecked ? 1 : 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {confirmChecked ? '✓ Use Watermarked Image' : 'Check Box to Allow'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="modal-box shadow-premium" style={{
                        maxWidth: '520px', padding: 0, borderRadius: '32px',
                        overflow: 'hidden', background: '#ffffff',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.12)',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <h3 style={{
                                fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem',
                                color: '#0f172a', letterSpacing: '-0.025em'
                            }}>
                                Apply Watermark?
                            </h3>
                            <p style={{
                                color: '#64748b', lineHeight: '1.6', fontSize: '1rem',
                                marginBottom: '2rem'
                            }}>
                                This is a clean image. We will generate code <span style={{ color: '#0f172a', fontWeight: 800 }}>{watermarkModal.detectedCode}</span> and apply the watermark for you.
                            </p>

                            <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', position: 'relative' }}>
                                <img
                                    src={watermarkModal.url}
                                    alt=""
                                    style={{ width: '100%', height: '200px', objectFit: 'contain' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    right: '20px',
                                    background: 'rgba(0,0,0,0.85)',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '50px',
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    border: '1.5px solid rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    zIndex: 10,
                                    fontFamily: 'var(--font-roboto)',
                                    letterSpacing: '0.05em'
                                }}>
                                    {watermarkModal.detectedCode}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: "2rem" }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        flex: 1, height: '56px', borderRadius: '16px',
                                        fontSize: '1rem', fontWeight: 700, border: 'none',
                                        color: '#64748b', background: '#f1f5f9', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={watermarkModal.onProceed}
                                    style={{
                                        flex: 1.5, height: '56px', borderRadius: '16px',
                                        fontSize: '1rem', fontWeight: 800, border: 'none',
                                        color: '#fff', background: '#0f172a',
                                        boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    Apply & Proceed
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModalPortal>
    );
}

/**
 * Social Media Feed Preview Modal (Facebook & Instagram)
 */
export function SocialPreviewModal({ previewModal, onClose }) {
    if (!previewModal) return null;

    return (
        <ModalPortal>
            <div className="modal-overlay" onClick={onClose}>
                <div
                    className="modal-box shadow-premium"
                    style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '24px', background: '#f8fafc' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Social Media Preview</h3>
                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>See how your product will look on Meta platforms.</p>
                        </div>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: previewModal.platform ? '1fr' : '1fr 1fr', gap: '1.5rem', justifyContent: 'center' }}>
                        {/* Facebook Mock */}
                        {(!previewModal.platform || previewModal.platform === 'facebook') && (
                            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden', height: 'fit-content' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f0f2f5' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1877F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Facebook size={16} />
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Vaiyaaree</div>
                                </div>
                                <div style={{ padding: '12px', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                    {(() => {
                                        const parts = (previewModal.caption || '').split('\n\n#');
                                        return (
                                            <>
                                                {parts[0]}
                                                {parts[1] && <div style={{ color: '#1877F2', marginTop: '0.5rem', fontWeight: 500 }}>#{parts[1]}</div>}
                                            </>
                                        );
                                    })()}
                                </div>
                                {previewModal.product?.image_url && (
                                    <div style={{ width: '100%', height: '240px', overflow: 'hidden', borderTop: '1px solid #eee', background: '#f1f5f9' }}>
                                        <img src={previewModal.product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                )}
                                <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#65676B', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ThumbsUp size={14} /> Like</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={14} /> Comment</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Share2 size={14} /> Share</span>
                                </div>
                            </div>
                        )}

                        {/* Instagram Mock */}
                        {(!previewModal.platform || previewModal.platform === 'instagram') && (
                            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden', height: 'fit-content', margin: '0 auto', width: '100%', maxWidth: '400px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Instagram size={14} />
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>vaiyaaree</div>
                                </div>
                                {previewModal.product?.image_url && (
                                    <div style={{ width: '100%', height: '300px', overflow: 'hidden', background: '#f1f5f9' }}>
                                        <img src={previewModal.product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                )}
                                <div style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', color: '#262626' }}>
                                        <Heart size={18} /> <MessageSquare size={18} /> <Share2 size={18} />
                                    </div>
                                    <div style={{ fontSize: '0.82rem', lineHeight: 1.4, maxHeight: '200px', overflowY: 'auto' }}>
                                        <span style={{ fontWeight: 700 }}>vaiyaaree</span>{' '}
                                        {(() => {
                                            const parts = (previewModal.caption || '').split('\n\n#');
                                            return (
                                                <>
                                                    <span style={{ whiteSpace: 'pre-wrap' }}>{parts[0]}</span>
                                                    {parts[1] && <div style={{ color: '#00376b', display: 'inline', marginLeft: '4px' }}>#{parts[1]}</div>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

/**
 * Success Notification Modal
 */
export function SuccessModal({ isOpen, successModal, onClose, title = 'Success!', message = 'Operation completed successfully.' }) {
    const isVisible = isOpen || Boolean(successModal);
    if (!isVisible) return null;

    const displayTitle = successModal?.title || title;
    const displayMessage = successModal?.message || message;
    const handleClose = () => {
        if (successModal?.onClose) {
            successModal.onClose();
        } else if (onClose) {
            onClose();
        }
    };

    return (
        <ModalPortal>
            <div className="modal-overlay" onClick={handleClose}>
                <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: 0, borderRadius: '32px', background: '#ffffff', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '3rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem', border: '1.5px solid #86efac' }}>
                            <Check size={40} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{displayTitle}</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '2rem' }}>
                            {displayMessage}
                        </p>
                        <button type="button" onClick={handleClose} style={{ width: '100%', background: '#0f172a', height: '52px', borderRadius: '14px', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.15s' }}>
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

/**
 * Error Notification Modal
 */
export function ErrorModal({ errorModal, isOpen, onClose, title = 'Error', message = '' }) {
    const isVisible = isOpen || Boolean(errorModal);
    if (!isVisible) return null;

    const displayTitle = errorModal?.title || title;
    const displayMessage = errorModal?.message || message || 'An unexpected error occurred.';
    const handleClose = () => {
        if (errorModal?.onClose) {
            errorModal.onClose();
        } else if (onClose) {
            onClose();
        }
    };

    return (
        <ModalPortal>
            <div className="modal-overlay" onClick={handleClose}>
                <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: 0, borderRadius: '32px', background: '#ffffff', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '3rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem', border: '1.5px solid #fca5a5' }}>
                            <X size={40} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{displayTitle}</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '2rem' }}>
                            {displayMessage}
                        </p>
                        <button type="button" onClick={handleClose} style={{ width: '100%', background: '#0f172a', height: '52px', borderRadius: '14px', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.15s' }}>
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

/**
 * Action Confirmation Modal
 */
export function ConfirmModal({ confirmModal, onClose }) {
    if (!confirmModal) return null;

    return (
        <ModalPortal>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-box modal-warning" onClick={e => e.stopPropagation()}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', fontSize: '2.5rem', boxShadow: 'inset 0 0 0 2px #fef3c7' }}>
                        <AlertTriangle size={40} strokeWidth={2.5} />
                    </div>
                    <h3 className="modal-title">{confirmModal.title}</h3>
                    <p className="modal-message">
                        {confirmModal.message}
                    </p>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="modal-btn modal-btn-secondary" style={{ flex: 1 }}>
                            No, Cancel
                        </button>
                        <button type="button" onClick={() => { confirmModal.onConfirm(); onClose(); }} className="modal-btn modal-btn-primary" style={{ flex: 1.2, background: '#ef4444' }}>
                            Yes, Proceed
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

/**
 * Generic Result Modal (for import / export feedback)
 */
export function ResultModal({ resultModal, onClose }) {
    if (!resultModal) return null;

    return (
        <ModalPortal>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: 0, borderRadius: '32px', background: '#ffffff', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '3rem' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: resultModal.type === 'error' ? '#fef2f2' : '#f0fdf4',
                            color: resultModal.type === 'error' ? '#ef4444' : '#10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 2rem',
                            border: `1px solid ${resultModal.type === 'error' ? '#fee2e2' : '#dcfce7'}`
                        }}>
                            {resultModal.type === 'error' ? <X size={40} strokeWidth={2} /> : <Check size={40} strokeWidth={2} />}
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{resultModal.title}</h3>
                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem', marginBottom: '2rem' }}>
                            {resultModal.message}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                if (resultModal.onClose) resultModal.onClose();
                            }}
                            style={{ width: '100%', background: '#0f172a', height: '52px', borderRadius: '14px', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

/**
 * Fullscreen Loading Overlay for Watermark & Image Processing
 */
export function OcrLoadingOverlay({ isLoading, ocrLoading, text, loadingOverlayText }) {
    const active = isLoading !== undefined ? isLoading : ocrLoading;
    const displayText = text || loadingOverlayText || 'Processing Image...';

    if (!active) return null;

    return (
        <ModalPortal>
            <div className="modal-overlay" style={{
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(10px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '2.5rem 2.25rem',
                    maxWidth: '440px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Top Shimmer Accent */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #5d0821, #d47a06, #5d0821)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s infinite linear'
                    }} />

                    {/* Animated Pulsing Icon & Spinner */}
                    <div style={{ position: 'relative', width: '84px', height: '84px' }}>
                        {/* Outer Glow Ring */}
                        <div style={{
                            position: 'absolute', inset: -6,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(212, 122, 6, 0.2) 0%, rgba(93, 8, 33, 0.05) 70%, transparent 100%)',
                            animation: 'pulse 2s infinite ease-in-out'
                        }} />

                        {/* Spinning Track */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            border: '3px solid #f1f5f9'
                        }} />

                        {/* Spinning Ring */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            border: '3px solid transparent',
                            borderTopColor: '#5d0821',
                            borderRightColor: '#d47a06',
                            animation: 'spin 0.9s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite'
                        }} />

                        {/* Center Icon */}
                        <div style={{
                            position: 'absolute', inset: '10px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(93, 8, 33, 0.08), rgba(212, 122, 6, 0.12))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#5d0821'
                        }}>
                            <Loader2 size={30} className="animate-spin" style={{ color: '#5d0821' }} />
                        </div>
                    </div>

                    {/* Text Heading */}
                    <div>
                        <h3 style={{
                            margin: '0 0 0.4rem',
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            letterSpacing: '-0.01em'
                        }}>
                            {displayText}
                        </h3>
                        <p style={{
                            margin: 0,
                            fontSize: '0.84rem',
                            color: '#64748b',
                            lineHeight: 1.5
                        }}>
                            Generating branded watermark and selecting image for your product catalog...
                        </p>
                    </div>

                    {/* Progress Track Bar */}
                    <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#f1f5f9',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        position: 'relative',
                        marginTop: '0.25rem'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: '45%',
                            borderRadius: '9999px',
                            background: 'linear-gradient(90deg, #5d0821, #d47a06)',
                            animation: 'indeterminateProgress 1.4s ease-in-out infinite'
                        }} />
                    </div>

                    {/* Status Pill */}
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#d47a06',
                        background: '#fffbeb',
                        border: '1px solid #fef3c7',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                    }}>
                        Please wait a moment
                    </span>
                </div>
            </div>
        </ModalPortal>
    );
}
