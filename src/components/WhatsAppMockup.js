'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Video, MoreVertical, Search, Check, CheckCheck, Smile, Paperclip, Camera, Mic, Send } from 'lucide-react';

export default function WhatsAppMockup() {
    const [messages, setMessages] = useState([]);
    const [step, setStep] = useState(0);

    const chatScript = [
        { sender: 'user', text: 'Hi! I want to order a Saree.', time: '10:00 AM' },
        { sender: 'bot', text: 'Welcome to Cast Print! 🌸 We make shopping easy on WhatsApp. How can I help you today?', time: '10:01 AM' },
        { sender: 'user', text: "I'd like to see your latest collection.", time: '10:02 AM' },
        { sender: 'bot', text: 'Of course! Here is one of our hand-picked bestsellers.', image: '/images/hero-saree.png', time: '10:03 AM' },
        { sender: 'bot', text: 'Would you like to order this piece?', time: '10:03 AM' },
        { sender: 'user', text: 'Yes, please! It looks perfect.', time: '10:04 AM' },
        { sender: 'bot', text: 'Great choice! I will help you with the checkout right away. 🙏', time: '10:05 AM' },
    ];

    useEffect(() => {
        if (step < chatScript.length) {
            const timer = setTimeout(() => {
                setMessages(prev => [...prev, chatScript[step]]);
                setStep(prev => prev + 1);
            }, step === 0 ? 1000 : 2000);
            return () => clearTimeout(timer);
        } else {
            // Reset after a delay
            const resetTimer = setTimeout(() => {
                setMessages([]);
                setStep(0);
            }, 5000);
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
                position: 'relative',
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundSize: 'contain'
            }}>
                {/* WhatsApp Header */}
                <div style={{
                    background: '#075e54',
                    padding: '35px 15px 10px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/images/maroon-logo.png" style={{ width: '25px' }} alt="Logo" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cast Print Support</div>
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
                    gap: '8px'
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
                                fontSize: '0.85rem'
                            }}>
                                {msg.image && (
                                    <img src={msg.image} style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }} alt="Product" />
                                )}
                                {msg.text}
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
                        background: '#075e54',
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
