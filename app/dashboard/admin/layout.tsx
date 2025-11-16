'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from "next/image";
import {
  FiMenu,
  FiUser,
  FiBarChart2,
  FiLogOut,
  FiHome,
  FiUsers,
  FiShield,
  FiPackage,
  FiTruck,
  FiTrendingUp,
  FiChevronDown,
  FiX,
  FiDatabase,
  FiActivity
} from 'react-icons/fi';
import styles from './DashboardLayout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Use refs for event listeners
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!loading && userProfile && userProfile.role !== 'admin') {
      setIsRedirecting(true);
      router.push('/dashboard');
    }
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!user && !userProfile && !loading && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/auth/signin');
    }
  }, [user, userProfile, loading, isRedirecting, router]);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Fixed click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (userMenuRef.current && !userMenuRef.current.contains(target) && 
          userMenuButtonRef.current && !userMenuButtonRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isLinkActive = (href: string) => pathname.includes(href);

  const getInitials = (name: string) => {
    if (!name) return 'A';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  if (loading || isRedirecting) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>
            {isRedirecting ? 'Redirecting...' : 'Loading admin dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
            Access Denied
          </div>
          <p style={{ color: '#6b7280', textAlign: 'center' }}>
            You don't have permission to access the admin dashboard.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Go to Main Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={`${styles.header} ${styles.adminHeader}`}>
        <div className={styles.headerContent}>
          {/* Logo and Menu Button */}
          <div className={styles.logoSection}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={styles.mobileMenuButton}
              aria-label="Toggle sidebar"
            >
              <FiMenu size={20} />
            </button>

            <Link href="/dashboard/admin" className={styles.logo}>
              <Image
                src="/logo.jpeg"
                alt="Food Forward Logo"
                width={40}
                height={40}
                className={styles.logoImage}
                priority
              />
              <div className={styles.logoText}>
                <div className={styles.logoTitle}>Food Forward</div>
                <div className={styles.logoSubtitle}>Admin Dashboard</div>
              </div>
            </Link>
          </div>

          {/* User Section - Notification bell removed */}
          <div className={styles.userSection}>
            {/* User Menu */}
            <div className={styles.userMenuContainer} ref={userMenuRef} data-user-menu>
              <button
                ref={userMenuButtonRef}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={styles.userMenuButton}
                onKeyDown={(e) => handleKeyPress(e, () => setUserMenuOpen(!userMenuOpen))}
                data-user-menu-button
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className={`${styles.userAvatar} ${styles.adminAvatar}`}>{getInitials(userProfile.displayName || 'Admin')}</div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{userProfile.displayName || 'Administrator'}</div>
                  <div className={styles.userRole}>Administrator</div>
                </div>
                <FiChevronDown
                  size={16}
                  className={`${styles.chevronIcon} ${userMenuOpen ? styles.rotate180 : ''}`}
                />
              </button>

              {userMenuOpen && (
                <div className={styles.userDropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.userEmail}>{userProfile.email}</div>
                  </div>

                  <Link 
                    href="/dashboard/admin/profile" 
                    className={styles.dropdownItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiUser size={16} />
                    My Profile
                  </Link>

                  {/* Settings and Help & Guide removed */}

                  <div className={styles.dropdownDivider}></div>

                  <button onClick={handleLogout} className={styles.dropdownItem}>
                    <FiLogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${styles.adminSidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarCloseContainer}>
            <button
              onClick={() => setSidebarOpen(false)}
              className={styles.closeButton}
              aria-label="Close sidebar"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Dashboard</div>
            <nav className={styles.sidebarNav}>
              <Link
                href="/dashboard/admin"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiHome size={18} />
                </div>
                Overview
              </Link>

              <Link
                href="/dashboard/admin/analytics"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin/analytics') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiBarChart2 size={18} />
                </div>
                Impact Analytics
              </Link>

              <Link
                href="/dashboard/admin/users"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin/users') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiUsers size={18} />
                </div>
                User Management
              </Link>

              <Link
                href="/dashboard/admin/ledger"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin/ledger') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiDatabase size={18} />
                </div>
                Blockchain Ledger
              </Link>
            </nav>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Management</div>
            <nav className={styles.sidebarNav}>
              <Link
                href="/dashboard/admin/donations"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin/donations') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiPackage size={18} />
                </div>
                Donations
              </Link>

              <Link
                href="/dashboard/admin/logistics"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin/logistics') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiTruck size={18} />
                </div>
                Logistics
              </Link>

              <Link
                href="/dashboard/admin/security"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin/security') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiShield size={18} />
                </div>
                Security
              </Link>

              <Link
                href="/dashboard/admin/system"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/admin/system') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiActivity size={18} />
                </div>
                System Health
              </Link>
            </nav>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Quick Access</div>
            <nav className={styles.sidebarNav}>
              <Link
                href="/dashboard"
                className={styles.sidebarLink}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiTrendingUp size={18} />
                </div>
                Main Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      <main className={`${styles.mainContent} ${sidebarOpen ? styles.mainContentShifted : ''}`}>
        {children}
      </main>
    </div>
  );
}