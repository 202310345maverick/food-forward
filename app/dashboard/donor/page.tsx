// app/dashboard/donor/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where, onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import {
  FiPackage, FiCheck, FiClock, FiStar, FiPlus, FiSearch, FiEdit, FiTrash2, FiX,
  FiMapPin, FiCalendar, FiUser, FiShoppingBag, FiCoffee, FiBarChart2, FiDroplet,
  FiDollarSign, FiMail, FiMeh, FiLoader, FiTruck, FiRefreshCw, FiUsers, FiCheckCircle,
  FiXCircle, FiChevronDown, FiChevronUp, FiInfo, FiPhone, FiHome, FiAlertCircle,
  FiShield, FiThermometer, FiEye, FiSmile, FiImage, FiClipboard
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

// Cloudinary Upload Function
const uploadToCloudinary = async (file: File): Promise<{ url: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'food_forward_donations');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your_cloud_name'}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Cloudinary Delete Function
const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'food_forward_donations');

    await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your_cloud_name'}/image/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    );
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Don't throw error for delete failures as it's not critical
  }
};

// Enhanced Claim Creation Function with better error handling
const createClaim = async (donationId: string, claimData: any, claimType: 'recipient' | 'donor_manual') => {
  console.log(`Creating claim for donation ${donationId} with type ${claimType}`);
  
  const claimDoc = {
    donationId: donationId,
    claimType: claimType,
    status: 'pending',
    claimedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...claimData
  };
  
  console.log('Claim document to create:', claimDoc);
  
  try {
    const claimRef = await addDoc(collection(db, 'claims'), claimDoc);
    console.log('Claim document created with ID:', claimRef.id);
    
    // Update donation status with recipient information
    console.log('Updating donation status to claimed...');
    await updateDoc(doc(db, 'donations', donationId), {
      status: 'claimed',
      recipientId: claimData.recipientId,
      recipientName: claimData.recipientName,
      recipientEmail: claimData.recipientEmail,
      recipientPhone: claimData.recipientPhone,
      recipientOrganization: claimData.recipientOrganization,
      intendedUse: claimData.intendedUse,
      estimatedBeneficiaries: claimData.estimatedBeneficiaries,
      updatedAt: serverTimestamp()
    });
    console.log('Donation status updated successfully');

    return claimRef.id;
  } catch (error) {
    console.error('Error in createClaim:', error);
    throw error;
  }
};

// Helper Components
const getCategoryIcon = (category: string) => {
  const icons = {
    'Produce': <FiShoppingBag size={20} />,
    'Prepared Food': <FiCoffee size={20} />,
    'Baked Goods': <FiBarChart2 size={20} />,
    'Dairy': <FiDroplet size={20} />,
    'Meat': <FiDollarSign size={20} />,
  };
  return icons[category as keyof typeof icons] || <FiPackage size={20} />;
};

const getStatusIcon = (status: string) => {
  const icons = {
    'available': <FiCheck size={12} />,
    'claimed': <FiClock size={12} />,
    'completed': <FiCheckCircle size={12} />,
    'expired': <FiXCircle size={12} />,
  };
  return icons[status as keyof typeof icons] || <FiMeh size={12} />;
};

const isDonationExpired = (expiryDate: string): boolean => new Date(expiryDate) < new Date();

const FoodSafetyCompliance = ({ formData, setFormData, isProcessing, onSafetyScoreChange }: any) => {
  const [showSafetyGuide, setShowSafetyGuide] = useState(false);

  const safetyChecklist = [
    {
      id: 'temperatureControl',
      label: 'Temperature Control',
      description: 'Food has been stored at safe temperatures',
      options: [
        { value: 'proper', label: 'Properly refrigerated/frozen' },
        { value: 'room_temp_safe', label: 'Room temperature (shelf-stable)' },
        { value: 'uncertain', label: 'Uncertain temperature control' },
        { value: 'improper', label: 'Improper temperature control' }
      ]
    },
    {
      id: 'packagingIntact',
      label: 'Packaging Condition',
      description: 'Original packaging is intact and undamaged',
      type: 'boolean'
    },
    {
      id: 'properLabeling',
      label: 'Proper Labeling',
      description: 'Clear labeling with ingredients and expiry date',
      type: 'boolean'
    },
    {
      id: 'contaminationRisk',
      label: 'Contamination Risk',
      description: 'No signs of cross-contamination',
      options: [
        { value: 'low', label: 'Low risk - properly sealed' },
        { value: 'medium', label: 'Medium risk - opened but stored properly' },
        { value: 'high', label: 'High risk - potential contamination' }
      ]
    }
  ];

  const getSafetyScore = () => {
    let score = 0;

    // Temperature control scoring
    const tempScores = {
      'proper': 2,
      'room_temp_safe': 1.5,
      'uncertain': 0.5,
      'improper': 0
    };
    score += tempScores[formData.temperatureControl as keyof typeof tempScores] || 0;

    // Boolean fields scoring - directly check the boolean values
    if (formData.packagingIntact) score += 1;
    if (formData.properLabeling) score += 1;

    // Contamination risk scoring
    const contaminationScores = {
      'low': 2,
      'medium': 1,
      'high': 0
    };
    score += contaminationScores[formData.contaminationRisk as keyof typeof contaminationScores] || 0;

    const total = 6;
    const percentage = Math.round((score / total) * 100);
    return { score, total, percentage };
  };

  const safetyScore = getSafetyScore();
  const isCompliant = safetyScore.percentage >= 75;

  useEffect(() => {
    onSafetyScoreChange(safetyScore.percentage, isCompliant);
  }, [safetyScore.percentage, isCompliant, onSafetyScoreChange]);

  const handleSafetyFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="food-safety-module">
      <div className="safety-header">
        <div className="safety-title">
          <FiShield size={20} />
          Food Safety Compliance
        </div>
        <button
          type="button"
          onClick={() => setShowSafetyGuide(!showSafetyGuide)}
          className="safety-guide-btn"
        >
          <FiInfo size={16} />
          Safety Guide
        </button>
      </div>

      {showSafetyGuide && (
        <div className="safety-guide">
          <h4>Food Safety Guidelines</h4>
          <div className="guide-items">
            {[
              { icon: FiThermometer, text: "Temperature: Keep cold food below 4°C and hot food above 60°C" },
              { icon: FiPackage, text: "Packaging: Ensure original packaging is intact and clean" },
              { icon: FiEye, text: "Inspection: Check for signs of spoilage, mold, or damage" },
              { icon: FiClock, text: "Time: Follow 'first in, first out' and respect expiry dates" }
            ].map((item, index) => (
              <div key={index} className="guide-item">
                <item.icon size={16} />
                <strong>{item.text.split(':')[0]}:</strong>
                {item.text.split(':')[1]}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`safety-score ${isCompliant ? 'compliant' : 'non-compliant'}`}>
        <div className="score-circle">
          <span className="score-percentage">{safetyScore.percentage}%</span>
          <div className="score-label">Safety Score</div>
        </div>
        <div className="score-status">
          {isCompliant ? (
            <>
              <FiCheckCircle size={20} />
              <span>Compliant with Safety Standards</span>
            </>
          ) : (
            <>
              <FiAlertCircle size={20} />
              <span>Needs Improvement</span>
            </>
          )}
        </div>
      </div>

      <div className="safety-checklist">
        {safetyChecklist.map((item) => (
          <div key={item.id} className="safety-item">
            <label className="safety-item-label">
              <strong>{item.label}</strong>
              <span className="safety-description">{item.description}</span>
            </label>

            {item.type === 'boolean' ? (
              <div className="boolean-options">
                {[['true', 'Yes'], ['false', 'No']].map(([value, label]) => (
                  <label key={value} className="boolean-option">
                    <input
                      type="radio"
                      name={item.id}
                      value={value}
                      checked={formData[item.id] === (value === 'true')}
                      onChange={(e) => handleSafetyFieldChange(item.id, e.target.value === 'true')}
                      disabled={isProcessing}
                    />
                    <span className="boolean-label">{label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <select
                value={formData[item.id] || ''}
                onChange={(e) => handleSafetyFieldChange(item.id, e.target.value)}
                className="safety-select"
                disabled={isProcessing}
                required
              >
                <option value="">Select option</option>
                {item.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">
          <div className="label-icon">
            <FiEdit size={16} />
            Additional Safety Notes
          </div>
        </label>
        <textarea
          value={formData.safetyNotes || ''}
          onChange={(e) => handleSafetyFieldChange('safetyNotes', e.target.value)}
          rows={3}
          className="form-textarea"
          placeholder="Any additional safety observations..."
          disabled={isProcessing}
        />
      </div>

      {!isCompliant && (
        <div className="compliance-warning">
          <FiAlertCircle size={20} />
          <div>
            <strong>Safety Compliance Issue</strong>
            <p>This donation does not meet safety standards (minimum 75% required).</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .food-safety-module { 
          background: #f8fafc; 
          border: 1px solid #e2e8f0; 
          border-radius: 12px; 
          padding: 1.5rem; 
          margin-bottom: 1.5rem; 
        }
        .safety-header { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          margin-bottom: 1rem; 
        }
        .safety-title { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          font-size: 1.125rem; 
          font-weight: 600; 
          color: #1f2937; 
        }
        .safety-guide-btn { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          padding: 0.5rem 1rem; 
          background: #dbeafe; 
          color: #1e40af; 
          border: none; 
          border-radius: 6px; 
          font-size: 0.875rem; 
          cursor: pointer; 
          transition: background-color 0.2s; 
        }
        .safety-guide-btn:hover { 
          background: #bfdbfe; 
        }
        .safety-guide { 
          background: white; 
          border: 1px solid #dbeafe; 
          border-radius: 8px; 
          padding: 1rem; 
          margin-bottom: 1rem; 
        }
        .safety-guide h4 { 
          margin: 0 0 0.75rem 0; 
          color: #1e40af; 
          font-size: 1rem; 
        }
        .guide-items { 
          display: flex; 
          flex-direction: column; 
          gap: 0.5rem; 
        }
        .guide-item { 
          display: flex; 
          align-items: flex-start; 
          gap: 0.5rem; 
          font-size: 0.875rem; 
          color: #4b5563; 
          line-height: 1.4; 
        }
        .safety-score { 
          display: flex; 
          align-items: center; 
          gap: 1rem; 
          padding: 1rem; 
          border-radius: 8px; 
          margin-bottom: 1rem; 
        }
        .safety-score.compliant { 
          background: #f0fdf4; 
          border: 1px solid #bbf7d0; 
        }
        .safety-score.non-compliant { 
          background: #fef3f2; 
          border: 1px solid #fecaca; 
        }
        .score-circle { 
          text-align: center; 
          min-width: 80px; 
        }
        .score-percentage { 
          font-size: 1.5rem; 
          font-weight: bold; 
          display: block; 
        }
        .score-label { 
          font-size: 0.75rem; 
          color: #6b7280; 
        }
        .score-status { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          font-weight: 500; 
        }
        .safety-score.compliant .score-status { 
          color: #059669; 
        }
        .safety-score.non-compliant .score-status { 
          color: #dc2626; 
        }
        .safety-checklist { 
          display: flex; 
          flex-direction: column; 
          gap: 1rem; 
          margin-bottom: 1rem; 
        }
        .safety-item { 
          display: flex; 
          flex-direction: column; 
          gap: 0.5rem; 
        }
        .safety-item-label { 
          font-size: 0.875rem; 
        }
        .safety-description { 
          display: block; 
          font-size: 0.75rem; 
          color: #6b7280; 
          margin-top: 2px; 
        }
        .boolean-options { 
          display: flex; 
          gap: 1rem; 
        }
        .boolean-option { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          cursor: pointer; 
        }
        .safety-select { 
          padding: 0.5rem; 
          border: 1px solid #d1d5db; 
          border-radius: 6px; 
          font-size: 0.875rem; 
          background: white; 
        }
        .compliance-warning { 
          display: flex; 
          align-items: flex-start; 
          gap: 0.75rem; 
          padding: 1rem; 
          background: #fef3f2; 
          border: 1px solid #fecaca; 
          border-radius: 8px; 
          color: #dc2626; 
          margin-top: 1rem; 
        }
        .compliance-warning strong { 
          display: block; 
          margin-bottom: 0.25rem; 
        }
        .compliance-warning p { 
          margin: 0; 
          font-size: 0.875rem; 
          line-height: 1.4; 
        }
        .form-group { 
          margin-bottom: 1rem; 
        }
        .form-label { 
          display: block; 
          font-size: 14px; 
          font-weight: 500; 
          color: #374151; 
          margin-bottom: 8px; 
        }
        .label-icon { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
        }
        .form-textarea { 
          width: 100%; 
          padding: 10px 12px; 
          border: 1px solid #d1d5db; 
          border-radius: 8px; 
          font-size: 14px; 
          outline: none; 
          transition: border-color 0.2s; 
          resize: vertical; 
          font-family: inherit; 
        }
        .form-textarea:focus { 
          border-color: #16a34a; 
        }
      `}</style>
    </div>
  );
};

const ClaimedByInfo = ({ donation, claims }: { donation: Donation, claims: Claim[] }) => {
  const donationClaims = claims.filter(claim => claim.donationId === donation.id);
  
  if (donationClaims.length === 0) return null;

  const latestClaim = donationClaims[0];

  return (
    <div className="claimed-by-section">
      <div className="claimed-by-header">
        <FiClipboard size={12} />
        Claim Information
      </div>
      <div className="claimed-by-details">
        <div className="claimed-detail-row">
          <span className="claimed-detail-label">Claimed by:</span>
          <span className="claimed-detail-value">{latestClaim.recipientName}</span>
        </div>
        {latestClaim.recipientEmail && (
          <div className="claimed-detail-row">
            <span className="claimed-detail-label">Email:</span>
            <span className="claimed-detail-value">{latestClaim.recipientEmail}</span>
          </div>
        )}
        {latestClaim.recipientPhone && (
          <div className="claimed-detail-row">
            <span className="claimed-detail-label">Phone:</span>
            <span className="claimed-detail-value">{latestClaim.recipientPhone}</span>
          </div>
        )}
        {latestClaim.intendedUse && (
          <div className="claimed-detail-row">
            <span className="claimed-detail-label">Intended Use:</span>
            <span className="claimed-detail-value">{latestClaim.intendedUse}</span>
          </div>
        )}
        {latestClaim.estimatedBeneficiaries && (
          <div className="claimed-detail-row">
            <span className="claimed-detail-label">Beneficiaries:</span>
            <span className="claimed-detail-value">{latestClaim.estimatedBeneficiaries} people</span>
          </div>
        )}
        <div className="claimed-detail-row">
          <span className="claimed-detail-label">Claim Type:</span>
          <span className="claimed-detail-value">
            {latestClaim.claimType === 'donor_manual' ? 'Manual Claim by Donor' : 'Recipient Claim'}
          </span>
        </div>
      </div>
      <style jsx>{`
        .claimed-by-section { 
          margin-top: 1rem; 
          padding: 12px; 
          background-color: #dbeafe; 
          border-radius: 8px; 
          border: 1px solid #bfdbfe; 
        }
        .claimed-by-header { 
          font-size: 12px; 
          font-weight: 600; 
          color: #1e40af; 
          margin-bottom: 8px; 
          display: flex; 
          align-items: center; 
          gap: 4px; 
        }
        .claimed-by-details { 
          font-size: 13px; 
          color: #374151; 
          line-height: 1.4; 
        }
        .claimed-detail-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 4px; 
        }
        .claimed-detail-label { 
          font-weight: 500; 
          color: #4b5563; 
        }
        .claimed-detail-value { 
          color: #111827; 
          text-align: right; 
        }
      `}</style>
    </div>
  );
};

export default function DonorDashboard() {
  const { user, userProfile } = useAuth();
  const { loading, accessGranted } = useRoleAccess(['donor']);
  const router = useRouter();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [claimingDonation, setClaimingDonation] = useState<Donation | null>(null);
  const [completingDonation, setCompletingDonation] = useState<Donation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [actionType, setActionType] = useState<'create' | 'update' | 'delete' | 'claim' | 'complete' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [safetyScore, setSafetyScore] = useState(0);
  const [isSafetyCompliant, setIsSafetyCompliant] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Produce',
    quantity: '',
    quantityUnit: 'kg' as 'kg' | 'pcs',
    description: '',
    address: '',
    expiryDate: '',
    specialInstructions: '',
    allergens: '',
    storageRequirements: 'Room Temperature',
    temperatureControl: '',
    packagingIntact: false,
    properLabeling: false,
    contaminationRisk: '',
    safetyNotes: ''
  });

  const [claimData, setClaimData] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    recipientOrganization: '',
    intendedUse: '',
    estimatedBeneficiaries: '',
    preferredPickupDate: '',
    preferredPickupTime: ''
  });

  const [completeData, setCompleteData] = useState({
    completionNotes: '',
    recipientFeedback: ''
  });

  // Auth & Data Fetching
  useEffect(() => {
    if (!loading && user && userProfile && !accessGranted) {
      return;
    }
  }, [loading, user, userProfile, accessGranted]);

  const fetchDonations = async () => {
    try {
      console.log('Fetching donations...');
      const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const donationsData: Donation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const donation = { id: doc.id, ...data } as Donation;
        if (donation.status === 'available' && isDonationExpired(donation.expiryDate)) {
          donation.status = 'expired';
        }
        donationsData.push(donation);
      });

      console.log(`Fetched ${donationsData.length} donations`);
      setDonations(donationsData);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const fetchClaims = async () => {
    try {
      if (!user?.uid) {
        console.log('No user UID available for fetching claims');
        return;
      }
      
      console.log('Fetching claims for donor:', user.uid);
      const q = query(
        collection(db, 'claims'),
        where('donorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const claimsData: Claim[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const claim = { id: doc.id, ...data } as Claim;
        console.log(`Found claim: ${claim.id} for donation: ${claim.donationId}`);
        claimsData.push(claim);
      });

      console.log(`Fetched ${claimsData.length} claims for donor ${user.uid}`);
      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  // Real-time listener for claims
  useEffect(() => {
    if (!user?.uid) return;

    console.log('Setting up real-time claims listener for donor:', user.uid);
    const claimsRef = collection(db, 'claims');
    const q = query(
      claimsRef, 
      where('donorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const claimsData: Claim[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          claimsData.push({ id: doc.id, ...data } as Claim);
        });
        console.log('Real-time claims update:', claimsData.length, 'claims');
        setClaims(claimsData);
      }, 
      (error) => {
        console.error('Error in claims listener:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('Refreshing data...');
    await fetchDonations();
    await fetchClaims();
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    if (user && accessGranted) {
      const loadData = async () => {
        setDataLoading(true);
        await fetchDonations();
        await fetchClaims();
        setDataLoading(false);
      };
      loadData();
    }
  }, [user, accessGranted]);

  // Debug logging
  useEffect(() => {
    console.log('=== DONOR DEBUG INFO ===');
    console.log('User UID:', user?.uid);
    console.log('Total claims:', claims.length);
    console.log('User donations:', donations.filter(d => d.donorId === user?.uid).length);
    console.log('==================');
  }, [claims, donations, user]);

  // Image Handling with Cloudinary
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Form Handling
  const resetForm = () => {
    setFormData({
      title: '',
      category: 'Produce',
      quantity: '',
      quantityUnit: 'kg',
      description: '',
      address: '',
      expiryDate: '',
      specialInstructions: '',
      allergens: '',
      storageRequirements: 'Room Temperature',
      temperatureControl: '',
      packagingIntact: false,
      properLabeling: false,
      contaminationRisk: '',
      safetyNotes: ''
    });
    setSafetyScore(0);
    setIsSafetyCompliant(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const resetClaimForm = () => {
    setClaimData({
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
      recipientOrganization: '',
      intendedUse: '',
      estimatedBeneficiaries: '',
      preferredPickupDate: '',
      preferredPickupTime: ''
    });
  };

  const resetCompleteForm = () => {
    setCompleteData({
      completionNotes: '',
      recipientFeedback: ''
    });
  };

  useEffect(() => {
    if (editingDonation) {
      setFormData({
        title: editingDonation.title || '',
        category: editingDonation.category || 'Produce',
        quantity: editingDonation.quantity || '',
        quantityUnit: editingDonation.quantityUnit || 'kg',
        description: editingDonation.description || '',
        address: editingDonation.address || '',
        expiryDate: editingDonation.expiryDate || '',
        specialInstructions: editingDonation.specialInstructions || '',
        allergens: editingDonation.allergens?.join(', ') || '',
        storageRequirements: editingDonation.storageRequirements || 'Room Temperature',
        temperatureControl: editingDonation.temperatureControl || '',
        packagingIntact: editingDonation.packagingIntact || false,
        properLabeling: editingDonation.properLabeling || false,
        contaminationRisk: editingDonation.contaminationRisk || '',
        safetyNotes: editingDonation.safetyNotes || ''
      });
      setImagePreview(editingDonation.imageUrl || null);
    } else {
      resetForm();
    }
  }, [editingDonation]);

  const handleSafetyScoreChange = (score: number, isCompliant: boolean) => {
    setSafetyScore(score);
    setIsSafetyCompliant(isCompliant);
  };

  // Donation Operations
  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    if (!isSafetyCompliant) {
      alert('Cannot submit donation: Safety compliance score must be 75% or higher.');
      return;
    }

    setIsProcessing(true);
    setActionType(editingDonation ? 'update' : 'create');
    setProcessingMessage(editingDonation ? 'Updating your donation...' : 'Creating your donation...');

    try {
      let imageUrl = editingDonation?.imageUrl || '';
      let imagePublicId = editingDonation?.imagePublicId || '';

      // Handle image upload to Cloudinary
      if (selectedImage) {
        setIsUploadingImage(true);
        setProcessingMessage('Uploading image...');
        try {
          const imageData = await uploadToCloudinary(selectedImage);
          imageUrl = imageData.url;
          imagePublicId = imageData.publicId;

          // Delete old image if editing and image changed
          if (editingDonation?.imagePublicId && editingDonation.imagePublicId !== imagePublicId) {
            await deleteFromCloudinary(editingDonation.imagePublicId);
          }
        } catch (error) {
          setProcessingMessage('Failed to upload image. Please try again.');
          setIsUploadingImage(false);
          setIsProcessing(false);
          return;
        }
        setIsUploadingImage(false);
      }

      const donationData: any = {
        title: formData.title,
        category: formData.category,
        quantity: formData.quantity,
        quantityUnit: formData.quantityUnit,
        description: formData.description,
        address: formData.address,
        expiryDate: formData.expiryDate,
        specialInstructions: formData.specialInstructions,
        allergens: formData.allergens ? formData.allergens.split(',').map((a: string) => a.trim()) : [],
        storageRequirements: formData.storageRequirements,
        foodSafetyChecked: true,
        temperatureControl: formData.temperatureControl,
        packagingIntact: formData.packagingIntact,
        properLabeling: formData.properLabeling,
        contaminationRisk: formData.contaminationRisk,
        safetyNotes: formData.safetyNotes,
        safetyScore: safetyScore,
        imageUrl,
        imagePublicId,
        status: 'available',
        donorId: user.uid,
        donorName: userProfile.displayName,
        donorRating: userProfile.rating || 5,
        updatedAt: serverTimestamp()
      };

      if (!editingDonation) {
        donationData.createdAt = serverTimestamp();
      }

      if (editingDonation) {
        await updateDoc(doc(db, 'donations', editingDonation.id), donationData);
        setProcessingMessage('Donation updated successfully!');
      } else {
        await addDoc(collection(db, 'donations'), donationData);
        setProcessingMessage('Donation created successfully!');
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchDonations();
      setIsCreateModalOpen(false);
      setEditingDonation(null);
      resetForm();
    } catch (error) {
      console.error('Error saving donation:', error);
      setProcessingMessage('Failed to save donation. Please try again.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
      setIsUploadingImage(false);
      setActionType(null);
    }
  };

  const handleMarkAsClaimed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingDonation || !user) return;

    console.log('Starting manual claim process...');
    console.log('Donor:', user.uid);
    console.log('Donation:', claimingDonation.id);

    setIsProcessing(true);
    setActionType('claim');
    setProcessingMessage('Creating claim record...');

    try {
      // Create claim document using the enhanced function
      const claimDocData = {
        donorId: user.uid,
        recipientName: claimData.recipientName,
        recipientEmail: claimData.recipientEmail,
        recipientPhone: claimData.recipientPhone,
        recipientOrganization: claimData.recipientOrganization,
        intendedUse: claimData.intendedUse,
        estimatedBeneficiaries: claimData.estimatedBeneficiaries,
        preferredPickupDate: claimData.preferredPickupDate,
        preferredPickupTime: claimData.preferredPickupTime
      };

      console.log('Manual claim data:', claimDocData);

      await createClaim(claimingDonation.id, claimDocData, 'donor_manual');

      setProcessingMessage('Donation marked as claimed successfully!');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await fetchDonations();
      await fetchClaims();
      setIsClaimModalOpen(false);
      setClaimingDonation(null);
      resetClaimForm();
    } catch (error) {
      console.error('Error marking donation as claimed:', error);
      setProcessingMessage('Failed to mark donation as claimed. Please try again.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleMarkAsComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingDonation) return;

    setIsProcessing(true);
    setActionType('complete');
    setProcessingMessage('Marking donation as completed...');

    try {
      await updateDoc(doc(db, 'donations', completingDonation.id), {
        status: 'completed',
        ...completeData,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setProcessingMessage('Donation marked as completed successfully!');
      await new Promise(resolve => setTimeout(resolve, 1500));

      await fetchDonations();
      setIsCompleteModalOpen(false);
      setCompletingDonation(null);
      resetCompleteForm();
    } catch (error) {
      console.error('Error marking donation as completed:', error);
      setProcessingMessage('Failed to mark donation as completed. Please try again.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleDeleteDonation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this donation?')) return;

    setIsProcessing(true);
    setActionType('delete');
    setProcessingMessage('Deleting donation...');

    try {
      // Get donation first to delete image from Cloudinary
      const donationToDelete = donations.find(d => d.id === id);
      if (donationToDelete?.imagePublicId) {
        await deleteFromCloudinary(donationToDelete.imagePublicId);
      }

      await deleteDoc(doc(db, 'donations', id));
      setProcessingMessage('Donation deleted successfully!');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchDonations();
    } catch (error) {
      console.error('Error deleting donation:', error);
      setProcessingMessage('Failed to delete donation. Please try again.');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  // Filtering & Data
  if (!user || !userProfile || !accessGranted) return null;

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

  const userDonations = donations.filter(d => d.donorId === user?.uid);
  const activeDonations = userDonations.filter(d => d.status === 'available' || d.status === 'claimed');
  const completedDonations = userDonations.filter(d => d.status === 'completed');
  const expiredDonations = userDonations.filter(d => d.status === 'expired');

  const filteredActiveDonations = activeDonations.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="donor-dashboard-container">
      <div className="dashboard-main">
        {/* Stats Grid */}
        <div className="stats-grid">
          {[
            { icon: FiPackage, value: userDonations.length, label: 'Total Donations', desc: 'All time', color: 'donor' },
            { icon: FiCheck, value: activeDonations.length, label: 'Active Donations', desc: 'Available & claimed', color: 'recipient' },
            { icon: FiCheckCircle, value: completedDonations.length, label: 'Completed', desc: 'Successfully delivered', color: 'volunteer' },
            { icon: FiClipboard, value: claims.length, label: 'Total Claims', desc: 'All claims received', color: 'delivery' },
            { icon: FiStar, value: `${userProfile.rating || 5}/5`, label: 'Community Rating', desc: 'Keep up the good work!', color: 'rating' }
          ].map((stat, index) => (
            <div key={index} className="stat-card">
              <div className={`stat-icon ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-description">{stat.desc}</div>
            </div>
          ))}
        </div>

        {/* Active Donations Section */}
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Active Donations</h2>
            <div className="header-actions">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
              >
                <FiRefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={() => {
                  setEditingDonation(null);
                  setIsCreateModalOpen(true);
                }}
                className="primary-btn"
              >
                <FiPlus size={20} />
                Create Donation
              </button>
            </div>
          </div>

          <div className="search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">
                <FiSearch size={20} />
              </span>
              <input
                type="text"
                placeholder="Search active donations..."
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
              {['Produce', 'Prepared Food', 'Baked Goods', 'Dairy', 'Meat', 'Other'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {filteredActiveDonations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FiPackage size={64} />
              </div>
              <h3 className="empty-title">
                {activeDonations.length === 0 ? 'No donations yet' : 'No matching donations'}
              </h3>
              <p className="empty-text">
                {activeDonations.length === 0
                  ? 'Start making a difference by creating your first donation!'
                  : 'Try adjusting your search criteria'
                }
              </p>
              {activeDonations.length === 0 && (
                <button
                  onClick={() => {
                    setEditingDonation(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="primary-btn"
                >
                  <FiPlus size={20} />
                  Create Your First Donation
                </button>
              )}
            </div>
          ) : (
            <div className="donations-grid">
              {filteredActiveDonations.map(donation => (
                <div key={donation.id} className="donation-card">
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
                  </div>
                  <div className="donation-content">
                    <h3 className="donation-title">{donation.title}</h3>
                    <div className="badges-container">
                      <span className={`badge category ${donation.category.toLowerCase().replace(' ', '-')}`}>
                        {getCategoryIcon(donation.category)}
                        {donation.category}
                      </span>
                      <span className={`badge status ${donation.status}`}>
                        {getStatusIcon(donation.status)}
                        {donation.status === 'available' ? 'Available' : 'Claimed'}
                      </span>
                      {donation.foodSafetyChecked && donation.safetyScore && (
                        <span className={`badge safety ${donation.safetyScore >= 75 ? 'compliant' : 'warning'}`}>
                          <FiShield size={12} />
                          Safety: {donation.safetyScore}%
                        </span>
                      )}
                    </div>
                    <p className="donation-desc">{donation.description}</p>
                    {[
                      { icon: FiPackage, text: `${donation.quantity} ${donation.quantityUnit?.toUpperCase()}` },
                      { icon: FiMapPin, text: donation.address },
                      { icon: FiCalendar, text: `Best before: ${donation.expiryDate}` }
                    ].map((item, index) => (
                      <div key={index} className="info-row">
                        <item.icon size={16} />
                        <span className="info-text">{item.text}</span>
                      </div>
                    ))}
                    {donation.status === 'claimed' && (
                      <ClaimedByInfo donation={donation} claims={claims} />
                    )}
                    <div className="button-group">
                      {donation.status === 'available' && (
                        <button
                          onClick={() => {
                            setClaimingDonation(donation);
                            setIsClaimModalOpen(true);
                          }}
                          className="btn claim-btn"
                        >
                          <FiUsers size={16} />
                          Mark as Claimed
                        </button>
                      )}
                      {donation.status === 'claimed' && (
                        <button
                          onClick={() => {
                            setCompletingDonation(donation);
                            setIsCompleteModalOpen(true);
                          }}
                          className="btn complete-btn"
                        >
                          <FiCheckCircle size={16} />
                          Mark as Complete
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingDonation(donation);
                          setIsCreateModalOpen(true);
                        }}
                        className="btn edit-btn"
                      >
                        <FiEdit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDonation(donation.id)}
                        className="btn delete-btn"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claims Section */}
        {claims.length > 0 && (
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Recent Claims</h2>
              <div className="header-actions">
                <span className="claims-count">{claims.length} total claims</span>
              </div>
            </div>
            <div className="claims-list">
              {claims.slice(0, 5).map(claim => (
                <div key={claim.id} className="claim-item">
                  <div className="claim-header">
                    <span className="claim-recipient">{claim.recipientName}</span>
                    <span className={`claim-type ${claim.claimType}`}>
                      {claim.claimType === 'donor_manual' ? 'Manual Claim' : 'Recipient Claim'}
                    </span>
                  </div>
                  <div className="claim-details">
                    <span className="claim-email">{claim.recipientEmail}</span>
                    {claim.recipientPhone && (
                      <span className="claim-phone">{claim.recipientPhone}</span>
                    )}
                    {claim.intendedUse && (
                      <span className="claim-use">For: {claim.intendedUse}</span>
                    )}
                  </div>
                  <div className="claim-status">
                    <span className={`status-badge ${claim.status}`}>
                      {claim.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed & Expired Sections */}
        {[
          {
            data: completedDonations,
            show: showCompleted,
            setShow: setShowCompleted,
            icon: FiCheckCircle,
            title: 'Completed Donations',
            type: 'completed'
          },
          {
            data: expiredDonations,
            show: showExpired,
            setShow: setShowExpired,
            icon: FiXCircle,
            title: 'Expired Donations',
            type: 'expired'
          }
        ].map(({ data, show, setShow, icon: Icon, title, type }) => data.length > 0 && (
          <div key={type} className="section-container">
            <div
              className="section-header-collapsible"
              onClick={() => setShow(!show)}
            >
              <div className="section-title-with-count">
                <Icon size={24} />
                {title}
                <span className="count-badge">{data.length}</span>
              </div>
              {show ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </div>
            {show && (
              <div className="history-list">
                {data.map((donation, index) => (
                  <div
                    key={donation.id}
                    className={`history-item ${index % 2 === 0 ? 'even' : 'odd'}`}
                  >
                    <div className={`history-item-icon ${type}`}>
                      {getCategoryIcon(donation.category)}
                    </div>
                    <div className="history-item-content">
                      <div className="history-item-title">{donation.title}</div>
                      <div className="history-item-meta">
                        <span>{donation.quantity} {donation.quantityUnit?.toUpperCase()}</span>
                        <span>•</span>
                        <span>{donation.category}</span>
                        <span>•</span>
                        <span>{donation.address}</span>
                        {donation.recipientName && (
                          <>
                            <span>•</span>
                            <span>Claimed by: {donation.recipientName}</span>
                          </>
                        )}
                        {type === 'expired' && (
                          <>
                            <span>•</span>
                            <span>Expired: {donation.expiryDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="history-item-actions">
                      <button
                        onClick={() => handleDeleteDonation(donation.id)}
                        className="btn delete-btn small"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => {
          if (!isProcessing) {
            setIsCreateModalOpen(false);
            setEditingDonation(null);
            resetForm();
          }
        }}>
          <div className="modal-content create-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-top">
                <h2 className="modal-title">
                  {editingDonation ? 'Edit Donation' : 'Create New Donation'}
                </h2>
                {!isProcessing && (
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingDonation(null);
                      resetForm();
                    }}
                    className="close-modal-btn"
                  >
                    <FiX size={24} />
                  </button>
                )}
              </div>
              <p className="modal-subtitle">Share your surplus food with the community</p>
            </div>

            <form onSubmit={handleSubmitDonation} className="modal-form">
              {/* Basic Information Fields */}
              <div className="form-group">
                <label className="form-label">
                  <div className="label-icon">
                    <FiEdit size={16} />
                    Food Title *
                  </div>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Fresh Vegetables & Fruits"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiShoppingBag size={16} />
                      Category *
                    </div>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-input"
                    disabled={isProcessing}
                  >
                    {['Produce', 'Prepared Food', 'Baked Goods', 'Dairy', 'Meat', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiPackage size={16} />
                      Quantity *
                    </div>
                  </label>
                  <div className="quantity-input-group">
                    <input
                      type="text"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="form-input quantity-input"
                      placeholder="e.g., 50"
                      disabled={isProcessing}
                    />
                    <select
                      value={formData.quantityUnit}
                      onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value as 'kg' | 'pcs' })}
                      className="unit-select"
                      disabled={isProcessing}
                    >
                      <option value="kg">KG</option>
                      <option value="pcs">PCS</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <div className="label-icon">
                    <FiEdit size={16} />
                    Description *
                  </div>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="form-textarea"
                  placeholder="Describe the food items, ingredients, and any important details..."
                  disabled={isProcessing}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiHome size={16} />
                      Pickup Address *
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                    placeholder="Full street address for pickup"
                    disabled={isProcessing}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiCalendar size={16} />
                      Best Before Date *
                    </div>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="form-input"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="form-group">
                <label className="form-label">
                  <div className="label-icon">
                    <FiImage size={16} />
                    Donation Photo
                  </div>
                </label>
                <div className="image-upload-section">
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <div className="image-preview">
                        <img
                          src={imagePreview}
                          alt="Donation preview"
                          className="preview-image"
                        />
                        {!isProcessing && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="remove-image-btn"
                          >
                            <FiX size={16} />
                          </button>
                        )}
                      </div>
                      {!isProcessing && (
                        <div className="image-upload-actions">
                          <label className="btn secondary-btn small">
                            <FiEdit size={14} />
                            Change Photo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden-file-input"
                              disabled={isProcessing}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="image-upload-placeholder">
                      <div className="upload-icon">
                        <FiImage size={32} />
                      </div>
                      <div className="upload-text">
                        <strong>Click to upload a photo</strong>
                        <span>JPEG, PNG (Max 5MB)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden-file-input"
                        disabled={isProcessing}
                      />
                    </label>
                  )}
                </div>
                {isUploadingImage && (
                  <div className="uploading-indicator">
                    <FiLoader size={16} className="spinning" />
                    <span>Uploading image...</span>
                  </div>
                )}
              </div>

              {/* Additional Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiAlertCircle size={16} />
                      Allergens
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.allergens}
                    onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                    className="form-input"
                    placeholder="e.g., nuts, dairy, gluten (separate with commas)"
                    disabled={isProcessing}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiPackage size={16} />
                      Storage Requirements
                    </div>
                  </label>
                  <select
                    value={formData.storageRequirements}
                    onChange={(e) => setFormData({ ...formData, storageRequirements: e.target.value })}
                    className="form-input"
                    disabled={isProcessing}
                  >
                    {['Room Temperature', 'Refrigerated', 'Frozen', 'Dry Storage'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <div className="label-icon">
                    <FiInfo size={16} />
                    Special Instructions
                  </div>
                </label>
                <textarea
                  value={formData.specialInstructions}
                  onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                  rows={2}
                  className="form-textarea"
                  placeholder="Any special pickup instructions, handling requirements, or additional notes..."
                  disabled={isProcessing}
                />
              </div>

              {/* Food Safety Compliance */}
              <FoodSafetyCompliance
                formData={formData}
                setFormData={setFormData}
                isProcessing={isProcessing}
                onSafetyScoreChange={handleSafetyScoreChange}
              />

              <div className="info-box">
                <div className="info-box-header">
                  <FiInfo size={16} />
                  <strong>Food Safety Reminder</strong>
                </div>
                <p className="info-box-text">
                  All donations must meet a minimum 75% safety compliance score to be submitted.
                </p>
              </div>

              <div className="modal-actions">
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingDonation(null);
                      resetForm();
                    }}
                    className="btn secondary-btn"
                  >
                    <FiX size={16} />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isProcessing || !isSafetyCompliant}
                  className={`btn primary-btn ${isProcessing ? 'processing' : ''} ${!isSafetyCompliant ? 'disabled' : ''}`}
                >
                  {isProcessing ? (
                    <>
                      <FiLoader size={16} />
                      Processing...
                    </>
                  ) : !isSafetyCompliant ? (
                    <>
                      <FiAlertCircle size={16} />
                      Safety Compliance Required (75%+)
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} />
                      {editingDonation ? 'Update Donation' : 'Create Donation'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {isClaimModalOpen && claimingDonation && (
        <div className="modal-overlay" onClick={() => {
          if (!isProcessing) {
            setIsClaimModalOpen(false);
            setClaimingDonation(null);
            resetClaimForm();
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-top">
                <h2 className="modal-title">
                  <FiClipboard size={24} />
                  Mark Donation as Claimed
                </h2>
                {!isProcessing && (
                  <button
                    onClick={() => {
                      setIsClaimModalOpen(false);
                      setClaimingDonation(null);
                      resetClaimForm();
                    }}
                    className="close-modal-btn"
                  >
                    <FiX size={24} />
                  </button>
                )}
              </div>
              <p className="modal-subtitle">
                Enter recipient information for: <strong>{claimingDonation.title}</strong>
              </p>
            </div>

            <form onSubmit={handleMarkAsClaimed} className="modal-form">
              <div className="info-box">
                <div className="info-box-header">
                  <FiInfo size={16} />
                  <strong>Manual Claim</strong>
                </div>
                <p className="info-box-text">
                  Use this form when you've arranged pickup with a recipient outside the platform.
                  This will create a claim record and mark the donation as claimed.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <div className="label-icon">
                    <FiUser size={16} />
                    Recipient Name *
                  </div>
                </label>
                <input
                  type="text"
                  required
                  name="recipientName"
                  value={claimData.recipientName}
                  onChange={(e) => setClaimData({ ...claimData, recipientName: e.target.value })}
                  className="form-input"
                  placeholder="Enter recipient's full name"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiMail size={16} />
                      Recipient Email *
                    </div>
                  </label>
                  <input
                    type="email"
                    required
                    name="recipientEmail"
                    value={claimData.recipientEmail}
                    onChange={(e) => setClaimData({ ...claimData, recipientEmail: e.target.value })}
                    className="form-input"
                    placeholder="recipient@email.com"
                    disabled={isProcessing}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiPhone size={16} />
                      Recipient Phone
                    </div>
                  </label>
                  <input
                    type="tel"
                    name="recipientPhone"
                    value={claimData.recipientPhone}
                    onChange={(e) => setClaimData({ ...claimData, recipientPhone: e.target.value })}
                    className="form-input"
                    placeholder="+63 912 3456 789"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <div className="label-icon">
                    <FiUsers size={16} />
                    Organization (Optional)
                  </div>
                </label>
                <input
                  type="text"
                  name="recipientOrganization"
                  value={claimData.recipientOrganization}
                  onChange={(e) => setClaimData({ ...claimData, recipientOrganization: e.target.value })}
                  className="form-input"
                  placeholder="Recipient's organization or community group"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <div className="label-icon">
                    <FiClipboard size={16} />
                    Intended Use
                  </div>
                </label>
                <select
                  name="intendedUse"
                  value={claimData.intendedUse}
                  onChange={(e) => setClaimData({ ...claimData, intendedUse: e.target.value })}
                  className="form-input"
                  disabled={isProcessing}
                >
                  <option value="">Select intended use</option>
                  <option value="community_meal">Community Meal Program</option>
                  <option value="food_pantry">Food Pantry Distribution</option>
                  <option value="shelter">Shelter Meals</option>
                  <option value="school_program">School Program</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiUsers size={16} />
                      Estimated Beneficiaries
                    </div>
                  </label>
                  <input
                    type="number"
                    name="estimatedBeneficiaries"
                    value={claimData.estimatedBeneficiaries}
                    onChange={(e) => setClaimData({ ...claimData, estimatedBeneficiaries: e.target.value })}
                    className="form-input"
                    placeholder="e.g., 50"
                    min="1"
                    disabled={isProcessing}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <div className="label-icon">
                      <FiCalendar size={16} />
                      Preferred Pickup Date
                    </div>
                  </label>
                  <input
                    type="date"
                    name="preferredPickupDate"
                    value={claimData.preferredPickupDate}
                    onChange={(e) => setClaimData({ ...claimData, preferredPickupDate: e.target.value })}
                    className="form-input"
                    min={new Date().toISOString().split('T')[0]}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="modal-actions">
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsClaimModalOpen(false);
                      setClaimingDonation(null);
                      resetClaimForm();
                    }}
                    className="btn secondary-btn"
                  >
                    <FiX size={16} />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`btn primary-btn ${isProcessing ? 'processing' : ''}`}
                >
                  {isProcessing ? (
                    <>
                      <FiLoader size={16} />
                      Creating Claim...
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} />
                      Mark as Claimed
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
                ? 'Success!' 
                : processingMessage.includes('Failed')
                  ? 'Action Failed'
                  : 'Processing...'
              }
            </h3>
            
            <p className="processing-message">
              {processingMessage}
            </p>

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

      {/* Keep all the CSS styles from your original code */}
      <style jsx>{`
        /* All the CSS styles from the previous implementation remain the same */
        .donor-dashboard-container { 
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
        @media (min-width: 1024px) { 
          .donor-dashboard-container { 
            left: 260px; 
            width: calc(100% - 260px); 
          } 
        }
        .dashboard-main { 
          flex: 1; 
          overflow-y: auto; 
          padding: 1.5rem; 
          max-width: 1280px; 
          margin: 0 auto; 
          width: 100%; 
        }
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
        .stat-icon.rating { 
          background-color: #fce7f3; 
          color: #db2777; 
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
        .claims-count { 
          font-size: 14px; 
          color: #6b7280; 
          font-weight: 500; 
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
        .primary-btn { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 12px 24px; 
          background-color: #16a34a; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 500; 
          transition: all 0.2s; 
        }
        .primary-btn:hover { 
          background-color: #15803d; 
        }
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
        .category-select { 
          padding: 12px 16px; 
          border: 1px solid #d1d5db; 
          border-radius: 8px; 
          font-size: 14px; 
          background-color: white; 
          cursor: pointer; 
          outline: none; 
          min-width: 200px; 
        }
        .donations-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
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
          transform: translateY(-2px); 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
        }
        .donation-image { 
          height: 192px; 
          background: linear-gradient(135deg, #dcfce7 0%, #dbeafe 100%); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 64px; 
          color: #16a34a; 
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
        }
        .donation-content { 
          padding: 1.25rem; 
        }
        .donation-title { 
          font-size: 1.125rem; 
          font-weight: 600; 
          color: #111827; 
          margin-bottom: 0.5rem; 
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
        .badge.safety { 
          font-size: 11px; 
        }
        .badge.safety.compliant { 
          background-color: #dcfce7; 
          color: #15803d; 
        }
        .badge.safety.warning { 
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
          background-color: #f59e0b; 
          color: white; 
        }
        .btn.claim-btn:hover { 
          background-color: #d97706; 
        }
        .btn.complete-btn { 
          background-color: #16a34a; 
          color: white; 
        }
        .btn.complete-btn:hover { 
          background-color: #15803d; 
        }
        .btn.edit-btn { 
          background-color: #2563eb; 
          color: white; 
        }
        .btn.edit-btn:hover { 
          background-color: #1d4ed8; 
        }
        .btn.delete-btn { 
          background-color: #fee2e2; 
          color: #dc2626; 
          flex: none; 
          width: auto; 
          padding-left: 20px; 
          padding-right: 20px; 
        }
        .btn.delete-btn:hover { 
          background-color: #fecaca; 
        }
        .btn.delete-btn.small { 
          padding: 8px 12px; 
        }
        .quantity-input-group { 
          display: flex; 
          gap: 0.5rem; 
        }
        .quantity-input { 
          flex: 1; 
        }
        .unit-select { 
          padding: 10px 12px; 
          border: 1px solid #d1d5db; 
          border-radius: 8px; 
          font-size: 14px; 
          background: white; 
          min-width: 80px; 
        }
        .btn.primary-btn.disabled { 
          background-color: #9ca3af; 
          cursor: not-allowed; 
        }
        .btn.primary-btn.disabled:hover { 
          background-color: #9ca3af; 
        }
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

        /* Claims List Styles */
        .claims-list { 
          background: white; 
          border-radius: 12px; 
          border: 1px solid #e5e7eb; 
          overflow: hidden; 
        }
        .claim-item { 
          padding: 1rem 1.5rem; 
          border-bottom: 1px solid #f3f4f6; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          gap: 1rem; 
        }
        .claim-item:last-child { 
          border-bottom: none; 
        }
        .claim-header { 
          display: flex; 
          align-items: center; 
          gap: 1rem; 
          flex: 1; 
        }
        .claim-recipient { 
          font-weight: 600; 
          color: #111827; 
        }
        .claim-type { 
          padding: 4px 8px; 
          border-radius: 12px; 
          font-size: 12px; 
          font-weight: 500; 
        }
        .claim-type.donor_manual { 
          background-color: #fef3c7; 
          color: #b45309; 
        }
        .claim-type.recipient { 
          background-color: #dbeafe; 
          color: #1e40af; 
        }
        .claim-details { 
          display: flex; 
          gap: 1rem; 
          font-size: 14px; 
          color: #6b7280; 
          flex: 2; 
        }
        .claim-status { 
          flex-shrink: 0; 
        }
        .status-badge { 
          padding: 4px 8px; 
          border-radius: 12px; 
          font-size: 12px; 
          font-weight: 500; 
        }
        .status-badge.pending { 
          background-color: #fef3c7; 
          color: #b45309; 
        }
        .status-badge.approved { 
          background-color: #dcfce7; 
          color: #15803d; 
        }
        .status-badge.completed { 
          background-color: #dbeafe; 
          color: #1e40af; 
        }

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
        .history-item-actions { 
          display: flex; 
          gap: 8px; 
        }
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
        .create-edit-modal { 
          max-height: 85vh; 
        }
        .modal-content.large { 
          max-width: 800px; 
        }
        .modal-content.medium { 
          max-width: 600px; 
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
        .label-icon { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
        }
        .form-input, .form-textarea { 
          width: 100%; 
          padding: 10px 12px; 
          border: 1px solid #d1d5db; 
          border-radius: 8px; 
          font-size: 14px; 
          outline: none; 
          transition: border-color 0.2s; 
          font-family: inherit; 
        }
        .form-input:focus, .form-textarea:focus { 
          border-color: #16a34a; 
        }
        .form-textarea { 
          resize: vertical; 
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
        .contact-info { 
          background-color: #f8fafc; 
          padding: 1rem; 
          border-radius: 8px; 
          margin-top: 1rem; 
          border: 1px solid #e2e8f0; 
        }
        .contact-info-header { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          margin-bottom: 8px; 
          font-weight: 600; 
          color: #374151; 
        }
        .contact-row { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-size: 14px; 
          color: #475569; 
          margin-bottom: 4px; 
        }
        .warning-box { 
          padding: 1rem; 
          background-color: #fef3c7; 
          border-radius: 8px; 
          margin-bottom: 1rem; 
          border: 1px solid #fcd34d; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
        }
        .warning-box p { 
          font-size: 14px; 
          color: #b45309; 
          margin: 0; 
        }
        .success-box { 
          padding: 1rem; 
          background-color: #dcfce7; 
          border-radius: 8px; 
          margin-bottom: 1rem; 
          border: 1px solid #86efac; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
        }
        .success-box p { 
          font-size: 14px; 
          color: #15803d; 
          margin: 0; 
        }
        .modal-actions { 
          display: flex; 
          gap: 0.75rem; 
          padding-top: 1rem; 
        }
        .btn.secondary-btn { 
          background-color: white; 
          color: #374151; 
          border: 1px solid #d1d5db; 
        }
        .btn.secondary-btn:hover { 
          background-color: #f9fafb; 
        }
        .btn.warning-btn { 
          background-color: #f59e0b; 
          color: white; 
        }
        .btn.warning-btn:hover:not(.processing) { 
          background-color: #d97706; 
        }
        .btn.success-btn { 
          background-color: #16a34a; 
          color: white; 
        }
        .btn.success-btn:hover:not(.processing) { 
          background-color: #15803d; 
        }
        .btn.error-btn { 
          background-color: #dc2626; 
          color: white; 
        }
        .btn.error-btn:hover { 
          background-color: #b91c1c; 
        }
        .btn.processing { 
          background-color: #9ca3af; 
          cursor: not-allowed; 
        }
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
        
        /* Image Upload Styles */
        .image-upload-section { 
          margin-top: 0.5rem; 
        }
        .image-preview-container { 
          display: flex; 
          flex-direction: column; 
          gap: 1rem; 
        }
        .image-preview { 
          position: relative; 
          width: 100%; 
          max-width: 300px; 
          height: 200px; 
          border-radius: 8px; 
          overflow: hidden; 
          border: 2px dashed #d1d5db; 
        }
        .preview-image { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
        }
        .remove-image-btn { 
          position: absolute; 
          top: 8px; 
          right: 8px; 
          width: 32px; 
          height: 32px; 
          background: rgba(0, 0, 0, 0.7); 
          color: white; 
          border: none; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          transition: background-color 0.2s; 
        }
        .remove-image-btn:hover { 
          background: rgba(0, 0, 0, 0.9); 
        }
        .image-upload-actions { 
          display: flex; 
          gap: 0.5rem; 
        }
        .image-upload-placeholder { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          width: 100%; 
          max-width: 300px; 
          height: 200px; 
          border: 2px dashed #d1d5db; 
          border-radius: 8px; 
          cursor: pointer; 
          transition: all 0.2s; 
          background: #f9fafb; 
          text-align: center; 
          padding: 1rem; 
        }
        .image-upload-placeholder:hover { 
          border-color: #16a34a; 
          background: #f0fdf4; 
        }
        .upload-icon { 
          color: #9ca3af; 
          margin-bottom: 0.5rem; 
        }
        .upload-text { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
        }
        .upload-text strong { 
          font-size: 14px; 
          color: #374151; 
        }
        .upload-text span { 
          font-size: 12px; 
          color: #6b7280; 
        }
        .hidden-file-input { 
          display: none; 
        }
        .uploading-indicator { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          margin-top: 0.5rem; 
          font-size: 14px; 
          color: #6b7280; 
        }
        .spinning { 
          animation: spin 1s linear infinite; 
        }
        .btn.secondary-btn.small { 
          padding: 8px 16px; 
          font-size: 12px; 
        }

        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}