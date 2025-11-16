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
  FiTruck, 
  FiRefreshCw, 
  FiClipboard, 
  FiStar, 
  FiClock,
  FiMapPin,
  FiCheck,
  FiUser,
  FiArrowRight,
  FiPackage,
  FiCalendar,
  FiHome,
  FiNavigation,
  FiLoader,
  FiAlertCircle,
  FiPhone,
  FiMail,
  FiX,
  FiInfo,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
  FiChevronUp,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMap,
  FiNavigation2,
  FiAlertTriangle,
  FiHeart,
  FiShield,
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
  status: 'available' | 'claimed' | 'assigned' | 'completed' | 'expired';
  donorId: string;
  donorName: string;
  donorRating: number;
  donorContact?: string;
  donorEmail?: string;
  donorAddress?: string;
  donorPhone?: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientOrganization?: string;
  intendedUse?: string;
  estimatedBeneficiaries?: string;
  volunteerId?: string;
  volunteerName?: string;
  createdAt: any;
  claimedAt?: any;
  assignedAt?: any;
  completedAt?: any;
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
  pickupInstructions?: string;
  distance?: number;
}

// Helper function to get category icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Produce':
      return <FiPackage size={20} />;
    case 'Prepared Food':
      return <FiClipboard size={20} />;
    case 'Baked Goods':
      return <FiStar size={20} />;
    case 'Dairy':
      return <FiUsers size={20} />;
    case 'Meat':
      return <FiTruck size={20} />;
    default:
      return <FiPackage size={20} />;
  }
};

// Helper function to get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'available':
      return <FiClipboard size={16} />;
    case 'claimed':
      return <FiClock size={16} />;
    case 'assigned':
      return <FiTruck size={16} />;
    case 'completed':
      return <FiCheckCircle size={16} />;
    case 'expired':
      return <FiXCircle size={16} />;
    default:
      return <FiClipboard size={16} />;
  }
};

// Helper function to get status text
const getStatusText = (status: string) => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'claimed':
      return 'Needs Volunteer';
    case 'assigned':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return { bg: '#dcfce7', text: '#15803d' };
    case 'claimed':
      return { bg: '#fef3c7', text: '#b45309' };
    case 'assigned':
      return { bg: '#dbeafe', text: '#1e40af' };
    case 'completed':
      return { bg: '#dcfce7', text: '#15803d' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
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

// Type for Firebase error
interface FirebaseError {
  code: string;
  message: string;
  name: string;
}

// Type guard to check if error is FirebaseError
const isFirebaseError = (error: unknown): error is FirebaseError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'name' in error
  );
};

// Full Details Modal Component
const FullDetailsModal = ({ 
  donation, 
  onClose,
  onAccept,
  onComplete,
  isProcessing
}: { 
  donation: Donation; 
  onClose: () => void;
  onAccept?: () => void;
  onComplete?: () => void;
  isProcessing?: boolean;
}) => {
  const statusColor = getStatusColor(donation.status);
  const isAvailable = donation.status === 'claimed' && !donation.volunteerId;
  const isAssigned = donation.status === 'assigned' && donation.volunteerId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-top">
            <h2 className="modal-title">
              <FiPackage size={24} />
              Delivery Details
            </h2>
            <button
              onClick={onClose}
              className="close-modal-btn"
              disabled={isProcessing}
            >
              <FiX size={24} />
            </button>
          </div>
          <p className="modal-subtitle">
            Complete information for: <strong>{donation.title}</strong>
          </p>
        </div>

        <div className="modal-form">
          {/* Header Section */}
          <div className="details-header">
            <div className="donation-image-large">
              {donation.imageUrl ? (
                <img
                  src={donation.imageUrl}
                  alt={donation.title}
                  className="donation-thumbnail-large"
                />
              ) : (
                <div className="donation-image-placeholder-large">
                  {getCategoryIcon(donation.category)}
                </div>
              )}
              <div 
                className="status-badge-large"
                style={{
                  backgroundColor: statusColor.bg,
                  color: statusColor.text
                }}
              >
                {getStatusIcon(donation.status)}
                {getStatusText(donation.status)}
              </div>
            </div>
            <div className="header-content">
              <h3 className="donation-title-large">{donation.title}</h3>
              <div className="header-badges">
                <span className="badge category-large">
                  {getCategoryIcon(donation.category)}
                  {donation.category}
                </span>
                <span className="badge quantity-large">
                  <FiPackage size={14} />
                  {donation.quantity} {donation.quantityUnit?.toUpperCase()}
                </span>
                {donation.foodSafetyChecked && donation.safetyScore && (
                  <span className={`badge safety-large ${donation.safetyScore >= 75 ? 'compliant' : 'warning'}`}>
                    <FiShield size={14} />
                    Safety: {donation.safetyScore}%
                  </span>
                )}
              </div>
              <p className="donation-description">{donation.description}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <FiCalendar size={16} />
              <div>
                <div className="stat-label">Best Before</div>
                <div className="stat-value">{donation.expiryDate}</div>
              </div>
            </div>
            <div className="stat-item">
              <FiMapPin size={16} />
              <div>
                <div className="stat-label">Pickup Location</div>
                <div className="stat-value">{donation.address}</div>
              </div>
            </div>
            {donation.createdAt && (
              <div className="stat-item">
                <FiClock size={16} />
                <div>
                  <div className="stat-label">Posted</div>
                  <div className="stat-value">{formatTimeAgo(donation.createdAt)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="details-grid">
            {/* Left Column - Donor Information */}
            <div className="details-column">
              <div className="section-card">
                <div className="section-header">
                  <FiUser size={20} />
                  <h4>Donor Information</h4>
                </div>
                <div className="contact-details">
                  <div className="contact-row">
                    <span className="contact-label">Name:</span>
                    <span className="contact-value">{donation.donorName}</span>
                  </div>
                  {donation.donorEmail && (
                    <div className="contact-row">
                      <span className="contact-label">Email:</span>
                      <span className="contact-value">{donation.donorEmail}</span>
                    </div>
                  )}
                  {donation.donorPhone && (
                    <div className="contact-row">
                      <span className="contact-label">Phone:</span>
                      <span className="contact-value">{donation.donorPhone}</span>
                    </div>
                  )}
                  {donation.donorAddress && (
                    <div className="contact-row">
                      <span className="contact-label">Address:</span>
                      <span className="contact-value">{donation.donorAddress}</span>
                    </div>
                  )}
                  <div className="contact-row">
                    <span className="contact-label">Rating:</span>
                    <span className="contact-value">
                      {Array.from({ length: 5 }, (_, i) => (
                        <FiStar 
                          key={i} 
                          size={14} 
                          style={{ 
                            color: i < (donation.donorRating || 5) ? '#f59e0b' : '#d1d5db',
                            marginRight: '2px'
                          }} 
                        />
                      ))}
                      ({donation.donorRating || 5}/5)
                    </span>
                  </div>
                </div>
              </div>

              {/* Food Details */}
              <div className="section-card">
                <div className="section-header">
                  <FiPackage size={20} />
                  <h4>Food Details</h4>
                </div>
                <div className="food-details">
                  <div className="detail-row">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{donation.category}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{donation.quantity} {donation.quantityUnit?.toUpperCase()}</span>
                  </div>
                  {donation.allergens && donation.allergens.length > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Allergens:</span>
                      <span className="detail-value warning">{donation.allergens.join(', ')}</span>
                    </div>
                  )}
                  {donation.storageRequirements && (
                    <div className="detail-row">
                      <span className="detail-label">Storage:</span>
                      <span className="detail-value">{donation.storageRequirements}</span>
                    </div>
                  )}
                  {donation.foodSafetyChecked && (
                    <div className="detail-row">
                      <span className="detail-label">Food Safety:</span>
                      <span className={`detail-value ${donation.safetyScore && donation.safetyScore >= 75 ? 'safe' : 'warning'}`}>
                        {donation.safetyScore}% Compliant
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Recipient & Instructions */}
            <div className="details-column">
              {/* Recipient Information */}
              <div className="section-card">
                <div className="section-header">
                  <FiUsers size={20} />
                  <h4>Recipient Information</h4>
                </div>
                {donation.recipientName ? (
                  <div className="contact-details">
                    <div className="contact-row">
                      <span className="contact-label">Name:</span>
                      <span className="contact-value">{donation.recipientName}</span>
                    </div>
                    {donation.recipientEmail && (
                      <div className="contact-row">
                        <span className="contact-label">Email:</span>
                        <span className="contact-value">{donation.recipientEmail}</span>
                      </div>
                    )}
                    {donation.recipientPhone && (
                      <div className="contact-row">
                        <span className="contact-label">Phone:</span>
                        <span className="contact-value">{donation.recipientPhone}</span>
                      </div>
                    )}
                    {donation.recipientOrganization && (
                      <div className="contact-row">
                        <span className="contact-label">Organization:</span>
                        <span className="contact-value">{donation.recipientOrganization}</span>
                      </div>
                    )}
                    {donation.intendedUse && (
                      <div className="contact-row">
                        <span className="contact-label">Intended Use:</span>
                        <span className="contact-value">{donation.intendedUse}</span>
                      </div>
                    )}
                    {donation.estimatedBeneficiaries && (
                      <div className="contact-row">
                        <span className="contact-label">Beneficiaries:</span>
                        <span className="contact-value">{donation.estimatedBeneficiaries} people</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-info">
                    <FiInfo size={16} />
                    <span>No recipient information available</span>
                  </div>
                )}
              </div>

              {/* Delivery Instructions */}
              {(donation.pickupInstructions || donation.specialInstructions) && (
                <div className="section-card">
                  <div className="section-header">
                    <FiAlertCircle size={20} />
                    <h4>Delivery Instructions</h4>
                  </div>
                  <div className="instructions-content">
                    {donation.pickupInstructions && (
                      <div className="instruction-item">
                        <strong>Pickup Instructions:</strong>
                        <p>{donation.pickupInstructions}</p>
                      </div>
                    )}
                    {donation.specialInstructions && (
                      <div className="instruction-item">
                        <strong>Special Instructions:</strong>
                        <p>{donation.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="section-card">
                <div className="section-header">
                  <FiClock size={20} />
                  <h4>Delivery Timeline</h4>
                </div>
                <div className="timeline">
                  <div className="timeline-item completed">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Donation Posted</strong>
                      {donation.createdAt && (
                        <span>{formatTimeAgo(donation.createdAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className={`timeline-item ${donation.status !== 'available' ? 'completed' : 'pending'}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Claimed by Recipient</strong>
                      {donation.claimedAt && (
                        <span>{formatTimeAgo(donation.claimedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className={`timeline-item ${donation.status === 'assigned' || donation.status === 'completed' ? 'completed' : 'pending'}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Volunteer Assigned</strong>
                      {donation.assignedAt && (
                        <span>{formatTimeAgo(donation.assignedAt)}</span>
                      )}
                      {isAssigned && (
                        <span className="volunteer-name">(You)</span>
                      )}
                    </div>
                  </div>
                  <div className={`timeline-item ${donation.status === 'completed' ? 'completed' : 'pending'}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Delivery Completed</strong>
                      {donation.completedAt && (
                        <span>{formatTimeAgo(donation.completedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-section">
            {isAvailable && onAccept && (
              <div className="action-buttons">
                <button
                  onClick={onClose}
                  className="btn secondary-btn"
                  disabled={isProcessing}
                >
                  <FiX size={16} />
                  Close
                </button>
                <button
                  onClick={onAccept}
                  className="btn primary-btn large"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <FiLoader size={16} />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} />
                      Accept This Delivery
                    </>
                  )}
                </button>
              </div>
            )}

            {isAssigned && onComplete && (
              <div className="action-buttons">
                <button
                  onClick={onClose}
                  className="btn secondary-btn"
                  disabled={isProcessing}
                >
                  <FiX size={16} />
                  Close
                </button>
                <button
                  onClick={onComplete}
                  className="btn success-btn large"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <FiLoader size={16} />
                      Completing...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle size={16} />
                      Mark as Delivered
                    </>
                  )}
                </button>
              </div>
            )}

            {!isAvailable && !isAssigned && (
              <div className="action-buttons">
                <button
                  onClick={onClose}
                  className="btn primary-btn"
                >
                  <FiCheck size={16} />
                  Got It
                </button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="info-box">
            <div className="info-box-header">
              <FiInfo size={16} />
              <strong>Delivery Guidelines</strong>
            </div>
            <div className="info-box-content">
              <p>• Contact both donor and recipient to coordinate pickup and delivery times</p>
              <p>• Ensure food is handled safely and stored properly during transport</p>
              <p>• Confirm receipt with the recipient before marking as delivered</p>
              <p>• Report any issues or concerns through the app</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-content.large {
          max-width: 900px;
          max-height: 90vh;
        }

        .details-header {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .donation-image-large {
          width: 120px;
          height: 120px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .donation-thumbnail-large {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .donation-image-placeholder-large {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: #1e40af;
        }

        .status-badge-large {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .header-content {
          flex: 1;
        }

        .donation-title-large {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .header-badges {
          margin-bottom: 1rem;
        }

        .badge.category-large, .badge.quantity-large, .badge.safety-large {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          margin-right: 8px;
          margin-bottom: 4px;
        }

        .badge.category-large {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .badge.quantity-large {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .badge.safety-large.compliant {
          background-color: #dcfce7;
          color: #15803d;
        }

        .badge.safety-large.warning {
          background-color: #fef3c7;
          color: #b45309;
        }

        .donation-description {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .stat-item svg {
          color: #6b7280;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .stat-value {
          font-size: 14px;
          color: #111827;
          font-weight: 600;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          .details-grid {
            grid-template-columns: 1fr;
          }
        }

        .details-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 1rem 1.5rem;
          background-color: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-header h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .section-header svg {
          color: #6b7280;
        }

        .contact-details, .food-details {
          padding: 1.5rem;
        }

        .contact-row, .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .contact-row:last-child, .detail-row:last-child {
          border-bottom: none;
        }

        .contact-label, .detail-label {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
        }

        .contact-value, .detail-value {
          font-size: 14px;
          color: #111827;
          font-weight: 500;
          text-align: right;
        }

        .detail-value.warning {
          color: #dc2626;
          font-weight: 600;
        }

        .detail-value.safe {
          color: #15803d;
          font-weight: 600;
        }

        .no-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 2rem;
          color: #6b7280;
          font-style: italic;
          justify-content: center;
        }

        .instructions-content {
          padding: 1.5rem;
        }

        .instruction-item {
          margin-bottom: 1rem;
        }

        .instruction-item:last-child {
          margin-bottom: 0;
        }

        .instruction-item strong {
          display: block;
          color: #111827;
          margin-bottom: 4px;
        }

        .instruction-item p {
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .timeline {
          padding: 1.5rem;
          position: relative;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .timeline-item:last-child {
          margin-bottom: 0;
        }

        .timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #e5e7eb;
          margin-top: 4px;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        .timeline-item.completed .timeline-dot {
          background-color: #16a34a;
        }

        .timeline-item:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 16px;
          bottom: -20px;
          width: 2px;
          background-color: #e5e7eb;
          z-index: 1;
        }

        .timeline-item.completed:not(:last-child)::after {
          background-color: #16a34a;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-content strong {
          display: block;
          color: #111827;
          margin-bottom: 2px;
        }

        .timeline-content span {
          font-size: 12px;
          color: #6b7280;
        }

        .volunteer-name {
          color: #2563eb !important;
          font-weight: 600;
        }

        .action-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn.large {
          padding: 12px 24px;
          font-size: 16px;
        }

        .info-box {
          background-color: #f0f9ff;
          padding: 1.5rem;
          border-radius: 8px;
          margin-top: 1.5rem;
          border: 1px solid #bae6fd;
        }

        .info-box-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1rem;
          color: #0369a1;
          font-weight: 600;
        }

        .info-box-content {
          color: #0369a1;
        }

        .info-box-content p {
          margin: 0.5rem 0;
          font-size: 14px;
        }

        .info-box-content p:first-child {
          margin-top: 0;
        }

        .info-box-content p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default function VolunteerDashboard() {
  const { user, userProfile } = useAuth();
  const { loading, accessGranted } = useRoleAccess(['volunteer']);
  const router = useRouter();
  
  const [donations, setDonations] = useState<Donation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    if (!loading && user && userProfile && !accessGranted) {
      console.log('User does not have access to volunteer dashboard');
      return;
    }
  }, [loading, user, userProfile, accessGranted]);

  // Fetch all donations from Firestore with proper field mapping
  const fetchDonations = async () => {
    try {
      console.log('Fetching donations from Firestore...');
      const donationsRef = collection(db, 'donations');
      const q = query(donationsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const donationsData: Donation[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Map all fields properly including Cloudinary image fields
        const donation: Donation = { 
          id: doc.id, 
          title: data.title || '',
          category: data.category || 'Other',
          quantity: data.quantity || '',
          quantityUnit: data.quantityUnit || 'kg',
          description: data.description || '',
          address: data.address || data.location || '', // Handle both address and location fields
          expiryDate: data.expiryDate || '',
          status: data.status || 'available',
          donorId: data.donorId || '',
          donorName: data.donorName || '',
          donorRating: data.donorRating || 5,
          donorContact: data.donorContact,
          donorEmail: data.donorEmail,
          donorAddress: data.donorAddress,
          donorPhone: data.donorPhone,
          recipientId: data.recipientId,
          recipientName: data.recipientName,
          recipientEmail: data.recipientEmail,
          recipientPhone: data.recipientPhone,
          recipientOrganization: data.recipientOrganization,
          intendedUse: data.intendedUse,
          estimatedBeneficiaries: data.estimatedBeneficiaries,
          volunteerId: data.volunteerId,
          volunteerName: data.volunteerName,
          createdAt: data.createdAt,
          claimedAt: data.claimedAt,
          assignedAt: data.assignedAt,
          completedAt: data.completedAt,
          specialInstructions: data.specialInstructions,
          allergens: data.allergens || [],
          storageRequirements: data.storageRequirements,
          foodSafetyChecked: data.foodSafetyChecked || false,
          temperatureControl: data.temperatureControl || '',
          packagingIntact: data.packagingIntact || false,
          properLabeling: data.properLabeling || false,
          contaminationRisk: data.contaminationRisk || '',
          safetyNotes: data.safetyNotes,
          safetyScore: data.safetyScore,
          imageUrl: data.imageUrl, // Cloudinary image URL
          imagePublicId: data.imagePublicId, // Cloudinary public ID
          pickupInstructions: data.pickupInstructions,
          distance: data.distance
        };
        
        donationsData.push(donation);
      });
      
      console.log(`Fetched ${donationsData.length} donations with images:`, 
        donationsData.filter(d => d.imageUrl).length);
      setDonations(donationsData);
      return donationsData;
    } catch (error) {
      console.error('Error fetching donations:', error);
      return [];
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      await fetchDonations();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    if (user && accessGranted) {
      fetchAllData();
    }
  }, [user, accessGranted]);

  const handleShowFullDetails = (donation: Donation) => {
    setSelectedDonation(donation);
    setShowDetailsModal(true);
  };

  const handleAcceptTask = async (donation: Donation) => {
    if (!user || !userProfile) return;

    setIsProcessing(true);
    setProcessingMessage('Accepting delivery task...');

    try {
      // Update the donation with volunteer information
      const donationRef = doc(db, 'donations', donation.id);
      await updateDoc(donationRef, {
        status: 'assigned',
        volunteerId: user.uid,
        volunteerName: userProfile.displayName,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Try to create notifications, but don't fail if they don't work
      try {
        // Create a notification for the donor
        await addDoc(collection(db, 'notifications'), {
          type: 'volunteer_assigned',
          title: 'Volunteer Assigned!',
          message: `${userProfile.displayName} has accepted your donation delivery for ${donation.title}.`,
          recipientId: donation.donorId,
          donationId: donation.id,
          read: false,
          createdAt: serverTimestamp()
        });

        // Create a notification for the recipient
        if (donation.recipientId) {
          await addDoc(collection(db, 'notifications'), {
            type: 'volunteer_assigned',
            title: 'Volunteer On The Way!',
            message: `${userProfile.displayName} is delivering ${donation.title} to you. They will contact you soon.`,
            recipientId: donation.recipientId,
            donationId: donation.id,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (notificationError) {
        console.warn('Could not create notifications, but donation was updated:', notificationError);
        // Continue anyway since the main donation update succeeded
      }

      setProcessingMessage('Delivery accepted successfully!');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await fetchAllData();
      setShowDetailsModal(false);
    } catch (error: unknown) {
      console.error('Error accepting task:', error);
      
      let errorMessage = 'Failed to accept delivery. Please try again.';
      
      if (isFirebaseError(error)) {
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check if you are logged in properly.';
        } else if (error.code === 'not-found') {
          errorMessage = 'Donation not found. It may have been already claimed.';
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setProcessingMessage(errorMessage);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteTask = async (donation: Donation) => {
    if (!user) return;

    setIsProcessing(true);
    setProcessingMessage('Completing delivery...');

    try {
      // Update the donation status to completed
      const donationRef = doc(db, 'donations', donation.id);
      await updateDoc(donationRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Try to create notifications, but don't fail if they don't work
      try {
        // Create notifications for donor and recipient
        await addDoc(collection(db, 'notifications'), {
          type: 'delivery_completed',
          title: 'Delivery Completed!',
          message: `Your donation ${donation.title} has been successfully delivered to ${donation.recipientName || 'the recipient'}.`,
          recipientId: donation.donorId,
          donationId: donation.id,
          read: false,
          createdAt: serverTimestamp()
        });

        if (donation.recipientId) {
          await addDoc(collection(db, 'notifications'), {
            type: 'delivery_completed',
            title: 'Delivery Received!',
            message: `Thank you for receiving ${donation.title}. The delivery has been completed.`,
            recipientId: donation.recipientId,
            donationId: donation.id,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (notificationError) {
        console.warn('Could not create notifications, but donation was updated:', notificationError);
        // Continue anyway since the main donation update succeeded
      }

      setProcessingMessage('Delivery completed successfully!');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await fetchAllData();
      setShowDetailsModal(false);
    } catch (error: unknown) {
      console.error('Error completing task:', error);
      
      let errorMessage = 'Failed to complete delivery. Please try again.';
      
      if (isFirebaseError(error)) {
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check if you are logged in properly.';
        } else if (error.code === 'not-found') {
          errorMessage = 'Donation not found. It may have been already completed.';
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setProcessingMessage(errorMessage);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter donations for different sections
  const availableDeliveries = donations.filter(d => 
    d.status === 'claimed' && !d.volunteerId
  );
  
  const myActiveDeliveries = donations.filter(d => 
    d.volunteerId === user?.uid && d.status === 'assigned'
  );
  
  const myCompletedDeliveries = donations.filter(d => 
    d.volunteerId === user?.uid && d.status === 'completed'
  );

  const expiredDeliveries = donations.filter(d => 
    d.status === 'expired'
  );

  // Filter available deliveries for search
  const filteredAvailableDeliveries = availableDeliveries.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const totalDeliveries = myCompletedDeliveries.length + myActiveDeliveries.length;
  const completedDeliveries = myCompletedDeliveries.length;
  const activeDeliveries = myActiveDeliveries.length;
  
  // Calculate total impact (estimated meals delivered)
  const totalMealsDelivered = myCompletedDeliveries.reduce((total, donation) => {
    const quantityMatch = donation.quantity.match(/(\d+)/);
    return total + (quantityMatch ? parseInt(quantityMatch[1]) : 1);
  }, 0);

  // Calculate total distance traveled (mock)
  const totalDistance = myCompletedDeliveries.length * 5.2; // Mock average distance

  // Don't render if user doesn't have access
  if (!user || !userProfile || !accessGranted) {
    return null;
  }

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
            border: 4px solid #2563eb;
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

  return (
    <div className="volunteer-dashboard-container">
      {/* Main Content */}
      <div className="dashboard-main">
        {/* Welcome Header */}
        <div className="welcome-header">
          <h1 className="welcome-title">Welcome back, {userProfile.displayName}!</h1>
          <p className="welcome-subtitle">
            Thank you for volunteering to help reduce food waste in our community.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon completed">
              <FiTruck size={24} />
            </div>
            <div className="stat-value">{completedDeliveries}</div>
            <div className="stat-label">Completed Deliveries</div>
            <div className="stat-description">All time</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon active">
              <FiRefreshCw size={24} />
            </div>
            <div className="stat-value">{activeDeliveries}</div>
            <div className="stat-label">Active Deliveries</div>
            <div className="stat-description">In progress</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon impact">
              <FiPackage size={24} />
            </div>
            <div className="stat-value">{totalMealsDelivered}+</div>
            <div className="stat-label">Meals Delivered</div>
            <div className="stat-description">Estimated impact</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon distance">
              <FiMapPin size={24} />
            </div>
            <div className="stat-value">{totalDistance.toFixed(1)}km</div>
            <div className="stat-label">Distance Traveled</div>
            <div className="stat-description">Total delivery distance</div>
          </div>
        </div>

        {/* Delivery Opportunities */}
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Delivery Opportunities</h2>
            <div className="header-actions">
              {activeDeliveries > 0 && (
                <div className="active-deliveries-badge">
                  <FiClock size={16} />
                  <span>
                    {activeDeliveries} Active Delivery{activeDeliveries !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
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

          <div className="search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">
                <FiSearch size={20} />
              </span>
              <input
                type="text"
                placeholder="Search deliveries..."
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
          </div>

          {filteredAvailableDeliveries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FiTruck size={64} />
              </div>
              <h3 className="empty-title">
                {availableDeliveries.length === 0 ? 'No delivery opportunities' : 'No matching deliveries'}
              </h3>
              <p className="empty-text">
                {availableDeliveries.length === 0 
                  ? 'There are currently no deliveries that need volunteers. Check back later!' 
                  : 'Try adjusting your search criteria'}
              </p>
            </div>
          ) : (
            <div className="deliveries-grid">
              {filteredAvailableDeliveries.map(donation => {
                const statusColor = getStatusColor(donation.status);
                return (
                  <div key={donation.id} className="delivery-card">
                    <div className="delivery-image">
                      {donation.imageUrl ? (
                        <img
                          src={donation.imageUrl}
                          alt={donation.title}
                          className="delivery-thumbnail"
                          onError={(e) => {
                            // If image fails to load, show placeholder
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`delivery-image-placeholder ${donation.imageUrl ? 'hidden' : ''}`}>
                        {getCategoryIcon(donation.category)}
                      </div>
                      <div 
                        className="status-badge"
                        style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text
                        }}
                      >
                        {getStatusIcon(donation.status)}
                        {getStatusText(donation.status)}
                      </div>
                    </div>
                    <div className="delivery-content">
                      <h3 className="delivery-title">{donation.title}</h3>
                      <div className="badges-container">
                        <span className="badge category">
                          {getCategoryIcon(donation.category)}
                          {donation.category}
                        </span>
                        <span className="badge quantity">
                          <FiPackage size={12} />
                          {donation.quantity} {donation.quantityUnit?.toUpperCase()}
                        </span>
                        {donation.foodSafetyChecked && donation.safetyScore && (
                          <span className={`badge safety ${donation.safetyScore >= 75 ? 'compliant' : 'warning'}`}>
                            <FiShield size={12} />
                            Safety: {donation.safetyScore}%
                          </span>
                        )}
                      </div>
                      <p className="delivery-desc">{donation.description}</p>
                      
                      <div className="info-row">
                        <FiHome size={16} />
                        <span className="info-text">{donation.address}</span>
                      </div>
                      <div className="info-row">
                        <FiCalendar size={16} />
                        <span className="info-text">Best before: {donation.expiryDate}</span>
                      </div>
                      <div className="info-row">
                        <FiUser size={16} />
                        <span className="info-text">From: {donation.donorName}</span>
                      </div>

                      {donation.recipientName && (
                        <div className="info-row">
                          <FiUsers size={16} />
                          <span className="info-text">To: {donation.recipientName}</span>
                        </div>
                      )}

                      {donation.pickupInstructions && (
                        <div className="special-instructions">
                          <strong>Pickup Instructions:</strong> {donation.pickupInstructions}
                        </div>
                      )}

                      <div className="button-group">
                        <button
                          onClick={() => handleShowFullDetails(donation)}
                          className="btn info-btn"
                        >
                          <FiInfo size={16} />
                          Full Details
                        </button>
                        <button
                          onClick={() => handleAcceptTask(donation)}
                          className="btn primary-btn"
                        >
                          <FiCheck size={16} />
                          Accept Delivery
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Active Deliveries */}
        {myActiveDeliveries.length > 0 && (
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">My Active Deliveries</h2>
              <div className="count-badge">{myActiveDeliveries.length}</div>
            </div>
            <div className="deliveries-grid">
              {myActiveDeliveries.map(donation => {
                const statusColor = getStatusColor(donation.status);
                return (
                  <div key={donation.id} className="delivery-card">
                    <div className="delivery-image">
                      {donation.imageUrl ? (
                        <img
                          src={donation.imageUrl}
                          alt={donation.title}
                          className="delivery-thumbnail"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`delivery-image-placeholder ${donation.imageUrl ? 'hidden' : ''}`}>
                        {getCategoryIcon(donation.category)}
                      </div>
                      <div 
                        className="status-badge"
                        style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text
                        }}
                      >
                        {getStatusIcon(donation.status)}
                        {getStatusText(donation.status)}
                      </div>
                    </div>
                    <div className="delivery-content">
                      <h3 className="delivery-title">{donation.title}</h3>
                      <div className="badges-container">
                        <span className="badge category">
                          {getCategoryIcon(donation.category)}
                          {donation.category}
                        </span>
                        <span className="badge quantity">
                          <FiPackage size={12} />
                          {donation.quantity} {donation.quantityUnit?.toUpperCase()}
                        </span>
                      </div>
                      <p className="delivery-desc">{donation.description}</p>
                      
                      <div className="contact-info">
                        <div className="contact-row">
                          <FiUser size={14} />
                          <strong>Donor:</strong> {donation.donorName}
                          {donation.donorPhone && (
                            <span className="contact-phone"> • {donation.donorPhone}</span>
                          )}
                        </div>
                        {donation.recipientName && (
                          <div className="contact-row">
                            <FiUsers size={14} />
                            <strong>Recipient:</strong> {donation.recipientName}
                            {donation.recipientPhone && (
                              <span className="contact-phone"> • {donation.recipientPhone}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="info-row">
                        <FiHome size={16} />
                        <span className="info-text">{donation.address}</span>
                      </div>

                      {donation.assignedAt && (
                        <div className="info-row">
                          <FiClock size={16} />
                          <span className="info-text">Assigned {formatTimeAgo(donation.assignedAt)}</span>
                        </div>
                      )}

                      <div className="button-group">
                        <button
                          onClick={() => handleShowFullDetails(donation)}
                          className="btn info-btn"
                        >
                          <FiInfo size={16} />
                          Full Details
                        </button>
                        <button
                          onClick={() => handleCompleteTask(donation)}
                          className="btn success-btn"
                        >
                          <FiCheckCircle size={16} />
                          Mark Delivered
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Deliveries Section */}
        {myCompletedDeliveries.length > 0 && (
          <div className="section-container">
            <div 
              className="section-header-collapsible"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <div className="section-title-with-count">
                <FiCheckCircle size={24} />
                Completed Deliveries
                <span className="count-badge">{myCompletedDeliveries.length}</span>
              </div>
              {showCompleted ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </div>
            
            {showCompleted && (
              <div className="history-list">
                {myCompletedDeliveries.map((donation, index) => (
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
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // Show category icon if image fails to load
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '';
                              parent.appendChild(getCategoryIcon(donation.category) as any);
                            }
                          }}
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
                        {donation.recipientName && (
                          <>
                            <span>•</span>
                            <span>To: {donation.recipientName}</span>
                          </>
                        )}
                        {donation.completedAt && (
                          <>
                            <span>•</span>
                            <span>Completed {formatTimeAgo(donation.completedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expired Deliveries Section */}
        {expiredDeliveries.length > 0 && (
          <div className="section-container">
            <div 
              className="section-header-collapsible"
              onClick={() => setShowExpired(!showExpired)}
            >
              <div className="section-title-with-count">
                <FiXCircle size={24} />
                Expired Deliveries
                <span className="count-badge">{expiredDeliveries.length}</span>
              </div>
              {showExpired ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </div>
            
            {showExpired && (
              <div className="history-list">
                {expiredDeliveries.map((donation, index) => (
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
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '';
                              parent.appendChild(getCategoryIcon(donation.category) as any);
                            }
                          }}
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
                        <span>Expired: {donation.expiryDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Details Modal */}
      {showDetailsModal && selectedDonation && (
        <FullDetailsModal 
          donation={selectedDonation}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDonation(null);
          }}
          onAccept={selectedDonation.status === 'claimed' && !selectedDonation.volunteerId ? 
            () => handleAcceptTask(selectedDonation) : undefined
          }
          onComplete={selectedDonation.status === 'assigned' && selectedDonation.volunteerId === user?.uid ? 
            () => handleCompleteTask(selectedDonation) : undefined
          }
          isProcessing={isProcessing}
        />
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
                <FiLoader size={32} />
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

            {processingMessage.includes('successfully') && (
              <div className="success-notice">
                {processingMessage.includes('accepted') ? (
                  <>
                    <FiTruck size={16} />
                    <p>You are now assigned to this delivery. Please contact the donor and recipient.</p>
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={16} />
                    <p>Delivery marked as completed. Thank you for your service!</p>
                  </>
                )}
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
        .volunteer-dashboard-container {
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
          .volunteer-dashboard-container {
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

        /* Welcome Header */
        .welcome-header {
          margin-bottom: 2rem;
        }

        .welcome-title {
          font-size: 28px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .welcome-subtitle {
          color: #6b7280;
          font-size: 16px;
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

        .stat-icon.completed {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .stat-icon.active {
          background-color: #dbeafe;
          color: #2563eb;
        }

        .stat-icon.impact {
          background-color: #fef3c7;
          color: #d97706;
        }

        .stat-icon.distance {
          background-color: #f3e8ff;
          color: #9333ea;
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

        .active-deliveries-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background-color: #dbeafe;
          color: #1e40af;
          border-radius: 8px;
          font-size: 14px;
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
          border-color: #2563eb;
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

        /* Deliveries Grid */
        .deliveries-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .deliveries-grid {
            grid-template-columns: 1fr;
          }
        }

        .delivery-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .delivery-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .delivery-image {
          height: 200px;
          background: linear-gradient(135deg, #dbeafe 0%, #d1d5db 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .delivery-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .delivery-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: #2563eb;
        }

        .delivery-image-placeholder.hidden {
          display: none;
        }

        .status-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .delivery-content {
          padding: 1.25rem;
        }

        .delivery-title {
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

        .badge.quantity {
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

        .delivery-desc {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 1rem;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .contact-info {
          background-color: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #e2e8f0;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #374151;
          margin-bottom: 4px;
        }

        .contact-phone {
          color: #6b7280;
          font-size: 13px;
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

        .btn.info-btn {
          background-color: #f3f4f6;
          color: #374151;
        }

        .btn.info-btn:hover {
          background-color: #e5e7eb;
        }

        .btn.primary-btn {
          background-color: #2563eb;
          color: white;
        }

        .btn.primary-btn:hover {
          background-color: #1d4ed8;
        }

        .btn.success-btn {
          background-color: #16a34a;
          color: white;
        }

        .btn.success-btn:hover {
          background-color: #15803d;
        }

        .btn.error-btn {
          background-color: #dc2626;
          color: white;
        }

        .btn.error-btn:hover {
          background-color: #b91c1c;
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

        /* Count Badge */
        .count-badge {
          background-color: #2563eb;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
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
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow: auto;
          margin: auto;
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

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
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