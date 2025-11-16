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
  Timestamp
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
  FiMenu,
  FiAlertTriangle,
  FiTarget,
  FiEye,
  FiRefreshCw
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
}

interface VolunteerTask {
  id: string;
  status: 'pending' | 'assigned' | 'completed';
  volunteerId?: string;
  volunteerName?: string;
  items: string;
  createdAt: any;
  completedAt?: any;
  distance?: number;
}

interface ImpactData {
  totalDonations: number;
  completedDonations: number;
  totalVolunteerTasks: number;
  completedVolunteerTasks: number;
  uniqueDonors: number;
  uniqueRecipients: number;
  estimatedFoodSaved: number;
  estimatedCO2Reduced: number;
  estimatedMealsProvided: number;
  estimatedMoneySaved: number;
  weeklyDonations: { week: string; count: number }[];
  communityLocations: { location: string; count: number }[];
  topCategories: { category: string; count: number }[];
  predictiveAnalytics: {
    hungerHotspots: {
      location: string;
      riskLevel: 'high' | 'medium' | 'low';
      expectedDemand: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }[];
    surplusTrends: {
      category: string;
      expectedIncrease: number;
      confidence: number;
    }[];
    recommendations: string[];
  };
}

export default function ImpactDashboard() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  
  const [donations, setDonations] = useState<Donation[]>([]);
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>([]);
  const [impactData, setImpactData] = useState<ImpactData>({
    totalDonations: 0,
    completedDonations: 0,
    totalVolunteerTasks: 0,
    completedVolunteerTasks: 0,
    uniqueDonors: 0,
    uniqueRecipients: 0,
    estimatedFoodSaved: 0,
    estimatedCO2Reduced: 0,
    estimatedMealsProvided: 0,
    estimatedMoneySaved: 0,
    weeklyDonations: [],
    communityLocations: [],
    topCategories: [],
    predictiveAnalytics: {
      hungerHotspots: [],
      surplusTrends: [],
      recommendations: []
    }
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'analytics'>('overview');

  // Mock predictive data
  const mockPredictiveData = {
    hungerHotspots: [
      {
        location: "Barretto Area",
        riskLevel: "high" as const,
        expectedDemand: 245,
        trend: "increasing" as const
      },
      {
        location: "Gordon Heights",
        riskLevel: "medium" as const,
        expectedDemand: 180,
        trend: "increasing" as const
      },
      {
        location: "New Cabalan",
        riskLevel: "medium" as const,
        expectedDemand: 156,
        trend: "stable" as const
      },
      {
        location: "East Bajac-Bajac",
        riskLevel: "low" as const,
        expectedDemand: 120,
        trend: "decreasing" as const
      }
    ],
    surplusTrends: [
      {
        category: "Bakery Items",
        expectedIncrease: 25,
        confidence: 85
      },
      {
        category: "Fresh Produce",
        expectedIncrease: 18,
        confidence: 78
      },
      {
        category: "Prepared Meals",
        expectedIncrease: 12,
        confidence: 72
      },
      {
        category: "Dairy Products",
        expectedIncrease: 8,
        confidence: 65
      }
    ],
    recommendations: [
      "Increase volunteer capacity in Barretto area by 15%",
      "Coordinate with local bakeries for weekend surplus collection",
      "Pre-allocate storage space for expected produce donations",
      "Schedule additional pickups in Gordon Heights this week",
      "Partner with restaurants for consistent prepared meals donations",
      "Optimize delivery routes to cover high-demand areas efficiently"
    ]
  };

  // Check screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      console.log('Starting data fetch for impact dashboard...');
      
      // Fetch all donations (without composite index)
      const donationsRef = collection(db, 'donations');
      const allDonationsQuery = query(donationsRef, orderBy('createdAt', 'desc'));
      const allDonationsSnapshot = await getDocs(allDonationsQuery);
      
      const allDonationsData: Donation[] = [];
      allDonationsSnapshot.forEach((doc) => {
        allDonationsData.push({ id: doc.id, ...doc.data() } as Donation);
      });

      // Filter completed donations client-side instead of using composite query
      const completedDonationsData = allDonationsData
        .filter(donation => donation.status === 'completed')
        .sort((a, b) => {
          // Sort by completedAt descending client-side
          const aTime = a.completedAt?.toDate?.() || new Date(0);
          const bTime = b.completedAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });

      console.log('Total donations:', allDonationsData.length);
      console.log('Completed donations:', completedDonationsData.length);
      console.log('Donation statuses:', [...new Set(allDonationsData.map(d => d.status))]);

      setDonations(allDonationsData);

      // Fetch all volunteer tasks
      const tasksRef = collection(db, 'volunteerTasks');
      const allTasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));
      const allTasksSnapshot = await getDocs(allTasksQuery);
      
      const allTasksData: VolunteerTask[] = [];
      allTasksSnapshot.forEach((doc) => {
        allTasksData.push({ id: doc.id, ...doc.data() } as VolunteerTask);
      });

      // Filter completed volunteer tasks client-side
      const completedTasksData = allTasksData
        .filter(task => task.status === 'completed')
        .sort((a, b) => {
          // Sort by completedAt descending client-side
          const aTime = a.completedAt?.toDate?.() || new Date(0);
          const bTime = b.completedAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });

      console.log('Total volunteer tasks:', allTasksData.length);
      console.log('Completed volunteer tasks:', completedTasksData.length);

      setVolunteerTasks(allTasksData);

      // Calculate impact metrics with proper completed data
      calculateImpactMetrics(allDonationsData, allTasksData, completedDonationsData, completedTasksData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const calculateImpactMetrics = (
    allDonations: Donation[], 
    allVolunteerTasks: VolunteerTask[],
    completedDonations: Donation[],
    completedVolunteerTasks: VolunteerTask[]
  ) => {
    const totalDonations = allDonations.length;
    const completedDonationsCount = completedDonations.length;
    const totalVolunteerTasks = allVolunteerTasks.length;
    const completedVolunteerTasksCount = completedVolunteerTasks.length;

    // Calculate unique donors and recipients from COMPLETED donations only
    const uniqueDonors = [...new Set(completedDonations.map(d => d.donorId))].length;
    const uniqueRecipients = [...new Set(completedDonations.filter(d => d.recipientId).map(d => d.recipientId))].length;

    // Calculate environmental impact based on completed donations
    const estimatedFoodSaved = completedDonationsCount * 5.5; // kg per completed donation
    const estimatedCO2Reduced = completedDonationsCount * 2.8; // kg CO2 per completed donation
    const estimatedMealsProvided = completedDonationsCount * 12; // meals per completed donation
    const estimatedMoneySaved = completedDonationsCount * 650; // PHP value per completed donation

    // Calculate weekly donations for the last 8 weeks
    const weeklyDonations = calculateWeeklyDonations(allDonations);
    
    // Calculate community locations
    const communityLocations = calculateCommunityLocations(allDonations);
    
    // Calculate top categories
    const topCategories = calculateTopCategories(allDonations);

    console.log('Impact Metrics Calculated:', {
      totalDonations,
      completedDonations: completedDonationsCount,
      totalVolunteerTasks,
      completedVolunteerTasks: completedVolunteerTasksCount,
      uniqueDonors,
      uniqueRecipients,
      estimatedFoodSaved,
      estimatedCO2Reduced,
      estimatedMealsProvided,
      estimatedMoneySaved
    });

    setImpactData({
      totalDonations,
      completedDonations: completedDonationsCount,
      totalVolunteerTasks,
      completedVolunteerTasks: completedVolunteerTasksCount,
      uniqueDonors,
      uniqueRecipients,
      estimatedFoodSaved,
      estimatedCO2Reduced,
      estimatedMealsProvided,
      estimatedMoneySaved,
      weeklyDonations,
      communityLocations,
      topCategories,
      predictiveAnalytics: mockPredictiveData
    });
  };

  const calculateWeeklyDonations = (donations: Donation[]) => {
    const weeks: { [key: string]: number } = {};
    const now = new Date();
    
    // Initialize last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);
      const weekKey = `Week ${Math.ceil((date.getDate()) / 7)}`;
      weeks[weekKey] = 0;
    }

    // Count donations per week
    donations.forEach(donation => {
      if (donation.createdAt) {
        const date = donation.createdAt.toDate ? donation.createdAt.toDate() : new Date(donation.createdAt);
        const weekNumber = Math.ceil(date.getDate() / 7);
        const weekKey = `Week ${weekNumber}`;
        if (weeks[weekKey] !== undefined) {
          weeks[weekKey]++;
        }
      }
    });

    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  };

  const calculateCommunityLocations = (donations: Donation[]) => {
    const locations: { [key: string]: number } = {};
    
    donations.forEach(donation => {
      const location = donation.location || 'Olongapo City';
      locations[location] = (locations[location] || 0) + 1;
    });

    return Object.entries(locations)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateTopCategories = (donations: Donation[]) => {
    const categories: { [key: string]: number } = {};
    
    donations.forEach(donation => {
      const category = donation.category || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getBarHeight = (value: number, maxValue: number) => {
    const maxHeight = 120; // Maximum height in pixels
    return (value / maxValue) * maxHeight;
  };

  const getLocationIcon = (index: number) => {
    const icons = [FiHome, FiMapPin, FiShoppingBag, FiCoffee, FiUsers];
    const IconComponent = icons[index] || FiMapPin;
    return <IconComponent size={14} />;
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (dataLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading impact dashboard...</p>
        </div>

        <style jsx>{`
          .loading-container {
            min-height: calc(100vh - 70px);
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f8fafc;
            margin-top: 70px;
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
            margin: 0 auto;
          }
          .loading-text {
            color: #6b7280;
            margin-top: 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const maxWeeklyDonations = Math.max(...impactData.weeklyDonations.map(w => w.count), 1);
  const maxCategoryCount = Math.max(...impactData.topCategories.map(c => c.count), 1);

  return (
    <div className="impact-dashboard-container">
      {/* Dashboard Header with Navigation */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-main">
            <h1 className="header-title">Impact Dashboard</h1>
            <p className="header-subtitle">
              Monitoring community impact and predictive analytics in Olongapo City
            </p>
          </div>
          <div className="header-actions">
            <button 
              className={`view-toggle ${activeView === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveView('overview')}
            >
              <FiEye className="w-4 h-4" />
              Overview
            </button>
            <button 
              className={`view-toggle ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveView('analytics')}
            >
              <FiTrendingUp className="w-4 h-4" />
              Analytics
            </button>
            <button className="refresh-btn" onClick={fetchData}>
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Main Content */}
      <div className="dashboard-scroll-container">
        <div className="dashboard-main">
          
          {/* Overview View */}
          {activeView === 'overview' && (
            <div className="overview-view">
              {/* Key Metrics Grid */}
              <div className="metrics-section">
                <h2 className="section-title">Community Impact Overview</h2>
                <div className="stats-grid">
                  <div className="stat-card primary">
                    <div className="stat-header">
                      <div className="stat-icon">
                        <FiPackage className="w-6 h-6" />
                      </div>
                      <div className="stat-trend positive">+12%</div>
                    </div>
                    <div className="stat-value">{impactData.totalDonations}</div>
                    <div className="stat-label">Total Donations</div>
                    <div className="stat-description">All time community contributions</div>
                  </div>

                  <div className="stat-card secondary">
                    <div className="stat-header">
                      <div className="stat-icon">
                        <FiUsers className="w-6 h-6" />
                      </div>
                      <div className="stat-trend positive">+8%</div>
                    </div>
                    <div className="stat-value">{impactData.uniqueDonors}</div>
                    <div className="stat-label">Active Donors</div>
                    <div className="stat-description">Community members participating</div>
                  </div>

                  <div className="stat-card success">
                    <div className="stat-header">
                      <div className="stat-icon">
                        <FiHeart className="w-6 h-6" />
                      </div>
                      <div className="stat-trend positive">+15%</div>
                    </div>
                    <div className="stat-value">{impactData.uniqueRecipients}</div>
                    <div className="stat-label">People Helped</div>
                    <div className="stat-description">Families and individuals served</div>
                  </div>

                  <div className="stat-card warning">
                    <div className="stat-header">
                      <div className="stat-icon">
                        <FiTruck className="w-6 h-6" />
                      </div>
                      <div className="stat-trend positive">+20%</div>
                    </div>
                    <div className="stat-value">{impactData.completedDonations}</div>
                    <div className="stat-label">Successful Deliveries</div>
                    <div className="stat-description">Food transported to those in need</div>
                  </div>
                </div>
              </div>

              {/* Environmental Impact & Trends */}
              <div className="charts-section">
                <div className="chart-grid">
                  {/* Environmental Impact */}
                  <div className="chart-card large">
                    <div className="chart-header">
                      <h3 className="chart-title">
                        <FiGlobe className="w-5 h-5" />
                        Environmental Impact
                      </h3>
                      <div className="chart-actions">
                        <span className="time-filter">This Month</span>
                      </div>
                    </div>
                    <div className="impact-grid">
                      <div className="impact-metric food">
                        <div className="metric-info">
                          <div className="metric-icon">
                            <FiPackage className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="metric-value">{impactData.estimatedFoodSaved} kg</div>
                            <div className="metric-label">Food Saved</div>
                          </div>
                        </div>
                        <div className="metric-trend positive">+8%</div>
                      </div>

                      <div className="impact-metric co2">
                        <div className="metric-info">
                          <div className="metric-icon">
                            <FiTrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="metric-value">{impactData.estimatedCO2Reduced} kg</div>
                            <div className="metric-label">CO₂ Reduced</div>
                          </div>
                        </div>
                        <div className="metric-trend positive">+12%</div>
                      </div>

                      <div className="impact-metric meals">
                        <div className="metric-info">
                          <div className="metric-icon">
                            <FiAward className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="metric-value">{impactData.estimatedMealsProvided}</div>
                            <div className="metric-label">Meals Provided</div>
                          </div>
                        </div>
                        <div className="metric-trend positive">+15%</div>
                      </div>

                      <div className="impact-metric money">
                        <div className="metric-info">
                          <div className="metric-icon">
                            <FiDollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="metric-value">₱{impactData.estimatedMoneySaved.toLocaleString()}</div>
                            <div className="metric-label">Money Saved</div>
                          </div>
                        </div>
                        <div className="metric-trend positive">+18%</div>
                      </div>
                    </div>
                  </div>

                  {/* Donation Trends Chart */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <h3 className="chart-title">
                        <FiBarChart2 className="w-5 h-5" />
                        Donation Trends
                      </h3>
                      <div className="chart-actions">
                        <span className="time-filter">Last 8 Weeks</span>
                      </div>
                    </div>
                    <div className="chart-container">
                      <div className="bar-chart">
                        {impactData.weeklyDonations.map((weekData, index) => (
                          <div key={index} className="bar-column">
                            <div 
                              className={`bar ${weekData.count > 0 ? 'active' : 'inactive'}`}
                              style={{ height: `${getBarHeight(weekData.count, maxWeeklyDonations)}px` }}
                            >
                              {weekData.count > 0 && (
                                <div className="bar-value">
                                  {weekData.count}
                                </div>
                              )}
                            </div>
                            <div className="bar-label">
                              {weekData.week}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Community Locations */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <h3 className="chart-title">
                        <FiMapPin className="w-5 h-5" />
                        Top Locations
                      </h3>
                    </div>
                    <div className="locations-list">
                      {impactData.communityLocations.map((location, index) => (
                        <div key={index} className="location-item">
                          <div className="location-rank">{index + 1}</div>
                          <div className="location-info">
                            <div className="location-name">{location.location}</div>
                            <div className="location-stats">
                              <span className="location-count">{location.count} donations</span>
                              <span className="location-percentage">
                                {Math.round((location.count / impactData.totalDonations) * 100)}%
                              </span>
                            </div>
                          </div>
                          <div className="location-progress">
                            <div 
                              className="progress-bar"
                              style={{
                                width: `${(location.count / Math.max(...impactData.communityLocations.map(l => l.count))) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Categories */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <h3 className="chart-title">
                        <FiShoppingBag className="w-5 h-5" />
                        Top Categories
                      </h3>
                    </div>
                    <div className="categories-list">
                      {impactData.topCategories.map((category, index) => (
                        <div key={index} className="category-item">
                          <div className="category-info">
                            <div className="category-name">{category.category}</div>
                            <div className="category-count">{category.count}</div>
                          </div>
                          <div className="category-progress">
                            <div 
                              className="progress-bar"
                              style={{
                                width: `${(category.count / maxCategoryCount) * 100}%`,
                                backgroundColor: index === 0 ? '#dc2626' : index === 1 ? '#ea580c' : index === 2 ? '#d97706' : '#65a30d'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <div className="analytics-view">
              <div className="analytics-header">
                <h2 className="section-title">Predictive Analytics</h2>
                <p className="section-description">
                  AI-powered insights to optimize food rescue operations and anticipate community needs
                </p>
              </div>

              <div className="analytics-grid">
                {/* Hunger Hotspots */}
                <div className="analytics-card large">
                  <div className="card-header">
                    <h3 className="card-title">
                      <FiAlertTriangle className="w-5 h-5" />
                      Hunger Hotspots Prediction
                    </h3>
                    <div className="card-badge high-risk">Live Analysis</div>
                  </div>
                  <div className="hotspots-grid">
                    {impactData.predictiveAnalytics.hungerHotspots.map((hotspot, index) => (
                      <div key={index} className={`hotspot-card ${hotspot.riskLevel}`}>
                        <div className="hotspot-header">
                          <div className="hotspot-location">
                            <FiMapPin className="w-4 h-4" />
                            {hotspot.location}
                          </div>
                          <div className={`risk-badge ${hotspot.riskLevel}`}>
                            {hotspot.riskLevel} Risk
                          </div>
                        </div>
                        <div className="hotspot-metrics">
                          <div className="metric">
                            <span className="metric-label">Expected Demand</span>
                            <span className="metric-value">{hotspot.expectedDemand} meals</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Trend</span>
                            <span className={`trend-indicator ${hotspot.trend}`}>
                              {hotspot.trend === 'increasing' ? '↗ Increasing' : 
                               hotspot.trend === 'decreasing' ? '↘ Decreasing' : '→ Stable'}
                            </span>
                          </div>
                        </div>
                        <div className="hotspot-actions">
                          <button className="action-btn primary">Allocate Resources</button>
                          <button className="action-btn secondary">View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Surplus Trends */}
                <div className="analytics-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <FiTrendingUp className="w-5 h-5" />
                      Surplus Trends Forecast
                    </h3>
                    <div className="card-badge">7-day Forecast</div>
                  </div>
                  <div className="trends-list">
                    {impactData.predictiveAnalytics.surplusTrends.map((trend, index) => (
                      <div key={index} className="trend-item">
                        <div className="trend-info">
                          <div className="trend-category">{trend.category}</div>
                          <div className="trend-confidence">{trend.confidence}% confidence</div>
                        </div>
                        <div className="trend-prediction">
                          <div className="prediction-value">+{trend.expectedIncrease}%</div>
                          <div className="prediction-label">Expected Increase</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimization Recommendations */}
                <div className="analytics-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <FiTarget className="w-5 h-5" />
                      Optimization Recommendations
                    </h3>
                  </div>
                  <div className="recommendations-list">
                    {impactData.predictiveAnalytics.recommendations.map((rec, index) => (
                      <div key={index} className="recommendation-item">
                        <div className="rec-number">{index + 1}</div>
                        <div className="rec-content">
                          <div className="rec-text">{rec}</div>
                          <div className="rec-actions">
                            <button className="action-btn small primary">Implement</button>
                            <button className="action-btn small secondary">Schedule</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Predictive Insights Summary */}
                <div className="analytics-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <FiBarChart2 className="w-5 h-5" />
                      Insights Summary
                    </h3>
                  </div>
                  <div className="insights-grid">
                    <div className="insight-item positive">
                      <div className="insight-value">+22%</div>
                      <div className="insight-label">Expected Donation Growth</div>
                      <div className="insight-period">Next 30 days</div>
                    </div>
                    <div className="insight-item warning">
                      <div className="insight-value">3</div>
                      <div className="insight-label">High-Risk Areas</div>
                      <div className="insight-period">Requiring attention</div>
                    </div>
                    <div className="insight-item info">
                      <div className="insight-value">85%</div>
                      <div className="insight-label">Prediction Accuracy</div>
                      <div className="insight-period">Based on historical data</div>
                    </div>
                    <div className="insight-item success">
                      <div className="insight-value">12</div>
                      <div className="insight-label">Optimization Opportunities</div>
                      <div className="insight-period">Identified this week</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity - Always Visible */}
          <div className="recent-activity-section">
            <div className="section-header">
              <h3 className="section-title">Recent Community Activity</h3>
              <button className="view-all-btn">View All</button>
            </div>
            <div className="activity-feed">
              {donations.slice(0, 6).map((donation, index) => (
                <div key={donation.id} className="activity-item">
                  <div className="activity-avatar">
                    <FiPackage className="w-4 h-4" />
                  </div>
                  <div className="activity-content">
                    <div className="activity-message">
                      <strong>{donation.donorName}</strong> donated {donation.title}
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">
                        {donation.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                      </span>
                      <span className="activity-category">{donation.category}</span>
                      <span className={`activity-status ${donation.status}`}>
                        {donation.status}
                      </span>
                    </div>
                  </div>
                  <div className="activity-badge">
                    {donation.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .impact-dashboard-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f8fafc;
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          bottom: 0;
        }

        /* Adjust for desktop sidebar */
        @media (min-width: 1024px) {
          .impact-dashboard-container {
            left: 260px;
            width: calc(100% - 260px);
          }
        }

        /* Dashboard Header */
        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 1.5rem 2rem;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
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
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-toggle:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .view-toggle.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }

        /* Scrollable Main Content */
        .dashboard-scroll-container {
          flex: 1;
          overflow-y: auto;
          background: #f8fafc;
        }

        .dashboard-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          width: 100%;
        }

        /* Section Styles */
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .section-description {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          position: relative;
          overflow: hidden;
        }

        .stat-card.primary {
          border-left: 4px solid #3b82f6;
        }

        .stat-card.secondary {
          border-left: 4px solid #8b5cf6;
        }

        .stat-card.success {
          border-left: 4px solid #10b981;
        }

        .stat-card.warning {
          border-left: 4px solid #f59e0b;
        }

        .stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-card.primary .stat-icon {
          background-color: #dbeafe;
          color: #3b82f6;
        }

        .stat-card.secondary .stat-icon {
          background-color: #f3e8ff;
          color: #8b5cf6;
        }

        .stat-card.success .stat-icon {
          background-color: #dcfce7;
          color: #10b981;
        }

        .stat-card.warning .stat-icon {
          background-color: #fef3c7;
          color: #f59e0b;
        }

        .stat-trend {
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }

        .stat-trend.positive {
          background-color: #dcfce7;
          color: #166534;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.5rem;
          line-height: 1;
        }

        .stat-label {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .stat-description {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* Charts Section */
        .charts-section {
          margin-bottom: 2rem;
        }

        .chart-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 1024px) {
          .chart-grid {
            grid-template-columns: 1fr;
          }
        }

        .chart-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .chart-card.large {
          grid-column: 1 / -1;
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
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

        .chart-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .time-filter {
          font-size: 0.875rem;
          color: #6b7280;
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          border-radius: 6px;
        }

        /* Impact Metrics Grid */
        .impact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .impact-metric {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-radius: 8px;
          background: #f8fafc;
        }

        .impact-metric.food {
          border-left: 4px solid #10b981;
        }

        .impact-metric.co2 {
          border-left: 4px solid #3b82f6;
        }

        .impact-metric.meals {
          border-left: 4px solid #8b5cf6;
        }

        .impact-metric.money {
          border-left: 4px solid #f59e0b;
        }

        .metric-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .metric-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .impact-metric.food .metric-icon {
          color: #10b981;
        }

        .impact-metric.co2 .metric-icon {
          color: #3b82f6;
        }

        .impact-metric.meals .metric-icon {
          color: #8b5cf6;
        }

        .impact-metric.money .metric-icon {
          color: #f59e0b;
        }

        .metric-value {
          font-size: 1.25rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .metric-trend {
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }

        .metric-trend.positive {
          background-color: #dcfce7;
          color: #166534;
        }

        /* Chart Styles */
        .chart-container {
          height: 200px;
          margin-top: 1rem;
        }

        .bar-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 160px;
          padding: 1rem 0.5rem;
          gap: 0.75rem;
        }

        .bar-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          height: 100%;
        }

        .bar {
          width: 100%;
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
          position: relative;
          min-height: 4px;
        }

        .bar.active {
          background: linear-gradient(180deg, #3b82f6, #60a5fa);
        }

        .bar.inactive {
          background-color: #e5e7eb;
        }

        .bar-value {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          font-weight: 600;
          color: #1e40af;
        }

        .bar-label {
          position: absolute;
          bottom: -25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          color: #6b7280;
          white-space: nowrap;
        }

        /* Lists Styles */
        .locations-list,
        .categories-list {
          space-y: 0.75rem;
        }

        .location-item,
        .category-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0;
        }

        .location-rank {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .location-info,
        .category-info {
          flex: 1;
        }

        .location-name,
        .category-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .location-stats {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .location-count,
        .category-count {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .location-percentage {
          color: #3b82f6;
          font-weight: 600;
        }

        .location-progress,
        .category-progress {
          width: 80px;
        }

        .progress-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .location-progress .progress-bar {
          background: #3b82f6;
        }

        /* Analytics View */
        .analytics-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .analytics-grid {
            grid-template-columns: 1fr;
          }
        }

        .analytics-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .analytics-card.large {
          grid-column: 1 / -1;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .card-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          background: #f3f4f6;
          color: #374151;
        }

        .card-badge.high-risk {
          background: #fef2f2;
          color: #dc2626;
        }

        .card-badge.success {
          background: #f0fdf4;
          color: #166534;
        }

        /* Hotspots Grid */
        .hotspots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .hotspot-card {
          padding: 1.25rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: white;
        }

        .hotspot-card.high {
          border-left: 4px solid #dc2626;
          background: #fef2f2;
        }

        .hotspot-card.medium {
          border-left: 4px solid #f59e0b;
          background: #fffbeb;
        }

        .hotspot-card.low {
          border-left: 4px solid #10b981;
          background: #f0fdf4;
        }

        .hotspot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .hotspot-location {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #111827;
        }

        .risk-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
        }

        .risk-badge.high {
          background: #fecaca;
          color: #dc2626;
        }

        .risk-badge.medium {
          background: #fed7aa;
          color: #ea580c;
        }

        .risk-badge.low {
          background: #bbf7d0;
          color: #166534;
        }

        .hotspot-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .trend-indicator {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .trend-indicator.increasing {
          color: #dc2626;
        }

        .trend-indicator.decreasing {
          color: #10b981;
        }

        .trend-indicator.stable {
          color: #6b7280;
        }

        .hotspot-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
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
          background: transparent;
          color: #3b82f6;
          border-color: #3b82f6;
        }

        .action-btn.secondary:hover {
          background: #eff6ff;
        }

        .action-btn.small {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
        }

        /* Trends List */
        .trends-list {
          space-y: 1rem;
        }

        .trend-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .trend-info {
          flex: 1;
        }

        .trend-category {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .trend-confidence {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .trend-prediction {
          text-align: right;
        }

        .prediction-value {
          font-size: 1.25rem;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 0.25rem;
        }

        .prediction-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        /* Recommendations List */
        .recommendations-list {
          space-y: 1rem;
        }

        .recommendation-item {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .rec-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .rec-content {
          flex: 1;
        }

        .rec-text {
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .rec-actions {
          display: flex;
          gap: 0.5rem;
        }

        /* Insights Grid */
        .insights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .insight-item {
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          background: #f8fafc;
        }

        .insight-item.positive {
          border-left: 4px solid #10b981;
        }

        .insight-item.warning {
          border-left: 4px solid #f59e0b;
        }

        .insight-item.info {
          border-left: 4px solid #3b82f6;
        }

        .insight-item.success {
          border-left: 4px solid #8b5cf6;
        }

        .insight-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .insight-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .insight-period {
          font-size: 0.75rem;
          color: #6b7280;
        }

        /* Recent Activity */
        .recent-activity-section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .view-all-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-all-btn:hover {
          background: #f9fafb;
        }

        .activity-feed {
          space-y: 1rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .activity-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-message {
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .activity-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .activity-status {
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.625rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .activity-status.completed {
          background: #dcfce7;
          color: #166534;
        }

        .activity-status.claimed {
          background: #fef3c7;
          color: #92400e;
        }

        .activity-status.available {
          background: #dbeafe;
          color: #1e40af;
        }

        .activity-status.assigned {
          background: #fef3c7;
          color: #92400e;
        }

        .activity-status.expired {
          background: #f3f4f6;
          color: #6b7280;
        }

        .activity-badge {
          padding: 0.375rem 0.75rem;
          background: #3b82f6;
          color: white;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* Utility Classes */
        .space-y > * + * {
          margin-top: 0.75rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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

          .dashboard-main {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .chart-grid,
          .analytics-grid {
            grid-template-columns: 1fr;
          }

          .hotspots-grid {
            grid-template-columns: 1fr;
          }

          .insights-grid {
            grid-template-columns: 1fr;
          }

          .hotspot-metrics {
            grid-template-columns: 1fr;
          }

          .hotspot-actions {
            flex-direction: column;
          }

          .activity-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}