'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, LogOut, Menu, X, Search, Package, Settings, Truck } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from './ShopHeader.module.css';

export default function ShopHeader() {
    const pathname = usePathname();
    const { user, cartCount, handleLogout } = useShop();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    // Auto-close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileOpen]);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.leftSection}>
                        <button className={styles.hamburgerBtn} onClick={toggleMobileMenu}>
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <Link href="/" className={styles.logoMaroonBox}>
                            <span className={styles.logoBrandName}>CAST PRINT</span>
                        </Link>
                    </div>

                    <div className={styles.rightSection}>
                        <nav className={`${styles.navbar} ${isMobileMenuOpen ? styles.navbarOpen : ''}`}>
                            <Link href="/page/home" className={`${styles.navLink} ${pathname === '/page/home' || pathname === '/' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                            <Link href="/shop" className={`${styles.navLink} ${pathname === '/shop' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Shop</Link>
                            <Link href="/page/about-us" className={`${styles.navLink} ${pathname === '/page/about-us' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
                            <Link href="/page/contact" className={`${styles.navLink} ${pathname === '/page/contact' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
                        </nav>

                        <div className={styles.headerActions}>
                            <div className={styles.searchContainer}>
                                <button className={styles.actionIconBtn}>
                                    <Search size={22} strokeWidth={1.5} />
                                </button>
                            </div>
                            
                            <Link href="/cart" className={styles.cartIconBtn}>
                                <div className={styles.cartIconWrapper}>
                                    <ShoppingCart size={22} strokeWidth={1.5} />
                                    {cartCount > 0 && <span className={styles.cartCountBadge}>{cartCount}</span>}
                                </div>
                            </Link>

                            <div className={styles.profileContainer} ref={profileRef}>
                                {user ? (
                                    <>
                                        <div className={styles.profileAvatar} onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={18} />}
                                        </div>
                                        {isProfileOpen && (
                                            <div className={styles.profileDropdown}>
                                                <div className={styles.dropdownHeader}>
                                                    <p className={styles.dropdownName}>{user.full_name || 'Customer'}</p>
                                                    <p className={styles.dropdownPhone}>{user.phone}</p>
                                                </div>
                                                <div className={styles.divider}></div>
                                                <Link href="/my-orders" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>My Orders</Link>
                                                <Link href="/account" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>Account Settings</Link>
                                                <div className={styles.divider}></div>
                                                <div className={`${styles.dropdownItem} ${styles.logout}`} onClick={handleLogout}>Logout</div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link href="/login" className={styles.loginLink}>
                                        <User size={22} strokeWidth={1.5} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
