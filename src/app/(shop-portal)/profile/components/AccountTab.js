'use client';

import React from 'react';
import { User, Mail, MapPin, Save, FileText, Truck } from 'lucide-react';
import { formatPhoneDisplay } from './profileHelpers';
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
    loadingAddresses,
    billingAddresses = [],
    shippingAddresses = [],
    deleteAddress
}) {
    return (
        <>
            <section className={styles.profileSection}>
                <h3 className={styles.sectionTitle}><User size={20} /> Personal Information</h3>
                <form onSubmit={handleUpdateProfile} className={styles.profileForm} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label><User size={14} /> FULL NAME</label>
                            <input 
                                name="name" 
                                defaultValue={user?.name} 
                                required 
                                placeholder="Your name"
                                onInput={(e) => {
                                    e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                }}
                                pattern="[a-zA-Z\s]+"
                                title="Only letters and spaces are allowed"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label><Mail size={14} /> EMAIL</label>
                            <input name="email" defaultValue={user?.email} type="email" placeholder="email@example.com" />
                        </div>
                    </div>

                    <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                        <label><MapPin size={14} /> DEFAULT SHIPPING ADDRESS</label>
                        <textarea name="address" defaultValue={user?.address} rows={3} placeholder="Flat/House No, Street, Area..." />
                    </div>

                    <div className={styles.formGrid3} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label>CITY</label>
                            <input name="city" defaultValue={user?.city} placeholder="City" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>STATE</label>
                            <input name="state" defaultValue={user?.state} placeholder="State" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>PINCODE</label>
                            <input name="pincode" defaultValue={user?.pincode} placeholder="6-digit PIN" />
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
                        <p className={styles.sectionSubtitle}>Manage saved billing locations and tax billing addresses</p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => {
                            if (showAddressForm && addressFormType === 'billing') {
                                setShowAddressForm(false);
                            } else {
                                setAddressFormType('billing');
                                setShowAddressForm(true);
                            }
                        }} 
                        className={styles.addAddressBtn}
                    >
                        {showAddressForm && addressFormType === 'billing' ? 'Cancel' : '+ Add Billing Address'}
                    </button>
                </div>

                {showAddressForm && addressFormType === 'billing' && (
                    <form onSubmit={handleAddAddress} className={styles.addressForm}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>TITLE (e.g. GST Billing, Office Billing)</label>
                                <input name="title" defaultValue="Billing Address" required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>FULL NAME / COMPANY NAME</label>
                                <input 
                                    name="full_name" 
                                    defaultValue={user?.name} 
                                    required 
                                    placeholder="Full Name"
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                    }}
                                    pattern="[a-zA-Z\s]+"
                                    title="Only letters and spaces are allowed"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>PHONE</label>
                                <input name="phone" defaultValue={user?.phone} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>PINCODE</label>
                                <input name="pincode" required placeholder="6-digit PIN" />
                            </div>
                        </div>
                        <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
                            <label>BILLING ADDRESS LINE</label>
                            <textarea name="address_line" rows={2} required placeholder="Flat/Building No, Street, Area" />
                        </div>
                        <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
                            <div className={styles.formGroup}>
                                <label>CITY</label>
                                <input name="city" required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>STATE</label>
                                <input name="state" defaultValue="Tamil Nadu" required />
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" name="is_default" id="is_default_billing" />
                            <label htmlFor="is_default_billing" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Set as default billing address</label>
                        </div>
                        <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>Save Billing Address</button>
                    </form>
                )}

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
                        {billingAddresses.map(addr => (
                            <div key={addr.id} className={styles.addressCard}>
                                {addr.is_default && <span className={styles.defaultBadge}>DEFAULT</span>}
                                <h4 className={styles.addressTitle}>
                                    <FileText size={16} /> {addr.title}
                                </h4>
                                <p className={styles.addressName}>{addr.full_name}</p>
                                <p className={styles.addressLine}>{addr.address_line}</p>
                                <p className={styles.addressLocation}>{addr.city}, {addr.state} {addr.pincode}</p>
                                <p className={styles.addressPhone}>{formatPhoneDisplay(addr.phone)}</p>
                                <button type="button" onClick={() => deleteAddress(addr.id)} className={styles.deleteAddressBtn}>
                                    Delete Address
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* CARD 3: Shipping Address Book */}
            <section className={styles.profileSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}><Truck size={20} /> Shipping Address Book</h3>
                        <p className={styles.sectionSubtitle}>Manage saved delivery locations and shipping addresses</p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => {
                            if (showAddressForm && addressFormType === 'shipping') {
                                setShowAddressForm(false);
                            } else {
                                setAddressFormType('shipping');
                                setShowAddressForm(true);
                            }
                        }} 
                        className={styles.addAddressBtn}
                    >
                        {showAddressForm && addressFormType === 'shipping' ? 'Cancel' : '+ Add Shipping Address'}
                    </button>
                </div>

                {showAddressForm && addressFormType === 'shipping' && (
                    <form onSubmit={handleAddAddress} className={styles.addressForm}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>TITLE (e.g. Home, Office, Work)</label>
                                <input name="title" defaultValue="Home Shipping" required placeholder="Home" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>RECIPIENT NAME</label>
                                <input 
                                    name="full_name" 
                                    defaultValue={user?.name} 
                                    required 
                                    placeholder="Recipient Full Name"
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                    }}
                                    pattern="[a-zA-Z\s]+"
                                    title="Only letters and spaces are allowed"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>PHONE</label>
                                <input name="phone" defaultValue={user?.phone} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>PINCODE</label>
                                <input name="pincode" required placeholder="6-digit PIN" />
                            </div>
                        </div>
                        <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
                            <label>DELIVERY ADDRESS LINE</label>
                            <textarea name="address_line" rows={2} required placeholder="Flat/House No, Street, Area" />
                        </div>
                        <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
                            <div className={styles.formGroup}>
                                <label>CITY</label>
                                <input name="city" required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>STATE</label>
                                <input name="state" defaultValue="Tamil Nadu" required />
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" name="is_default" id="is_default_shipping" />
                            <label htmlFor="is_default_shipping" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Set as default shipping address</label>
                        </div>
                        <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>Save Shipping Address</button>
                    </form>
                )}

                {loadingAddresses ? (
                    <div className={styles.loadingState}>Loading shipping addresses...</div>
                ) : shippingAddresses.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Truck size={40} style={{ opacity: 0.3 }} />
                        <p>No saved shipping addresses yet.</p>
                        <span>Add a delivery address for faster checkout.</span>
                    </div>
                ) : (
                    <div className={styles.addressGrid}>
                        {shippingAddresses.map(addr => (
                            <div key={addr.id} className={styles.addressCard}>
                                {addr.is_default && <span className={styles.defaultBadge}>DEFAULT</span>}
                                <h4 className={styles.addressTitle}>
                                    <Truck size={16} /> {addr.title}
                                </h4>
                                <p className={styles.addressName}>{addr.full_name}</p>
                                <p className={styles.addressLine}>{addr.address_line}</p>
                                <p className={styles.addressLocation}>{addr.city}, {addr.state} {addr.pincode}</p>
                                <p className={styles.addressPhone}>{formatPhoneDisplay(addr.phone)}</p>
                                <button type="button" onClick={() => deleteAddress(addr.id)} className={styles.deleteAddressBtn}>
                                    Delete Address
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
