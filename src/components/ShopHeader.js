'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, LogOut, Menu, X, Package, Settings, Truck, Heart, Activity } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { useCompare } from '@/context/CompareContext';
import styles from './ShopHeader.module.css';

export default function ShopHeader() {
    const pathname = usePathname();
    const { user, cartCount, wishlist, handleLogout, openCart, setIsCartOpen } = useShop();
    const { compareItems } = useCompare();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCartAlerting, setIsCartAlerting] = useState(false);
    const prevCartCountRef = useRef(cartCount);
    const profileRef = useRef(null);

    const handleOpenCart = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (typeof openCart === 'function') {
            openCart();
        } else if (typeof setIsCartOpen === 'function') {
            setIsCartOpen(true);
        }
    };

    // Trigger cart alert animation on item count increase
    useEffect(() => {
        if (cartCount > prevCartCountRef.current) {
            setIsCartAlerting(true);
            const timer = setTimeout(() => setIsCartAlerting(false), 1200);
            return () => clearTimeout(timer);
        }
        prevCartCountRef.current = cartCount;
    }, [cartCount]);

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
                        <Link href="/" className={styles.logoLink}>
                            <img src="/images/cp-logo.png" alt="Vaiyaaree" className={styles.logoImg} onError={(e) => { e.target.onerror = null; e.target.src = '/images/cp-logo.svg'; }} />
                            <span className={styles.logoBrandName}>VAIYAAREE</span>
                        </Link>
                    </div>

                    <div className={styles.rightSection}>
                        <nav className={`${styles.navbar} ${isMobileMenuOpen ? styles.navbarOpen : ''}`}>
                            <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                            <Link href="/shop" className={`${styles.navLink} ${pathname === '/shop' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Shop</Link>
                            <Link href="/about-us" className={`${styles.navLink} ${pathname === '/about-us' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
                            <Link href="/contact" className={`${styles.navLink} ${pathname === '/contact' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
                        </nav>

                        <form
                            className={styles.searchForm}
                            onSubmit={(e) => {
                                e.preventDefault();
                                const q = e.target.search.value;
                                if (q) window.location.href = `/shop?q=${encodeURIComponent(q)}`;
                            }}
                        >
                            <input 
                                type="text" 
                                name="search" 
                                placeholder="Search products..." 
                                className={styles.searchInput} 
                            />
                        </form>

                        <div className={styles.headerActions}>
                            <button
                                type="button"
                                onClick={handleOpenCart}
                                className={styles.cartIconBtn}
                                title="View Cart"
                                aria-label="Open Cart Drawer"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                <div className={styles.cartIconWrapper}>
                                    <ShoppingCart size={22} strokeWidth={1.5} />
                                    {cartCount > 0 && (
                                        <span className={`${styles.cartCountBadge} ${isCartAlerting ? styles.cartAlertPing : ''}`}>
                                            {cartCount}
                                        </span>
                                    )}
                                </div>
                            </button>

                            <div className={styles.profileContainer} ref={profileRef}>
                                {user ? (
                                    <>
                                        <div className={styles.profileAvatar} onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                            {user.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
                                        </div>
                                        {isProfileOpen && (
                                            <div className={styles.profileDropdown}>
                                                <div className={styles.dropdownHeader}>
                                                    <p className={styles.dropdownName}>{user.name || 'Customer'}</p>
                                                    <p className={styles.dropdownPhone}>{user.phone}</p>
                                                </div>
                                                <div className={styles.divider}></div>
                                                <Link href="/my-orders" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>My Orders</Link>
                                                <Link href="/profile?tab=history" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>Order History</Link>
                                                <Link href="/profile?tab=account" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>Account & Addresses</Link>
                                                <Link href="/profile?tab=refund" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>Refund Requests</Link>
                                                <Link href="/profile?tab=return" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>Return Requests</Link>
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
