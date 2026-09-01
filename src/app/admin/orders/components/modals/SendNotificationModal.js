'use client';

import React from 'react';
import { X, Send, MessageCircle, Mail, Loader2 } from 'lucide-react';

export default function SendNotificationModal({
    show,
    onClose,
    sendWhatsAppChecked,
    setSendWhatsAppChecked,
    sendEmailChecked,
    setSendEmailChecked,
    notificationPhone,
    setNotificationPhone,
    notificationEmail,
    setNotificationEmail,
    onSendNotifications,
    loading
}) {
    if (!show) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
            <div className="card animate-pop" style={{ width: '100%', maxWidth: '480px', background: 'white', padding: '2rem', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Send size={20} style={{ color: 'hsl(var(--primary))' }} /> Send Notification
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* WhatsApp Checkbox & input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-main))' }}>
                            <input 
                                type="checkbox" 
                                checked={sendWhatsAppChecked} 
                                onChange={(e) => setSendWhatsAppChecked(e.target.checked)} 
                                style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MessageCircle size={16} style={{ color: '#10b981' }} /> WhatsApp
                            </span>
                        </label>
                        {sendWhatsAppChecked && (
                            <input 
                                type="text" 
                                value={notificationPhone} 
                                onChange={(e) => setNotificationPhone(e.target.value)} 
                                placeholder="WhatsApp Phone Number"
                                style={{ 
                                    width: '100%', 
                                    padding: '0.75rem', 
                                    background: '#f8fafc', 
                                    border: '1px solid hsl(var(--border-subtle))', 
                                    borderRadius: '12px', 
                                    fontSize: '0.9rem',
                                    color: 'hsl(var(--text-main))',
                                    outline: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* Email Checkbox & input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-main))' }}>
                            <input 
                                type="checkbox" 
                                checked={sendEmailChecked} 
                                onChange={(e) => setSendEmailChecked(e.target.checked)} 
                                style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))', cursor: 'pointer' }}
                            />
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Mail size={16} style={{ color: 'hsl(var(--primary))' }} /> Email
                            </span>
                        </label>
                        {sendEmailChecked && (
                            <input 
                                type="text" 
                                value={notificationEmail} 
                                onChange={(e) => setNotificationEmail(e.target.value)} 
                                placeholder="Email Address"
                                style={{ 
                                    width: '100%', 
                                    padding: '0.75rem', 
                                    background: '#f8fafc', 
                                    border: '1px solid hsl(var(--border-subtle))', 
                                    borderRadius: '12px', 
                                    fontSize: '0.9rem',
                                    color: 'hsl(var(--text-main))',
                                    outline: 'none'
                                }}
                            />
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.8rem' }}>Cancel</button>
                    <button
                        onClick={onSendNotifications}
                        className="btn btn-primary"
                        disabled={loading || (!sendWhatsAppChecked && !sendEmailChecked)}
                        style={{ padding: '0.8rem', background: 'hsl(var(--primary))', border: 'none' }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}
