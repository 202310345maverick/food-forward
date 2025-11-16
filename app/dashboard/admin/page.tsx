'use client'

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import Link from 'next/link';
import {
  FiUsers,
  FiPackage,
  FiTruck,
  FiTrendingUp,
  FiDollarSign,
  FiMapPin,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiSettings,
  FiDatabase,
  FiBarChart2,
  FiEye
} from 'react-icons/fi';

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: any;
  isVerified: boolean;
}

interface Donation {
  id: string;
  title: string;
  status: string;
  createdAt: any;
  donorName: string;
  category: string;
}

interface Stats {
  totalUsers: number;
  totalDonations: number;
  completedDeliveries: number;
  activeVolunteers: number;
  totalImpact: number;
  pendingApprovals: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDonations: 0,
    completedDeliveries: 0,
    activeVolunteers: 0,
    totalImpact: 0,
    pendingApprovals: 0
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData: User[] = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      
      // Fetch donations
      const donationsQuery = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
      const donationsSnapshot = await getDocs(donationsQuery);
      const donationsData: Donation[] = donationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation));

      // Calculate stats
      const totalUsers = usersData.length;
      const totalDonations = donationsData.length;
      const completedDeliveries = donationsData.filter(d => d.status === 'completed').length;
      const activeVolunteers = usersData.filter(u => u.role === 'volunteer').length;
      const totalImpact = completedDeliveries * 12; // Estimated meals provided
      const pendingApprovals = usersData.filter(u => !u.isVerified).length;

      setStats({
        totalUsers,
        totalDonations,
        completedDeliveries,
        activeVolunteers,
        totalImpact,
        pendingApprovals
      });

      setRecentUsers(usersData.slice(0, 5));
      setRecentDonations(donationsData.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'donor': return 'bg-green-100 text-green-800';
      case 'recipient': return 'bg-blue-100 text-blue-800';
      case 'volunteer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'claimed': return 'bg-yellow-100 text-yellow-800';
      case 'available': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid #dc2626',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
          Welcome back! Here's what's happening with your platform today.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Total Users */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Total Users</div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiUsers size={20} style={{ color: '#d97706' }} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            {stats.totalUsers}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <FiTrendingUp size={16} style={{ color: '#16a34a' }} />
            <span>+12% from last month</span>
          </div>
        </div>

        {/* Total Donations */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Total Donations</div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiPackage size={20} style={{ color: '#16a34a' }} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            {stats.totalDonations}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <FiTrendingUp size={16} style={{ color: '#16a34a' }} />
            <span>+8% from last month</span>
          </div>
        </div>

        {/* Completed Deliveries */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Completed Deliveries</div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: '#dbeafe',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiTruck size={20} style={{ color: '#2563eb' }} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            {stats.completedDeliveries}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <FiTrendingUp size={16} style={{ color: '#16a34a' }} />
            <span>+15% from last month</span>
          </div>
        </div>

        {/* Total Impact */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Total Impact</div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: '#f3e8ff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiDollarSign size={20} style={{ color: '#9333ea' }} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            {stats.totalImpact}+
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Meals provided to community</div>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          color: '#92400e',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <FiAlertTriangle size={20} />
          <div style={{ flex: 1 }}>
            <strong>{stats.pendingApprovals} user(s)</strong> need verification approval.
          </div>
          <Link 
            href="/dashboard/admin/users" 
            style={{
              backgroundColor: '#d97706',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Review Now
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Recent Users */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Recent Users
            </h3>
            <Link 
              href="/dashboard/admin/users"
              style={{
                color: '#dc2626',
                fontSize: '0.875rem',
                fontWeight: '500',
                textDecoration: 'none'
              }}
            >
              View All
            </Link>
          </div>
          <div style={{ padding: '1rem' }}>
            {recentUsers.map((user, index) => (
              <div 
                key={user.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : 'transparent',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    backgroundColor: '#dc2626',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', color: '#1f2937' }}>
                      {user.displayName || 'Unknown User'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    ...(getRoleColor(user.role) === 'bg-red-100 text-red-800' ? { backgroundColor: '#fef2f2', color: '#dc2626' } :
                        getRoleColor(user.role) === 'bg-green-100 text-green-800' ? { backgroundColor: '#f0fdf4', color: '#166534' } :
                        getRoleColor(user.role) === 'bg-blue-100 text-blue-800' ? { backgroundColor: '#eff6ff', color: '#1e40af' } :
                        { backgroundColor: '#f3f4f6', color: '#374151' })
                  }}>
                    {user.role}
                  </span>
                  {!user.isVerified && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#ef4444',
                      borderRadius: '50%'
                    }}></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Donations */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Recent Donations
            </h3>
            <Link 
              href="/dashboard/admin/donations"
              style={{
                color: '#dc2626',
                fontSize: '0.875rem',
                fontWeight: '500',
                textDecoration: 'none'
              }}
            >
              View All
            </Link>
          </div>
          <div style={{ padding: '1rem' }}>
            {recentDonations.map((donation, index) => (
              <div 
                key={donation.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : 'transparent',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiPackage size={14} style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', color: '#1f2937', fontSize: '0.875rem' }}>
                      {donation.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>by {donation.donorName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    ...(getStatusColor(donation.status) === 'bg-green-100 text-green-800' ? { backgroundColor: '#f0fdf4', color: '#166534' } :
                        getStatusColor(donation.status) === 'bg-yellow-100 text-yellow-800' ? { backgroundColor: '#fef3c7', color: '#92400e' } :
                        getStatusColor(donation.status) === 'bg-blue-100 text-blue-800' ? { backgroundColor: '#eff6ff', color: '#1e40af' } :
                        { backgroundColor: '#f3f4f6', color: '#374151' })
                  }}>
                    {donation.status}
                  </span>
                  <Link 
                    href={`/dashboard/admin/donations/${donation.id}`}
                    style={{
                      padding: '0.25rem',
                      borderRadius: '4px',
                      color: '#6b7280',
                      textDecoration: 'none'
                    }}
                  >
                    <FiEye size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link 
            href="/dashboard/admin/users"
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <FiUsers size={24} style={{ color: '#dc2626', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: '600', color: '#111827' }}>Manage Users</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>View and manage all users</div>
          </Link>

          <Link 
            href="/dashboard/admin/analytics"
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <FiBarChart2 size={24} style={{ color: '#2563eb', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: '600', color: '#111827' }}>View Analytics</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Platform performance insights</div>
          </Link>

          <Link 
            href="/dashboard/admin/ledger"
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <FiDatabase size={24} style={{ color: '#16a34a', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: '600', color: '#111827' }}>Blockchain Ledger</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Transparency and audit trail</div>
          </Link>

          <Link 
            href="/dashboard/admin/system"
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <FiSettings size={24} style={{ color: '#6b7280', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: '600', color: '#111827' }}>System Settings</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Configure platform settings</div>
          </Link>
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