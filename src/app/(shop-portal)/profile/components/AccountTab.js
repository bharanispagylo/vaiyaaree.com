'use client';

import React, { useState, useEffect } from 'react';
import { 
    User, Mail, MapPin, Save, FileText, Truck, Phone, MessageCircle, 
    Edit2, Trash2, CheckCircle2, Globe, Plus, X 
} from 'lucide-react';
import { ALL_COUNTRIES, COUNTRY_CODES, formatDisplayPhone, getCountryByName } from '@/lib/countryCodes';
import styles from '../profile.module.css';

export default function AccountTab({
    user,
    handleUpdateProfile,
    saving,
    showAddressForm,
    setShowAddressForm,
    addressFormType,
    setAddressFormType,
    handleAddAddress,
    editingAddress,
    setEditingAddress,
    handleOpenAddAddress,
    handleOpenEditAddress,
    handleCancelAddressForm,
    handleSetDefaultAddress,
    loadingAddresses,
    billingAddresses = [],
    shippingAddresses = [],
    deleteAddress
}) {
    // Local form helper states for Personal Information
    const [profilePhone, setProfilePhone] = useState(user?.phone || '');
    const [profileCountryCode, setProfileCountryCode] = useState(user?.country_code || '+91');
    const [profileWA, setProfileWA] = useState(user?.whatsapp || '');
    const [profileWACountryCode, setProfileWACountryCode] = useState(user?.whatsapp_country_code || user?.country_code || '+91');
    const [profileCountry, setProfileCountry] = useState(user?.country || 'India');

    // Sync profile state when user prop updates
    useEffect(() => {
        if (user) {
            setProfilePhone(user.phone || '');
            setProfileCountryCode(user.country_code || '+91');
            setProfileWA(user.whatsapp || '');
            setProfileWACountryCode(user.whatsapp_country_code || user.country_code || '+91');
            setProfileCountry(user.country || 'India');
        }
    }, [user]);

    // Local form helper states for Address Add/Edit
    const [addrPhone, setAddrPhone] = useState('');
    const [addrCountryCode, setAddrCountryCode] = useState('+91');
    const [addrWA, setAddrWA] = useState('');
    const [addrWACountryCode, setAddrWACountryCode] = useState('+91');
    const [addrCountry, setAddrCountry] = useState('India');

    useEffect(() => {
        if (editingAddress) {
            setAddrPhone(editingAddress.phone || '');
            setAddrCountryCode(editingAddress.country_code || '+91');
            setAddrWA(editingAddress.whatsapp || '');
            setAddrWACountryCode(editingAddress.whatsapp_country_code || editingAddress.country_code || '+91');
            setAddrCountry(editingAddress.country || 'India');
        } else {
            setAddrPhone(user?.phone || '');
            setAddrCountryCode(user?.country_code || '+91');
            setAddrWA(user?.whatsapp || user?.phone || '');
            setAddrWACountryCode(user?.whatsapp_country_code || user?.country_code || '+91');
            setAddrCountry(user?.country || 'India');
        }
    }, [editingAddress, showAddressForm, user]);

    // Copy Phone to WhatsApp for Personal Information
    const copyProfilePhoneToWA = () => {
        setProfileWA(profilePhone);
        setProfileWACountryCode(profileCountryCode);
    };

    // Copy Phone to WhatsApp for Address Form
    const copyAddrPhoneToWA = () => {
        setAddrWA(addrPhone);
        setAddrWACountryCode(addrCountryCode);
    };

    // Render an address card
    const renderAddressCard = (addr, type) => {
        const isDefault = Boolean(Number(addr.is_default) === 1 || addr.is_default === '1' || addr.is_default === true);
        const displayPhone = formatDisplayPhone(addr.country_code || '+91', addr.phone);
        const displayWA = addr.whatsapp ? formatDisplayPhone(addr.whatsapp_country_code || addr.country_code || '+91', addr.whatsapp) : null;

        return (
            <div key={addr.id} className={styles.addressCard}>
                {isDefault && (
                    <span className={`${styles.defaultBadge} ${type === 'billing' ? styles.badgeDefaultBilling : styles.badgeDefaultShipping}`}>
                        DEFAULT {type.toUpperCase()}
                    </span>
                )}
                <h4 className={styles.addressTitle}>
                    {type === 'billing' ? <FileText size={16} /> : <Truck size={16} />}
                    {addr.title || (type === 'billing' ? 'Billing Address' : 'Shipping Address')}
                </h4>
                <p className={styles.addressName}>{addr.full_name || addr.name || 'Recipient'}</p>
                {addr.email && (
                    <p className={styles.addressLine} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Mail size={13} style={{ opacity: 0.6 }} /> {addr.email}
                    </p>
                )}
                <p className={styles.addressLine}>{addr.address_line || addr.address}</p>
                <p className={styles.addressLocation}>
                    {addr.city ? `${addr.city}, ` : ''}{addr.state || ''} {addr.pincode || ''}
                </p>
                <p className={styles.addressLocation} style={{ fontWeight: 600 }}>
                    <Globe size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    {addr.country || 'India'}
                </p>
                {displayPhone && (
                    <p className={styles.addressPhone} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Phone size={13} style={{ opacity: 0.6 }} /> {displayPhone}
                    </p>
                )}
                {displayWA && (
                    <p className={styles.addressPhone} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a' }}>
                        <MessageCircle size={13} /> {displayWA}
                    </p>
                )}

                <div className={styles.addressCardActions}>
                    <button 
                        type="button" 
                        onClick={() => handleOpenEditAddress(addr)} 
                        className={styles.editAddressBtn}
                    >
                        <Edit2 size={13} /> Edit
                    </button>
                    {!isDefault && (
                        <button 
                            type="button" 
                            onClick={() => handleSetDefaultAddress(addr.id, type)} 
                            className={styles.makeDefaultBtn}
                        >
                            <CheckCircle2 size={13} /> Set as Default
                        </button>
                    )}
                    <button 
                        type="button" 
                        onClick={() => deleteAddress(addr.id)} 
                        className={styles.deleteAddressBtn}
                    >
                        <Trash2 size={13} /> Delete
                    </button>
                </div>
            </div>
        );
    };

    // Render Address Add / Edit Form
    const renderAddressForm = (formType) => {
        const isEditing = Boolean(editingAddress && editingAddress.id);
        const formTitle = isEditing 
            ? `Edit ${formType === 'billing' ? 'Billing' : 'Shipping'} Address` 
            : `Add New ${formType === 'billing' ? 'Billing' : 'Shipping'} Address`;

        const defaultTitle = formType === 'billing' ? 'Tax / Office Billing' : 'Home Delivery';

        return (
            <form onSubmit={handleAddAddress} className={styles.addressForm} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid hsl(var(--text-main) / 0.08)' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'hsl(var(--text-main))' }}>
                        {formTitle}
                    </h4>
                    <button 
                        type="button" 
                        onClick={handleCancelAddressForm}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                    >
                        <X size={16} /> Cancel
                    </button>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>ADDRESS TITLE / LABEL <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            name="title" 
                            defaultValue={editingAddress?.title || defaultTitle} 
                            required 
                            placeholder="e.g. Home, Office, Work, GST Billing" 
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>{formType === 'billing' ? 'FULL NAME / COMPANY NAME' : 'RECIPIENT FULL NAME'} <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            name="full_name" 
                            defaultValue={editingAddress?.full_name || editingAddress?.name || user?.name} 
                            required 
                            placeholder="Full Name"
                            onInput={(e) => {
                                e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            }}
                            pattern="[a-zA-Z\s]+"
                            title="Only letters and spaces are allowed"
                        />
                    </div>
                </div>

                <div className={styles.formGrid} style={{ marginTop: '1.25rem' }}>
                    <div className={styles.formGroup}>
                        <label>PHONE NUMBER <span style={{ color: '#ef4444' }}>*</span></label>
                        <div className={styles.phoneInputCompound}>
                            <select 
                                name="country_code" 
                                value={addrCountryCode}
                                onChange={(e) => setAddrCountryCode(e.target.value)}
                                className={styles.phoneSelectPrefix}
                            >
                                {COUNTRY_CODES.map((c, i) => (
                                    <option key={`${c.code}-${c.iso || i}`} value={c.code}>
                                        {c.flag} {c.code}
                                    </option>
                                ))}
                            </select>
                            <input 
                                name="phone" 
                                value={addrPhone}
                                onChange={(e) => setAddrPhone(e.target.value.replace(/\D/g, ''))}
                                required 
                                placeholder="Phone number"
                                className={styles.phoneInputRight}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '0.6rem' }}>
                            <label style={{ margin: 0 }}>WHATSAPP NUMBER</label>
                            <button 
                                type="button" 
                                onClick={copyAddrPhoneToWA}
                                className={styles.samePhoneLink}
                            >
                                Same as phone
                            </button>
                        </div>
                        <div className={styles.phoneInputCompound}>
                            <select 
                                name="whatsapp_country_code" 
                                value={addrWACountryCode}
                                onChange={(e) => setAddrWACountryCode(e.target.value)}
                                className={styles.phoneSelectPrefix}
                            >
                                {COUNTRY_CODES.map((c, i) => (
                                    <option key={`wa-${c.code}-${c.iso || i}`} value={c.code}>
                                        {c.flag} {c.code}
                                    </option>
                                ))}
                            </select>
                            <input 
                                name="whatsapp" 
                                value={addrWA}
                                onChange={(e) => setAddrWA(e.target.value.replace(/\D/g, ''))}
                                placeholder="WhatsApp number"
                                className={styles.phoneInputRight}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.formGrid} style={{ marginTop: '1.25rem' }}>
                    <div className={styles.formGroup}>
                        <label>EMAIL ADDRESS (OPTIONAL)</label>
                        <input 
                            name="email" 
                            type="email" 
                            defaultValue={editingAddress?.email || user?.email || ''} 
                            placeholder="recipient@example.com" 
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>COUNTRY <span style={{ color: '#ef4444' }}>*</span></label>
                        <select 
                            name="country" 
                            value={addrCountry}
                            onChange={(e) => {
                                const newCountry = e.target.value;
                                setAddrCountry(newCountry);
                                const found = getCountryByName(newCountry);
                                if (found?.code) {
                                    setAddrCountryCode(found.code);
                                    setAddrWACountryCode(found.code);
                                }
                            }}
                        >
                            {ALL_COUNTRIES.map((c, i) => (
                                <option key={`addr-c-${c.name}-${i}`} value={c.name}>
                                    {c.flag} {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.formGroupFull} style={{ marginTop: '1.25rem' }}>
                    <label>{formType === 'billing' ? 'BILLING ADDRESS LINE' : 'DELIVERY ADDRESS LINE'} <span style={{ color: '#ef4444' }}>*</span></label>
                    <textarea 
                        name="address_line" 
                        rows={2} 
                        required 
                        defaultValue={editingAddress?.address_line || editingAddress?.address || ''}
                        placeholder="House / Flat No, Building Name, Street, Locality" 
                    />
                </div>

                <div className={styles.formGrid3} style={{ marginTop: '1.25rem' }}>
                    <div className={styles.formGroup}>
                        <label>CITY / TOWN <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            name="city" 
                            required 
                            defaultValue={editingAddress?.city || ''}
                            placeholder="City" 
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>STATE / PROVINCE <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            name="state" 
                            defaultValue={editingAddress?.state || 'Tamil Nadu'} 
                            required 
                            placeholder="State"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>PINCODE / POSTAL CODE <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            name="pincode" 
                            required 
                            defaultValue={editingAddress?.pincode || ''}
                            placeholder="Pincode" 
                        />
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <input 
                        type="checkbox" 
                        name="is_default" 
                        id={`is_default_${formType}`} 
                        defaultChecked={editingAddress ? Boolean(Number(editingAddress.is_default) === 1) : (formType === 'billing' ? billingAddresses.length === 0 : shippingAddresses.length === 0)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor={`is_default_${formType}`} style={{ margin: 0, fontWeight: 600, cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal' }}>
                        Set as default {formType === 'billing' ? 'billing' : 'shipping'} address
                    </label>
                </div>

                <div className={styles.formActionButtons}>
                    <button type="submit" className={styles.btnPrimary} style={{ marginTop: 0, padding: '0.85rem 2rem' }}>
                        <Save size={16} style={{ display: 'inline', marginRight: '6px' }} />
                        {isEditing ? 'Update Address' : `Save ${formType === 'billing' ? 'Billing' : 'Shipping'} Address`}
                    </button>
                    <button type="button" onClick={handleCancelAddressForm} className={styles.cancelFormBtn}>
                        Cancel
                    </button>
                </div>
            </form>
        );
    };

    return (
        <>
            {/* CARD 1: Personal Information */}
            <section className={styles.profileSection}>
                <h3 className={styles.sectionTitle}><User size={20} /> Personal Information</h3>
                <form onSubmit={handleUpdateProfile} className={styles.profileForm} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label><User size={14} /> FULL NAME <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                name="name" 
                                defaultValue={user?.name} 
                                required 
                                placeholder="Your full name"
                                onInput={(e) => {
                                    e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                }}
                                pattern="[a-zA-Z\s]+"
                                title="Only letters and spaces are allowed"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label><Mail size={14} /> EMAIL</label>
                            <input 
                                name="email" 
                                defaultValue={user?.email || ''} 
                                type="email" 
                                placeholder="email@example.com" 
                            />
                        </div>
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label><Phone size={14} /> PHONE NUMBER</label>
                            <div className={styles.phoneInputCompound}>
                                <select 
                                    name="country_code" 
                                    value={profileCountryCode}
                                    onChange={(e) => setProfileCountryCode(e.target.value)}
                                    className={styles.phoneSelectPrefix}
                                >
                                    {COUNTRY_CODES.map((c, i) => (
                                        <option key={`prof-phone-${c.code}-${c.iso || i}`} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <input 
                                    name="phone" 
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Phone number"
                                    className={styles.phoneInputRight}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '0.6rem' }}>
                                <label style={{ margin: 0 }}><MessageCircle size={14} /> WHATSAPP NUMBER</label>
                                <button 
                                    type="button" 
                                    onClick={copyProfilePhoneToWA}
                                    className={styles.samePhoneLink}
                                >
                                    Same as phone
                                </button>
                            </div>
                            <div className={styles.phoneInputCompound}>
                                <select 
                                    name="whatsapp_country_code" 
                                    value={profileWACountryCode}
                                    onChange={(e) => setProfileWACountryCode(e.target.value)}
                                    className={styles.phoneSelectPrefix}
                                >
                                    {COUNTRY_CODES.map((c, i) => (
                                        <option key={`prof-wa-${c.code}-${c.iso || i}`} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <input 
                                    name="whatsapp" 
                                    value={profileWA}
                                    onChange={(e) => setProfileWA(e.target.value.replace(/\D/g, ''))}
                                    placeholder="WhatsApp number"
                                    className={styles.phoneInputRight}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                        <label><MapPin size={14} /> DEFAULT SHIPPING ADDRESS</label>
                        <textarea 
                            name="address" 
                            defaultValue={user?.address || ''} 
                            rows={3} 
                            placeholder="Flat/House No, Building, Street, Area..." 
                        />
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label><Globe size={14} /> COUNTRY</label>
                            <select 
                                name="country" 
                                value={profileCountry}
                                onChange={(e) => {
                                    const newCountry = e.target.value;
                                    setProfileCountry(newCountry);
                                    const found = getCountryByName(newCountry);
                                    if (found?.code) {
                                        setProfileCountryCode(found.code);
                                        setProfileWACountryCode(found.code);
                                    }
                                }}
                            >
                                {ALL_COUNTRIES.map((c, i) => (
                                    <option key={`prof-c-${c.name}-${i}`} value={c.name}>
                                        {c.flag} {c.name} ({c.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>CITY</label>
                            <input name="city" defaultValue={user?.city || ''} placeholder="City" />
                        </div>
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label>STATE</label>
                            <input name="state" defaultValue={user?.state || ''} placeholder="State" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>PINCODE</label>
                            <input name="pincode" defaultValue={user?.pincode || ''} placeholder="6-digit PIN" />
                        </div>
                    </div>

                    <button type="submit" className={styles.saveBtn} disabled={saving}>
                        {saving ? 'Saving Changes...' : <><Save size={18} /> Save Account Info</>}
                    </button>
                </form>
            </section>

            {/* CARD 2: Billing Address Book */}
            <section className={styles.profileSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}><FileText size={20} /> Billing Address Book</h3>
                        <p className={styles.sectionSubtitle}>Manage saved billing locations, GST billing, and tax addresses</p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => {
                            if (showAddressForm && addressFormType === 'billing') {
                                handleCancelAddressForm();
                            } else {
                                handleOpenAddAddress('billing');
                            }
                        }} 
                        className={styles.addAddressBtn}
                    >
                        {showAddressForm && addressFormType === 'billing' ? <><X size={14} /> Close</> : <><Plus size={14} /> Add Billing Address</>}
                    </button>
                </div>

                {showAddressForm && addressFormType === 'billing' && renderAddressForm('billing')}

                {loadingAddresses ? (
                    <div className={styles.loadingState}>Loading billing addresses...</div>
                ) : billingAddresses.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={40} style={{ opacity: 0.3 }} />
                        <p>No saved billing addresses yet.</p>
                        <span>Add a billing address for tax invoices and billing records.</span>
                    </div>
                ) : (
                    <div className={styles.addressGrid}>
                        {billingAddresses.map(addr => renderAddressCard(addr, 'billing'))}
                    </div>
                )}
            </section>

            {/* CARD 3: Shipping Address Book */}
            <section className={styles.profileSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}><Truck size={20} /> Shipping Address Book</h3>
                        <p className={styles.sectionSubtitle}>Manage saved delivery locations and recipient addresses for faster checkout</p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => {
                            if (showAddressForm && addressFormType === 'shipping') {
                                handleCancelAddressForm();
                            } else {
                                handleOpenAddAddress('shipping');
                            }
                        }} 
                        className={styles.addAddressBtn}
                    >
                        {showAddressForm && addressFormType === 'shipping' ? <><X size={14} /> Close</> : <><Plus size={14} /> Add Shipping Address</>}
                    </button>
                </div>

                {showAddressForm && addressFormType === 'shipping' && renderAddressForm('shipping')}

                {loadingAddresses ? (
                    <div className={styles.loadingState}>Loading shipping addresses...</div>
                ) : shippingAddresses.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Truck size={40} style={{ opacity: 0.3 }} />
                        <p>No saved shipping addresses yet.</p>
                        <span>Add a delivery address for one-click checkout.</span>
                    </div>
                ) : (
                    <div className={styles.addressGrid}>
                        {shippingAddresses.map(addr => renderAddressCard(addr, 'shipping'))}
                    </div>
                )}
            </section>
        </>
    );
}
