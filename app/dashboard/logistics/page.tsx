'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDocs,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { 
  FiTruck, 
  FiPackage, 
  FiUsers, 
  FiMapPin, 
  FiCalendar,
  FiBarChart2,
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiNavigation,
  FiHome,
  FiShoppingBag,
  FiCoffee
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Use your existing auth system
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { useGeolocation } from '@/hooks/UseGeoLocation';
import { LocationTracker } from '@/components/LocationTracker';
import { geocodeAddress } from '@/utils/geocoding';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Donation {
  id: string;
  title: string;
  category: string;
  quantity: string;
  description: string;
  address: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  expiryDate: string;
  status: 'available' | 'claimed' | 'assigned' | 'completed' | 'expired';
  donorId: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  donorRating: number;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientOrganization?: string;
  recipientAddress?: string;
  recipientCoordinates?: { lat: number; lng: number };
  intendedUse?: string;
  estimatedBeneficiaries?: string;
  volunteerId?: string;
  volunteerName?: string;
  volunteerEmail?: string;
  volunteerPhone?: string;
  createdAt: any;
  claimedAt?: any;
  assignedAt?: any;
  completedAt?: any;
  pickupInstructions?: string;
  specialInstructions?: string;
  allergens?: string[];
  storageRequirements?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: Date;
  };
  lastLocationUpdate?: Date;
}

interface LogisticsOperation {
  id: string;
  donationId: string;
  type: 'pickup' | 'delivery';
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  
  // From donation
  title: string;
  items: string[];
  quantity: string;
  
  // Donor info
  donorId: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  pickupAddress: string;
  pickupCoordinates?: { lat: number; lng: number };
  
  // Recipient info
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  deliveryCoordinates?: { lat: number; lng: number };
  
  // Volunteer info
  volunteerId?: string;
  volunteerName?: string;
  volunteerEmail?: string;
  volunteerPhone?: string;
  
  // Logistics details
  scheduledTime?: any;
  estimatedDuration?: number;
  distance?: number;
  notes?: string;
  currentLocation?: { lat: number; lng: number; timestamp: Date };
  lastLocationUpdate?: Date;
  
  createdAt: any;
  updatedAt: any;
}

// Map updater component
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

// Route calculator component
function RouteCalculator({ pickupCoords, deliveryCoords }: { 
  pickupCoords: [number, number]; 
  deliveryCoords: [number, number] 
}) {
  const [route, setRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    // Simple straight line route - in production, use a routing service like OSRM
    setRoute([pickupCoords, deliveryCoords]);
  }, [pickupCoords, deliveryCoords]);

  return route.length > 0 ? (
    <Polyline
      positions={route}
      color="#3b82f6"
      weight={4}
      opacity={0.7}
    />
  ) : null;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Logistics Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-content">
            <FiAlertTriangle className="error-icon" />
            <h2>Something went wrong with the logistics dashboard.</h2>
            <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Dashboard Content
function LogisticsDashboardContent() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [operations, setOperations] = useState<LogisticsOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI State
  const [selectedOperation, setSelectedOperation] = useState<LogisticsOperation | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeTracking, setActiveTracking] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.8295, 120.2821]); // Olongapo City
  const [mapZoom, setMapZoom] = useState(13);

  const { location: userLocation, error: locationError, isLoading: locationLoading } = useGeolocation({ 
    enabled: true, 
    highAccuracy: true 
  });

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  const calculatePriority = (expiryDate: string): 'low' | 'medium' | 'high' => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'high';
    if (diffDays <= 3) return 'medium';
    return 'low';
  };

  // Geocode donations with real addresses
  const geocodeDonations = async (donationsData: Donation[]): Promise<Donation[]> => {
    const geocodedDonations: Donation[] = [];
    
    for (const donation of donationsData) {
      try {
        let pickupCoords = donation.coordinates;
        let deliveryCoords = donation.recipientCoordinates;

        // Add timeout and error handling for geocoding
        const geocodeWithTimeout = async (address: string): Promise<{ lat: number; lng: number } | null> => {
          try {
            const result = await Promise.race([
              geocodeAddress(address),
              new Promise<{ lat: number; lng: number } | null>((_, reject) => 
                setTimeout(() => reject(new Error('Geocoding timeout')), 5000)
              )
            ]);
            return result || null;
          } catch (error) {
            console.warn(`Geocoding failed for address: ${address}`, error);
            return null;
          }
        };

        // Geocode pickup address if not already done
        if (!pickupCoords && donation.address) {
          const result = await geocodeWithTimeout(donation.address);
          if (result) {
            pickupCoords = result;
          }
        }

        // Geocode delivery address if not already done
        if (!deliveryCoords && donation.recipientOrganization) {
          const result = await geocodeWithTimeout(donation.recipientOrganization);
          if (result) {
            deliveryCoords = result;
          }
        }

        geocodedDonations.push({
          ...donation,
          coordinates: pickupCoords || { 
            lat: 14.8295 + (Math.random() - 0.5) * 0.01, 
            lng: 120.2821 + (Math.random() - 0.5) * 0.01 
          },
          recipientCoordinates: deliveryCoords || { 
            lat: 14.8295 + (Math.random() - 0.5) * 0.01, 
            lng: 120.2821 + (Math.random() - 0.5) * 0.01 
          }
        });
      } catch (error) {
        console.error(`Failed to geocode donation ${donation.id}:`, error);
        // Fallback with slight variation to avoid overlapping markers
        geocodedDonations.push({
          ...donation,
          coordinates: donation.coordinates || { 
            lat: 14.8295 + (Math.random() - 0.5) * 0.01, 
            lng: 120.2821 + (Math.random() - 0.5) * 0.01 
          },
          recipientCoordinates: donation.recipientCoordinates || { 
            lat: 14.8295 + (Math.random() - 0.5) * 0.01, 
            lng: 120.2821 + (Math.random() - 0.5) * 0.01 
          }
        });
      }
    }
    
    return geocodedDonations;
  };

  // Create logistics operations from donations
  const createLogisticsOperations = useCallback((donationsData: Donation[]): LogisticsOperation[] => {
    const ops: LogisticsOperation[] = [];
    
    donationsData.forEach(donation => {
      try {
        const pickupCoords = donation.coordinates || { lat: 14.8295, lng: 120.2821 };
        const deliveryCoords = donation.recipientCoordinates || 
          (donation.recipientOrganization ? { lat: 14.8295, lng: 120.2821 } : undefined);

        const priority = calculatePriority(donation.expiryDate);
        
        // Create pickup operation
        if (donation.status === 'available' || donation.status === 'claimed') {
          ops.push({
            id: `pickup-${donation.id}`,
            donationId: donation.id,
            type: 'pickup',
            status: donation.volunteerId ? 'scheduled' : 'pending',
            priority,
            title: donation.title,
            items: [donation.title, ...(donation.category ? [donation.category] : [])],
            quantity: donation.quantity,
            donorId: donation.donorId,
            donorName: donation.donorName,
            donorEmail: donation.donorEmail,
            donorPhone: donation.donorPhone,
            pickupAddress: donation.address || donation.location || 'Address not provided',
            pickupCoordinates: pickupCoords,
            recipientId: donation.recipientId,
            recipientName: donation.recipientName,
            recipientEmail: donation.recipientEmail,
            recipientPhone: donation.recipientPhone,
            deliveryAddress: donation.recipientOrganization,
            deliveryCoordinates: deliveryCoords,
            volunteerId: donation.volunteerId,
            volunteerName: donation.volunteerName,
            volunteerEmail: donation.volunteerEmail,
            volunteerPhone: donation.volunteerPhone,
            notes: donation.specialInstructions,
            currentLocation: donation.currentLocation,
            lastLocationUpdate: donation.lastLocationUpdate,
            createdAt: donation.createdAt,
            updatedAt: donation.createdAt,
          });
        }
        
        // Create delivery operation
        if (donation.status === 'assigned' && donation.volunteerId && donation.recipientId) {
          ops.push({
            id: `delivery-${donation.id}`,
            donationId: donation.id,
            type: 'delivery',
            status: 'in-progress',
            priority,
            title: donation.title,
            items: [donation.title, ...(donation.category ? [donation.category] : [])],
            quantity: donation.quantity,
            donorId: donation.donorId,
            donorName: donation.donorName,
            pickupAddress: donation.address || donation.location || 'Address not provided',
            pickupCoordinates: pickupCoords,
            recipientId: donation.recipientId,
            recipientName: donation.recipientName!,
            recipientEmail: donation.recipientEmail,
            recipientPhone: donation.recipientPhone,
            deliveryAddress: donation.recipientOrganization,
            deliveryCoordinates: deliveryCoords,
            volunteerId: donation.volunteerId,
            volunteerName: donation.volunteerName!,
            volunteerEmail: donation.volunteerEmail,
            volunteerPhone: donation.volunteerPhone,
            notes: donation.pickupInstructions,
            currentLocation: donation.currentLocation,
            lastLocationUpdate: donation.lastLocationUpdate,
            createdAt: donation.assignedAt || donation.createdAt,
            updatedAt: donation.assignedAt || donation.createdAt,
          });
        }
        
        // Create completed operation
        if (donation.status === 'completed') {
          ops.push({
            id: `completed-${donation.id}`,
            donationId: donation.id,
            type: 'delivery',
            status: 'completed',
            priority,
            title: donation.title,
            items: [donation.title, ...(donation.category ? [donation.category] : [])],
            quantity: donation.quantity,
            donorId: donation.donorId,
            donorName: donation.donorName,
            pickupAddress: donation.address || donation.location || 'Address not provided',
            pickupCoordinates: pickupCoords,
            recipientId: donation.recipientId,
            recipientName: donation.recipientName || 'Unknown',
            deliveryAddress: donation.recipientOrganization,
            deliveryCoordinates: deliveryCoords,
            volunteerId: donation.volunteerId,
            volunteerName: donation.volunteerName,
            currentLocation: donation.currentLocation,
            lastLocationUpdate: donation.lastLocationUpdate,
            createdAt: donation.createdAt,
            updatedAt: donation.completedAt || donation.createdAt,
          });
        }
      } catch (error) {
        console.error('Error creating logistics operation for donation:', donation.id, error);
      }
    });
    
    return ops;
  }, []);

  // Fetch donations and create logistics operations
  useEffect(() => {
    // Don't proceed if not on client side or auth is still loading
    if (!isClient || authLoading) return;

    // If no user but auth is done loading, we're logged out
    if (!user) {
      setLoading(false);
      setIsInitialized(true);
      setDonations([]);
      setOperations([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let donationsQuery;
        const donationsRef = collection(db, 'donations');
        
        if (userProfile?.role === 'donor') {
          donationsQuery = query(donationsRef, where('donorId', '==', user.uid));
        } else if (userProfile?.role === 'recipient') {
          donationsQuery = query(donationsRef, where('recipientId', '==', user.uid));
        } else if (userProfile?.role === 'volunteer') {
          donationsQuery = query(donationsRef, where('volunteerId', '==', user.uid));
        } else {
          donationsQuery = query(donationsRef, orderBy('createdAt', 'desc'));
        }
        
        unsubscribe = onSnapshot(donationsQuery, 
          async (snapshot) => {
            try {
              const donationsData: Donation[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                donationsData.push({ 
                  id: doc.id, 
                  ...data,
                  currentLocation: data.currentLocation || undefined,
                  lastLocationUpdate: data.lastLocationUpdate?.toDate?.() || undefined
                } as Donation);
              });
              
              // Geocode all donations with real addresses
              const geocodedDonations = await geocodeDonations(donationsData);
              setDonations(geocodedDonations);
              const ops = createLogisticsOperations(geocodedDonations);
              setOperations(ops);
              setLoading(false);
              setIsInitialized(true);
            } catch (err) {
              console.error('Error processing donations:', err);
              setError('Failed to process logistics data');
              setLoading(false);
              setIsInitialized(true);
            }
          },
          (err) => {
            console.error('Error fetching donations:', err);
            setError('Failed to load logistics data');
            setLoading(false);
            setIsInitialized(true);
          }
        );
        
      } catch (err) {
        console.error('Error setting up data listener:', err);
        setError('Failed to load logistics data');
        setLoading(false);
        setIsInitialized(true);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userProfile, authLoading, isClient, createLogisticsOperations]);

  // Filter operations based on user role
  const getFilteredOperations = useCallback(() => {
    let filtered = operations;
    
    if (userProfile?.role === 'donor') {
      filtered = filtered.filter(op => op.donorId === user?.uid);
    } else if (userProfile?.role === 'recipient') {
      filtered = filtered.filter(op => op.recipientId === user?.uid);
    } else if (userProfile?.role === 'volunteer') {
      filtered = filtered.filter(op => 
        !op.volunteerId || op.volunteerId === user?.uid
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(op => op.type === typeFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(op => op.status === statusFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(op =>
        op.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.donorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.pickupAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [operations, userProfile, user, typeFilter, statusFilter, searchQuery]);

  // Sort operations
  const getSortedOperations = useCallback((ops: LogisticsOperation[]) => {
    return [...ops].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'status':
          const statusOrder = { 'in-progress': 4, 'scheduled': 3, 'pending': 2, 'completed': 1, 'cancelled': 0 };
          comparison = statusOrder[b.status] - statusOrder[a.status];
          break;
        case 'createdAt':
        default:
          const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt || 0;
          comparison = bTime - aTime;
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [sortBy, sortOrder]);

  // Handle operation selection
  const handleOperationSelect = useCallback((op: LogisticsOperation) => {
    setSelectedOperation(op);
    if (op.pickupCoordinates) {
      setMapCenter([op.pickupCoordinates.lat, op.pickupCoordinates.lng]);
      setMapZoom(14);
    }
  }, []);

  // Create custom icons for map markers
  const createCustomIcon = useCallback((op: LogisticsOperation) => {
    const statusColor = getStatusColor(op.status);
    const typeIcon = op.type === 'pickup' ? '🔄' : '🚚';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${statusColor};
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          border: 3px solid white;
          transform: rotate(-45deg);
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 16px;
            color: white;
          ">${typeIcon}</span>
          ${op.priority === 'high' ? `
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 12px;
              height: 12px;
              background: #ef4444;
              border: 2px solid white;
              border-radius: 50%;
            "></div>
          ` : ''}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return '#eab308';
      case 'scheduled': return '#3b82f6';
      case 'in-progress': return '#f97316';
      case 'completed': return '#22c55e';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  }, []);

  const getStatusBgColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }, []);

  // Action handlers
  const handleAssignToMe = async (op: LogisticsOperation) => {
    if (!user || userProfile?.role !== 'volunteer') return;
    
    try {
      const donationRef = doc(db, 'donations', op.donationId);
      await updateDoc(donationRef, {
        status: 'assigned',
        volunteerId: user.uid,
        volunteerName: userProfile.displayName,
        volunteerEmail: user.email,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error assigning:', err);
      alert('Failed to assign operation');
    }
  };

  const handleUpdateStatus = async (op: LogisticsOperation, newStatus: string) => {
    try {
      const donationRef = doc(db, 'donations', op.donationId);
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      if (newStatus === 'in-progress') {
        updateData.status = 'assigned';
      } else if (newStatus === 'completed') {
        updateData.status = 'completed';
        updateData.completedAt = serverTimestamp();
      }
      
      await updateDoc(donationRef, updateData);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const handleStartTracking = (operationId: string) => {
    setActiveTracking(operationId);
  };

  const handleStopTracking = () => {
    setActiveTracking(null);
  };

  const filteredOps = getFilteredOperations();
  const sortedOps = getSortedOperations(filteredOps);
  
  const activeOps = sortedOps.filter(op => op.status !== 'completed' && op.status !== 'cancelled');
  const completedOps = sortedOps.filter(op => op.status === 'completed');

  // Calculate stats
  const totalOperations = operations.length;
  const activeOperations = activeOps.length;
  const completedOperations = completedOps.length;
  const highPriorityOperations = operations.filter(op => op.priority === 'high').length;
  const operationsWithGPS = operations.filter(op => op.currentLocation).length;

  // Show loading state during initialization
  if (!isInitialized && (authLoading || loading)) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading logistics dashboard...</p>
        </div>
      </div>
    );
  }

  // Show message when not authenticated
  if (!user && !authLoading) {
    return (
      <div className="auth-required-container">
        <div className="auth-required-content">
          <FiUsers className="auth-icon" />
          <h3>Authentication Required</h3>
          <p>Please log in to access the logistics dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="logistics-dashboard-container">
      {/* GPS Tracker */}
      {activeTracking && (
        <div className="location-tracker-container">
          <LocationTracker
            operationId={activeTracking}
            volunteerId={user?.uid || ''}
            isActive={true}
            updateInterval={15000}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Header Section */}
        <div className="section-header">
          <h2 className="section-title">Logistics Operations</h2>
          <p className="section-description">
            Manage and track all food donation logistics operations in Olongapo City
          </p>
          {userLocation && !locationError && (
            <div className="gps-status">
              <div className="gps-indicator"></div>
              <span>GPS Active - Real-time tracking enabled</span>
            </div>
          )}
          {locationError && (
            <div className="gps-error">
              <div className="gps-error-indicator"></div>
              <span>GPS Unavailable - {locationError}</span>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <FiPackage className="w-6 h-6" />
            </div>
            <div className="stat-value">{totalOperations}</div>
            <div className="stat-label">Total Operations</div>
            <div className="stat-description">All logistics operations</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon active">
              <FiNavigation className="w-6 h-6" />
            </div>
            <div className="stat-value">{activeOperations}</div>
            <div className="stat-label">Active Operations</div>
            <div className="stat-description">Currently in progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon completed">
              <FiCheckCircle className="w-6 h-6" />
            </div>
            <div className="stat-value">{completedOperations}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-description">Successfully delivered</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gps">
              <FiTrendingUp className="w-6 h-6" />
            </div>
            <div className="stat-value">{operationsWithGPS}</div>
            <div className="stat-label">Live Tracking</div>
            <div className="stat-description">Active GPS locations</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="operations-grid">
          {/* Operations List */}
          <div className="operations-column">
            {/* Filters */}
            <div className="filters-card">
              <div className="filters-grid">
                <div className="search-container">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search operations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                {userProfile?.role !== 'donor' && userProfile?.role !== 'recipient' && (
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="pickup">Pickups</option>
                    <option value="delivery">Deliveries</option>
                  </select>
                )}
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="createdAt">Date</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>

            {/* Active Operations */}
            <div className="operations-card">
              <div className="operations-header">
                <h3 className="operations-title">Active Operations</h3>
                <span className="operations-count">{activeOps.length} operations</span>
              </div>
              
              <div className="operations-list">
                {activeOps.length === 0 ? (
                  <div className="empty-state">
                    <FiPackage className="empty-icon" />
                    <p className="empty-text">No active operations</p>
                  </div>
                ) : (
                  activeOps.map(op => (
                    <div 
                      key={op.id} 
                      className={`operation-item ${selectedOperation?.id === op.id ? 'selected' : ''}`}
                      onClick={() => handleOperationSelect(op)}
                    >
                      <div className="operation-header">
                        <div className="operation-type">
                          <div className={`priority-dot ${getPriorityColor(op.priority)}`} />
                          <span className="type-icon">
                            {op.type === 'pickup' ? '🔄' : '🚚'}
                          </span>
                          <span className="operation-title">{op.title}</span>
                        </div>
                        <span className={`status-badge ${getStatusBgColor(op.status)}`}>
                          {op.status.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="operation-details">
                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">From:</span>
                            <span className="detail-value">{op.donorName}</span>
                          </div>
                          {op.recipientName && (
                            <div className="detail-item">
                              <span className="detail-label">To:</span>
                              <span className="detail-value">{op.recipientName}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">Items:</span>
                            <span className="detail-value">{op.quantity}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Address:</span>
                            <span className="detail-value address">{op.pickupAddress}</span>
                          </div>
                        </div>
                      </div>
                      
                      {op.volunteerName && (
                        <div className="volunteer-info">
                          <FiUsers className="volunteer-icon" />
                          <span className="volunteer-text">Volunteer: {op.volunteerName}</span>
                          {op.currentLocation && (
                            <span className="live-indicator">📍 Live</span>
                          )}
                        </div>
                      )}
                      
                      <div className="operation-actions">
                        {!op.volunteerId && userProfile?.role === 'volunteer' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignToMe(op);
                            }}
                            className="action-btn assign"
                          >
                            Assign to Me
                          </button>
                        )}
                        
                        {op.volunteerId === user?.uid && op.status === 'scheduled' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(op, 'in-progress');
                            }}
                            className="action-btn start"
                          >
                            Start Delivery
                          </button>
                        )}
                        
                        {op.volunteerId === user?.uid && op.status === 'in-progress' && (
                          <>
                            {activeTracking !== op.id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartTracking(op.donationId);
                                }}
                                className="action-btn track"
                              >
                                Start GPS
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStopTracking();
                                }}
                                className="action-btn stop"
                              >
                                Stop GPS
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(op, 'completed');
                              }}
                              className="action-btn complete"
                            >
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Completed Operations */}
            {completedOps.length > 0 && (
              <div className="operations-card">
                <div 
                  className="operations-header clickable"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  <h3 className="operations-title">Completed Operations</h3>
                  <div className="header-right">
                    <span className="operations-count">{completedOps.length} operations</span>
                    <FiTrendingUp className={`toggle-icon ${showCompleted ? 'open' : ''}`} />
                  </div>
                </div>
                
                {showCompleted && (
                  <div className="operations-list">
                    {completedOps.map(op => (
                      <div key={op.id} className="operation-item completed">
                        <div className="operation-header">
                          <div className="operation-type">
                            <span className="type-icon">
                              {op.type === 'pickup' ? '🔄' : '🚚'}
                            </span>
                            <span className="operation-title">{op.title}</span>
                          </div>
                          <span className={`status-badge ${getStatusBgColor('completed')}`}>
                            Completed
                          </span>
                        </div>
                        <div className="operation-details">
                          <div className="detail-item">
                            <span className="detail-label">Route:</span>
                            <span className="detail-value">{op.donorName} → {op.recipientName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Map Section */}
          <div className="map-column">
            <div className="map-card">
              <h3 className="map-title">
                <FiMapPin className="map-icon" />
                Operations Map - Real Addresses
              </h3>
              <div className="map-container">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  <MapUpdater center={mapCenter} zoom={mapZoom} />

                  {/* User Location */}
                  {userLocation && (
                    <Marker
                      position={[userLocation.latitude, userLocation.longitude]}
                      icon={L.divIcon({
                        className: 'user-location-marker',
                        html: `
                          <div style="
                            background-color: #8b5cf6;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                          "></div>
                        `,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                    >
                      <Popup>Your Current Location</Popup>
                    </Marker>
                  )}

                  {/* Show route if delivery operation is selected */}
                  {selectedOperation && 
                  selectedOperation.type === 'delivery' && 
                  selectedOperation.pickupCoordinates && 
                  selectedOperation.deliveryCoordinates && (
                    <RouteCalculator 
                      pickupCoords={[
                        selectedOperation.pickupCoordinates.lat, 
                        selectedOperation.pickupCoordinates.lng
                      ]}
                      deliveryCoords={[
                        selectedOperation.deliveryCoordinates.lat, 
                        selectedOperation.deliveryCoordinates.lng
                      ]}
                    />
                  )}

                  {/* Markers for all operations */}
                  {operations
                    .filter(op => op.pickupCoordinates)
                    .map((op) => {
                      const position: [number, number] = [
                        op.pickupCoordinates!.lat, 
                        op.pickupCoordinates!.lng
                      ];
                      
                      return (
                        <Marker
                          key={op.id}
                          position={position}
                          icon={createCustomIcon(op)}
                          eventHandlers={{
                            click: () => handleOperationSelect(op),
                          }}
                        >
                          <Popup>
                            <div className="popup-content">
                              <div className="popup-header">
                                <span className="popup-icon">
                                  {op.type === 'pickup' ? '🔄' : '🚚'}
                                </span>
                                <h4 className="popup-title">
                                  {op.type === 'pickup' ? 'Food Pickup' : 'Food Delivery'}
                                </h4>
                              </div>
                              
                              <div className="popup-details">
                                <div className="popup-row">
                                  <span className="popup-label">From:</span>
                                  <span className="popup-value">{op.donorName}</span>
                                </div>
                                <div className="popup-row">
                                  <span className="popup-label">To:</span>
                                  <span className="popup-value">{op.recipientName || 'Not assigned'}</span>
                                </div>
                                <div className="popup-row">
                                  <span className="popup-label">Status:</span>
                                  <span className={`popup-status ${op.status}`}>
                                    {op.status.replace('-', ' ')}
                                  </span>
                                </div>
                                {op.priority === 'high' && (
                                  <div className="popup-row">
                                    <span className="popup-priority">HIGH PRIORITY</span>
                                  </div>
                                )}
                              </div>

                              <div className="popup-items">
                                <span className="popup-label">Items:</span>
                                <div className="items-list">
                                  {op.items.slice(0, 3).map((item, index) => (
                                    <span key={index} className="item-tag">
                                      {item}
                                    </span>
                                  ))}
                                  {op.items.length > 3 && (
                                    <span className="item-more">
                                      +{op.items.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              {op.volunteerName && (
                                <div className="popup-volunteer">
                                  <span className="popup-label">Volunteer:</span>
                                  <span className="popup-value">{op.volunteerName}</span>
                                  {op.currentLocation && (
                                    <span className="live-badge">LIVE</span>
                                  )}
                                </div>
                              )}

                              <div className="popup-address">
                                <span className="popup-label">Address:</span>
                                <span className="popup-address-text">{op.pickupAddress}</span>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                </MapContainer>
              </div>

              {/* Selected Operation Details */}
              {selectedOperation && (
                <div className="selected-details">
                  <h4 className="details-title">Selected Operation Details</h4>
                  <div className="details-grid">
                    <div className="detail-pair">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value capitalize">{selectedOperation.type}</span>
                    </div>
                    <div className="detail-pair">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge small ${getStatusBgColor(selectedOperation.status)}`}>
                        {selectedOperation.status}
                      </span>
                    </div>
                    <div className="detail-pair">
                      <span className="detail-label">Priority:</span>
                      <span className="priority-display">
                        <div className={`priority-dot small ${getPriorityColor(selectedOperation.priority)}`} />
                        <span className="capitalize">{selectedOperation.priority}</span>
                      </span>
                    </div>
                    <div className="detail-pair">
                      <span className="detail-label">Donor:</span>
                      <span className="detail-value">{selectedOperation.donorName}</span>
                    </div>
                    {selectedOperation.recipientName && (
                      <div className="detail-pair">
                        <span className="detail-label">Recipient:</span>
                        <span className="detail-value">{selectedOperation.recipientName}</span>
                      </div>
                    )}
                    <div className="detail-pair full-width">
                      <span className="detail-label">Pickup Address:</span>
                      <span className="detail-value address">{selectedOperation.pickupAddress}</span>
                    </div>
                    {selectedOperation.deliveryAddress && (
                      <div className="detail-pair full-width">
                        <span className="detail-label">Delivery Address:</span>
                        <span className="detail-value address">{selectedOperation.deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .logistics-dashboard-container {
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

        .location-tracker-container {
          padding: 1rem 1.5rem 0;
        }

        /* Adjust for desktop sidebar */
        @media (min-width: 1024px) {
          .logistics-dashboard-container {
            left: 260px;
            width: calc(100% - 260px);
          }
        }

        /* Error and Auth States */
        .error-container, .auth-required-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 70px);
          background: #f8fafc;
          padding: 2rem;
        }

        .error-content, .auth-required-content {
          text-align: center;
          background: white;
          padding: 3rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          max-width: 400px;
          width: 100%;
        }

        .error-icon, .auth-icon {
          width: 4rem;
          height: 4rem;
          color: #ef4444;
          margin: 0 auto 1rem;
        }

        .auth-icon {
          color: #6b7280;
        }

        .error-content h2, .auth-required-content h3 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .error-content p, .auth-required-content p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .retry-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .retry-button:hover {
          background: #2563eb;
        }

        /* Loading State */
        .loading-container {
          min-height: calc(100vh - 70px);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8fafc;
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

        /* Main Content */
        .dashboard-main {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .section-header {
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .section-description {
          font-size: 1rem;
          color: #6b7280;
          margin: 0 0 1rem 0;
        }

        .gps-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #dcfce7;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #166534;
        }

        .gps-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #dc2626;
        }

        .gps-indicator {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .gps-error-indicator {
          width: 8px;
          height: 8px;
          background: #dc2626;
          border-radius: 50%;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Rest of the CSS remains the same as previous version */
        /* ... (include all the remaining CSS from the previous version) */

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

        .stat-icon.total {
          background-color: #dbeafe;
          color: #2563eb;
        }

        .stat-icon.active {
          background-color: #fef3c7;
          color: #f59e0b;
        }

        .stat-icon.completed {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .stat-icon.gps {
          background-color: #e0e7ff;
          color: #8b5cf6;
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

        /* Operations Grid */
        .operations-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          height: calc(100vh - 400px);
          min-height: 600px;
        }

        @media (max-width: 1024px) {
          .operations-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
        }

        .operations-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          min-height: 0;
        }

        .map-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          min-height: 0;
        }

        /* Cards */
        .filters-card, .operations-card, .map-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .filters-card {
          padding: 1.5rem;
        }

        .operations-card {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .map-card {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        /* Filters */
        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          align-items: center;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          color: #6b7280;
          width: 1.25rem;
          height: 1.25rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          background-color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Operations Header */
        .operations-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 1.5rem 1rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .operations-header.clickable {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .operations-header.clickable:hover {
          background-color: #f9fafb;
        }

        .operations-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .operations-count {
          font-size: 0.875rem;
          color: #6b7280;
          background-color: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toggle-icon {
          transition: transform 0.2s;
          color: #6b7280;
        }

        .toggle-icon.open {
          transform: rotate(180deg);
        }

        /* Operations List */
        .operations-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 1.5rem 1.5rem 1.5rem;
        }

        .operation-item {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          background-color: white;
        }

        .operation-item:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        .operation-item.selected {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }

        .operation-item.completed {
          opacity: 0.7;
        }

        .operation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .operation-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .priority-dot.small {
          width: 6px;
          height: 6px;
        }

        .type-icon {
          font-size: 1.125rem;
        }

        .operation-title {
          font-weight: 500;
          color: #111827;
          font-size: 0.875rem;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .status-badge.small {
          padding: 0.125rem 0.375rem;
          font-size: 0.625rem;
        }

        .operation-details {
          margin-bottom: 0.75rem;
        }

        .detail-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 640px) {
          .detail-row {
            flex-direction: column;
            gap: 0.25rem;
          }
        }

        .detail-item {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .detail-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
          min-width: 40px;
        }

        .detail-value {
          font-size: 0.75rem;
          color: #111827;
          flex: 1;
        }

        .detail-value.address {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .volunteer-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background-color: #eff6ff;
          border-radius: 6px;
          margin-bottom: 0.75rem;
        }

        .volunteer-icon {
          width: 0.875rem;
          height: 0.875rem;
          color: #2563eb;
        }

        .volunteer-text {
          font-size: 0.75rem;
          color: #2563eb;
          font-weight: 500;
        }

        .live-indicator {
          font-size: 0.625rem;
          background: #dcfce7;
          color: #166534;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          font-weight: 600;
        }

        .operation-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .action-btn.assign {
          background-color: #3b82f6;
          color: white;
        }

        .action-btn.assign:hover {
          background-color: #2563eb;
        }

        .action-btn.start {
          background-color: #f59e0b;
          color: white;
        }

        .action-btn.start:hover {
          background-color: #d97706;
        }

        .action-btn.track {
          background-color: #8b5cf6;
          color: white;
        }

        .action-btn.track:hover {
          background-color: #7c3aed;
        }

        .action-btn.stop {
          background-color: #ef4444;
          color: white;
        }

        .action-btn.stop:hover {
          background-color: #dc2626;
        }

        .action-btn.complete {
          background-color: #10b981;
          color: white;
        }

        .action-btn.complete:hover {
          background-color: #059669;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }

        .empty-icon {
          width: 3rem;
          height: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 0.875rem;
          text-align: center;
        }

        /* Map Styles */
        .map-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
          padding: 1.5rem 1.5rem 1rem 1.5rem;
        }

        .map-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #ef4444;
        }

        .map-container {
          flex: 1;
          min-height: 400px;
          border-radius: 8px;
          overflow: hidden;
          margin: 0 1.5rem;
        }

        /* Popup Styles */
        .popup-content {
          min-width: 250px;
          padding: 0.75rem;
        }

        .popup-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .popup-icon {
          font-size: 1.25rem;
        }

        .popup-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .popup-details {
          margin-bottom: 0.75rem;
        }

        .popup-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }

        .popup-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .popup-value {
          font-size: 0.75rem;
          color: #111827;
          font-weight: 500;
        }

        .popup-status {
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          font-weight: 500;
        }

        .popup-status.pending {
          background-color: #fef3c7;
          color: #d97706;
        }

        .popup-status.scheduled {
          background-color: #dbeafe;
          color: #2563eb;
        }

        .popup-status.in-progress {
          background-color: #fed7aa;
          color: #ea580c;
        }

        .popup-status.completed {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .popup-priority {
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          background-color: #fee2e2;
          color: #dc2626;
          font-weight: 600;
        }

        .popup-items {
          margin-bottom: 0.75rem;
        }

        .items-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }

        .item-tag {
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
          background-color: #f3f4f6;
          color: #374151;
          border-radius: 4px;
        }

        .item-more {
          font-size: 0.625rem;
          color: #6b7280;
          font-style: italic;
        }

        .popup-volunteer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .live-badge {
          font-size: 0.5rem;
          background: #dcfce7;
          color: #166534;
          padding: 0.125rem 0.25rem;
          border-radius: 9999px;
          font-weight: 700;
        }

        .popup-address {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #f3f4f6;
        }

        .popup-address-text {
          font-size: 0.7rem;
          color: #4b5563;
          font-style: italic;
        }

        /* Selected Details */
        .selected-details {
          padding: 1.5rem;
          border-top: 1px solid #f3f4f6;
        }

        .details-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 1rem 0;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .detail-pair {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-pair.full-width {
          grid-column: 1 / -1;
        }

        .priority-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .capitalize {
          text-transform: capitalize;
        }

        /* Custom marker styles */
        :global(.custom-marker) {
          animation: bounce 0.5s ease-out;
        }

        :global(.user-location-marker) {
          animation: pulse 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0) rotate(-45deg); }
          50% { transform: translateY(-5px) rotate(-45deg); }
        }
      `}</style>
    </div>
  );
}

// Main exported component with error boundary
export default function LogisticsDashboard() {
  return (
    <ErrorBoundary>
      <LogisticsDashboardContent />
    </ErrorBoundary>
  );
}