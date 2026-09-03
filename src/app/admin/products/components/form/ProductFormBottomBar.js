'use client';

import { Trash2, FileText, Save } from 'lucide-react';

export default function ProductFormBottomBar({
    currentProduct,
    handleDelete,
    setIsEditing,
    handleSaveAsDraft,
    fbProcessing,
    productStatus
}) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid hsl(var(--border-subtle))',
            flexWrap: 'wrap',
            gap: '1rem'
        }}>
            <div>
                {currentProduct?.id && (
                    <button
                        type="button"
                        onClick={() => handleDelete(currentProduct.id)}
                        className="btn btn-danger"
                        style={{ padding: '0.55rem 1.15rem', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Trash2 size={15} /> Delete Product
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 1.25rem', fontSize: '0.84rem', fontWeight: 700 }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSaveAsDraft}
                    disabled={fbProcessing}
                    className="btn btn-secondary"
                    style={{
                        padding: '0.55rem 1.25rem',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#fffbeb',
                        color: '#b45309',
                        border: '1px solid #fde68a'
                    }}
                >
                    <FileText size={15} /> Save as Draft
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={fbProcessing}
                    style={{
                        padding: '0.55rem 1.75rem',
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(93, 8, 33, 0.28)'
                    }}
                >
                    <Save size={16} /> {fbProcessing ? 'Saving Product...' : (productStatus === 'draft' ? 'Save Product' : 'Publish Product')}
                </button>
            </div>
        </div>
    );
}
