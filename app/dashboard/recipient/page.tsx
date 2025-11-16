// app/dashboard/recipient/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  FiPackage, 
  FiCheck, 
  FiClock, 
  FiStar, 
  FiSearch, 
  FiMapPin,
  FiCalendar,
  FiUser,
  FiShoppingBag,
  FiCoffee,
  FiBarChart2,
  FiDroplet,
  FiDollarSign,
  FiTruck,
  FiHome,
  FiMeh,
  FiFilter,
  FiRefreshCw,
  FiAlertCircle,
  FiHeart,
  FiNavigation,
  FiMessageCircle,
  FiShare2,
  FiBookmark,
  FiEye,
  FiTrendingUp,
  FiZap,
  FiChevronRight,
  FiInfo,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
  FiChevronUp,
  FiUsers,
  FiX,
  FiBox,
  FiMail,
  FiPhone,
  FiMessageSquare,
  FiClipboard,
  FiMap,
  FiAlertTriangle,
  FiImage
} from 'react-icons/fi';

interface Donation {
  id: string;
  title: string;
  category: string;
  quantity: string;
  quantityUnit: 'kg' | 'pcs';
  description: string;
  address: string;
  expiryDate: string;
  status: 'available' | 'claimed' | 'completed' | 'expired';
  donorId: string;
  donorName: string;
  donorRating: number;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientOrganization?: string;
  intendedUse?: string;
  estimatedBeneficiaries?: string;
  specialInstructions?: string;
  allergens?: string[];
  storageRequirements?: string;
  foodSafetyChecked: boolean;
  temperatureControl: string;
  packagingIntact: boolean;
  properLabeling: boolean;
  contaminationRisk: string;
  safetyNotes?: string;
  safetyScore?: number;
  imageUrl?: string;
  imagePublicId?: string;
  createdAt: any;
  claimedAt?: any;
  completedAt?: any;
  distance?: number;
  isWatched?: boolean;
  views?: number;
  donorContact?: string;
  donorPhone?: string;
  pickupInstructions?: string;
}

interface Claim {
  id: string;
  donationId: string;
  claimType: 'recipient' | 'donor_manual';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  donorId: string;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  recipientOrganization?: string;
  intendedUse?: string;
  estimatedBeneficiaries?: string;
  preferredPickupDate?: string;
  preferredPickupTime?: string;
  specialRequirements?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

interface ClaimFormData {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientLocation: string;
  pickupAddress: string;
  organizationName: string;
  intendedUse: string;
  estimatedBeneficiaries: string;
  preferredPickupDate: string;
  preferredPickupTime: string;
  specialRequirements: string;
  notes: string;
}

// Unified Claim Creation Function
const createClaim = async (donationId: string, claimData: any, claimType: 'recipient' | 'donor_manual') => {
  const claimDoc = {
    donationId: donationId,
    claimType: claimType,
    status: 'pending',
    claimedAt: serverTimestamp(),
    ...claimData
  };
  
  const claimRef = await addDoc(collection(db, 'claims'), claimDoc);
  
  // Then update donation status
  await updateDoc(doc(db, 'donations', donationId), {
    status: 'claimed',
    updatedAt: serverTimestamp()
  });

  return claimRef.id;
};

// Helper function to get category icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Produce':
      return <FiShoppingBag size={20} />;
    case 'Prepared Food':
      return <FiCoffee size={20} />;
    case 'Baked Goods':
      return <FiBarChart2 size={20} />;
    case 'Dairy':
      return <FiDroplet size={20} />;
    case 'Meat':
      return <FiDollarSign size={20} />;
    default:
      return <FiPackage size={20} />;
  }
};

// Helper function to get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'available':
      return <FiCheck size={12} />;
    case 'claimed':
      return <FiClock size={12} />;
    case 'completed':
      return <FiCheckCircle size={12} />;
    case 'expired':
      return <FiXCircle size={12} />;
    default:
      return <FiMeh size={12} />;
  }
};

// Helper function to calculate urgency
const getUrgencyLevel = (expiryDate: string, status: string): 'low' | 'medium' | 'high' | 'expired' => {
  if (status === 'expired') return 'expired';
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  
  // Handle invalid dates
  if (isNaN(expiry.getTime())) return 'low';
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 1) return 'high';
  if (diffDays <= 3) return 'medium';
  return 'low';
};

// Helper function to check if donation is expired
const isDonationExpired = (expiryDate: string): boolean => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return expiry < today;
};

// Helper function to format timestamp
const formatTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'Unknown time';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  } catch (error) {
    return 'Unknown time';
  }
};

export default function RecipientDashboard() {
  const { user, userProfile } = useAuth();
  const { loading } = useRoleAccess(['recipient']);
  const router = useRouter();
  
  const [donations, setDonations] = useState<Donation[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchedItems, setWatchedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showClaimed, setShowClaimed] = useState(false);
  
  // New states for claim modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimingDonation, setClaimingDonation] = useState<Donation | null>(null);
  const [claimFormData, setClaimFormData] = useState<ClaimFormData>({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    recipientLocation: '',
    pickupAddress: '',
    organizationName: '',
    intendedUse: '',
    estimatedBeneficiaries: '',
    preferredPickupDate: '',
    preferredPickupTime: '',
    specialRequirements: '',
    notes: ''
  });

  // Initialize form with user data
  useEffect(() => {
    if (userProfile && isClaimModalOpen) {
      setClaimFormData(prev => ({
        ...prev,
        recipientName: userProfile.displayName || '',
        recipientEmail: user?.email || '',
        recipientLocation: userProfile.location || '',
        organizationName: userProfile.organization || ''
      }));
    }
  }, [userProfile, isClaimModalOpen, user]);

  const fetchDonations = async () => {
    try {
      const donationsRef = collection(db, 'donations');
      const q = query(donationsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const donationsData: Donation[] = [];
      const now = new Date();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const donation = { 
          id: doc.id, 
          ...data,
          isWatched: watchedItems.has(doc.id),
          views: data.views || 0
        } as Donation;

        if (donation.status === 'available' && isDonationExpired(donation.expiryDate)) {
          donation.status = 'expired';
        }
        
        donationsData.push(donation);
      });
      
      setDonations(donationsData);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const fetchClaims = async () => {
    try {
      if (!user?.uid) return;
      
      const q = query(
        collection(db, 'claims'),
        where('recipientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const claimsData: Claim[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        claimsData.push({ id: doc.id, ...data } as Claim);
      });

      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDonations();
    await fetchClaims();
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setDataLoading(true);
        await fetchDonations();
        await fetchClaims();
        setDataLoading(false);
      };
      loadData();
    }
  }, [user]);

  const openClaimModal = (donation: Donation) => {
    setClaimingDonation(donation);
    setIsClaimModalOpen(true);
  };

  const closeClaimModal = () => {
    setIsClaimModalOpen(false);
    setClaimingDonation(null);
    setClaimFormData({
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
      recipientLocation: '',
      pickupAddress: '',
      organizationName: '',
      intendedUse: '',
      estimatedBeneficiaries: '',
      preferredPickupDate: '',
      preferredPickupTime: '',
      specialRequirements: '',
      notes: ''
    });
  };

  const handleClaimFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClaimFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !claimingDonation) return;

    setIsProcessing(true);
    setProcessingMessage('Processing your claim request...');

    try {
      // Prepare claim data using the unified function
      const claimDocData = {
        donorId: claimingDonation.donorId,
        recipientId: user.uid,
        recipientName: claimFormData.recipientName,
        recipientEmail: claimFormData.recipientEmail,
        recipientPhone: claimFormData.recipientPhone,
        recipientOrganization: claimFormData.organizationName,
        recipientLocation: claimFormData.recipientLocation,
        pickupAddress: claimFormData.pickupAddress,
        intendedUse: claimFormData.intendedUse,
        estimatedBeneficiaries: claimFormData.estimatedBeneficiaries,
        preferredPickupDate: claimFormData.preferredPickupDate,
        preferredPickupTime: claimFormData.preferredPickupTime,
        specialRequirements: claimFormData.specialRequirements,
        notes: claimFormData.notes
      };

      // Remove undefined values
      Object.keys(claimDocData).forEach(key => {
        if (claimDocData[key as keyof typeof claimDocData] === undefined || claimDocData[key as keyof typeof claimDocData] === '') {
          delete claimDocData[key as keyof typeof claimDocData];
        }
      });

      console.log('Creating claim with data:', claimDocData);

      // Use the unified createClaim function
      await createClaim(claimingDonation.id, claimDocData, 'recipient');

      setProcessingMessage('Claim request submitted successfully!');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await fetchDonations();
      await fetchClaims();
      closeClaimModal();
    } catch (error) {
      console.error('Error claiming donation:', error);
      setProcessingMessage('Failed to submit claim request. Please try again.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickClaim = async (donation: Donation) => {
    if (!user || !userProfile) return;

    const confirmed = window.confirm(`Quick claim ${donation.title}? This will use your basic information.`);
    if (!confirmed) return;

    setIsProcessing(true);
    setProcessingMessage('Processing quick claim...');

    try {
      // Prepare basic claim data for quick claim
      const claimDocData = {
        donorId: donation.donorId,
        recipientId: user.uid,
        recipientName: userProfile.displayName,
        recipientEmail: user.email,
        recipientLocation: userProfile.location || '',
        organizationName: userProfile.organization || '',
        intendedUse: 'quick_claim',
        estimatedBeneficiaries: '1',
        notes: 'Quick claim via recipient dashboard'
      };

      // Use the unified createClaim function
      await createClaim(donation.id, claimDocData, 'recipient');

      setProcessingMessage('Quick claim successful!');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await fetchDonations();
      await fetchClaims();
    } catch (error) {
      console.error('Error with quick claim:', error);
      setProcessingMessage('Failed to quick claim. Please try again.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleWatchItem = (donationId: string) => {
    const newWatchedItems = new Set(watchedItems);
    if (newWatchedItems.has(donationId)) {
      newWatchedItems.delete(donationId);
    } else {
      newWatchedItems.add(donationId);
    }
    setWatchedItems(newWatchedItems);
    
    // In a real app, save to user's profile in Firestore
    console.log('Toggled watch:', donationId);
  };

  const shareDonation = async (donation: Donation) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this food donation: ${donation.title}`,
          text: `${donation.title} - ${donation.description}`,
          url: `${window.location.origin}/donations/${donation.id}`,
        });
      } catch (error) {
        console.log('Sharing cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/donations/${donation.id}`);
      alert('Link copied to clipboard!');
    }
  };

  // Filter donations
  const availableDonations = donations.filter(d => d.status === 'available');
  const userClaims = claims.filter(claim => claim.recipientId === user?.uid);
  const claimedDonationIds = userClaims.map(claim => claim.donationId);
  const claimedDonations = donations.filter(d => claimedDonationIds.includes(d.id));
  const completedDonations = donations.filter(d => d.status === 'completed' && claimedDonationIds.includes(d.id));
  const expiredDonations = donations.filter(d => d.status === 'expired');

  // Filter available donations for search and filters
  const filteredAvailableDonations = availableDonations.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    
    const urgency = getUrgencyLevel(d.expiryDate, d.status);
    const matchesUrgency = filterUrgency === 'all' || 
                          (filterUrgency === 'high' && urgency === 'high') ||
                          (filterUrgency === 'medium' && urgency === 'medium') ||
                          (filterUrgency === 'low' && urgency === 'low') ||
                          (filterUrgency === 'expired' && urgency === 'expired');
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'available' && d.status === 'available') ||
                      (activeTab === 'watch-list' && watchedItems.has(d.id)) ||
                      (activeTab === 'nearby' && (d.distance || 0) <= 3);

    return matchesSearch && matchesCategory && matchesUrgency && matchesTab;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'urgent':
        const aUrgency = getUrgencyLevel(a.expiryDate, a.status);
        const bUrgency = getUrgencyLevel(b.expiryDate, b.status);
        const urgencyOrder = { expired: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[bUrgency] - urgencyOrder[aUrgency];
      case 'distance':
        return (a.distance || 999) - (b.distance || 999);
      case 'popular':
        return (b.views || 0) - (a.views || 0);
      default:
        return 0;
    }
  });

  if (loading || dataLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your dashboard...</p>
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

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="recipient-dashboard-container">
      {/* Main Content */}
      <div className="dashboard-main">
        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon donor">
              <FiPackage className="w-6 h-6" />
            </div>
            <div className="stat-value">{userClaims.length}</div>
            <div className="stat-label">Total Claims</div>
            <div className="stat-description">All time</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon recipient">
              <FiShoppingBag className="w-6 h-6" />
            </div>
            <div className="stat-value">{availableDonations.length}</div>
            <div className="stat-label">Available Now</div>
            <div className="stat-description">Ready to claim</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon volunteer">
              <FiClock className="w-6 h-6" />
            </div>
            <div className="stat-value">{userClaims.filter(c => c.status === 'pending' || c.status === 'approved').length}</div>
            <div className="stat-label">Active Claims</div>
            <div className="stat-description">Pending & approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon delivery">
              <FiCheckCircle className="w-6 h-6" />
            </div>
            <div className="stat-value">{userClaims.filter(c => c.status === 'completed').length}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-description">Successfully received</div>
          </div>
        </div>

        {/* My Claims Section */}
        {userClaims.length > 0 && (
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">My Claims</h2>
              <div className="header-actions">
                <span className="claims-count">{userClaims.length} total claims</span>
              </div>
            </div>
            <div className="claims-overview">
              {userClaims.slice(0, 3).map(claim => {
                const donation = donations.find(d => d.id === claim.donationId);
                return (
                  <div key={claim.id} className="claim-card">
                    <div className="claim-header">
                      <div className="claim-title">
                        {donation ? donation.title : 'Donation'}
                        <span className={`claim-status ${claim.status}`}>
                          {claim.status}
                        </span>
                      </div>
                      <div className="claim-date">
                        {formatTimeAgo(claim.createdAt)}
                      </div>
                    </div>
                    <div className="claim-details">
                      <div className="claim-type">
                        {claim.claimType === 'recipient' ? 'Recipient Claim' : 'Manual Claim'}
                      </div>
                      {donation && (
                        <div className="claim-donation-info">
                          <span>{donation.quantity} {donation.quantityUnit}</span>
                          <span>•</span>
                          <span>{donation.category}</span>
                        </div>
                      )}
                    </div>
                    <div className="claim-actions">
                      <button className="btn view-details-btn">
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Donations Section - Card Grid View */}
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">
              Available Food Donations
              {activeTab === 'watch-list' && ` · Watch List (${watchedItems.size})`}
              {activeTab === 'nearby' && ' · Nearby'}
              {activeTab === 'available' && ` · Available (${availableDonations.length})`}
            </h2>
            <div className="header-actions">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
              >
                <FiRefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs">
            {[
              { id: 'all', label: 'All Items', count: availableDonations.length },
              { id: 'available', label: 'Available', count: availableDonations.length },
              { id: 'watch-list', label: 'Watch List', count: watchedItems.size },
              { id: 'nearby', label: 'Nearby', count: availableDonations.filter(d => (d.distance || 0) <= 3).length }
            ].map(tab => (
              <div
                key={tab.id}
                className={`filter-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </div>
            ))}
          </div>

          <div className="search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">
                <FiSearch size={20} />
              </span>
              <input
                type="text"
                placeholder="Search by food name, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="category-select"
            >
              <option value="all">All Categories</option>
              <option value="Produce">Produce</option>
              <option value="Prepared Food">Prepared Food</option>
              <option value="Baked Goods">Baked Goods</option>
              <option value="Dairy">Dairy</option>
              <option value="Meat">Meat</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="urgency-select"
            >
              <option value="all">Any Urgency</option>
              <option value="high">Urgent (Today)</option>
              <option value="medium">Soon (3 days)</option>
              <option value="low">Fresh</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="urgent">Most Urgent</option>
              <option value="distance">Nearest First</option>
              <option value="popular">Most Viewed</option>
            </select>
          </div>

          {filteredAvailableDonations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FiShoppingBag size={64} />
              </div>
              <h3 className="empty-title">No donations found</h3>
              <p className="empty-text">
                {searchQuery || filterCategory !== 'all' || filterUrgency !== 'all' 
                  ? 'Try adjusting your search filters' 
                  : 'Check back soon for new food donations in your area!'}
              </p>
            </div>
          ) : (
            <div className="donations-grid">
              {filteredAvailableDonations.map(donation => {
                const urgency = getUrgencyLevel(donation.expiryDate, donation.status);
                const urgencyColors = {
                  low: { bg: '#dcfce7', text: '#15803d' },
                  medium: { bg: '#fef3c7', text: '#b45309' },
                  high: { bg: '#fecaca', text: '#dc2626' },
                  expired: { bg: '#f3f4f6', text: '#6b7280' }
                };

                return (
                  <div 
                    key={donation.id} 
                    className="donation-card"
                  >
                    <div className="donation-image">
                      {donation.imageUrl ? (
                        <img
                          src={donation.imageUrl}
                          alt={donation.title}
                          className="donation-thumbnail"
                        />
                      ) : (
                        <div className="donation-image-placeholder">
                          {getCategoryIcon(donation.category)}
                        </div>
                      )}
                      {urgency !== 'expired' && (
                        <div 
                          className="urgency-badge"
                          style={{
                            backgroundColor: urgencyColors[urgency].bg,
                            color: urgencyColors[urgency].text
                          }}
                        >
                          {urgency === 'high' ? 'Urgent' : urgency === 'medium' ? 'Soon' : 'Fresh'}
                        </div>
                      )}
                      <div className="card-actions">
                        <div 
                          className={`action-button ${watchedItems.has(donation.id) ? 'watched' : ''}`}
                          onClick={() => toggleWatchItem(donation.id)}
                        >
                          <FiEye size={14} />
                        </div>
                        <div 
                          className="action-button"
                          onClick={() => shareDonation(donation)}
                        >
                          <FiShare2 size={14} />
                        </div>
                      </div>
                    </div>
                    <div className="donation-content">
                      <h3 className="donation-title">
                        {donation.title}
                        {urgency === 'high' && (
                          <span className="priority-badge">
                            <FiZap size={10} />
                            Priority
                          </span>
                        )}
                      </h3>
                      <div className="badges-container">
                        <span className="badge category">
                          {getCategoryIcon(donation.category)}
                          {donation.category}
                        </span>
                        <span className="badge status available">
                          {getStatusIcon(donation.status)}
                          Available
                        </span>
                        {donation.foodSafetyChecked && donation.safetyScore && (
                          <span className={`badge safety ${donation.safetyScore >= 75 ? 'compliant' : 'warning'}`}>
                            <FiCheckCircle size={12} />
                            Safety: {donation.safetyScore}%
                          </span>
                        )}
                        {donation.distance && (
                          <span className="badge distance">
                            <FiNavigation size={10} />
                            {donation.distance}km
                          </span>
                        )}
                      </div>
                      <p className="donation-desc">{donation.description}</p>
                      
                      {donation.allergens && donation.allergens.length > 0 && (
                        <div className="allergens-warning">
                          <FiAlertCircle size={12} />
                          Contains: {donation.allergens.join(', ')}
                        </div>
                      )}

                      <div className="info-row">
                        <FiPackage size={16} />
                        <span className="info-text">{donation.quantity} {donation.quantityUnit?.toUpperCase()}</span>
                      </div>
                      <div className="info-row">
                        <FiMapPin size={16} />
                        <span className="info-text">{donation.address}</span>
                        {donation.distance && (
                          <span className="distance-text">
                            ({donation.distance} km away)
                          </span>
                        )}
                      </div>
                      <div className="info-row">
                        <FiCalendar size={16} />
                        <span className="info-text">Best before: {donation.expiryDate}</span>
                      </div>
                      <div className="info-row">
                        <FiUser size={16} />
                        <span className="info-text">{donation.donorName} <FiStar size={12} /> {donation.donorRating}</span>
                      </div>

                      {donation.specialInstructions && (
                        <div className="special-instructions">
                          <strong>Note:</strong> {donation.specialInstructions}
                        </div>
                      )}

                      <div className="button-group">
                        <button
                          onClick={() => openClaimModal(donation)}
                          className={`btn claim-btn ${urgency === 'high' ? 'urgent' : ''}`}
                        >
                          <FiCheck size={16} />
                          {urgency === 'high' ? 'Claim Urgently' : 'Claim Food'}
                        </button>
                        <button
                          onClick={() => handleQuickClaim(donation)}
                          className="btn quick-claim-btn"
                        >
                          <FiZap size={16} />
                          Quick Claim
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Claimed Donations Section - List View */}
        {claimedDonations.length > 0 && (
          <div className="section-container">
            <div 
              className="section-header-collapsible"
              onClick={() => setShowClaimed(!showClaimed)}
            >
              <div className="section-title-with-count">
                <FiBox size={24} />
                My Claimed Donations
                <span className="count-badge">{claimedDonations.length}</span>
              </div>
              {showClaimed ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </div>
            
            {showClaimed && (
              <div className="history-list">
                {claimedDonations.map((donation, index) => {
                  const claim = userClaims.find(c => c.donationId === donation.id);
                  return (
                    <div 
                      key={donation.id}
                      className={`history-item ${index % 2 === 0 ? 'even' : 'odd'}`}
                    >
                      <div className="history-item-icon claimed">
                        {donation.imageUrl ? (
                          <img
                            src={donation.imageUrl}
                            alt={donation.title}
                            className="history-item-thumbnail"
                          />
                        ) : (
                          <FiBox size={20} />
                        )}
                      </div>
                      <div className="history-item-content">
                        <div className="history-item-title">{donation.title}</div>
                        <div className="history-item-meta">
                          <span>{donation.quantity} {donation.quantityUnit?.toUpperCase()}</span>
                          <span>•</span>
                          <span>{donation.category}</span>
                          <span>•</span>
                          <span>{donation.address}</span>
                          <span>•</span>
                          <span>From: {donation.donorName}</span>
                          {claim && (
                            <>
                              <span>•</span>
                              <span>Claimed {formatTimeAgo(claim.createdAt)}</span>
                            </>
                          )}
                        </div>
                        <div className="status-badges">
                          <span className="badge status claimed">
                            <FiClock size={12} />
                            {claim?.status === 'pending' ? 'Pending Approval' : 
                             claim?.status === 'approved' ? 'Approved - Awaiting Pickup' : 
                             'Claimed'}
                          </span>
                          {claim && (
                            <span className={`claim-type-badge ${claim.claimType}`}>
                              {claim.claimType === 'recipient' ? 'Recipient Claim' : 'Manual Claim'}
                            </span>
                          )}
                        </div>

                        {/* Contact Information */}
                        <div className="contact-info">
                          <div className="contact-row">
                            <FiUser size={14} />
                            <strong>Donor:</strong> {donation.donorName}
                          </div>
                          {donation.donorContact && (
                            <div className="contact-row">
                              <FiMail size={14} />
                              <strong>Email:</strong> {donation.donorContact}
                            </div>
                          )}
                          {donation.donorPhone && (
                            <div className="contact-row">
                              <FiPhone size={14} />
                              <strong>Phone:</strong> {donation.donorPhone}
                            </div>
                          )}
                        </div>

                        {/* Pickup Instructions */}
                        {donation.pickupInstructions && (
                          <div className="pickup-instructions">
                            <div className="pickup-header">
                              <FiTruck size={14} />
                              Pickup Instructions:
                            </div>
                            <div className="pickup-text">
                              {donation.pickupInstructions}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Completed Donations Section - List View */}
        {completedDonations.length > 0 && (
          <div className="section-container">
            <div 
              className="section-header-collapsible"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <div className="section-title-with-count">
                <FiCheckCircle size={24} />
                Completed Donations
                <span className="count-badge">{completedDonations.length}</span>
              </div>
              {showCompleted ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </div>
            
            {showCompleted && (
              <div className="history-list">
                {completedDonations.map((donation, index) => {
                  const claim = userClaims.find(c => c.donationId === donation.id);
                  return (
                    <div 
                      key={donation.id}
                      className={`history-item ${index % 2 === 0 ? 'even' : 'odd'}`}
                    >
                      <div className="history-item-icon completed">
                        {donation.imageUrl ? (
                          <img
                            src={donation.imageUrl}
                            alt={donation.title}
                            className="history-item-thumbnail"
                          />
                        ) : (
                          getCategoryIcon(donation.category)
                        )}
                      </div>
                      <div className="history-item-content">
                        <div className="history-item-title">{donation.title}</div>
                        <div className="history-item-meta">
                          <span>{donation.quantity} {donation.quantityUnit?.toUpperCase()}</span>
                          <span>•</span>
                          <span>{donation.category}</span>
                          <span>•</span>
                          <span>{donation.address}</span>
                          <span>•</span>
                          <span>From: {donation.donorName}</span>
                          {donation.completedAt && (
                            <>
                              <span>•</span>
                              <span>Completed {formatTimeAgo(donation.completedAt)}</span>
                            </>
                          )}
                        </div>
                        <div className="status-badges">
                          <span className="badge status completed">
                            <FiCheckCircle size={12} />
                            Completed
                          </span>
                          {donation.donorRating && (
                            <span className="badge rating">
                              <FiStar size={12} />
                              {donation.donorRating}/5
                            </span>
                          )}
                          {claim && (
                            <span className={`claim-type-badge ${claim.claimType}`}>
                              {claim.claimType === 'recipient' ? 'Recipient Claim' : 'Manual Claim'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Expired Donations Section - List View */}
        {expiredDonations.length > 0 && (
          <div className="section-container">
            <div 
              className="section-header-collapsible"
              onClick={() => setShowExpired(!showExpired)}
            >
              <div className="section-title-with-count">
                <FiXCircle size={24} />
                Expired Donations
                <span className="count-badge">{expiredDonations.length}</span>
              </div>
              {showExpired ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </div>
            
            {showExpired && (
              <div className="history-list">
                {expiredDonations.map((donation, index) => (
                  <div 
                    key={donation.id}
                    className={`history-item ${index % 2 === 0 ? 'even' : 'odd'}`}
                  >
                    <div className="history-item-icon expired">
                      {donation.imageUrl ? (
                        <img
                          src={donation.imageUrl}
                          alt={donation.title}
                          className="history-item-thumbnail"
                        />
                      ) : (
                        getCategoryIcon(donation.category)
                      )}
                    </div>
                    <div className="history-item-content">
                      <div className="history-item-title">{donation.title}</div>
                      <div className="history-item-meta">
                        <span>{donation.quantity} {donation.quantityUnit?.toUpperCase()}</span>
                        <span>•</span>
                        <span>{donation.category}</span>
                        <span>•</span>
                        <span>{donation.address}</span>
                        <span>•</span>
                        <span>From: {donation.donorName}</span>
                        <span>•</span>
                        <span>Expired: {donation.expiryDate}</span>
                      </div>
                      <div className="status-badges">
                        <span className="badge status expired">
                          <FiXCircle size={12} />
                          Expired
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Modal */}
      {isClaimModalOpen && claimingDonation && (
        <div className="modal-overlay" onClick={closeClaimModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-top">
                <h2 className="modal-title">
                  <FiClipboard size={24} />
                  Claim Food Donation
                </h2>
                <button
                  onClick={closeClaimModal}
                  className="close-modal-btn"
                  disabled={isProcessing}
                >
                  <FiX size={24} />
                </button>
              </div>
              <p className="modal-subtitle">
                Please provide your information to claim: <strong>{claimingDonation.title}</strong>
              </p>
            </div>

            <form onSubmit={handleClaimSubmit} className="modal-form">
              {/* Donation Preview */}
              <div className="donation-preview">
                <h3 className="preview-title">Donation Details</h3>
                <div className="preview-content">
                  {claimingDonation.imageUrl && (
                    <div className="preview-image">
                      <img
                        src={claimingDonation.imageUrl}
                        alt={claimingDonation.title}
                        className="preview-thumbnail"
                      />
                    </div>
                  )}
                  <div className="preview-details">
                    <div className="preview-item">
                      <span className="preview-label">Food Item:</span>
                      <span className="preview-value">{claimingDonation.title}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Category:</span>
                      <span className="preview-value">{claimingDonation.category}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Quantity:</span>
                      <span className="preview-value">{claimingDonation.quantity} {claimingDonation.quantityUnit?.toUpperCase()}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Pickup Location:</span>
                      <span className="preview-value">{claimingDonation.address}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Best Before:</span>
                      <span className="preview-value">{claimingDonation.expiryDate}</span>
                    </div>
                    {claimingDonation.foodSafetyChecked && claimingDonation.safetyScore && (
                      <div className="preview-item">
                        <span className="preview-label">Safety Score:</span>
                        <span className={`preview-value ${claimingDonation.safetyScore >= 75 ? 'safe' : 'warning'}`}>
                          {claimingDonation.safetyScore}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Information Box */}
              <div className="info-box">
                <div className="info-box-header">
                  <FiInfo size={16} />
                  <strong>Important Information</strong>
                </div>
                <p className="info-box-text">
                  Your information will be shared with the donor to coordinate pickup. 
                  Please ensure all details are accurate.
                </p>
              </div>

              {/* Contact Information Section */}
              <div className="form-section">
                <h3 className="section-title">
                  <FiUser size={20} />
                  Your Contact Information
                </h3>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Full Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="recipientName"
                      required
                      value={claimFormData.recipientName}
                      onChange={handleClaimFormChange}
                      className="form-input"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Email <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      name="recipientEmail"
                      required
                      value={claimFormData.recipientEmail}
                      onChange={handleClaimFormChange}
                      className="form-input"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Phone Number <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      name="recipientPhone"
                      required
                      value={claimFormData.recipientPhone}
                      onChange={handleClaimFormChange}
                      className="form-input"
                      placeholder="+63 912 3456 789"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Your Location
                    </label>
                    <input
                      type="text"
                      name="recipientLocation"
                      value={claimFormData.recipientLocation}
                      onChange={handleClaimFormChange}
                      className="form-input"
                      placeholder="Address"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    value={claimFormData.organizationName}
                    onChange={handleClaimFormChange}
                    className="form-input"
                    placeholder="Your organization or community group"
                  />
                </div>
              </div>

              {/* Pickup Information Section */}
              <div className="form-section">
                <h3 className="section-title">
                  <FiMapPin size={20} />
                  Pickup Information
                </h3>
                <div className="form-group">
                  <label className="form-label">
                    Pickup/Delivery Address <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="pickupAddress"
                    required
                    value={claimFormData.pickupAddress}
                    onChange={handleClaimFormChange}
                    className="form-input"
                    placeholder="Full address for pickup or delivery"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Preferred Pickup Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="preferredPickupDate"
                      required
                      value={claimFormData.preferredPickupDate}
                      onChange={handleClaimFormChange}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Preferred Pickup Time <span className="required">*</span>
                    </label>
                    <select
                      name="preferredPickupTime"
                      required
                      value={claimFormData.preferredPickupTime}
                      onChange={handleClaimFormChange}
                      className="form-select"
                    >
                      <option value="">Select time</option>
                      <option value="morning">Morning (8AM - 12PM)</option>
                      <option value="afternoon">Afternoon (12PM - 5PM)</option>
                      <option value="evening">Evening (5PM - 8PM)</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Usage Information Section */}
              <div className="form-section">
                <h3 className="section-title">
                  <FiUsers size={20} />
                  Food Usage Information
                </h3>
                <div className="form-group">
                  <label className="form-label">
                    How will this food be used? <span className="required">*</span>
                    </label>
                  <select
                    name="intendedUse"
                    required
                    value={claimFormData.intendedUse}
                    onChange={handleClaimFormChange}
                    className="form-select"
                  >
                    <option value="">Select usage</option>
                    <option value="community_meal">Community Meal Program</option>
                    <option value="food_pantry">Food Pantry Distribution</option>
                    <option value="shelter">Shelter Meals</option>
                    <option value="school_program">School Program</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Estimated Number of Beneficiaries
                  </label>
                  <input
                    type="number"
                    name="estimatedBeneficiaries"
                    value={claimFormData.estimatedBeneficiaries}
                    onChange={handleClaimFormChange}
                    className="form-input"
                    placeholder="e.g., 50"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Special Requirements or Notes
                  </label>
                  <textarea
                    name="specialRequirements"
                    value={claimFormData.specialRequirements}
                    onChange={handleClaimFormChange}
                    className="form-textarea"
                    placeholder="Any special handling requirements, dietary restrictions, or additional notes..."
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div className="form-group">
                <label className="form-label">
                  Additional Notes for Donor
                </label>
                <textarea
                  name="notes"
                  value={claimFormData.notes}
                  onChange={handleClaimFormChange}
                  className="form-textarea"
                  placeholder="Any additional information you'd like to share with the donor..."
                />
              </div>

              {/* Warning Box */}
              <div className="warning-box">
                <div className="warning-box-header">
                  <FiAlertTriangle size={16} />
                  <strong>Please Note</strong>
                </div>
                <p className="warning-box-text">
                  By submitting this claim, you agree to coordinate pickup with the donor and ensure 
                  the food reaches those in need. Failure to pick up may affect future claims.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeClaimModal}
                  className="btn secondary-btn"
                  disabled={isProcessing}
                >
                  <FiX size={16} />
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn primary-btn ${isProcessing ? 'processing' : ''}`}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="spinner" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} />
                      Submit Claim Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Processing Modal */}
      {isProcessing && (
        <div className="processing-modal">
          <div className="processing-content">
            <div className="processing-icon">
              {processingMessage.includes('successfully') ? (
                <FiCheck size={32} />
              ) : processingMessage.includes('Failed') ? (
                <FiX size={32} />
              ) : (
                <div className="processing-spinner" />
              )}
            </div>
            
            <h3 className="processing-title">
              {processingMessage.includes('successfully') 
                ? 'Claim Submitted!' 
                : processingMessage.includes('Failed')
                  ? 'Submission Failed'
                  : 'Processing Your Claim'
              }
            </h3>
            
            <p className="processing-message">
              {processingMessage}
            </p>

            {processingMessage.includes('successfully') && (
              <div className="success-notice">
                <FiUsers size={16} />
                <p>
                  Your claim has been submitted successfully! The donor will contact you soon.
                </p>
              </div>
            )}

            {processingMessage.includes('Failed') && (
              <button
                onClick={() => setIsProcessing(false)}
                className="btn error-btn"
              >
                <FiX size={16} />
                Close
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .recipient-dashboard-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 70px);
          background: #f8fafc;
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          bottom: 0;
          overflow-y: auto;
        }

        /* Adjust for desktop sidebar */
        @media (min-width: 1024px) {
          .recipient-dashboard-container {
            left: 260px;
            width: calc(100% - 260px);
          }
        }

        /* Main Content */
        .dashboard-main {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .stat-icon.donor {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .stat-icon.recipient {
          background-color: #dbeafe;
          color: #2563eb;
        }

        .stat-icon.volunteer {
          background-color: #f3e8ff;
          color: #9333ea;
        }

        .stat-icon.delivery {
          background-color: #fef3c7;
          color: #f59e0b;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .stat-description {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        /* Claims Overview */
        .claims-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .claim-card {
          background: white;
          padding: 1.25rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .claim-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .claim-title {
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .claim-status {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .claim-status.pending {
          background-color: #fef3c7;
          color: #b45309;
        }

        .claim-status.approved {
          background-color: #dcfce7;
          color: #15803d;
        }

        .claim-status.completed {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .claim-status.rejected {
          background-color: #fecaca;
          color: #dc2626;
        }

        .claim-date {
          font-size: 12px;
          color: #6b7280;
        }

        .claim-details {
          display: flex;
          gap: 1rem;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .claim-type {
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .claim-donation-info {
          display: flex;
          gap: 0.5rem;
          font-size: 13px;
        }

        .claim-actions {
          display: flex;
          justify-content: flex-end;
        }

        .btn.view-details-btn {
          padding: 6px 12px;
          background-color: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }

        .btn.view-details-btn:hover {
          background-color: #e5e7eb;
        }

        .claims-count {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        /* Section Styles */
        .section-container {
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background-color: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background-color: #e5e7eb;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-btn.refreshing svg {
          animation: spin 1s linear infinite;
        }

        /* Filter Tabs */
        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #d1d5db;
          background-color: white;
          transition: all 0.2s;
        }

        .filter-tab.active {
          background-color: #16a34a;
          color: white;
          border-color: #16a34a;
        }

        .filter-tab:hover:not(.active) {
          background-color: #f3f4f6;
        }

        /* Search Bar */
        .search-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          flex: 1;
          min-width: 300px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          pointer-events: none;
          color: #6b7280;
        }

        .search-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #16a34a;
        }

        .category-select, .urgency-select, .sort-select {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          outline: none;
          min-width: 150px;
        }

        /* Donations Grid */
        .donations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .donations-grid {
            grid-template-columns: 1fr;
          }
        }

        .donation-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .donation-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .donation-image {
          height: 200px;
          background: linear-gradient(135deg, #dcfce7 0%, #dbeafe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .donation-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .donation-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: #16a34a;
        }

        .urgency-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
        }

        .card-actions {
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          gap: 8px;
        }

        .action-button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s;
          color: #6b7280;
        }

        .action-button:hover {
          background-color: #f3f4f6;
        }

        .action-button.watched {
          color: #2563eb;
        }

        .donation-content {
          padding: 1.25rem;
        }

        .donation-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .priority-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          background-color: #fef3c7;
          color: #b45309;
        }

        .badges-container {
          margin-bottom: 1rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          margin-right: 8px;
          margin-bottom: 4px;
        }

        .badge.category {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .badge.status.available {
          background-color: #dcfce7;
          color: #15803d;
        }

        .badge.status.claimed {
          background-color: #fef3c7;
          color: #b45309;
        }

        .badge.status.completed {
          background-color: #dcfce7;
          color: #15803d;
        }

        .badge.status.expired {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .badge.safety.compliant {
          background-color: #dcfce7;
          color: #15803d;
        }

        .badge.safety.warning {
          background-color: #fef3c7;
          color: #b45309;
        }

        .badge.distance {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .badge.rating {
          background-color: #fef3c7;
          color: #b45309;
        }

        .claim-type-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .claim-type-badge.recipient {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .claim-type-badge.donor_manual {
          background-color: #fef3c7;
          color: #b45309;
        }

        .donation-desc {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 1rem;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .allergens-warning {
          font-size: 12px;
          font-weight: 500;
          color: #dc2626;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .info-text {
          font-weight: 500;
        }

        .distance-text {
          font-size: 12px;
          color: #9ca3af;
        }

        .special-instructions {
          margin-top: 0.5rem;
          padding: 8px;
          background-color: #f3f4f6;
          border-radius: 4px;
          font-size: 12px;
          color: #6b7280;
        }

        .button-group {
          display: flex;
          gap: 8px;
          margin-top: 1rem;
        }

        .btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn.claim-btn {
          background-color: #16a34a;
          color: white;
        }

        .btn.claim-btn:hover {
          background-color: #15803d;
        }

        .btn.claim-btn.urgent {
          background-color: #dc2626;
        }

        .btn.claim-btn.urgent:hover {
          background-color: #b91c1c;
        }

        .btn.quick-claim-btn {
          background-color: transparent;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn.quick-claim-btn:hover {
          background-color: #f3f4f6;
        }

        /* Empty State */
        .empty-state {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 1rem;
          opacity: 0.5;
          color: #6b7280;
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .empty-text {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        /* Collapsible Sections */
        .section-header-collapsible {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          margin-bottom: 1rem;
          transition: background-color 0.2s;
        }

        .section-header-collapsible:hover {
          background-color: #f8fafc;
        }

        .section-title-with-count {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .count-badge {
          background-color: #f3f4f6;
          color: #6b7280;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .history-list {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .history-item {
          padding: 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: background-color 0.2s;
        }

        .history-item:hover {
          background-color: #f3f4f6;
        }

        .history-item.even {
          background-color: #fafafa;
        }

        .history-item.odd {
          background-color: white;
        }

        .history-item:last-child {
          border-bottom: none;
        }

        .history-item-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          overflow: hidden;
        }

        .history-item-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .history-item-icon.claimed {
          background-color: #fef3c7;
          color: #b45309;
        }

        .history-item-icon.completed {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .history-item-icon.expired {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .history-item-content {
          flex: 1;
        }

        .history-item-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .history-item-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 14px;
          color: #6b7280;
          flex-wrap: wrap;
        }

        .status-badges {
          margin-top: 0.5rem;
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .contact-info {
          background-color: #f0f9ff;
          padding: 12px;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #0369a1;
          margin-bottom: 4px;
        }

        .pickup-instructions {
          background-color: #fef7ed;
          padding: 12px;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .pickup-header {
          font-size: 14px;
          color: #b45309;
          font-weight: 500;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pickup-text {
          font-size: 14px;
          color: #92400e;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          top: 70px;
          height: calc(100vh - 70px);
        }

        @media (min-width: 1024px) {
          .modal-overlay {
            left: 260px;
            width: calc(100% - 260px);
          }
        }

        .modal-content {
          background-color: white;
          border-radius: 12px;
          max-width: 640px;
          width: 100%;
          max-height: 80vh;
          overflow: auto;
          margin: auto;
        }

        .modal-content.large {
          max-width: 800px;
          max-height: 85vh;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
          margin-bottom: 0;
        }

        .close-modal-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #6b7280;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .close-modal-btn:hover {
          background-color: #f3f4f6;
        }

        .modal-form {
          padding: 1.5rem;
        }

        .donation-preview {
          background-color: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .preview-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 1rem;
        }

        .preview-content {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .preview-image {
          flex-shrink: 0;
          width: 100px;
          height: 100px;
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-details {
          flex: 1;
        }

        .preview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .preview-item:last-child {
          border-bottom: none;
        }

        .preview-label {
          font-weight: 500;
          color: #6b7280;
        }

        .preview-value {
          font-weight: 600;
          color: #111827;
        }

        .preview-value.safe {
          color: #15803d;
        }

        .preview-value.warning {
          color: #b45309;
        }

        .info-box {
          background-color: #f0f9ff;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #bae6fd;
        }

        .info-box-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #0369a1;
          font-weight: 600;
        }

        .info-box-text {
          font-size: 14px;
          color: #0369a1;
          margin: 0;
        }

        .form-section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .required {
          color: #dc2626;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: #16a34a;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .warning-box {
          background-color: #fef3c7;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #fcd34d;
        }

        .warning-box-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #b45309;
          font-weight: 600;
        }

        .warning-box-text {
          font-size: 14px;
          color: #b45309;
          margin: 0;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn.secondary-btn {
          background-color: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn.secondary-btn:hover {
          background-color: #f9fafb;
        }

        .btn.primary-btn {
          background-color: #16a34a;
          color: white;
        }

        .btn.primary-btn:hover:not(.processing) {
          background-color: #15803d;
        }

        .btn.primary-btn.processing {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .btn.error-btn {
          background-color: #dc2626;
          color: white;
        }

        .btn.error-btn:hover {
          background-color: #b91c1c;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Processing Modal */
        .processing-modal {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 1rem;
          top: 70px;
          height: calc(100vh - 70px);
        }

        @media (min-width: 1024px) {
          .processing-modal {
            left: 260px;
            width: calc(100% - 260px);
          }
        }

        .processing-content {
          background-color: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }

        .processing-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          background-color: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .processing-icon svg {
          color: #16a34a;
        }

        .processing-spinner {
          width: 32px;
          height: 32px;
          border: 4px solid #16a34a;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .processing-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .processing-message {
          color: #6b7280;
          margin-bottom: 2rem;
          line-height: 1.5;
        }

        .success-notice {
          padding: 1rem;
          background-color: #f0fdf4;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          border: 1px solid #86efac;
        }

        .success-notice p {
          font-size: 14px;
          color: #15803d;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}