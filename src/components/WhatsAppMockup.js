'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Video, MoreVertical, Search, Check, CheckCheck, Smile, Paperclip, Camera, Mic, Send } from 'lucide-react';

export default function WhatsAppMockup() {
    const [messages, setMessages] = useState([]);
    const [step, setStep] = useState(0);

    const chatScript = [
        { sender: 'user', text: 'Hi', time: '10:00 AM' },
        { 
            sender: 'bot', 
            text: " *Welcome to Vaiyaaree!*\n\nDiscover our premium collection of silk & cotton sarees.\n\n *Shop Online:*\nhttps://vaiyaaree.vercel.app/shop", 
            time: '10:01 AM' 
        },
        { 
            sender: 'bot', 
            text: "Explore our collection and manage:", 
            buttons: [" View Catalogue", "My Orders", "Contact Us"],
            time: '10:01 AM' 
        },
    ];

    useEffect(() => {
        if (step < chatScript.length) {
            const timer = setTimeout(() => {
                setMessages(prev => [...prev, chatScript[step]]);
                setStep(prev => prev + 1);
            }, step === 0 ? 1000 : 2000);
            return () => clearTimeout(timer);
        } else {
            // Reset after a long delay
            const resetTimer = setTimeout(() => {
                setMessages([]);
                setStep(0);
            }, 8000);
            return () => clearTimeout(resetTimer);
        }
    }, [step]);

    return (
        <div className="phone-container" style={{
            position: 'relative',
            width: '320px',
            height: '650px',
            background: '#1a1a1a',
            borderRadius: '40px',
            padding: '12px',
            boxShadow: '0 50px 100px rgba(0,0,0,0.2), 0 15px 35px rgba(0,0,0,0.1)',
            border: '4px solid #333',
            margin: '0 auto'
        }}>
            {/* iPhone Notch */}
            <div style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '150px',
                height: '30px',
                background: '#1a1a1a',
                borderBottomLeftRadius: '20px',
                borderBottomRightRadius: '20px',
                zIndex: 10
            }}>
                <div style={{
                    width: '60px',
                    height: '5px',
                    background: '#333',
                    borderRadius: '5px',
                    margin: '12px auto 0'
                }} />
            </div>

            {/* Screen Content */}
            <div style={{
                width: '100%',
                height: '100%',
                background: '#e5ddd5', // WhatsApp Chat Background
                borderRadius: '30px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}>
                {/* WhatsApp Header */}
                <div style={{
                    background: '#5d0821',
                    padding: '35px 15px 10px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src="/images/vaiyaaree-logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Vaiyaaree Support</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Online</div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <Video size={18} />
                        <Phone size={18} />
                        <MoreVertical size={18} />
                    </div>
                </div>

                {/* Chat Area */}
                <div style={{
                    flex: 1,
                    padding: '15px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {messages.map((msg, i) => (
                        <div 
                            key={i} 
                            style={{
                                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                            }}
                        >
                            <div style={{
                                background: msg.sender === 'user' ? '#dcf8c6' : '#fff',
                                padding: '8px 12px',
                                borderRadius: msg.sender === 'user' ? '10px 0 10px 10px' : '0 10px 10px 10px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                position: 'relative',
                                fontSize: '0.85rem',
                                color: '#333'
                            }}>
                                {msg.image && (
                                    <div style={{ margin: '-8px -12px 10px -12px', overflow: 'hidden', borderRadius: '10px 10px 0 0' }}>
                                        <img src={msg.image} style={{ width: '100%', display: 'block' }} alt="Product" />
                                    </div>
                                )}
                                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: '#999',
                                    textAlign: 'right',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '3px'
                                }}>
                                    {msg.time}
                                    {msg.sender === 'user' && <CheckCheck size={12} color="#4fc3f7" />}
                                </div>
                            </div>
                            
                            {/* WhatsApp Reply Buttons */}
                            {msg.buttons && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                                    {msg.buttons.map((btn, idx) => (
                                        <div key={idx} style={{ 
                                            background: '#fff', 
                                            padding: '8px 15px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.8rem', 
                                            color: '#5d0821', 
                                            textAlign: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                            fontWeight: 500,
                                            border: '1px solid #f0f0f0'
                                        }}>
                                            {btn}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* WhatsApp Footer */}
                <div style={{
                    background: '#f0f0f0',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <Smile size={20} color="#999" />
                    <div style={{
                        flex: 1,
                        background: '#fff',
                        borderRadius: '20px',
                        padding: '8px 15px',
                        fontSize: '0.85rem',
                        color: '#999',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        Type a message
                        <Paperclip size={18} />
                    </div>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#5d0821',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                    }}>
                        <Mic size={20} />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.9) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>

    );
}
