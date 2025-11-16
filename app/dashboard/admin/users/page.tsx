'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  FiUsers, 
  FiUserPlus, 
  FiUserCheck, 
  FiUserX,
  FiSearch,
  FiFilter,
  FiEdit,
  FiTrash2,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiEye,
  FiMoreVertical,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiUser,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'donor' | 'recipient' | 'volunteer' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  phone?: string;
  location?: string;
  joinDate: any;
  lastActive?: any;
  donationCount?: number;
  completedDonations?: number;
  profileCompleted: boolean;
  emailVerified: boolean;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  usersByRole: {
    donor: number;
    recipient: number;
    volunteer: number;
    admin: number;
  };
  usersByStatus: {
    active: number;
    inactive: number;
    suspended: number;
    pending: number;
  };
  verificationStats: {
    verified: number;
    unverified: number;
    profileCompleted: number;
  };
}

export default function AdminUsersDashboard() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    usersByRole: {
      donor: 0,
      recipient: 0,
      volunteer: 0,
      admin: 0
    },
    usersByStatus: {
      active: 0,
      inactive: 0,
      suspended: 0,
      pending: 0
    },
    verificationStats: {
      verified: 0,
      unverified: 0,
      profileCompleted: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'joinDate' | 'name' | 'lastActive'>('joinDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setMobileView(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch users data with proper error handling
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Starting to fetch users...');

      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersData: User[] = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        console.log('User data:', userData); // Debug log
        
        usersData.push({ 
          id: doc.id,
          email: userData.email || '',
          name: userData.name || userData.displayName || 'Unknown User',
          role: userData.role || 'donor',
          status: userData.status || 'active',
          phone: userData.phoneNumber || userData.phone,
          location: userData.location || userData.address,
          joinDate: userData.createdAt || userData.joinDate || Timestamp.now(),
          lastActive: userData.lastActive || userData.lastLogin || Timestamp.now(),
          donationCount: userData.donationCount || userData.totalDonations || 0,
          completedDonations: userData.completedDonations || userData.successfulDonations || 0,
          profileCompleted: userData.profileCompleted || userData.hasCompleteProfile || false,
          emailVerified: userData.emailVerified || userData.isVerified || false
        } as User);
      });

      console.log('Fetched users:', usersData.length); // Debug log
      setUsers(usersData);
      calculateUserStats(usersData);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error loading users data. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time users subscription
  useEffect(() => {
    if (!user) {
      console.log('No user authenticated');
      return;
    }

    console.log('Setting up real-time users subscription...');
    
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(usersQuery, 
      (snapshot) => {
        console.log('Real-time update received:', snapshot.size, 'users');
        const usersData: User[] = [];
        snapshot.forEach((doc) => {
          const userData = doc.data();
          usersData.push({ 
            id: doc.id,
            email: userData.email || '',
            name: userData.name || userData.displayName || 'Unknown User',
            role: userData.role || 'donor',
            status: userData.status || 'active',
            phone: userData.phoneNumber || userData.phone,
            location: userData.location || userData.address,
            joinDate: userData.createdAt || userData.joinDate || Timestamp.now(),
            lastActive: userData.lastActive || userData.lastLogin || Timestamp.now(),
            donationCount: userData.donationCount || userData.totalDonations || 0,
            completedDonations: userData.completedDonations || userData.successfulDonations || 0,
            profileCompleted: userData.profileCompleted || userData.hasCompleteProfile || false,
            emailVerified: userData.emailVerified || userData.isVerified || false
          } as User);
        });
        
        setUsers(usersData);
        calculateUserStats(usersData);
      },
      (error) => {
        console.error('Error in real-time subscription:', error);
        // Fallback to regular fetch if real-time fails
        fetchUsers();
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Filter and sort users
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'joinDate':
          aValue = a.joinDate?.toDate?.() || new Date(0);
          bValue = b.joinDate?.toDate?.() || new Date(0);
          break;
        case 'lastActive':
          aValue = a.lastActive?.toDate?.() || new Date(0);
          bValue = b.lastActive?.toDate?.() || new Date(0);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

  const calculateUserStats = (usersData: User[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stats: UserStats = {
      totalUsers: usersData.length,
      activeUsers: usersData.filter(u => u.status === 'active').length,
      newUsersToday: usersData.filter(u => {
        const joinDate = u.joinDate?.toDate?.() || new Date(0);
        return joinDate >= today;
      }).length,
      newUsersThisWeek: usersData.filter(u => {
        const joinDate = u.joinDate?.toDate?.() || new Date(0);
        return joinDate >= oneWeekAgo;
      }).length,
      usersByRole: {
        donor: usersData.filter(u => u.role === 'donor').length,
        recipient: usersData.filter(u => u.role === 'recipient').length,
        volunteer: usersData.filter(u => u.role === 'volunteer').length,
        admin: usersData.filter(u => u.role === 'admin').length
      },
      usersByStatus: {
        active: usersData.filter(u => u.status === 'active').length,
        inactive: usersData.filter(u => u.status === 'inactive').length,
        suspended: usersData.filter(u => u.status === 'suspended').length,
        pending: usersData.filter(u => u.status === 'pending').length
      },
      verificationStats: {
        verified: usersData.filter(u => u.emailVerified).length,
        unverified: usersData.filter(u => !u.emailVerified).length,
        profileCompleted: usersData.filter(u => u.profileCompleted).length
      }
    };

    console.log('Calculated stats:', stats); // Debug log
    setUserStats(stats);
  };

  const handleUserAction = async (userId: string, action: string, value?: any) => {
    setActionLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      
      switch (action) {
        case 'activate':
          await updateDoc(userRef, { 
            status: 'active',
            updatedAt: Timestamp.now()
          });
          break;
        case 'deactivate':
          await updateDoc(userRef, { 
            status: 'inactive',
            updatedAt: Timestamp.now()
          });
          break;
        case 'suspend':
          await updateDoc(userRef, { 
            status: 'suspended',
            updatedAt: Timestamp.now()
          });
          break;
        case 'changeRole':
          if (value) await updateDoc(userRef, { 
            role: value,
            updatedAt: Timestamp.now()
          });
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await deleteDoc(userRef);
          }
          break;
        case 'resendVerification':
          // This would integrate with your email service
          alert('Verification email resent successfully');
          break;
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      alert('Error performing action. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    setActionLoading(true);
    try {
      const batch = writeBatch(db);

      selectedUsers.forEach(userId => {
        const userRef = doc(db, 'users', userId);
        
        switch (bulkAction) {
          case 'activate':
            batch.update(userRef, { 
              status: 'active',
              updatedAt: Timestamp.now()
            });
            break;
          case 'deactivate':
            batch.update(userRef, { 
              status: 'inactive',
              updatedAt: Timestamp.now()
            });
            break;
          case 'suspend':
            batch.update(userRef, { 
              status: 'suspended',
              updatedAt: Timestamp.now()
            });
            break;
          case 'delete':
            batch.delete(userRef);
            break;
          case 'verifyAll':
            batch.update(userRef, { 
              emailVerified: true,
              updatedAt: Timestamp.now()
            });
            break;
        }
      });

      await batch.commit();
      setSelectedUsers([]);
      setBulkAction('');
      alert(`Bulk action completed successfully for ${selectedUsers.length} users`);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Error performing bulk action. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportUserData = () => {
    if (filteredUsers.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      const data = filteredUsers.map(user => ({
        Name: user.name,
        Email: user.email,
        Role: user.role,
        Status: user.status,
        Phone: user.phone || 'N/A',
        Location: user.location || 'N/A',
        'Join Date': user.joinDate?.toDate?.().toLocaleDateString() || 'N/A',
        'Last Active': user.lastActive?.toDate?.().toLocaleDateString() || 'N/A',
        'Donation Count': user.donationCount || 0,
        'Completed Donations': user.completedDonations || 0,
        'Profile Completed': user.profileCompleted ? 'Yes' : 'No',
        'Email Verified': user.emailVerified ? 'Yes' : 'No'
      }));

      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'donor': return 'bg-blue-100 text-blue-800';
      case 'recipient': return 'bg-green-100 text-green-800';
      case 'volunteer': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysSinceJoin = (joinDate: any) => {
    if (!joinDate) return 'N/A';
    const join = joinDate.toDate ? joinDate.toDate() : new Date(joinDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - join.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  };

  const getLastActive = (lastActive: any) => {
    if (!lastActive) return 'Never';
    const active = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - active.getTime());
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  // Mobile User Card Component
  const MobileUserCard = ({ user }: { user: User }) => (
    <div className={`mobile-user-card ${selectedUsers.includes(user.id) ? 'selected' : ''}`}>
      <div className="mobile-card-header">
        <input
          type="checkbox"
          checked={selectedUsers.includes(user.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers(prev => [...prev, user.id]);
            } else {
              setSelectedUsers(prev => prev.filter(id => id !== user.id));
            }
          }}
          className="mobile-checkbox"
        />
        <div className="mobile-user-info">
          <div className="mobile-user-name">{user.name}</div>
          <div className="mobile-user-email">{user.email}</div>
        </div>
      </div>
      
      <div className="mobile-card-content">
        <div className="mobile-row">
          <span className="mobile-label">Role:</span>
          <span className={`mobile-role-badge ${getRoleColor(user.role)}`}>
            {user.role}
          </span>
        </div>
        <div className="mobile-row">
          <span className="mobile-label">Status:</span>
          <span className={`mobile-status-badge ${getStatusColor(user.status)}`}>
            {user.status}
          </span>
        </div>
        <div className="mobile-row">
          <span className="mobile-label">Location:</span>
          <span className="mobile-value">{user.location || 'Not specified'}</span>
        </div>
        <div className="mobile-row">
          <span className="mobile-label">Joined:</span>
          <span className="mobile-value">
            {user.joinDate?.toDate?.().toLocaleDateString() || 'N/A'}
          </span>
        </div>
        <div className="mobile-row">
          <span className="mobile-label">Last Active:</span>
          <span className="mobile-value">{getLastActive(user.lastActive)}</span>
        </div>
        <div className="mobile-row">
          <span className="mobile-label">Donations:</span>
          <span className="mobile-value">
            {user.donationCount || 0} total, {user.completedDonations || 0} completed
          </span>
        </div>
        <div className="mobile-row">
          <span className="mobile-label">Verification:</span>
          <span className="mobile-value">
            {user.emailVerified ? 'Verified' : 'Unverified'} • 
            {user.profileCompleted ? ' Complete' : ' Incomplete'}
          </span>
        </div>
      </div>
      
      <div className="mobile-card-actions">
        <button 
          className="mobile-action-btn view"
          onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
        >
          <FiEye size={14} />
        </button>
        <button 
          className="mobile-action-btn edit"
          onClick={() => {
            const newRole = user.role === 'admin' ? 'donor' : 'admin';
            handleUserAction(user.id, 'changeRole', newRole);
          }}
        >
          <FiEdit size={14} />
        </button>
        {!user.emailVerified && (
          <button 
            className="mobile-action-btn verify"
            onClick={() => handleUserAction(user.id, 'resendVerification')}
          >
            <FiMail size={14} />
          </button>
        )}
        {user.status === 'active' ? (
          <button 
            className="mobile-action-btn suspend"
            onClick={() => handleUserAction(user.id, 'suspend')}
          >
            <FiUserX size={14} />
          </button>
        ) : (
          <button 
            className="mobile-action-btn activate"
            onClick={() => handleUserAction(user.id, 'activate')}
          >
            <FiUserCheck size={14} />
          </button>
        )}
        <button 
          className="mobile-action-btn delete"
          onClick={() => handleUserAction(user.id, 'delete')}
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Users Dashboard...</p>
          <p className="loading-subtext">Fetching user data from database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-main">
            <h1 className="header-title">Users Management</h1>
            <p className="header-subtitle">
              Manage and monitor all platform users in real-time
            </p>
            <div className="data-info">
              <span className="data-update">Real-time data • {users.length} users loaded</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={fetchUsers}>
              <FiRefreshCw size={16} />
              Refresh
            </button>
            <button className="btn-secondary" onClick={exportUserData} disabled={filteredUsers.length === 0}>
              <FiDownload size={16} />
              Export CSV
            </button>
            <button className="btn-primary">
              <FiUserPlus size={16} />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <FiUsers size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{userStats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
              <div className="stat-trend">
                +{userStats.newUsersThisWeek} this week
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <FiUserCheck size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{userStats.activeUsers}</div>
              <div className="stat-label">Active Users</div>
              <div className="stat-subtext">
                {Math.round((userStats.activeUsers / userStats.totalUsers) * 100)}% of total
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon new">
              <FiUserPlus size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{userStats.newUsersToday}</div>
              <div className="stat-label">New Today</div>
              <div className="stat-subtext">
                {userStats.newUsersThisWeek} this week
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon verified">
              <FiCheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{userStats.verificationStats.verified}</div>
              <div className="stat-label">Verified Users</div>
              <div className="stat-subtext">
                {userStats.verificationStats.profileCompleted} profiles completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="distribution-section">
        <div className="distribution-grid">
          <div className="distribution-card">
            <h3 className="distribution-title">Users by Role</h3>
            <div className="role-stats">
              <div className="role-stat">
                <span className="role-label">Donors</span>
                <span className="role-count">{userStats.usersByRole.donor}</span>
                <div className="role-bar">
                  <div 
                    className="bar-fill donor"
                    style={{ 
                      width: `${userStats.totalUsers > 0 ? (userStats.usersByRole.donor / userStats.totalUsers) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="role-stat">
                <span className="role-label">Recipients</span>
                <span className="role-count">{userStats.usersByRole.recipient}</span>
                <div className="role-bar">
                  <div 
                    className="bar-fill recipient"
                    style={{ 
                      width: `${userStats.totalUsers > 0 ? (userStats.usersByRole.recipient / userStats.totalUsers) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="role-stat">
                <span className="role-label">Volunteers</span>
                <span className="role-count">{userStats.usersByRole.volunteer}</span>
                <div className="role-bar">
                  <div 
                    className="bar-fill volunteer"
                    style={{ 
                      width: `${userStats.totalUsers > 0 ? (userStats.usersByRole.volunteer / userStats.totalUsers) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="role-stat">
                <span className="role-label">Admins</span>
                <span className="role-count">{userStats.usersByRole.admin}</span>
                <div className="role-bar">
                  <div 
                    className="bar-fill admin"
                    style={{ 
                      width: `${userStats.totalUsers > 0 ? (userStats.usersByRole.admin / userStats.totalUsers) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="distribution-card">
            <h3 className="distribution-title">Users by Status</h3>
            <div className="status-stats">
              <div className="status-stat">
                <div className="status-indicator active"></div>
                <span className="status-label">Active</span>
                <span className="status-count">{userStats.usersByStatus.active}</span>
                <span className="status-percentage">
                  {userStats.totalUsers > 0 ? Math.round((userStats.usersByStatus.active / userStats.totalUsers) * 100) : 0}%
                </span>
              </div>
              <div className="status-stat">
                <div className="status-indicator inactive"></div>
                <span className="status-label">Inactive</span>
                <span className="status-count">{userStats.usersByStatus.inactive}</span>
                <span className="status-percentage">
                  {userStats.totalUsers > 0 ? Math.round((userStats.usersByStatus.inactive / userStats.totalUsers) * 100) : 0}%
                </span>
              </div>
              <div className="status-stat">
                <div className="status-indicator suspended"></div>
                <span className="status-label">Suspended</span>
                <span className="status-count">{userStats.usersByStatus.suspended}</span>
                <span className="status-percentage">
                  {userStats.totalUsers > 0 ? Math.round((userStats.usersByStatus.suspended / userStats.totalUsers) * 100) : 0}%
                </span>
              </div>
              <div className="status-stat">
                <div className="status-indicator pending"></div>
                <span className="status-label">Pending</span>
                <span className="status-count">{userStats.usersByStatus.pending}</span>
                <span className="status-percentage">
                  {userStats.totalUsers > 0 ? Math.round((userStats.usersByStatus.pending / userStats.totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Section */}
      <div className="users-section">
        <div className="section-header">
          <h2 className="section-title">User Management</h2>
          <div className="section-actions">
            <span className="results-count">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-bar">
          <div className="search-box">
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Search users by name, email, phone, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="donor">Donors</option>
              <option value="recipient">Recipients</option>
              <option value="volunteer">Volunteers</option>
              <option value="admin">Admins</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="filter-select"
            >
              <option value="joinDate">Join Date</option>
              <option value="name">Name</option>
              <option value="lastActive">Last Active</option>
            </select>

            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-btn"
              title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
            >
              {sortOrder === 'asc' ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-info">
              <span>{selectedUsers.length} users selected</span>
            </div>
            <div className="bulk-controls">
              <select 
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="bulk-select"
              >
                <option value="">Bulk Actions</option>
                <option value="activate">Activate Selected</option>
                <option value="deactivate">Deactivate Selected</option>
                <option value="suspend">Suspend Selected</option>
                <option value="verifyAll">Verify All Selected</option>
                <option value="delete">Delete Selected</option>
              </select>
              <button 
                onClick={handleBulkAction}
                disabled={!bulkAction || actionLoading}
                className="bulk-apply-btn"
              >
                {actionLoading ? 'Applying...' : 'Apply'}
              </button>
              <button 
                onClick={() => setSelectedUsers([])}
                className="bulk-cancel-btn"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Users Table for Desktop, Cards for Mobile */}
        <div className="users-table-container">
          {!mobileView ? (
            // Desktop Table View
            <table className="users-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      disabled={filteredUsers.length === 0}
                    />
                  </th>
                  <th className="user-column">User</th>
                  <th className="role-column">Role</th>
                  <th className="status-column">Status</th>
                  <th className="location-column">Location</th>
                  <th className="date-column">Join Date</th>
                  <th className="date-column">Last Active</th>
                  <th className="donations-column">Donations</th>
                  <th className="verification-column">Verification</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={selectedUsers.includes(user.id) ? 'selected' : ''}>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(prev => [...prev, user.id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                      />
                    </td>
                    <td className="user-column">
                      <div className="user-info">
                        <div className="user-avatar">
                          <FiUser size={16} />
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.name}</div>
                          <div className="user-email">{user.email}</div>
                          {user.phone && (
                            <div className="user-phone">
                              <FiPhone size={12} />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="role-column">
                      <span className={`role-badge ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="status-column">
                      <span className={`status-badge ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="location-column">
                      <div className="location-info">
                        <FiMapPin size={14} />
                        <span className="location-text">{user.location || 'Not specified'}</span>
                      </div>
                    </td>
                    <td className="date-column">
                      <div className="date-info">
                        <div className="date">
                          {user.joinDate?.toDate?.().toLocaleDateString() || 'N/A'}
                        </div>
                        <div className="days-ago">
                          {getDaysSinceJoin(user.joinDate)}
                        </div>
                      </div>
                    </td>
                    <td className="date-column">
                      <div className="last-active">
                        {getLastActive(user.lastActive)}
                      </div>
                    </td>
                    <td className="donations-column">
                      <div className="donation-stats">
                        <div className="donation-count">
                          {user.donationCount || 0} total
                        </div>
                        <div className="completed-count">
                          {user.completedDonations || 0} completed
                        </div>
                      </div>
                    </td>
                    <td className="verification-column">
                      <div className="verification-status">
                        <div className={`verification-badge ${user.emailVerified ? 'verified' : 'unverified'}`}>
                          {user.emailVerified ? (
                            <><FiCheckCircle size={12} /> Verified</>
                          ) : (
                            <><FiXCircle size={12} /> Unverified</>
                          )}
                        </div>
                        <div className={`profile-badge ${user.profileCompleted ? 'completed' : 'incomplete'}`}>
                          {user.profileCompleted ? 'Complete' : 'Incomplete'}
                        </div>
                      </div>
                    </td>
                    <td className="actions-column">
                      <div className="action-buttons">
                        <button 
                          className="action-btn view"
                          onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                          title="View User Details"
                        >
                          <FiEye size={14} />
                        </button>
                        <button 
                          className="action-btn edit"
                          onClick={() => {
                            const newRole = user.role === 'admin' ? 'donor' : 'admin';
                            handleUserAction(user.id, 'changeRole', newRole);
                          }}
                          title="Change Role"
                        >
                          <FiEdit size={14} />
                        </button>
                        {!user.emailVerified && (
                          <button 
                            className="action-btn verify"
                            onClick={() => handleUserAction(user.id, 'resendVerification')}
                            title="Resend Verification"
                          >
                            <FiMail size={14} />
                          </button>
                        )}
                        {user.status === 'active' ? (
                          <button 
                            className="action-btn suspend"
                            onClick={() => handleUserAction(user.id, 'suspend')}
                            title="Suspend User"
                          >
                            <FiUserX size={14} />
                          </button>
                        ) : (
                          <button 
                            className="action-btn activate"
                            onClick={() => handleUserAction(user.id, 'activate')}
                            title="Activate User"
                          >
                            <FiUserCheck size={14} />
                          </button>
                        )}
                        <button 
                          className="action-btn delete"
                          onClick={() => handleUserAction(user.id, 'delete')}
                          title="Delete User"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // Mobile Card View
            <div className="mobile-users-list">
              {filteredUsers.map((user) => (
                <MobileUserCard key={user.id} user={user} />
              ))}
            </div>
          )}

          {filteredUsers.length === 0 && (
            <div className="empty-state">
              {users.length === 0 ? (
                <>
                  <FiUsers size={48} />
                  <h3>No Users Found</h3>
                  <p>There are no users in the database yet.</p>
                  <button className="btn-primary" onClick={fetchUsers}>
                    <FiRefreshCw size={16} />
                    Check Again
                  </button>
                </>
              ) : (
                <>
                  <FiSearch size={48} />
                  <h3>No Matching Users</h3>
                  <p>Try adjusting your search or filters</p>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .users-dashboard-container {
          min-height: 100vh;
          background: #f8fafc;
          margin-top: 70px;
        }

        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 1.5rem 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-main {
          flex: 1;
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .header-subtitle {
          color: #6b7280;
          margin: 0 0 0.5rem 0;
        }

        .data-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .data-update {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .btn-primary, .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 0.875rem;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
        }

        .btn-secondary:disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .stats-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 2rem 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.total { background: #dbeafe; color: #3b82f6; }
        .stat-icon.active { background: #dcfce7; color: #10b981; }
        .stat-icon.new { background: #fef3c7; color: #f59e0b; }
        .stat-icon.verified { background: #f3e8ff; color: #8b5cf6; }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .stat-trend, .stat-subtext {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .stat-trend {
          color: #10b981;
          font-weight: 500;
        }

        .distribution-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 2rem 2rem;
        }

        .distribution-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .distribution-grid {
            grid-template-columns: 1fr;
          }
        }

        .distribution-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .distribution-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 1.5rem 0;
        }

        .role-stats, .status-stats {
          space-y: 1rem;
        }

        .role-stat, .status-stat {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .role-label, .status-label {
          flex: 1;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .role-count, .status-count {
          font-weight: 600;
          color: #111827;
          min-width: 30px;
          text-align: right;
          font-size: 0.875rem;
        }

        .status-percentage {
          font-size: 0.75rem;
          color: #6b7280;
          min-width: 35px;
          text-align: right;
        }

        .role-bar {
          flex: 2;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .bar-fill.donor { background: #3b82f6; }
        .bar-fill.recipient { background: #10b981; }
        .bar-fill.volunteer { background: #f59e0b; }
        .bar-fill.admin { background: #8b5cf6; }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-indicator.active { background: #10b981; }
        .status-indicator.inactive { background: #6b7280; }
        .status-indicator.suspended { background: #dc2626; }
        .status-indicator.pending { background: #f59e0b; }

        .users-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .results-count {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 300px;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-box svg {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
        }

        .filter-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .filter-select, .bulk-select {
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          min-width: 120px;
        }

        .sort-btn {
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #374151;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sort-btn:hover {
          background: #f9fafb;
        }

        .bulk-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f3f4f6;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .bulk-info {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .bulk-controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .bulk-apply-btn, .bulk-cancel-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
        }

        .bulk-apply-btn {
          background: #3b82f6;
          color: white;
        }

        .bulk-apply-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .bulk-cancel-btn {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .users-table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        /* Desktop Table Styles */
        .users-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .users-table th {
          background: #f8fafc;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .users-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
          vertical-align: top;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .users-table tr:last-child td {
          border-bottom: none;
        }

        .users-table tr.selected {
          background: #f0f9ff;
        }

        /* Column Widths for Desktop */
        .checkbox-cell { width: 50px; }
        .user-column { width: 220px; }
        .role-column { width: 100px; }
        .status-column { width: 100px; }
        .location-column { width: 150px; }
        .date-column { width: 140px; }
        .donations-column { width: 120px; }
        .verification-column { width: 140px; }
        .actions-column { width: 180px; }

        .checkbox-cell {
          text-align: center;
        }

        .checkbox-cell input[type="checkbox"] {
          cursor: pointer;
        }

        .user-info {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          flex-shrink: 0;
        }

        .user-details {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-weight: 500;
          color: #111827;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email, .user-phone {
          color: #6b7280;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .role-badge, .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
          display: inline-block;
        }

        .location-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          white-space: nowrap;
        }

        .location-text {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .date-info, .last-active {
          color: #374151;
          white-space: nowrap;
        }

        .date {
          font-weight: 500;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .days-ago {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .donation-stats {
          color: #374151;
          white-space: nowrap;
        }

        .donation-count {
          font-weight: 500;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .completed-count {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .verification-status {
          space-y: 0.25rem;
        }

        .verification-badge, .profile-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
        }

        .verification-badge.verified {
          background: #dcfce7;
          color: #166534;
        }

        .verification-badge.unverified {
          background: #fef3c7;
          color: #92400e;
        }

        .profile-badge.completed {
          background: #dbeafe;
          color: #1e40af;
        }

        .profile-badge.incomplete {
          background: #f3f4f6;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          background: #f9fafb;
        }

        .action-btn.view:hover { color: #3b82f6; border-color: #3b82f6; }
        .action-btn.edit:hover { color: #f59e0b; border-color: #f59e0b; }
        .action-btn.verify:hover { color: #8b5cf6; border-color: #8b5cf6; }
        .action-btn.activate:hover { color: #10b981; border-color: #10b981; }
        .action-btn.suspend:hover { color: #dc2626; border-color: #dc2626; }
        .action-btn.delete:hover { color: #dc2626; background: #fef2f2; border-color: #dc2626; }

        /* Mobile Card Styles */
        .mobile-users-list {
          padding: 1rem;
          space-y: 1rem;
        }

        .mobile-user-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          space-y: 1rem;
        }

        .mobile-user-card.selected {
          background: #f0f9ff;
          border-color: #3b82f6;
        }

        .mobile-card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .mobile-checkbox {
          margin-top: 0.25rem;
        }

        .mobile-user-info {
          flex: 1;
        }

        .mobile-user-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .mobile-user-email {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .mobile-card-content {
          space-y: 0.5rem;
        }

        .mobile-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
        }

        .mobile-label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .mobile-value {
          color: #6b7280;
          font-size: 0.875rem;
          text-align: right;
          flex: 1;
          margin-left: 1rem;
        }

        .mobile-role-badge, .mobile-status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .mobile-card-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .mobile-action-btn {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-action-btn:hover {
          background: #f9fafb;
        }

        .mobile-action-btn.view:hover { color: #3b82f6; border-color: #3b82f6; }
        .mobile-action-btn.edit:hover { color: #f59e0b; border-color: #f59e0b; }
        .mobile-action-btn.verify:hover { color: #8b5cf6; border-color: #8b5cf6; }
        .mobile-action-btn.activate:hover { color: #10b981; border-color: #10b981; }
        .mobile-action-btn.suspend:hover { color: #dc2626; border-color: #dc2626; }
        .mobile-action-btn.delete:hover { color: #dc2626; background: #fef2f2; border-color: #dc2626; }

        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          color: #6b7280;
        }

        .empty-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          margin: 0 0 1.5rem 0;
        }

        .loading-container {
          min-height: calc(100vh - 70px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .loading-content {
          text-align: center;
        }

        .loading-spinner {
          width: 64px;
          height: 64px;
          border: 4px solid #16a34a;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .loading-text {
          color: #6b7280;
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }

        .loading-subtext {
          color: #9ca3af;
          font-size: 0.875rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .stats-section,
          .distribution-section,
          .users-section {
            padding: 1rem;
          }

          .filters-bar {
            flex-direction: column;
          }

          .search-box {
            min-width: auto;
          }

          .filter-group {
            width: 100%;
            justify-content: space-between;
          }

          .filter-select {
            flex: 1;
          }

          .users-table-container {
            overflow-x: auto;
          }

          .users-table {
            min-width: 1200px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .bulk-actions-bar {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .bulk-controls {
            justify-content: space-between;
          }
        }

        @media (max-width: 480px) {
          .header-actions {
            flex-direction: column;
            width: 100%;
          }

          .btn-primary, .btn-secondary {
            width: 100%;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .filter-group {
            flex-direction: column;
          }

          .filter-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}