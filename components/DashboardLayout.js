import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import styles from '@/styles/layout.module.css';

export default function DashboardLayout({ children, role }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        window.location.href = '/';
    };

    const caretakerLinks = [
        { href: '/caretaker/dashboard', label: 'Dashboard', icon: 'home' },
        { href: '/caretaker/services', label: 'My Services', icon: 'briefcase' },
        { href: '/caretaker/requests', label: 'Service Requests', icon: 'clipboard' },
        { href: '/caretaker/profile', label: 'Profile', icon: 'user' },
    ];

    const nriLinks = [
        { href: '/nri/dashboard', label: 'Dashboard', icon: 'home' },
        { href: '/nri/caretakers', label: 'My Caretakers', icon: 'users' },
        { href: '/nri/requests', label: 'My Requests', icon: 'clipboard' },
        { href: '/nri/profile', label: 'Profile', icon: 'user' },
    ];

    const navLinks = role === 'caretaker' ? caretakerLinks : nriLinks;

    const getIcon = (icon) => {
        switch (icon) {
            case 'home':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                );
            case 'briefcase':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                    </svg>
                );
            case 'clipboard':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                );
            case 'user':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                );
            case 'users':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.layout}>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <Link href="/" className={styles.logo}>
                        Route Care
                    </Link>
                    <button
                        className={styles.closeSidebar}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <nav className={styles.sidebarNav}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${styles.navLink} ${router.pathname === link.href ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>{getIcon(link.icon)}</span>
                            <span className={styles.navLabel}>{link.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <polyline points="16,17 21,12 16,7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Header */}
                <header className={styles.header}>
                    <button
                        className={styles.menuToggle}
                        onClick={() => setSidebarOpen(true)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    <div className={styles.headerTitle}>
                        {role === 'caretaker' ? 'Caretaker Portal' : 'NRI Portal'}
                    </div>

                    <div className={styles.headerRight}>
                        <div className={styles.userInfo}>
                            <span className={styles.userEmail}>{user?.email}</span>
                            <span className={styles.userRole}>{role?.toUpperCase()}</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className={styles.pageContent}>
                    {children}
                </main>
            </div>
        </div>
    );
}
