'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiStar, 
  FiCalendar,
  FiEdit3,
  FiSave,
  FiX,
  FiClock,
  FiBarChart,
  FiTruck,
  FiHome,
  FiShield,
  FiLock,
  FiPackage,
  FiUsers,
  FiDollarSign,
  FiNavigation,
  FiLogOut,
  FiCamera,
  FiCheck,
  FiAlertCircle,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';

// Responsive styles
const styles = {
  container: { 
    minHeight: '100vh', 
    backgroundColor: '#f9fafb',
    padding: '1rem' 
  },
  mainContent: { 
    maxWidth: '800px', 
    margin: '0 auto', 
    padding: '1rem' 
  },
  section: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    padding: '1.5rem', 
    marginBottom: '1.5rem', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    border: '1px solid #e5e7eb' 
  },
  sectionTitle: { 
    fontSize: '1.25rem', 
    fontWeight: 'bold', 
    color: '#111827', 
    marginBottom: '1rem' 
  },
  formGroup: { 
    marginBottom: '1.25rem' 
  },
  label: { 
    display: 'block', 
    fontSize: '0.875rem', 
    fontWeight: '500', 
    color: '#374151', 
    marginBottom: '0.5rem' 
  },
  input: { 
    width: '100%', 
    padding: '0.75rem 1rem', 
    border: '1px solid #d1d5db', 
    borderRadius: '0.5rem', 
    fontSize: '1rem', 
    outline: 'none',
    transition: 'all 0.2s'
  },
  button: { 
    padding: '0.75rem 1.5rem', 
    border: 'none', 
    borderRadius: '0.5rem', 
    fontSize: '0.875rem', 
    fontWeight: '500', 
    cursor: 'pointer', 
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  statCard: { 
    backgroundColor: '#f8fafc', 
    padding: '1.25rem', 
    borderRadius: '0.5rem', 
    textAlign: 'center' as const 
  },
  statValue: { 
    fontSize: '1.75rem', 
    fontWeight: 'bold', 
    color: '#1e40af', 
    marginBottom: '0.5rem' 
  },
  statLabel: { 
    fontSize: '0.875rem', 
    color: '#6b7280', 
    fontWeight: '500' 
  },
  avatar: {
    position: 'relative' as const,
    display: 'inline-block'
  },
  avatarUpload: {
    position: 'absolute' as const,
    bottom: '0',
    right: '0',
    backgroundColor: '#2563eb',
    color: 'white',
    borderRadius: '50%',
    padding: '0.25rem',
    cursor: 'pointer',
    border: '2px solid white'
  },
  message: {
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626'
  },
  warningMessage: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fed7aa',
    color: '#92400e'
  }
};

// Helper function to safely convert Firestore timestamp to Date
const getDateFromFirestoreTimestamp = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (timestamp.seconds && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    return null;
  }
};

// Helper function to format date safely
const formatDate = (timestamp: any): string => {
  const date = getDateFromFirestoreTimestamp(timestamp);
  if (!date) return 'Recently';
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to validate phone number
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^(\+63|0)[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Helper function to validate email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface UserStats {
  totalDonations?: number;
  activeDonations?: number;
  completedDonations?: number;
  totalReceived?: number;
  pendingPickups?: number;
  totalDeliveries?: number;
  activeDeliveries?: number;
  totalImpact?: number;
}

interface Message {
  type: 'success' | 'error' | 'warning';
  text: string;
}

// Firestore collection names
const COLLECTIONS = {
  DONATIONS: 'donations',
  VOLUNTEER_TASKS: 'volunteerTasks',
  USERS: 'users'
};

export default function ProfilePage() {
  const { user, userProfile, updateProfile, loading, logout } = useAuth();
  const { loading: roleLoading } = useRoleAccess(['donor', 'recipient', 'volunteer']);
  const router = useRouter();

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Initialize form data when userProfile is available
  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
      });
    }
  }, [userProfile]);

  // Fetch user statistics based on role
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user || !userProfile) return;

      setStatsLoading(true);
      try {
        const stats: UserStats = {};

        switch (userProfile.role) {
          case 'donor':
            // Fetch donations where user is the donor
            const donationsQuery = query(
              collection(db, COLLECTIONS.DONATIONS),
              where('donorId', '==', user.uid)
            );
            const donationsSnapshot = await getDocs(donationsQuery);
            const donations = donationsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...(doc.data() as any)
            }));

            stats.totalDonations = donations.length;
            stats.activeDonations = donations.filter(d => 
              d.status === 'available' || d.status === 'claimed'
            ).length;
            stats.completedDonations = donations.filter(d => 
              d.status === 'completed' || d.status === 'delivered'
            ).length;
            stats.totalImpact = donations.reduce((total, donation) => {
              const quantity = donation.quantity || donation.meals || 1;
              return total + (typeof quantity === 'number' ? quantity : parseInt(quantity) || 1);
            }, 0);
            break;

          case 'recipient':
            // Fetch donations where user is the recipient
            const receivedQuery = query(
              collection(db, COLLECTIONS.DONATIONS),
              where('recipientId', '==', user.uid)
            );
            const receivedSnapshot = await getDocs(receivedQuery);
            const receivedDonations = receivedSnapshot.docs.map(doc => ({
              id: doc.id,
              ...(doc.data() as any)
            }));

            stats.totalReceived = receivedDonations.filter(d => 
              d.status === 'completed' || d.status === 'delivered' || d.status === 'received'
            ).length;
            stats.pendingPickups = receivedDonations.filter(d => 
              d.status === 'claimed' || d.status === 'assigned'
            ).length;
            stats.totalImpact = receivedDonations.reduce((total, donation) => {
              const quantity = donation.quantity || donation.meals || 1;
              return total + (typeof quantity === 'number' ? quantity : parseInt(quantity) || 1);
            }, 0);
            break;

          case 'volunteer':
            // Fetch volunteer tasks assigned to user
            const tasksQuery = query(
              collection(db, COLLECTIONS.VOLUNTEER_TASKS),
              where('volunteerId', '==', user.uid)
            );
            const tasksSnapshot = await getDocs(tasksQuery);
            const tasks = tasksSnapshot.docs.map(doc => ({
              id: doc.id,
              ...(doc.data() as any)
            }));

            stats.totalDeliveries = tasks.filter(t => 
              t.status === 'completed' || t.status === 'delivered'
            ).length;
            stats.activeDeliveries = tasks.filter(t => 
              t.status === 'assigned' || t.status === 'in_progress' || t.status === 'picked_up'
            ).length;
            stats.totalImpact = tasks.reduce((total, task) => {
              const distance = task.distance || task.kilometers || 0;
              return total + (typeof distance === 'number' ? distance : parseFloat(distance) || 0);
            }, 0);
            break;
        }

        setUserStats(stats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
        showMessage('error', 'Failed to load statistics. Please try again.');
        // Set default stats to prevent errors
        setUserStats({
          totalDonations: 0,
          activeDonations: 0,
          completedDonations: 0,
          totalReceived: 0,
          pendingPickups: 0,
          totalDeliveries: 0,
          activeDeliveries: 0,
          totalImpact: 0
        });
      } finally {
        setStatsLoading(false);
      }
    };

    if (user && userProfile) {
      fetchUserStats();
    }
  }, [user, userProfile]);

  const showMessage = (type: Message['type'], text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const validateForm = (): boolean => {
    if (!formData.displayName.trim()) {
      showMessage('error', 'Display name is required');
      return false;
    }

    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      showMessage('error', 'Please enter a valid Philippine phone number (e.g., +63 XXX XXX XXXX)');
      return false;
    }

    if (formData.email && !validateEmail(formData.email)) {
      showMessage('error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaveLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      showMessage('success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showMessage('error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword) {
      showMessage('error', 'Current password is required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters long');
      return;
    }

    setSaveLoading(true);
    try {
      // In a real app, you would verify current password and update to new password
      // For demo purposes, we'll simulate this
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      showMessage('success', 'Password updated successfully!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to update password. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: userProfile?.displayName || '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || '',
    });
    setIsEditing(false);
    setMessage(null);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error logging out:', error);
      showMessage('error', 'Failed to logout. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        showMessage('error', 'Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage('error', 'Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        // In a real app, you would upload the image to your storage service
        showMessage('success', 'Avatar updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const getRoleStats = () => {
    if (!userProfile || statsLoading) {
      return [
        { label: 'Loading...', value: '...', color: '#6b7280', icon: <FiClock size={20} /> },
        { label: 'Loading...', value: '...', color: '#6b7280', icon: <FiClock size={20} /> },
        { label: 'Loading...', value: '...', color: '#6b7280', icon: <FiClock size={20} /> },
      ];
    }

    switch (userProfile.role) {
      case 'donor':
        return [
          { 
            label: 'Total Donations', 
            value: userStats.totalDonations || 0, 
            color: '#16a34a', 
            icon: <FiPackage size={20} /> 
          },
          { 
            label: 'Active Listings', 
            value: userStats.activeDonations || 0, 
            color: '#2563eb', 
            icon: <FiBarChart size={20} /> 
          },
          { 
            label: 'Meals Provided', 
            value: userStats.totalImpact || 0, 
            color: '#9333ea', 
            icon: <FiUsers size={20} /> 
          },
        ];
      case 'recipient':
        return [
          { 
            label: 'Meals Received', 
            value: userStats.totalReceived || 0, 
            color: '#16a34a', 
            icon: <FiPackage size={20} /> 
          },
          { 
            label: 'Pending Pickups', 
            value: userStats.pendingPickups || 0, 
            color: '#f59e0b', 
            icon: <FiClock size={20} /> 
          },
          { 
            label: 'Money Saved', 
            value: `₱${((userStats.totalImpact || 0) * 50).toLocaleString()}`, 
            color: '#9333ea', 
            icon: <FiDollarSign size={20} /> 
          },
        ];
      case 'volunteer':
        return [
          { 
            label: 'Deliveries Completed', 
            value: userStats.totalDeliveries || 0, 
            color: '#16a34a', 
            icon: <FiTruck size={20} /> 
          },
          { 
            label: 'Active Deliveries', 
            value: userStats.activeDeliveries || 0, 
            color: '#2563eb', 
            icon: <FiNavigation size={20} /> 
          },
          { 
            label: 'Kilometers Traveled', 
            value: `${(userStats.totalImpact || 0).toFixed(1)}km`, 
            color: '#9333ea', 
            icon: <FiMapPin size={20} /> 
          },
        ];
      default:
        return [];
    }
  };

  const getRoleDescription = () => {
    switch (userProfile?.role) {
      case 'donor':
        return 'Thank you for donating surplus food and helping fight food waste in Olongapo City!';
      case 'recipient':
        return 'We\'re glad to support your organization in serving the community.';
      case 'volunteer':
        return 'Your delivery efforts are crucial in connecting food donors with those in need.';
      default:
        return 'Welcome to Food Forward Olongapo!';
    }
  };

  const getRoleIcon = () => {
    switch (userProfile?.role) {
      case 'donor': 
        return <FiPackage size={24} />;
      case 'recipient': 
        return <FiHome size={24} />;
      case 'volunteer': 
        return <FiTruck size={24} />;
      default: 
        return <FiUser size={24} />;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading || roleLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            border: '4px solid #16a34a', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {message && (
          <div style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.successMessage : 
                 message.type === 'error' ? styles.errorMessage : styles.warningMessage)
          }}>
            {message.type === 'success' ? <FiCheck size={16} /> : 
             message.type === 'error' ? <FiAlertCircle size={16} /> : <FiAlertCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Header Section */}
        <div style={styles.section}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between', 
            marginBottom: '1rem',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '1rem'
          }}>
            <h1 style={styles.sectionTitle}>My Profile</h1>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#2563eb', 
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                <FiEdit3 size={16} />
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCancel}
                  style={{ 
                    ...styles.button, 
                    backgroundColor: '#6b7280', 
                    color: 'white'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
                >
                  <FiX size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  style={{ 
                    ...styles.button, 
                    backgroundColor: '#16a34a', 
                    color: 'white',
                    opacity: saveLoading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                >
                  <FiSave size={16} />
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '1rem',
            flexDirection: isMobile ? 'column' : 'row',
            textAlign: isMobile ? 'center' : 'left'
          }}>
            <div style={styles.avatar}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                backgroundColor: '#3b82f6', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {!avatarPreview && getInitials(userProfile.displayName || 'User')}
              </div>
              {isEditing && (
                <label style={styles.avatarUpload}>
                  <FiCamera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.25rem',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
                  {userProfile.displayName || 'User'}
                </h2>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: userProfile.role === 'donor' ? '#dcfce7' : 
                                  userProfile.role === 'recipient' ? '#dbeafe' : '#f3e8ff',
                  color: userProfile.role === 'donor' ? '#166534' : 
                        userProfile.role === 'recipient' ? '#1e40af' : '#6b21a8',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {userProfile.role || 'user'}
                </span>
              </div>
              <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                {getRoleDescription()}
              </p>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  <FiStar size={12} />
                  {userProfile.rating || 5}/5 Community Rating
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <FiCalendar size={12} />
                  Member since {formatDate(userProfile.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Role Statistics */}
        <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, fontSize: '1.125rem' }}>My Impact</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {getRoleStats().map((stat, index) => (
              <div key={index} style={styles.statCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                  <div style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
                </div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Information */}
        <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, fontSize: '1.125rem' }}>Personal Information</h3>
          <form onSubmit={handleSave}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '1rem' 
            }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiUser size={14} />
                    Full Name
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  style={{
                    ...styles.input,
                    borderColor: isEditing ? '#3b82f6' : '#d1d5db',
                    backgroundColor: isEditing ? '#ffffff' : '#f9fafb'
                  }}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiMail size={14} />
                    Email Address
                  </div>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  style={{ 
                    ...styles.input, 
                    backgroundColor: '#f9fafb', 
                    color: '#6b7280',
                    cursor: 'not-allowed'
                  }}
                  disabled
                  title="Email cannot be changed"
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Contact support to change email
                </p>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiPhone size={14} />
                  Phone Number
                </div>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                style={{
                  ...styles.input,
                  borderColor: isEditing ? '#3b82f6' : '#d1d5db',
                  backgroundColor: isEditing ? '#ffffff' : '#f9fafb'
                }}
                disabled={!isEditing}
                placeholder="+63 XXX XXX XXXX"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiMapPin size={14} />
                  Address
                </div>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                style={{
                  ...styles.input,
                  borderColor: isEditing ? '#3b82f6' : '#d1d5db',
                  backgroundColor: isEditing ? '#ffffff' : '#f9fafb'
                }}
                disabled={!isEditing}
                placeholder="Olongapo City, Zambales"
              />
            </div>
          </form>
        </div>

        {/* Change Password */}
        {isChangingPassword && (
          <div style={styles.section}>
            <h3 style={{ ...styles.sectionTitle, fontSize: '1.125rem' }}>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}
                  >
                    {showCurrentPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                gap: '1rem' 
              }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      style={styles.input}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer'
                      }}
                    >
                      {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={saveLoading}
                  style={{
                    ...styles.button,
                    backgroundColor: '#16a34a',
                    color: 'white',
                    opacity: saveLoading ? 0.6 : 1
                  }}
                >
                  <FiSave size={16} />
                  {saveLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  style={{
                    ...styles.button,
                    backgroundColor: '#6b7280',
                    color: 'white'
                  }}
                >
                  <FiX size={16} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Account Information */}
        <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, fontSize: '1.125rem' }}>Account Information</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiUser size={14} />
                User ID
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {user.uid}
              </p>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiShield size={14} />
                Account Role
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {userProfile.role?.charAt(0).toUpperCase() + userProfile.role?.slice(1) || 'User'}
              </p>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiCalendar size={14} />
                Member Since
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {formatDate(userProfile.createdAt)}
              </p>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiEdit3 size={14} />
                Last Updated
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {formatDate(userProfile.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, fontSize: '1.125rem' }}>Account Actions</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#f59e0b', 
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
              >
                <FiLock size={16} />
                Change Password
              </button>
            )}
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              style={{ 
                ...styles.button, 
                backgroundColor: '#dc2626', 
                color: 'white',
                opacity: logoutLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              <FiLogOut size={16} />
              {logoutLoading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}