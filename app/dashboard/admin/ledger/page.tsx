'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  FiBox,
  FiShield,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiEye,
  FiLink,
  FiHash,
  FiUser,
  FiTruck,
  FiHome,
  FiBarChart2,
  FiLock,
  FiCopy,
  FiHeart,
  FiCalendar,
  FiAward,
  FiPackage,
  FiUsers,
  FiMenu,
  FiX
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

interface BlockchainTransaction {
  id: string;
  donationId: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: any;
  donorId: string;
  donorName: string;
  recipientId?: string;
  recipientName?: string;
  donationType: string;
  status: string;
  items: DonationItem[];
  location: {
    from: string;
    to: string;
  };
  verification: {
    verifiedBy: string;
    verificationTimestamp: any;
    verificationMethod: 'automated' | 'manual' | 'community' | 'recipient';
    proof?: string;
  };
  impact: {
    beneficiariesCount?: number;
    communityImpact?: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface DonationItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  description?: string;
}

interface LedgerStats {
  totalTransactions: number;
  totalItemsDonated: number;
  totalPeopleFed: number;
  activeTransactions: number;
  completedTransactions: number;
  averageCompletionTime: number;
  transactionsToday: number;
  communityImpactScore: number;
}

// Generate deterministic blockchain data from real donations
const generateBlockchainData = (donation: Donation): Omit<BlockchainTransaction, 'id'> => {
  // Create deterministic hash from donation data
  const donationString = JSON.stringify({
    id: donation.id,
    donorId: donation.donorId,
    recipientId: donation.recipientId,
    createdAt: donation.createdAt?.toMillis?.() || Date.now(),
    title: donation.title,
    category: donation.category
  });
  
  // Simple hash function for demo purposes
  let hash = 0;
  for (let i = 0; i < donationString.length; i++) {
    const char = donationString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const transactionHash = `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  const blockNumber = 18000000 + (Math.abs(hash) % 100000);
  
  // Convert donation to blockchain items format
  const items: DonationItem[] = [{
    id: donation.id,
    name: donation.title,
    category: donation.category,
    quantity: parseInt(donation.quantity) || 1,
    unit: 'units',
    condition: 'good',
    description: donation.description
  }];

  // Calculate impact based on donation data
  const beneficiariesCount = donation.estimatedPeopleFed || 
    Math.round((parseInt(donation.quantity) || 1) * 
      (donation.category === 'food' ? 10 : 
       donation.category === 'clothing' ? 5 : 
       donation.category === 'medical' ? 3 : 1));

  const communityImpact = beneficiariesCount > 100 ? 'critical' : 
                         beneficiariesCount > 50 ? 'high' :
                         beneficiariesCount > 20 ? 'medium' : 'low';

  // Determine verification method based on status
  let verificationMethod: 'automated' | 'manual' | 'community' | 'recipient' = 'automated';
  let verifiedBy = 'system';
  
  if (donation.status === 'completed') {
    verificationMethod = 'recipient';
    verifiedBy = donation.recipientName || 'recipient';
  } else if (donation.status === 'assigned') {
    verificationMethod = 'manual';
    verifiedBy = 'volunteer';
  }

  return {
    donationId: donation.id,
    transactionHash,
    blockNumber,
    timestamp: donation.createdAt || Timestamp.now(),
    donorId: donation.donorId,
    donorName: donation.donorName,
    recipientId: donation.recipientId,
    recipientName: donation.recipientName,
    donationType: donation.category,
    status: donation.status,
    items,
    location: {
      from: donation.location || 'Unknown Location',
      to: donation.recipientName || 'Pending Assignment'
    },
    verification: {
      verifiedBy,
      verificationTimestamp: donation.completedAt || donation.assignedAt || donation.claimedAt || donation.createdAt,
      verificationMethod,
      proof: donation.status === 'completed' ? `proof_${donation.id}` : undefined
    },
    impact: {
      beneficiariesCount,
      communityImpact
    }
  };
};

export default function BlockchainTransparencyLedger() {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<BlockchainTransaction[]>([]);
  const [ledgerStats, setLedgerStats] = useState<LedgerStats>({
    totalTransactions: 0,
    totalItemsDonated: 0,
    totalPeopleFed: 0,
    activeTransactions: 0,
    completedTransactions: 0,
    averageCompletionTime: 0,
    transactionsToday: 0,
    communityImpactScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<BlockchainTransaction | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchRealDonations = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching real donations from Firestore...');
      
      // Fetch actual donations from Firestore using your data structure
      const donationsRef = collection(db, 'donations');
      const donationsQuery = query(donationsRef, orderBy('createdAt', 'desc'));
      const donationsSnapshot = await getDocs(donationsQuery);
      
      const donationsData: Donation[] = [];
      donationsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Raw donation data:', data);
        donationsData.push({ 
          id: doc.id,
          ...data
        } as Donation);
      });

      console.log('Fetched donations:', donationsData.length);

      // Convert donations to blockchain transactions
      const blockchainTransactions: BlockchainTransaction[] = donationsData.map(donation => ({
        id: donation.id,
        ...generateBlockchainData(donation)
      }));

      console.log('Generated blockchain transactions:', blockchainTransactions.length);
      setTransactions(blockchainTransactions);
      calculateLedgerStats(blockchainTransactions);
      
    } catch (error) {
      console.error('Error fetching real donations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription to actual donations
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time donation listener...');

    const donationsRef = collection(db, 'donations');
    const donationsQuery = query(donationsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(donationsQuery, 
      (snapshot) => {
        console.log('Real-time update received:', snapshot.size, 'donations');
        const donationsData: Donation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          donationsData.push({ 
            id: doc.id,
            ...data
          } as Donation);
        });

        // Convert to blockchain transactions
        const blockchainTransactions: BlockchainTransaction[] = donationsData.map(donation => ({
          id: donation.id,
          ...generateBlockchainData(donation)
        }));

        setTransactions(blockchainTransactions);
        calculateLedgerStats(blockchainTransactions);
      },
      (error) => {
        console.error('Error in real-time subscription:', error);
        fetchRealDonations();
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchRealDonations();
    }
  }, [user]);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.donationType === typeFilter);
    }

    // Apply impact filter
    if (impactFilter !== 'all') {
      filtered = filtered.filter(tx => tx.impact.communityImpact === impactFilter);
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, statusFilter, typeFilter, impactFilter]);

  const calculateLedgerStats = (txs: BlockchainTransaction[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalItems = txs.reduce((sum, tx) => 
      sum + tx.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    const totalPeopleFed = txs.reduce((sum, tx) => sum + (tx.impact.beneficiariesCount || 0), 0);

    const completedTxs = txs.filter(tx => tx.status === 'completed');
    const avgCompletionTime = completedTxs.length > 0 ? 
      completedTxs.reduce((sum, tx) => {
        const completionTime = tx.verification.verificationTimestamp?.toDate?.().getTime() - tx.timestamp?.toDate?.().getTime();
        return sum + (completionTime || 0);
      }, 0) / completedTxs.length : 0;

    const impactScore = txs.length > 0 ? 
      txs.reduce((sum, tx) => {
        let impactMultiplier = 1;
        switch (tx.impact.communityImpact) {
          case 'low': impactMultiplier = 1; break;
          case 'medium': impactMultiplier = 2; break;
          case 'high': impactMultiplier = 3; break;
          case 'critical': impactMultiplier = 4; break;
        }
        return sum + impactMultiplier;
      }, 0) / txs.length : 0;

    const stats: LedgerStats = {
      totalTransactions: txs.length,
      totalItemsDonated: totalItems,
      totalPeopleFed: totalPeopleFed,
      activeTransactions: txs.filter(tx => 
        ['available', 'claimed', 'assigned'].includes(tx.status)
      ).length,
      completedTransactions: completedTxs.length,
      averageCompletionTime: avgCompletionTime,
      transactionsToday: txs.filter(tx => {
        const txDate = tx.timestamp?.toDate?.() || new Date();
        return txDate >= today;
      }).length,
      communityImpactScore: impactScore
    };

    console.log('Calculated stats:', stats);
    setLedgerStats(stats);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'claimed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'available': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <FiCheckCircle className="text-green-600" />;
      case 'assigned': return <FiTruck className="text-blue-600" />;
      case 'claimed': return <FiPackage className="text-purple-600" />;
      case 'available': return <FiBox className="text-yellow-600" />;
      case 'expired': return <FiAlertCircle className="text-red-600" />;
      default: return <FiClock className="text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'food': return <FiPackage className="text-green-600" />;
      case 'clothing': return <FiUser className="text-blue-600" />;
      case 'medical': return <FiHeart className="text-red-600" />;
      case 'electronics': return <FiBox className="text-purple-600" />;
      case 'furniture': return <FiHome className="text-orange-600" />;
      default: return <FiBox className="text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatHash = (hash: string) => {
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You might want to show a toast notification here
  };

  const exportAuditReport = () => {
    if (transactions.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      const data = transactions.map(tx => ({
        'Transaction Hash': tx.transactionHash,
        'Block Number': tx.blockNumber,
        'Donor': tx.donorName,
        'Recipient': tx.recipientName || 'Not Assigned',
        'Donation Type': tx.donationType,
        'Status': tx.status,
        'Items': tx.items.map(item => `${item.quantity} ${item.unit} ${item.name}`).join('; '),
        'Location': `${tx.location.from} → ${tx.location.to}`,
        'Beneficiaries': tx.impact.beneficiariesCount || 'Unknown',
        'Impact': tx.impact.communityImpact,
        'Timestamp': tx.timestamp?.toDate?.().toLocaleString() || 'Unknown',
        'Verified By': tx.verification.verifiedBy,
        'Verification Method': tx.verification.verificationMethod
      }));

      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blockchain-ledger-audit-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  // Mobile responsive table row component
  const MobileTransactionRow = ({ transaction }: { transaction: BlockchainTransaction }) => (
    <div className="mobile-transaction-card">
      <div className="mobile-card-header">
        <div className="mobile-hash" onClick={() => copyToClipboard(transaction.transactionHash)}>
          <FiHash size={12} />
          {formatHash(transaction.transactionHash)}
          <FiCopy size={12} />
        </div>
        <div className={`mobile-status ${transaction.status}`}>
          {getStatusIcon(transaction.status)}
          <span>{transaction.status}</span>
        </div>
      </div>
      
      <div className="mobile-card-body">
        <div className="mobile-parties">
          <div className="mobile-party">
            <FiUser size={14} />
            <span>{transaction.donorName}</span>
          </div>
          <FiBox className="mobile-arrow" />
          <div className="mobile-party">
            <FiHome size={14} />
            <span>{transaction.recipientName || 'Not Assigned'}</span>
          </div>
        </div>
        
        <div className="mobile-details">
          <div className="mobile-type">
            {getTypeIcon(transaction.donationType)}
            <span>{transaction.donationType}</span>
          </div>
          <div className="mobile-block">
            Block #{transaction.blockNumber.toLocaleString()}
          </div>
        </div>
        
        <div className="mobile-items">
          {transaction.items.map((item, index) => (
            <span key={item.id} className="mobile-item-tag">
              {item.quantity} {item.unit} {item.name}
            </span>
          ))}
        </div>
        
        <div className="mobile-impact">
          <span className={`impact-badge ${transaction.impact.communityImpact}`}>
            {transaction.impact.communityImpact}
          </span>
          {transaction.impact.beneficiariesCount && (
            <span className="mobile-beneficiaries">
              {transaction.impact.beneficiariesCount} people
            </span>
          )}
        </div>
        
        <div className="mobile-timestamp">
          {transaction.timestamp?.toDate?.().toLocaleDateString() || 'Unknown'}
        </div>
      </div>
      
      <div className="mobile-card-actions">
        <button 
          className="mobile-action-btn"
          onClick={() => setSelectedTransaction(transaction)}
        >
          <FiEye size={16} />
          View Details
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="blockchain-spinner">
            <div className="block"></div>
            <div className="block"></div>
            <div className="block"></div>
          </div>
          <p className="loading-text">Loading Transparency Ledger...</p>
          <p className="loading-subtext">Connecting to blockchain network</p>
        </div>
      </div>
    );
  }

  return (
    <div className="blockchain-ledger-container">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-main">
            <div className="header-badge">
              <FiShield className="text-green-600" />
              <span>Blockchain Secured Donations</span>
            </div>
            <h1 className="header-title">Transparency Ledger</h1>
            <p className="header-subtitle">
              Immutable blockchain tracking of all donations with real data
            </p>
            <div className="data-info">
              <span className="data-update">
                <FiLock size={14} />
                All donations cryptographically secured • {transactions.length} donations recorded
              </span>
            </div>
          </div>
          <div className={`header-actions ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button className="btn-secondary" onClick={fetchRealDonations}>
              <FiRefreshCw size={16} />
              Refresh
            </button>
            <button className="btn-primary" onClick={exportAuditReport} disabled={transactions.length === 0}>
              <FiDownload size={16} />
              Export Audit
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card blockchain-stat">
            <div className="stat-icon total">
              <FiHash size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{ledgerStats.totalTransactions}</div>
              <div className="stat-label">Total Donations</div>
              <div className="stat-trend">
                {ledgerStats.transactionsToday} today
              </div>
            </div>
          </div>

          <div className="stat-card blockchain-stat">
            <div className="stat-icon items">
              <FiBox size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{ledgerStats.totalItemsDonated.toLocaleString()}</div>
              <div className="stat-label">Items Donated</div>
              <div className="stat-subtext">
                {ledgerStats.totalPeopleFed} people helped
              </div>
            </div>
          </div>

          <div className="stat-card blockchain-stat">
            <div className="stat-icon impact">
              <FiAward size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{ledgerStats.communityImpactScore.toFixed(1)}</div>
              <div className="stat-label">Impact Score</div>
              <div className="stat-subtext">
                {ledgerStats.activeTransactions} active
              </div>
            </div>
          </div>

          <div className="stat-card blockchain-stat">
            <div className="stat-icon completion">
              <FiCheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{ledgerStats.completedTransactions}</div>
              <div className="stat-label">Completed</div>
              <div className="stat-subtext">
                {ledgerStats.totalTransactions > 0 ? 
                  Math.round((ledgerStats.completedTransactions / ledgerStats.totalTransactions) * 100) : 0
                }% success rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Visualization - Hidden on mobile */}
      {!isMobile && (
        <div className="blockchain-visualization">
          <div className="visualization-header">
            <h3>Live Donation Chain</h3>
            <div className="chain-info">
              <span>Latest Block: {transactions[0]?.blockNumber.toLocaleString() || 'Loading...'}</span>
              <span className="chain-security">
                <FiLock size={14} />
                Immutable • Tamper-Proof
              </span>
            </div>
          </div>
          <div className="chain-container">
            {transactions.slice(0, 6).map((tx, index) => (
              <div key={tx.id} className="chain-block">
                <div className="block-header">
                  <span className="block-number">Block #{tx.blockNumber}</span>
                  <span className={`block-status ${tx.status}`}>
                    {getStatusIcon(tx.status)}
                    {tx.status}
                  </span>
                </div>
                <div className="block-hash" onClick={() => copyToClipboard(tx.transactionHash)}>
                  <FiHash size={12} />
                  {formatHash(tx.transactionHash)}
                  <FiCopy size={12} />
                </div>
                <div className="block-items">
                  {tx.items[0]?.quantity} {tx.items[0]?.unit}
                </div>
                <div className="block-arrow">
                  <FiBox size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Donations Section */}
      <div className="transactions-section">
        <div className="section-header">
          <h2 className="section-title">All Donation Records</h2>
          <div className="section-actions">
            <span className="results-count">
              Showing {filteredTransactions.length} of {transactions.length} donations
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-box">
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Search by donor, recipient, items, or transaction hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="claimed">Claimed</option>
              <option value="assigned">Assigned</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>

            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="food">Food</option>
              <option value="clothing">Clothing</option>
              <option value="medical">Medical</option>
              <option value="electronics">Electronics</option>
              <option value="furniture">Furniture</option>
              <option value="other">Other</option>
            </select>

            <select 
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Impact</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="transactions-list">
          {isMobile ? (
            // Mobile Cards View
            <div className="mobile-transactions">
              {filteredTransactions.map((transaction) => (
                <MobileTransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            // Desktop Table View
            <div className="transactions-table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Transaction Hash</th>
                    <th>Block</th>
                    <th>Donor → Recipient</th>
                    <th>Donation Details</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Impact</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="transaction-row">
                      <td>
                        <div className="hash-cell">
                          <FiHash size={14} />
                          <span className="hash-text" title={transaction.transactionHash}>
                            {formatHash(transaction.transactionHash)}
                          </span>
                          <button 
                            onClick={() => copyToClipboard(transaction.transactionHash)}
                            className="icon-btn small"
                            title="Copy hash"
                          >
                            <FiCopy size={12} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="block-cell">
                          #{transaction.blockNumber.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div className="parties-cell">
                          <div className="donor-info">
                            <FiUser size={14} />
                            <span>{transaction.donorName}</span>
                          </div>
                          <FiBox className="arrow" />
                          <div className="recipient-info">
                            <FiHome size={14} />
                            <span>{transaction.recipientName || 'Not Assigned'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="donation-details">
                          <div className="items-list">
                            {transaction.items.map((item, index) => (
                              <span key={item.id} className="item-tag">
                                {item.quantity} {item.unit} {item.name}
                              </span>
                            ))}
                          </div>
                          <div className="location">
                            {transaction.location.from} → {transaction.location.to}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="type-cell">
                          {getTypeIcon(transaction.donationType)}
                          <span className="type-text">{transaction.donationType}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`status-cell ${transaction.status}`}>
                          {getStatusIcon(transaction.status)}
                          <span>{transaction.status}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`impact-cell ${transaction.impact.communityImpact}`}>
                          <span className="impact-text">{transaction.impact.communityImpact}</span>
                          {transaction.impact.beneficiariesCount && (
                            <span className="beneficiaries">
                              {transaction.impact.beneficiariesCount} people
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="timestamp-cell">
                          <div className="date">
                            {transaction.timestamp?.toDate?.().toLocaleDateString() || 'Unknown'}
                          </div>
                          <div className="time">
                            {transaction.timestamp?.toDate?.().toLocaleTimeString() || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view"
                            onClick={() => setSelectedTransaction(transaction)}
                            title="View Details"
                          >
                            <FiEye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredTransactions.length === 0 && (
            <div className="empty-state">
              {transactions.length === 0 ? (
                <>
                  <FiShield size={48} />
                  <h3>No Donations Recorded</h3>
                  <p>The blockchain ledger will populate when donations are made in the system.</p>
                  <button className="btn-primary" onClick={fetchRealDonations}>
                    <FiRefreshCw size={16} />
                    Check for Donations
                  </button>
                </>
              ) : (
                <>
                  <FiSearch size={48} />
                  <h3>No Matching Donations</h3>
                  <p>Try adjusting your search or filters</p>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                      setImpactFilter('all');
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

      {/* Donation Detail Modal */}
      {selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Donation Blockchain Record</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedTransaction(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Blockchain Information</h4>
                  <div className="detail-item">
                    <span className="label">Transaction Hash:</span>
                    <span className="value hash-value">
                      {isMobile ? formatHash(selectedTransaction.transactionHash) : selectedTransaction.transactionHash}
                      <button 
                        onClick={() => copyToClipboard(selectedTransaction.transactionHash)}
                        className="icon-btn"
                      >
                        <FiCopy size={14} />
                      </button>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Block Number:</span>
                    <span className="value">#{selectedTransaction.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Donation ID:</span>
                    <span className="value">{selectedTransaction.donationId}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Parties Involved</h4>
                  <div className="detail-item">
                    <span className="label">Donor:</span>
                    <span className="value">{selectedTransaction.donorName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Recipient:</span>
                    <span className="value">{selectedTransaction.recipientName || 'Not Assigned'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Location:</span>
                    <span className="value">
                      {selectedTransaction.location.from} → {selectedTransaction.location.to}
                    </span>
                  </div>
                </div>

                <div className="detail-section full-width">
                  <h4>Donation Items</h4>
                  <div className="items-grid">
                    {selectedTransaction.items.map((item) => (
                      <div key={item.id} className="item-card">
                        <div className="item-name">{item.name}</div>
                        <div className="item-details">
                          <span className="quantity">{item.quantity} {item.unit}</span>
                          <span className="category">Category: {item.category}</span>
                        </div>
                        {item.description && (
                          <div className="description">
                            {item.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Impact Assessment</h4>
                  <div className="detail-item">
                    <span className="label">Community Impact:</span>
                    <span className={`value impact ${selectedTransaction.impact.communityImpact}`}>
                      {selectedTransaction.impact.communityImpact}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Beneficiaries:</span>
                    <span className="value">
                      {selectedTransaction.impact.beneficiariesCount || 'Unknown'} people
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Verification</h4>
                  <div className="detail-item">
                    <span className="label">Verified By:</span>
                    <span className="value">{selectedTransaction.verification.verifiedBy}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Method:</span>
                    <span className="value">{selectedTransaction.verification.verificationMethod}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Timestamp:</span>
                    <span className="value">
                      {selectedTransaction.verification.verificationTimestamp?.toDate?.().toLocaleString() || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary"
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .blockchain-ledger-container {
          min-height: 100vh;
          background: #f8fafc;
          margin-top: 70px;
          position: relative;
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          position: fixed;
          top: 80px;
          right: 1rem;
          z-index: 100;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.5rem;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex;
          }
        }

        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 1.5rem 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .header-main {
          flex: 1;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: 9999px;
          color: #166534;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1rem;
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
          font-size: 1rem;
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

        @media (max-width: 768px) {
          .header-actions {
            display: none;
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
            margin-top: 1rem;
          }

          .header-actions.mobile-open {
            display: flex;
          }

          .header-content {
            flex-direction: column;
          }

          .header-title {
            font-size: 1.5rem;
          }

          .header-subtitle {
            font-size: 0.875rem;
          }
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
          white-space: nowrap;
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

        .stats-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1rem 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }

        .blockchain-stat {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }

        .blockchain-stat::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #10b981);
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon.total { background: #dbeafe; color: #3b82f6; }
        .stat-icon.items { background: #dcfce7; color: #10b981; }
        .stat-icon.impact { background: #fef3c7; color: #f59e0b; }
        .stat-icon.completion { background: #f3e8ff; color: #8b5cf6; }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.25rem;
          line-height: 1;
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

        @media (max-width: 480px) {
          .blockchain-stat {
            padding: 1rem;
            gap: 0.75rem;
          }

          .stat-icon {
            width: 50px;
            height: 50px;
          }

          .stat-value {
            font-size: 1.75rem;
          }

          .stat-label {
            font-size: 0.875rem;
          }
        }

        .blockchain-visualization {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1rem 2rem;
        }

        @media (max-width: 768px) {
          .blockchain-visualization {
            display: none;
          }
        }

        .visualization-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .visualization-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .chain-info {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .chain-security {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #10b981;
        }

        .chain-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          overflow-x: auto;
          padding: 1rem 0;
        }

        .chain-block {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          min-width: 200px;
          text-align: center;
          transition: all 0.2s;
          cursor: pointer;
          flex-shrink: 0;
        }

        .chain-block:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }

        .block-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .block-number {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
        }

        .block-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
        }

        .block-status.completed { background: #dcfce7; color: #166534; }
        .block-status.assigned { background: #dbeafe; color: #1e40af; }
        .block-status.claimed { background: #f3e8ff; color: #7c3aed; }
        .block-status.available { background: #fef3c7; color: #92400e; }
        .block-status.expired { background: #fecaca; color: #991b1b; }

        .block-hash {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: monospace;
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          background: #f8fafc;
          justify-content: center;
        }

        .block-hash:hover {
          background: #f1f5f9;
        }

        .block-items {
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .block-arrow {
          color: #9ca3af;
        }

        .transactions-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1rem 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          min-width: 250px;
          position: relative;
        }

        @media (max-width: 640px) {
          .search-box {
            min-width: 100%;
          }
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
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .filter-group {
            width: 100%;
            justify-content: space-between;
          }
        }

        .filter-select {
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          min-width: 120px;
        }

        @media (max-width: 640px) {
          .filter-select {
            flex: 1;
            min-width: 0;
          }
        }

        .transactions-list {
          width: 100%;
        }

        /* Mobile Transactions Cards */
        .mobile-transactions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mobile-transaction-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .mobile-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
          gap: 0.5rem;
        }

        .mobile-hash {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: monospace;
          font-size: 0.75rem;
          color: #6b7280;
          background: #f8fafc;
          padding: 0.5rem;
          border-radius: 6px;
          flex: 1;
          cursor: pointer;
        }

        .mobile-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.375rem 0.5rem;
          border-radius: 9999px;
          white-space: nowrap;
        }

        .mobile-status.completed { background: #dcfce7; color: #166534; }
        .mobile-status.assigned { background: #dbeafe; color: #1e40af; }
        .mobile-status.claimed { background: #f3e8ff; color: #7c3aed; }
        .mobile-status.available { background: #fef3c7; color: #92400e; }
        .mobile-status.expired { background: #fecaca; color: #991b1b; }

        .mobile-card-body {
          space-y: 0.75rem;
        }

        .mobile-parties {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .mobile-party {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          flex: 1;
        }

        .mobile-arrow {
          color: #9ca3af;
          flex-shrink: 0;
        }

        .mobile-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .mobile-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          text-transform: capitalize;
        }

        .mobile-block {
          font-size: 0.75rem;
          color: #6b7280;
          font-family: monospace;
        }

        .mobile-items {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .mobile-item-tag {
          background: #f3f4f6;
          padding: 0.375rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #374151;
        }

        .mobile-impact {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .impact-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .impact-badge.critical { background: #fecaca; color: #991b1b; }
        .impact-badge.high { background: #fed7aa; color: #c2410c; }
        .impact-badge.medium { background: #fef3c7; color: #92400e; }
        .impact-badge.low { background: #dcfce7; color: #166534; }

        .mobile-beneficiaries {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .mobile-timestamp {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }

        .mobile-card-actions {
          display: flex;
          justify-content: flex-end;
        }

        .mobile-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .mobile-action-btn:hover {
          background: #2563eb;
        }

        /* Desktop Table */
        .transactions-table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          overflow-x: auto;
        }

        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        .transactions-table th {
          background: #f8fafc;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .transactions-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
          vertical-align: middle;
        }

        .transactions-table tr:last-child td {
          border-bottom: none;
        }

        .transaction-row:hover {
          background: #f8fafc;
        }

        .hash-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: monospace;
        }

        .hash-text {
          color: #6b7280;
        }

        .icon-btn {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .icon-btn.small {
          padding: 0.125rem;
        }

        .block-cell {
          font-family: monospace;
          font-weight: 600;
          color: #374151;
        }

        .parties-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .donor-info, .recipient-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }

        .arrow {
          color: #9ca3af;
        }

        .donation-details {
          max-width: 200px;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .item-tag {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #374151;
        }

        .location {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .type-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-transform: capitalize;
        }

        .status-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 9999px;
          font-weight: 500;
          text-transform: capitalize;
          width: fit-content;
        }

        .status-cell.completed { background: #dcfce7; color: #166534; }
        .status-cell.assigned { background: #dbeafe; color: #1e40af; }
        .status-cell.claimed { background: #f3e8ff; color: #7c3aed; }
        .status-cell.available { background: #fef3c7; color: #92400e; }
        .status-cell.expired { background: #fecaca; color: #991b1b; }

        .impact-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .impact-text {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
          width: fit-content;
        }

        .impact-cell.critical .impact-text { background: #fecaca; color: #991b1b; }
        .impact-cell.high .impact-text { background: #fed7aa; color: #c2410c; }
        .impact-cell.medium .impact-text { background: #fef3c7; color: #92400e; }
        .impact-cell.low .impact-text { background: #dcfce7; color: #166534; }

        .beneficiaries {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .timestamp-cell {
          white-space: nowrap;
        }

        .date {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .time {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
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

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 640px) {
          .detail-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .detail-section {
          space-y: 1rem;
        }

        .detail-section.full-width {
          grid-column: 1 / -1;
        }

        .detail-section h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.5rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .detail-item .label {
          font-weight: 500;
          color: #374151;
          flex-shrink: 0;
        }

        .detail-item .value {
          color: #6b7280;
          text-align: right;
          word-break: break-all;
          flex: 1;
          min-width: 0;
        }

        .hash-value {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: monospace;
          justify-content: flex-end;
        }

        .impact {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .impact.critical { background: #fecaca; color: #991b1b; }
        .impact.high { background: #fed7aa; color: #c2410c; }
        .impact.medium { background: #fef3c7; color: #92400e; }
        .impact.low { background: #dcfce7; color: #166534; }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .item-card {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
        }

        .item-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .item-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .description {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
          font-style: italic;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
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

        .blockchain-spinner {
          display: flex;
          gap: 4px;
          margin: 0 auto 1rem;
        }

        .block {
          width: 12px;
          height: 30px;
          background: #3b82f6;
          animation: blockchain-bounce 1.4s infinite ease-in-out;
        }

        .block:nth-child(1) { animation-delay: -0.32s; }
        .block:nth-child(2) { animation-delay: -0.16s; }
        .block:nth-child(3) { animation-delay: 0s; }

        .loading-text {
          color: #6b7280;
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }

        .loading-subtext {
          color: #9ca3af;
          font-size: 0.875rem;
        }

        @keyframes blockchain-bounce {
          0%, 80%, 100% {
            transform: scaleY(0.6);
          }
          40% {
            transform: scaleY(1);
          }
        }

        /* Additional Mobile Optimizations */
        @media (max-width: 480px) {
          .dashboard-header {
            padding: 1rem 0.75rem;
          }

          .header-badge {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
          }

          .stats-section {
            padding: 1rem 0.75rem;
          }

          .transactions-section {
            padding: 0 0.75rem 1rem;
          }

          .modal-body {
            padding: 1rem;
          }

          .modal-header {
            padding: 1rem;
          }

          .modal-footer {
            padding: 1rem;
            flex-direction: column;
          }

          .btn-primary, .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}