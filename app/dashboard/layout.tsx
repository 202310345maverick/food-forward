'use client'

import React, { useState, useEffect } from 'react';
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
  FiMessageSquare,
  FiBook,
  FiChevronDown,
  FiSettings,
  FiHelpCircle,
  FiBell,
  FiX,
  FiTruck,
  FiShoppingCart,
  FiPackage,
  FiCheckCircle,
  FiClock,
  FiAlertCircle
} from 'react-icons/fi';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import styles from './DashboardLayout.module.css';

interface Notification {
  id: string;
  type: 'donation_created' | 'donation_accepted' | 'donation_delivered' | 'donation_expired' | 'system';
  title: string;
  message: string;
  donationId?: string;
  timestamp: any;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Skip layout for admin routes (they have their own layout)
  if (pathname?.startsWith('/dashboard/admin')) {
    return <>{children}</>;
  }

  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  // Fetch real-time notifications with error handling
  useEffect(() => {
    if (!user?.uid || !userProfile?.role) return;

    let unsubscribe: (() => void) | undefined;
    let userNotificationsUnsubscribe: (() => void) | undefined;

    const setupDonationListeners = async () => {
      try {
        const donationsRef = collection(db, 'donations');
        
        // Create a more restricted query based on user role
        let donationsQuery;
        if (userProfile.role === 'donor') {
          donationsQuery = query(
            donationsRef,
            where('donorId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
        } else if (userProfile.role === 'recipient') {
          donationsQuery = query(
            donationsRef,
            where('status', 'in', ['available', 'claimed', 'assigned', 'completed']),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
        } else if (userProfile.role === 'volunteer') {
          donationsQuery = query(
            donationsRef,
            where('status', 'in', ['available', 'assigned', 'completed']),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
        } else {
          // For admin or general users with limited access
          donationsQuery = query(
            donationsRef,
            orderBy('createdAt', 'desc'),
            limit(10)
          );
        }

        unsubscribe = onSnapshot(donationsQuery, 
          (snapshot) => {
            const newNotifications: Notification[] = [];
            
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const donationData = change.doc.data();
                const donationId = change.doc.id;
                
                // Generate notifications based on changes
                const notification = generateNotificationFromDonation(
                  donationData, 
                  donationId, 
                  userProfile.role, 
                  user.uid
                );
                
                if (notification) {
                  newNotifications.push(notification);
                }
              }
            });

            if (newNotifications.length > 0) {
              setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
                return [...uniqueNewNotifications, ...prev].slice(0, 30);
              });
            }
          },
          (error) => {
            console.error('Error listening to donations:', error);
            setNotificationError('Unable to load real-time updates');
          }
        );
      } catch (error) {
        console.error('Error setting up donation listeners:', error);
        setNotificationError('Permission denied for donation data');
      }
    };

    const setupUserNotifications = () => {
      try {
        const notificationsRef = collection(db, 'notifications');
        const userNotificationsQuery = query(
          notificationsRef,
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );

        userNotificationsUnsubscribe = onSnapshot(userNotificationsQuery, 
          (snapshot) => {
            const userNotifications: Notification[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              userNotifications.push({
                id: doc.id,
                type: data.type || 'system',
                title: data.title,
                message: data.message,
                donationId: data.donationId,
                timestamp: data.timestamp,
                read: data.read || false,
                priority: data.priority || 'medium'
              });
            });

            setNotifications(prev => {
              const existingIds = new Set(prev.map(n => n.id));
              const uniqueNewNotifications = userNotifications.filter(n => !existingIds.has(n.id));
              return [...uniqueNewNotifications, ...prev].slice(0, 30);
            });
          },
          (error) => {
            console.error('Error listening to user notifications:', error);
            // Don't show error for notifications collection - it might not exist yet
          }
        );
      } catch (error) {
        console.error('Error setting up user notifications:', error);
        // Silent fail for notifications collection
      }
    };

    setupDonationListeners();
    setupUserNotifications();

    return () => {
      if (unsubscribe) unsubscribe();
      if (userNotificationsUnsubscribe) userNotificationsUnsubscribe();
    };
  }, [user?.uid, userProfile?.role]);

  // Helper function to generate notifications from donation data
  const generateNotificationFromDonation = (
    donationData: any, 
    donationId: string, 
    userRole: string, 
    userId: string
  ): Notification | null => {
    const now = new Date();
    
    // Notification for new donation creation
    if (donationData.status === 'available' && 
        (userRole === 'recipient' || userRole === 'volunteer')) {
      return {
        id: `donation_created_${donationId}_${now.getTime()}`,
        type: 'donation_created',
        title: 'New Donation Available',
        message: `New ${donationData.category} donation from ${donationData.donorName}`,
        donationId,
        timestamp: donationData.createdAt || now,
        read: false,
        priority: 'medium'
      };
    }

    // Notification for donation acceptance (for donors)
    if ((donationData.status === 'claimed' || donationData.status === 'assigned') &&
        userRole === 'donor' && donationData.donorId === userId) {
      return {
        id: `donation_accepted_${donationId}_${now.getTime()}`,
        type: 'donation_accepted',
        title: 'Donation Accepted',
        message: `Your ${donationData.category} donation was accepted by ${donationData.recipientName || 'a recipient'}`,
        donationId,
        timestamp: donationData.claimedAt || donationData.assignedAt || now,
        read: false,
        priority: 'medium'
      };
    }

    // Notification for donation delivery completion
    if (donationData.status === 'completed') {
      if (userRole === 'donor' && donationData.donorId === userId) {
        return {
          id: `donation_delivered_donor_${donationId}_${now.getTime()}`,
          type: 'donation_delivered',
          title: 'Delivery Completed',
          message: `Your ${donationData.category} donation was successfully delivered to ${donationData.recipientName}`,
          donationId,
          timestamp: donationData.completedAt || now,
          read: false,
          priority: 'high'
        };
      }
      
      if (userRole === 'recipient' && donationData.recipientId === userId) {
        return {
          id: `donation_delivered_recipient_${donationId}_${now.getTime()}`,
          type: 'donation_delivered',
          title: 'Delivery Received',
          message: `You received ${donationData.quantity} of ${donationData.category} from ${donationData.donorName}`,
          donationId,
          timestamp: donationData.completedAt || now,
          read: false,
          priority: 'high'
        };
      }

      if (userRole === 'volunteer' && donationData.volunteerId === userId) {
        return {
          id: `donation_delivered_volunteer_${donationId}_${now.getTime()}`,
          type: 'donation_delivered',
          title: 'Mission Accomplished',
          message: `You successfully delivered ${donationData.quantity} of ${donationData.category}`,
          donationId,
          timestamp: donationData.completedAt || now,
          read: false,
          priority: 'high'
        };
      }
    }

    // Notification for expiring donations (for donors)
    if (userRole === 'donor' && donationData.donorId === userId && donationData.expiryDate) {
      const expiryDate = new Date(donationData.expiryDate);
      const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1 && donationData.status === 'available') {
        return {
          id: `donation_expiring_${donationId}_${now.getTime()}`,
          type: 'donation_expired',
          title: 'Donation Expiring Soon',
          message: `Your ${donationData.category} donation expires in ${diffDays} day(s)`,
          donationId,
          timestamp: now,
          read: false,
          priority: 'high'
        };
      }
    }

    return null;
  };

  // Rest of your existing code remains the same...
  useEffect(() => {
    if (!user && !userProfile && !loading && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/auth/signin');
    }
  }, [user, userProfile, loading, isRedirecting, router]);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setNotificationMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu]') && !target.closest('[data-user-menu-button]')) {
        setUserMenuOpen(false);
      }
      if (!target.closest('[data-notification-menu]') && !target.closest('[data-notification-button]')) {
        setNotificationMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.donationId) {
      if (userProfile?.role === 'donor') {
        router.push('/dashboard/donor');
      } else if (userProfile?.role === 'recipient') {
        router.push('/dashboard/recipient');
      } else if (userProfile?.role === 'volunteer') {
        router.push('/dashboard/volunteer');
      }
    }
    
    setNotificationMenuOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'donation_created':
        return <FiPackage size={16} className={styles.notificationIconNew} />;
      case 'donation_accepted':
        return <FiCheckCircle size={16} className={styles.notificationIconSuccess} />;
      case 'donation_delivered':
        return <FiTruck size={16} className={styles.notificationIconDelivered} />;
      case 'donation_expired':
        return <FiAlertCircle size={16} className={styles.notificationIconWarning} />;
      default:
        return <FiBell size={16} className={styles.notificationIconDefault} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return styles.notificationPriorityHigh;
      case 'medium':
        return styles.notificationPriorityMedium;
      case 'low':
        return styles.notificationPriorityLow;
      default:
        return '';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const isLinkActive = (href: string) => pathname.includes(href);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUnreadNotificationsCount = () => notifications.filter(n => !n.read).length;

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
            {isRedirecting ? 'Redirecting to sign in...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) return null;

  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={styles.header}>
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

            <Link href="/dashboard" className={styles.logo}>
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
                <div className={styles.logoSubtitle}>Olongapo City</div>
              </div>
            </Link>
          </div>

          {/* User Section */}
          <div className={styles.userSection}>
            {/* Notifications */}
            <div className={styles.notificationContainer} data-notification-menu>
              <button
                className={styles.notificationButton}
                onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
                data-notification-button
                aria-label={`Notifications (${getUnreadNotificationsCount()} unread)`}
              >
                <FiBell size={18} />
                {getUnreadNotificationsCount() > 0 && (
                  <div className={styles.notificationBadge}>
                    {getUnreadNotificationsCount() > 9 ? '9+' : getUnreadNotificationsCount()}
                  </div>
                )}
              </button>

              {notificationMenuOpen && (
                <div className={styles.notificationDropdown}>
                  <div className={styles.notificationHeader}>
                    <h3>Notifications</h3>
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={markAllNotificationsAsRead}
                        className={styles.markAllReadButton}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {notificationError && (
                    <div className={styles.notificationError}>
                      <FiAlertCircle size={16} />
                      <span>{notificationError}</span>
                    </div>
                  )}

                  <div className={styles.notificationList}>
                    {notifications.length === 0 ? (
                      <div className={styles.noNotifications}>
                        <FiBell size={24} />
                        <p>No notifications yet</p>
                        {notificationError && (
                          <p className={styles.errorSubtext}>Real-time updates unavailable</p>
                        )}
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`${styles.notificationItem} ${
                            !notification.read ? styles.notificationUnread : ''
                          } ${getPriorityColor(notification.priority)}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className={styles.notificationIcon}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className={styles.notificationContent}>
                            <div className={styles.notificationTitle}>
                              {notification.title}
                            </div>
                            <div className={styles.notificationMessage}>
                              {notification.message}
                            </div>
                            <div className={styles.notificationTime}>
                              {formatTimestamp(notification.timestamp)}
                            </div>
                          </div>
                          {!notification.read && (
                            <div className={styles.unreadIndicator}></div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className={styles.userMenuContainer} data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={styles.userMenuButton}
                onKeyPress={(e) => handleKeyPress(e, () => setUserMenuOpen(!userMenuOpen))}
                data-user-menu-button
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className={styles.userAvatar}>{getInitials(userProfile.displayName || 'User')}</div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{userProfile.displayName || 'User'}</div>
                  <div className={styles.userRole}>{userProfile.role || 'member'}</div>
                </div>
                <FiChevronDown
                  size={16}
                  className={`${styles.chevronIcon} ${userMenuOpen ? styles.rotate180 : ''}`}
                />
              </button>

              {userMenuOpen && (
                <div className={styles.userDropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.userName}>{userProfile.displayName || 'User'}</div>
                    <div className={styles.userEmail}>{userProfile.email}</div>
                  </div>

                  <Link 
                    href="/dashboard/profile" 
                    className={styles.dropdownItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiUser size={16} />
                    My Profile
                  </Link>

                  <Link 
                    href="/dashboard/settings" 
                    className={styles.dropdownItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiSettings size={16} />
                    Settings
                  </Link>

                  <Link 
                    href="/dashboard/guide" 
                    className={styles.dropdownItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiHelpCircle size={16} />
                    Help & Guide
                  </Link>

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

      {/* Rest of your component remains the same... */}
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
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
            <div className={styles.sidebarTitle}>Main</div>
            <nav className={styles.sidebarNav}>
              <Link
                href={`/dashboard/${userProfile.role}`}
                className={`${styles.sidebarLink} ${isLinkActive(`/dashboard/${userProfile.role}`) ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiHome size={18} />
                </div>
                Dashboard
              </Link>

              <Link
                href="/dashboard/impact"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/impact') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiBarChart2 size={18} />
                </div>
                Impact Analytics
              </Link>

              <Link
                href="/dashboard/community"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/community') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiMessageSquare size={18} />
                </div>
                Community
              </Link>

              {/* Only show Logistics for authorized roles */}
              {(userProfile?.role === 'admin' || 
                userProfile?.role === 'donor' || 
                userProfile?.role === 'recipient' || 
                userProfile?.role === 'volunteer') && (
                <Link
                  href="/dashboard/logistics"
                  className={`${styles.sidebarLink} ${isLinkActive('/dashboard/logistics') ? styles.activeSidebarLink : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={styles.sidebarIcon}>
                    <FiTruck size={18} />
                  </div>
                  Logistics
                </Link>
              )}
            </nav>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Resources</div>
            <nav className={styles.sidebarNav}>
              <Link
                href="/dashboard/guide"
                className={`${styles.sidebarLink} ${isLinkActive('/dashboard/guide') ? styles.activeSidebarLink : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={styles.sidebarIcon}>
                  <FiBook size={18} />
                </div>
                User Guide
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