export type UserRole = 'donor' | 'recipient' | 'volunteer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone: string;
  address: string;
  rating: number;
  totalDonations: number;
  totalReceived: number;
  totalDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
  // Admin-specific fields
  isActive?: boolean;
  permissions?: string[];
}

// Add the missing Donation interface
export interface Donation {
  id: string;
  title: string;
  category: string;
  quantity: string;
  description: string;
  location: string;
  expiryDate: string;
  status: 'available' | 'claimed' | 'completed';
  donorId: string;
  donorName: string;
  donorRating: number;
  recipientId?: string;
  recipientName?: string;
  volunteerId?: string;
  volunteerName?: string;
  createdAt: any;
  updatedAt?: any;
}

// Add the missing VolunteerTask interface
export interface VolunteerTask {
  id: string;
  donationId: string;
  pickupLocation: string;
  dropoffLocation: string;  
  pickupTime: string;
  distance: string;
  status: 'pending' | 'assigned' | 'completed';
  volunteerId?: string;
  volunteerName?: string;
  items: string;
  createdAt: any;
  acceptedAt?: any;
  completedAt?: any;
}

// Analytics interfaces
export interface AnalyticsData {
  totalDonations: number;
  totalRecipients: number;
  totalVolunteers: number;
  totalDonors: number;
  completedDeliveries: number;
  pendingDonations: number;
  monthlyStats: MonthlyStat[];
  topDonors: TopDonor[];
  recentActivities: Activity[];
}

export interface MonthlyStat {
  month: string;
  donations: number;
  deliveries: number;
  recipients: number;
}

export interface TopDonor {
  donorId: string;
  donorName: string;
  totalDonations: number;
  rating: number;
}

export interface Activity {
  id: string;
  type: 'donation' | 'delivery' | 'registration';
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
}