'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, LogOut, Menu, X, Package, Settings, Truck, Heart, Activity, Search, Sparkles, Phone, ChevronDown } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { useCompare } from '@/context/CompareContext';
import styles from './ShopHeader.module.css';

function formatPhoneDisplay(phone) {
    if (!phone) return '';
    const clean = String(phone).trim();
    const digits = clean.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
        return `+91 ${digits.slice(2)}`;
    }
    if (digits.length === 10) {
        return `+91 ${digits}`;
    }
    if (clean.startsWith('+')) {
        return clean.replace(/^\+(\d{1,3})(\d+)/, '+$1 $2');
    }
    return digits ? `+91 ${digits}` : clean;
}

export default function ShopHeader() {
    const pathname = usePathname();
    const { user, cartCount, wishlist, handleLogout, openCart, setIsCartOpen } = useShop();
    const { compareItems } = useCompare ? useCompare() : { compareItems: [] };
    const [mounted, setMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCartAlerting, setIsCartAlerting] = useState(false);
    const [navItems, setNavItems] = useState([
        { id: 'item_home', title: 'Home', url: '/', target: '_self', children: [] },
        { id: 'item_shop', title: 'Shop Collections', url: '/shop', target: '_self', children: [] },
        { id: 'item_heritage', title: 'Our Heritage', url: '/about-us', target: '_self', children: [] },
        { id: 'item_contact', title: 'Contact', url: '/contact', target: '_self', children: [] }
    ]);
    const [openMobileSubmenus, setOpenMobileSubmenus] = useState({});
    const prevCartCountRef = useRef(cartCount);
    const profileRef = useRef(null);

    useEffect(() => {
        setMounted(true);
        let isMounted = true;
        async function fetchMenu() {
            try {
                const res = await fetch('/api/navigation/menu?location=primary');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.success && Array.isArray(data.items) && data.items.length > 0) {
                        setNavItems(data.items);
                    }
                }
            } catch (err) {
                console.warn('[SHOP-HEADER] Dynamic menu fetch failed, using default:', err);
            }
        }
        fetchMenu();
        return () => { isMounted = false; };
    }, []);

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
        <div className={styles.headerContainer} suppressHydrationWarning>
            {/* Top Royal Indian Announcement Bar */}
            <div className={styles.topBar}>
                <div className={styles.topBarInner}>
                    <div className={styles.topBarLeft}>
                        <span className={styles.topBarIconText}>
                            <Sparkles size={12} className={styles.goldSparkle} />
                            FREE ALL-INDIA SHIPPING • 100% AUTHENTIC HANDLOOM SILKS
                        </span>
                    </div>
                    <div className={styles.topBarRight}>
                        <a href="tel:+918667793292" className={styles.topBarPhoneLink}>
                            <Phone size={11} className={styles.goldSparkle} />
                            +91 86677 93292
                        </a>
                        <span className={styles.topBarSep}>|</span>
                        <Link href="/about-us" className={styles.topBarLink}>WEAVER'S STORY</Link>
                    </div>
                </div>
            </div>

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.leftSection}>
                        <button className={styles.hamburgerBtn} onClick={toggleMobileMenu} aria-label="Toggle navigation menu">
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <Link href="/" className={styles.logoLink}>
                            <Image 
                                src="/images/vaiyaaree-logo.png" 
                                alt="Vaiyaaree" 
                                width={48}
                                height={48}
                                className={styles.logoImg} 
                                priority
                            />
                            <div className={styles.logoBrandBlock}>
                                <span className={styles.logoBrandName}>VAIYAAREE</span>
                                <span className={styles.logoTagline}>SILKS & WEAVES</span>
                            </div>
                        </Link>
                    </div>

                    <nav className={`${styles.navbar} ${isMobileMenuOpen ? styles.navbarOpen : ''}`}>
                        {navItems.map((item) => {
                            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                            const isActive = pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url));
                            const isSubOpen = Boolean(openMobileSubmenus[item.id]);

                            return (
                                <div key={item.id} className={styles.navItem}>
                                    <Link
                                        href={item.url || '#'}
                                        target={item.target || '_self'}
                                        rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                                        className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                                        onClick={() => {
                                            if (!hasChildren || (typeof window !== 'undefined' && window.innerWidth > 991)) {
                                                setIsMobileMenuOpen(false);
                                            }
                                        }}
                                    >
                                        <span>{item.title}</span>
                                        {item.badge_text && (
                                            <span className={`${styles.navBadge} ${String(item.badge_text).toLowerCase() === 'hot' ? styles.badgeHot : String(item.badge_text).toLowerCase() === 'sale' ? styles.badgeSale : styles.badgeNew}`}>
                                                {item.badge_text}
                                            </span>
                                        )}
                                        {hasChildren && (
                                            <span
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setOpenMobileSubmenus(p => ({ ...p, [item.id]: !p[item.id] }));
                                                }}
                                                style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                                            >
                                                <ChevronDown size={14} className={styles.navChevron} />
                                            </span>
                                        )}
                                    </Link>

                                    {/* Desktop Dropdown Submenu */}
                                    {hasChildren && (
                                        <div className={styles.navDropdown}>
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.id}
                                                    href={child.url || '#'}
                                                    target={child.target || '_self'}
                                                    rel={child.target === '_blank' ? 'noopener noreferrer' : undefined}
                                                    className={styles.navDropdownItem}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <span>{child.title}</span>
                                                    {child.badge_text && (
                                                        <span className={`${styles.navBadge} ${String(child.badge_text).toLowerCase() === 'hot' ? styles.badgeHot : String(child.badge_text).toLowerCase() === 'sale' ? styles.badgeSale : styles.badgeNew}`}>
                                                            {child.badge_text}
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {/* Mobile Submenu Accordion */}
                                    {hasChildren && isSubOpen && (
                                        <div className={styles.mobileSubmenu}>
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.id}
                                                    href={child.url || '#'}
                                                    target={child.target || '_self'}
                                                    rel={child.target === '_blank' ? 'noopener noreferrer' : undefined}
                                                    className={styles.mobileSubItem}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <span>{child.title}</span>
                                                    {child.badge_text && (
                                                        <span className={`${styles.navBadge} ${String(child.badge_text).toLowerCase() === 'hot' ? styles.badgeHot : String(child.badge_text).toLowerCase() === 'sale' ? styles.badgeSale : styles.badgeNew}`}>
                                                            {child.badge_text}
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                            placeholder="Search silks, drapes..." 
                            className={styles.searchInput} 
                        />
                        <button type="submit" className={styles.searchBtn} aria-label="Search" title="Search">
                            <Search size={16} />
                        </button>
                    </form>

                    <div className={styles.headerActions} suppressHydrationWarning>
                        <button
                            type="button"
                            onClick={handleOpenCart}
                            className={styles.cartIconBtn}
                            title="View Cart"
                            aria-label="Open Cart Drawer"
                        >
                            <div className={styles.cartIconWrapper}>
                                <ShoppingCart size={22} strokeWidth={1.5} />
                                {mounted && cartCount > 0 && (
                                    <span className={`${styles.cartCountBadge} ${isCartAlerting ? styles.cartAlertPing : ''}`}>
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                        </button>

                        <div className={styles.profileContainer} ref={profileRef} suppressHydrationWarning>
                            {mounted && user ? (
                                <>
                                    <div className={styles.profileAvatar} onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                        {user.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
                                    </div>
                                    {isProfileOpen && (
                                        <div className={styles.profileDropdown}>
                                            <div className={styles.dropdownHeader}>
                                                <p className={styles.dropdownName}>{user.name || 'Customer'}</p>
                                                <p className={styles.dropdownPhone}>{formatPhoneDisplay(user.phone)}</p>
                                            </div>
                                            <div className={styles.divider}></div>
                                            <Link href="/profile?tab=orders" className={styles.dropdownItem} onClick={() => setIsProfileOpen(false)}>My Orders</Link>
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
                                <Link href="/login" className={styles.loginLink} title="Login / Register">
                                    <User size={22} strokeWidth={1.5} />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}
