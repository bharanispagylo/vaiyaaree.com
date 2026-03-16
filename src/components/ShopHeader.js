'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, LogOut, Menu, X, Search, Package, Settings, Truck } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from './ShopHeader.module.css';

export default function ShopHeader() {
    const pathname = usePathname();
    const { user, cartCount, handleLogout, showToast } = useShop();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileRef = useRef(null);

    // Auto-close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const getPageTitle = () => {
        if (pathname === '/shop') return 'Shop';
        if (pathname === '/cart') return 'My Cart';
        if (pathname === '/checkout') return 'Checkout';
        if (pathname === '/profile') return 'My Profile';
        if (pathname === '/my-orders') return 'My Orders';
        if (pathname === '/track-order') return 'Track Order';
        if (pathname.startsWith('/product/')) return 'Product Details';
        return '';
    };

    const title = getPageTitle();

    return (
        <>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.leftSection}>
                        <button className={styles.hamburgerBtn} onClick={toggleMobileMenu}>
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <Link href="/" className={styles.logo}>
                            <div className={styles.logoIcon}>💮</div>
                            <span className={styles.logoName}>Caste Print</span>
                        </Link>
                    </div>

                    <div className={styles.headerRight}>
                        <nav className={`${styles.navbar} ${isMobileMenuOpen ? styles.navbarOpen : ''}`}>
                            <Link href="/shop" className={`${styles.navLink} ${pathname === '/shop' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Shop</Link>
                            <Link href="/track-order" className={`${styles.navLink} ${pathname === '/track-order' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Track Order</Link>
                            <Link href="/my-orders" className={`${styles.navLink} ${pathname === '/my-orders' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>My Orders</Link>
                            <Link href="/profile" className={`${styles.navLink} ${pathname === '/profile' ? styles.active : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Account</Link>
                        </nav>

                        <div className={styles.headerActions}>
                            <Link href="/cart" className={styles.cartIconBtn}>
                                <div className={styles.cartIconWrapper}>
                                    <ShoppingCart size={22} />
                                    {cartCount > 0 && <span className={styles.cartCountBadge}>{cartCount}</span>}
                                </div>
                            </Link>
                            {user ? (
                                <div className={styles.profileContainer} ref={profileRef}>
                                    <div
                                        className={styles.profileAvatar}
                                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                                        title={user.name}
                                    >
                                        {(user.name?.[0] || 'U').toUpperCase()}
                                    </div>
                                    {showProfileMenu && (
                                        <div className={styles.profileDropdown}>
                                            <div className={styles.dropdownHeader}>
                                                <div className={styles.dropdownName}>{user.name}</div>
                                                <div className={styles.dropdownPhone}>{user.phone}</div>
                                            </div>
                                            <div className={styles.divider} />
                                            <Link href="/profile" className={styles.dropdownItem} onClick={() => setShowProfileMenu(false)}>
                                                <User size={16} /> Edit Profile
                                            </Link>
                                            <Link href="/my-orders" className={styles.dropdownItem} onClick={() => setShowProfileMenu(false)}>
                                                <Package size={16} /> My Orders
                                            </Link>
                                            <div className={styles.divider} />
                                            <div className={`${styles.dropdownItem} ${styles.logout}`} onClick={() => { handleLogout(); setShowProfileMenu(false); }}>
                                                <LogOut size={16} /> Logout
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link href="/login" className={styles.loginBtn}>Login</Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
