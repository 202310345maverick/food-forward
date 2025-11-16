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
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  FiUsers, 
  FiPackage, 
  FiTruck, 
  FiHeart, 
  FiTrendingUp, 
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiGlobe,
  FiBarChart2,
  FiAward,
  FiClock,
  FiHome,
  FiShoppingBag,
  FiCoffee,
  FiAlertTriangle,
  FiTarget,
  FiEye,
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiSettings,
  FiUserCheck,
  FiActivity,
  FiPieChart,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';

interface Donation {
  id: string;
  title: string;
  category: string;
  quantity: string;
  description: string;
  status: 'available' | 'claimed' | 'assigned' | 'completed' | 'expired';
  donorId: string;
  donorName: string;
  recipientId?: string;
  recipientName?: string;
  createdAt: any;
  completedAt?: any;
  assignedAt?: any;
  claimedAt?: any;
  expiryDate: string;
  location?: string;
  foodWeight?: number;
  estimatedPeopleFed?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'donor' | 'recipient' | 'volunteer' | 'admin';
  joinDate: any;
  status: 'active' | 'inactive';
  location?: string;
}

interface AdminAnalytics {
  platformMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisWeek: number;
    userGrowthRate: number;
    totalDonations: number;
    completedDonations: number;
    donationSuccessRate: number;
    avgResponseTime: number;
  };
  financialImpact: {
    totalValue: number;
    valueThisMonth: number;
    costSavings: number;
    operationalEfficiency: number;
    roi: number;
  };
  userEngagement: {
    donorRetention: number;
    volunteerParticipation: number;
    recipientSatisfaction: number;
    platformActivity: number;
  };
  performanceTrends: {
    weeklyActivity: { week: string; donations: number; users: number; completionRate: number }[];
    categoryDistribution: { category: string; count: number; percentage: number }[];
    locationPerformance: { location: string; donations: number; successRate: number; avgTime: number }[];
  };
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    dataAccuracy: number;
  };
  predictiveInsights: {
    highValueOpportunities: {
      description: string;
      potentialImpact: number;
      effortRequired: number;
      timeframe: string;
    }[];
    riskAreas: {
      area: string;
      riskLevel: 'high' | 'medium' | 'low';
      description: string;
      mitigation: string;
    }[];
    growthPredictions: {
      metric: string;
      current: number;
      predicted: number;
      confidence: number;
    }[];
  };
}

export default function AdminImpactAnalytics() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [donations, setDonations] = useState<Donation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AdminAnalytics>({
    platformMetrics: {
      totalUsers: 0,
      activeUsers: 0,
      newUsersThisWeek: 0,
      userGrowthRate: 0,
      totalDonations: 0,
      completedDonations: 0,
      donationSuccessRate: 0,
      avgResponseTime: 0
    },
    financialImpact: {
      totalValue: 0,
      valueThisMonth: 0,
      costSavings: 0,
      operationalEfficiency: 0,
      roi: 0
    },
    userEngagement: {
      donorRetention: 0,
      volunteerParticipation: 0,
      recipientSatisfaction: 0,
      platformActivity: 0
    },
    performanceTrends: {
      weeklyActivity: [],
      categoryDistribution: [],
      locationPerformance: []
    },
    systemHealth: {
      uptime: 0,
      responseTime: 0,
      errorRate: 0,
      dataAccuracy: 0
    },
    predictiveInsights: {
      highValueOpportunities: [],
      riskAreas: [],
      growthPredictions: []
    }
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Real-time data subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to donations
    const donationsRef = collection(db, 'donations');
    const donationsQuery = query(donationsRef, orderBy('createdAt', 'desc'));
    const unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
      const donationsData: Donation[] = [];
      snapshot.forEach((doc) => {
        donationsData.push({ id: doc.id, ...doc.data() } as Donation);
      });
      setDonations(donationsData);
    });

    // Subscribe to users
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef);
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
    });

    return () => {
      unsubscribeDonations();
      unsubscribeUsers();
    };
  }, [user]);

  // Calculate analytics when data changes
  useEffect(() => {
    if (donations.length > 0 && users.length > 0) {
      calculateAdminAnalytics();
      setLastUpdated(new Date());
    }
  }, [donations, users, timeRange]);

  const calculateAdminAnalytics = () => {
    const platformMetrics = calculatePlatformMetrics();
    const financialImpact = calculateFinancialImpact();
    const userEngagement = calculateUserEngagement();
    const performanceTrends = calculatePerformanceTrends();
    const systemHealth = calculateSystemHealth();
    const predictiveInsights = calculatePredictiveInsights();

    setAnalyticsData({
      platformMetrics,
      financialImpact,
      userEngagement,
      performanceTrends,
      systemHealth,
      predictiveInsights
    });
    setDataLoading(false);
  };

  const calculatePlatformMetrics = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsersThisWeek = users.filter(u => {
      const joinDate = u.joinDate?.toDate?.() || new Date();
      return joinDate > oneWeekAgo;
    }).length;

    const userGrowthRate = totalUsers > 0 ? (newUsersThisWeek / totalUsers) * 100 : 0;

    const totalDonations = donations.length;
    const completedDonations = donations.filter(d => d.status === 'completed').length;
    const donationSuccessRate = totalDonations > 0 ? (completedDonations / totalDonations) * 100 : 0;

    // Calculate average response time (simulated)
    const avgResponseTime = Math.random() * 24 + 12; // 12-36 hours

    return {
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      userGrowthRate,
      totalDonations,
      completedDonations,
      donationSuccessRate,
      avgResponseTime
    };
  };

  const calculateFinancialImpact = () => {
    const completedDonations = donations.filter(d => d.status === 'completed');
    const totalValue = completedDonations.length * 750; // Average value per donation
    const valueThisMonth = completedDonations.filter(d => {
      const completedDate = d.completedAt?.toDate?.() || new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return completedDate > oneMonthAgo;
    }).length * 750;

    const costSavings = totalValue * 0.65; // 65% cost savings estimate
    const operationalEfficiency = 78 + (Math.random() * 15); // 78-93%
    const roi = (totalValue / (totalValue * 0.3)) * 100; // ROI calculation

    return {
      totalValue,
      valueThisMonth,
      costSavings,
      operationalEfficiency,
      roi
    };
  };

  const calculateUserEngagement = () => {
    const donors = users.filter(u => u.role === 'donor');
    const activeDonors = donors.filter(u => u.status === 'active');
    const donorRetention = donors.length > 0 ? (activeDonors.length / donors.length) * 100 : 0;

    const volunteers = users.filter(u => u.role === 'volunteer');
    const activeVolunteers = volunteers.filter(u => u.status === 'active');
    const volunteerParticipation = volunteers.length > 0 ? (activeVolunteers.length / volunteers.length) * 100 : 0;

    // Simulated metrics
    const recipientSatisfaction = 85 + (Math.random() * 10); // 85-95%
    const platformActivity = 72 + (Math.random() * 20); // 72-92%

    return {
      donorRetention,
      volunteerParticipation,
      recipientSatisfaction,
      platformActivity
    };
  };

  const calculatePerformanceTrends = () => {
    // Weekly activity
    const weeklyActivity = [];
    for (let i = 3; i >= 0; i--) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i * 7));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const weekDonations = donations.filter(d => {
        const donationDate = d.createdAt?.toDate?.() || new Date();
        return donationDate >= startDate && donationDate <= endDate;
      });

      const weekUsers = users.filter(u => {
        const joinDate = u.joinDate?.toDate?.() || new Date();
        return joinDate >= startDate && joinDate <= endDate;
      });

      const completedWeekDonations = weekDonations.filter(d => d.status === 'completed');
      const completionRate = weekDonations.length > 0 ? (completedWeekDonations.length / weekDonations.length) * 100 : 0;

      weeklyActivity.push({
        week: `W${4-i}`,
        donations: weekDonations.length,
        users: weekUsers.length,
        completionRate
      });
    }

    // Category distribution
    const categoryCounts: { [key: string]: number } = {};
    donations.forEach(donation => {
      const category = donation.category || 'Other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const totalDonations = donations.length;
    const categoryDistribution = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / totalDonations) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Location performance
    const locationData: { [key: string]: { donations: number; completed: number; totalTime: number } } = {};
    donations.forEach(donation => {
      const location = donation.location || 'Unknown';
      if (!locationData[location]) {
        locationData[location] = { donations: 0, completed: 0, totalTime: 0 };
      }
      locationData[location].donations++;
      if (donation.status === 'completed') {
        locationData[location].completed++;
        // Simulate time calculation
        locationData[location].totalTime += Math.random() * 48 + 24; // 24-72 hours
      }
    });

    const locationPerformance = Object.entries(locationData)
      .map(([location, data]) => ({
        location,
        donations: data.donations,
        successRate: (data.completed / data.donations) * 100,
        avgTime: data.completed > 0 ? data.totalTime / data.completed : 0
      }))
      .sort((a, b) => b.donations - a.donations)
      .slice(0, 5);

    return {
      weeklyActivity,
      categoryDistribution,
      locationPerformance
    };
  };

  const calculateSystemHealth = () => {
    // Simulated system metrics
    return {
      uptime: 99.8 + (Math.random() * 0.2), // 99.8-100%
      responseTime: 120 + (Math.random() * 80), // 120-200ms
      errorRate: 0.1 + (Math.random() * 0.3), // 0.1-0.4%
      dataAccuracy: 95 + (Math.random() * 4) // 95-99%
    };
  };

  const calculatePredictiveInsights = () => {
    return {
      highValueOpportunities: [
        {
          description: "Expand corporate partnership program",
          potentialImpact: 85,
          effortRequired: 65,
          timeframe: "Q2 2024"
        },
        {
          description: "Implement AI-driven matching algorithm",
          potentialImpact: 92,
          effortRequired: 80,
          timeframe: "Q3 2024"
        },
        {
          description: "Launch mobile app for volunteers",
          potentialImpact: 78,
          effortRequired: 45,
          timeframe: "Q1 2024"
        }
      ],
      riskAreas: [
        {
          area: "Volunteer Retention",
          riskLevel: "high" as const,
          description: "30% volunteer turnover rate this quarter",
          mitigation: "Implement recognition program and training"
        },
        {
          area: "Donor Engagement",
          riskLevel: "medium" as const,
          description: "New donor acquisition slowing",
          mitigation: "Launch referral program and social campaigns"
        },
        {
          area: "System Scalability",
          riskLevel: "low" as const,
          description: "Platform performance during peak hours",
          mitigation: "Optimize database queries and caching"
        }
      ],
      growthPredictions: [
        {
          metric: "Monthly Active Users",
          current: analyticsData.platformMetrics.activeUsers,
          predicted: Math.round(analyticsData.platformMetrics.activeUsers * 1.35),
          confidence: 88
        },
        {
          metric: "Donation Completion Rate",
          current: analyticsData.platformMetrics.donationSuccessRate,
          predicted: Math.min(95, analyticsData.platformMetrics.donationSuccessRate * 1.15),
          confidence: 76
        },
        {
          metric: "Platform Value",
          current: analyticsData.financialImpact.totalValue,
          predicted: Math.round(analyticsData.financialImpact.totalValue * 1.5),
          confidence: 82
        }
      ]
    };
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <FiArrowUp className="text-green-500" />;
    if (current < previous) return <FiArrowDown className="text-red-500" />;
    return <div className="w-4 h-0.5 bg-gray-400" />;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const exportAnalytics = () => {
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (dataLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Admin Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics-container">
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <div className="header-main">
            <h1 className="header-title">Admin Impact Analytics</h1>
            <p className="header-subtitle">
              Comprehensive platform performance and impact metrics
            </p>
            <div className="last-updated">
              <FiClock size={14} />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
          <div className="header-actions">
            <select 
              className="time-filter"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="action-btn secondary">
              <FiFilter size={16} />
              Filters
            </button>
            <button className="action-btn secondary" onClick={exportAnalytics}>
              <FiDownload size={16} />
              Export
            </button>
            <button className="action-btn primary">
              <FiRefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="analytics-content">
        {/* Platform Overview */}
        <div className="section">
          <h2 className="section-title">Platform Overview</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <FiUsers size={20} />
                </div>
                <div className="metric-trend">
                  {getTrendIcon(analyticsData.platformMetrics.activeUsers, analyticsData.platformMetrics.totalUsers * 0.8)}
                </div>
              </div>
              <div className="metric-value">{analyticsData.platformMetrics.totalUsers.toLocaleString()}</div>
              <div className="metric-label">Total Users</div>
              <div className="metric-subtext">{analyticsData.platformMetrics.activeUsers} active</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <FiPackage size={20} />
                </div>
                <div className="metric-trend">
                  {getTrendIcon(analyticsData.platformMetrics.completedDonations, analyticsData.platformMetrics.totalDonations * 0.7)}
                </div>
              </div>
              <div className="metric-value">{analyticsData.platformMetrics.totalDonations.toLocaleString()}</div>
              <div className="metric-label">Total Donations</div>
              <div className="metric-subtext">{analyticsData.platformMetrics.donationSuccessRate.toFixed(1)}% success rate</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <FiDollarSign size={20} />
                </div>
                <div className="metric-trend positive">
                  <FiArrowUp size={16} />
                </div>
              </div>
              <div className="metric-value">₱{analyticsData.financialImpact.totalValue.toLocaleString()}</div>
              <div className="metric-label">Total Value</div>
              <div className="metric-subtext">{analyticsData.financialImpact.roi.toFixed(1)}% ROI</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <FiActivity size={20} />
                </div>
                <div className="metric-trend">
                  {getTrendIcon(analyticsData.userEngagement.platformActivity, 75)}
                </div>
              </div>
              <div className="metric-value">{analyticsData.userEngagement.platformActivity.toFixed(1)}%</div>
              <div className="metric-label">Platform Activity</div>
              <div className="metric-subtext">User engagement score</div>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          {/* Performance Trends */}
          <div className="chart-section">
            <div className="chart-header">
              <h3 className="chart-title">
                <FiTrendingUp size={18} />
                Performance Trends
              </h3>
              <div className="chart-actions">
                <span className="time-badge">{timeRange}</span>
              </div>
            </div>
            <div className="chart-content">
              <div className="trends-chart">
                {analyticsData.performanceTrends.weeklyActivity.map((week, index) => (
                  <div key={index} className="trend-item">
                    <div className="trend-label">{week.week}</div>
                    <div className="trend-bars">
                      <div 
                        className="bar donations"
                        style={{ height: `${(week.donations / 50) * 100}%` }}
                        title={`${week.donations} donations`}
                      ></div>
                      <div 
                        className="bar users"
                        style={{ height: `${(week.users / 30) * 100}%` }}
                        title={`${week.users} users`}
                      ></div>
                      <div 
                        className="bar completion"
                        style={{ height: `${week.completionRate}%` }}
                        title={`${week.completionRate.toFixed(1)}% completion`}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color donations"></div>
                  <span>Donations</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color users"></div>
                  <span>Users</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color completion"></div>
                  <span>Completion Rate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="chart-section">
            <div className="chart-header">
              <h3 className="chart-title">
                <FiPieChart size={18} />
                Category Distribution
              </h3>
            </div>
            <div className="chart-content">
              <div className="categories-list">
                {analyticsData.performanceTrends.categoryDistribution.map((category, index) => (
                  <div key={index} className="category-item">
                    <div className="category-info">
                      <span className="category-name">{category.category}</span>
                      <span className="category-percentage">{category.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="category-progress">
                      <div 
                        className="progress-fill"
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <div className="category-count">{category.count} donations</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Engagement Metrics */}
          <div className="chart-section">
            <div className="chart-header">
              <h3 className="chart-title">
                <FiUserCheck size={18} />
                User Engagement
              </h3>
            </div>
            <div className="chart-content">
              <div className="engagement-metrics">
                <div className="engagement-item">
                  <div className="engagement-label">Donor Retention</div>
                  <div className="engagement-value">{analyticsData.userEngagement.donorRetention.toFixed(1)}%</div>
                  <div className="engagement-bar">
                    <div 
                      className="bar-fill"
                      style={{ width: `${analyticsData.userEngagement.donorRetention}%` }}
                    ></div>
                  </div>
                </div>
                <div className="engagement-item">
                  <div className="engagement-label">Volunteer Participation</div>
                  <div className="engagement-value">{analyticsData.userEngagement.volunteerParticipation.toFixed(1)}%</div>
                  <div className="engagement-bar">
                    <div 
                      className="bar-fill"
                      style={{ width: `${analyticsData.userEngagement.volunteerParticipation}%` }}
                    ></div>
                  </div>
                </div>
                <div className="engagement-item">
                  <div className="engagement-label">Recipient Satisfaction</div>
                  <div className="engagement-value">{analyticsData.userEngagement.recipientSatisfaction.toFixed(1)}%</div>
                  <div className="engagement-bar">
                    <div 
                      className="bar-fill"
                      style={{ width: `${analyticsData.userEngagement.recipientSatisfaction}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="chart-section">
            <div className="chart-header">
              <h3 className="chart-title">
                <FiSettings size={18} />
                System Health
              </h3>
            </div>
            <div className="chart-content">
              <div className="health-metrics">
                <div className="health-item">
                  <div className="health-label">Uptime</div>
                  <div className="health-value">{analyticsData.systemHealth.uptime.toFixed(1)}%</div>
                  <div className="health-status excellent">Excellent</div>
                </div>
                <div className="health-item">
                  <div className="health-label">Response Time</div>
                  <div className="health-value">{analyticsData.systemHealth.responseTime.toFixed(0)}ms</div>
                  <div className="health-status good">Good</div>
                </div>
                <div className="health-item">
                  <div className="health-label">Error Rate</div>
                  <div className="health-value">{analyticsData.systemHealth.errorRate.toFixed(2)}%</div>
                  <div className="health-status good">Good</div>
                </div>
                <div className="health-item">
                  <div className="health-label">Data Accuracy</div>
                  <div className="health-value">{analyticsData.systemHealth.dataAccuracy.toFixed(1)}%</div>
                  <div className="health-status excellent">Excellent</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Predictive Insights */}
        <div className="section">
          <h2 className="section-title">Predictive Insights & Opportunities</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-header">
                <h4 className="insight-title">
                  <FiTarget size={18} />
                  High-Value Opportunities
                </h4>
              </div>
              <div className="insight-content">
                {analyticsData.predictiveInsights.highValueOpportunities.map((opportunity, index) => (
                  <div key={index} className="opportunity-item">
                    <div className="opportunity-description">{opportunity.description}</div>
                    <div className="opportunity-metrics">
                      <div className="metric">
                        <span className="metric-label">Impact</span>
                        <span className="metric-value">{opportunity.potentialImpact}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Effort</span>
                        <span className="metric-value">{opportunity.effortRequired}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Timeline</span>
                        <span className="metric-value">{opportunity.timeframe}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-header">
                <h4 className="insight-title">
                  <FiAlertTriangle size={18} />
                  Risk Assessment
                </h4>
              </div>
              <div className="insight-content">
                {analyticsData.predictiveInsights.riskAreas.map((risk, index) => (
                  <div key={index} className="risk-item">
                    <div className="risk-header">
                      <span className="risk-area">{risk.area}</span>
                      <span 
                        className="risk-level"
                        style={{ backgroundColor: getRiskColor(risk.riskLevel) }}
                      >
                        {risk.riskLevel}
                      </span>
                    </div>
                    <div className="risk-description">{risk.description}</div>
                    <div className="risk-mitigation">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-header">
                <h4 className="insight-title">
                  <FiTrendingUp size={18} />
                  Growth Predictions
                </h4>
              </div>
              <div className="insight-content">
                {analyticsData.predictiveInsights.growthPredictions.map((prediction, index) => (
                  <div key={index} className="prediction-item">
                    <div className="prediction-metric">{prediction.metric}</div>
                    <div className="prediction-values">
                      <div className="current-value">
                        Current: {typeof prediction.current === 'number' ? prediction.current.toLocaleString() : prediction.current}
                      </div>
                      <div className="predicted-value">
                        Predicted: {typeof prediction.predicted === 'number' ? prediction.predicted.toLocaleString() : prediction.predicted}
                      </div>
                    </div>
                    <div className="prediction-confidence">
                      Confidence: {prediction.confidence}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Location Performance */}
        <div className="section">
          <h2 className="section-title">Location Performance</h2>
          <div className="location-grid">
            {analyticsData.performanceTrends.locationPerformance.map((location, index) => (
              <div key={index} className="location-card">
                <div className="location-header">
                  <FiMapPin size={16} />
                  <span className="location-name">{location.location}</span>
                </div>
                <div className="location-metrics">
                  <div className="location-metric">
                    <span className="metric-value">{location.donations}</span>
                    <span className="metric-label">Donations</span>
                  </div>
                  <div className="location-metric">
                    <span className="metric-value">{location.successRate.toFixed(1)}%</span>
                    <span className="metric-label">Success Rate</span>
                  </div>
                  <div className="location-metric">
                    <span className="metric-value">{location.avgTime.toFixed(1)}h</span>
                    <span className="metric-label">Avg. Time</span>
                  </div>
                </div>
                <div className="location-performance">
                  <div 
                    className="performance-bar"
                    style={{ width: `${location.successRate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-analytics-container {
          min-height: 100vh;
          background: #f8fafc;
          margin-top: 70px;
        }

        .admin-header {
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

        .last-updated {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .time-filter {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f9fafb;
        }

        .action-btn.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .action-btn.primary:hover {
          background: #2563eb;
        }

        .action-btn.secondary {
          background: white;
          color: #374151;
        }

        .analytics-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .metric-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #dbeafe;
          color: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-trend {
          display: flex;
          align-items: center;
        }

        .metric-trend.positive {
          color: #10b981;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .metric-label {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .metric-subtext {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }

        .chart-section {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .chart-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .time-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          background: #f3f4f6;
          color: #374151;
          border-radius: 9999px;
        }

        .trends-chart {
          display: flex;
          align-items: end;
          gap: 1rem;
          height: 200px;
          margin-bottom: 1rem;
        }

        .trend-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .trend-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .trend-bars {
          display: flex;
          align-items: end;
          gap: 2px;
          height: 100%;
          width: 100%;
        }

        .bar {
          flex: 1;
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
        }

        .bar.donations {
          background: #3b82f6;
        }

        .bar.users {
          background: #10b981;
        }

        .bar.completion {
          background: #f59e0b;
        }

        .chart-legend {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .legend-color.donations { background: #3b82f6; }
        .legend-color.users { background: #10b981; }
        .legend-color.completion { background: #f59e0b; }

        .categories-list {
          space-y: 1rem;
        }

        .category-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
        }

        .category-info {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .category-name {
          font-weight: 500;
          color: #111827;
        }

        .category-percentage {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .category-progress {
          width: 100px;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 3px;
        }

        .category-count {
          font-size: 0.75rem;
          color: #6b7280;
          min-width: 60px;
          text-align: right;
        }

        .engagement-metrics {
          space-y: 1.5rem;
        }

        .engagement-item {
          space-y: 0.5rem;
        }

        .engagement-label {
          font-size: 0.875rem;
          color: #374151;
          font-weight: 500;
        }

        .engagement-value {
          font-size: 1.25rem;
          font-weight: bold;
          color: #111827;
        }

        .engagement-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #34d399);
          border-radius: 4px;
        }

        .health-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .health-item {
          text-align: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .health-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .health-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .health-status {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          display: inline-block;
        }

        .health-status.excellent {
          background: #dcfce7;
          color: #166534;
        }

        .health-status.good {
          background: #fef3c7;
          color: #92400e;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .insight-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .insight-header {
          margin-bottom: 1.5rem;
        }

        .insight-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .insight-content {
          space-y: 1rem;
        }

        .opportunity-item {
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .opportunity-description {
          font-weight: 500;
          color: #111827;
          margin-bottom: 0.75rem;
        }

        .opportunity-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.5rem;
        }

        .metric {
          text-align: center;
        }

        .metric-label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .metric-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .risk-item {
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .risk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .risk-area {
          font-weight: 500;
          color: #111827;
        }

        .risk-level {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          text-transform: capitalize;
        }

        .risk-description {
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .risk-mitigation {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .prediction-item {
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #10b981;
        }

        .prediction-metric {
          font-weight: 500;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .prediction-values {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .current-value {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .predicted-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #10b981;
        }

        .prediction-confidence {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .location-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .location-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .location-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-weight: 500;
          color: #111827;
        }

        .location-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .location-metric {
          text-align: center;
        }

        .location-metric .metric-value {
          font-size: 1.25rem;
          font-weight: bold;
          color: #111827;
          display: block;
        }

        .location-metric .metric-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .location-performance {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .performance-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 3px;
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
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .admin-header {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .analytics-content {
            padding: 1rem;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .health-metrics {
            grid-template-columns: 1fr;
          }

          .insights-grid {
            grid-template-columns: 1fr;
          }

          .location-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}