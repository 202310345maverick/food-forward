'use client'

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { 
  FiUser, 
  FiPackage, 
  FiHome, 
  FiTruck, 
  FiCheckCircle,
  FiArrowRight,
  FiBook,
  FiPlay,
  FiList,
  FiTarget,
  FiHelpCircle,
  FiStar,
  FiShield,
  FiClock,
  FiMapPin,
  FiMessageCircle,
  FiUsers,
  FiClipboard
} from 'react-icons/fi';

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f9fafb' },
  mainContent: { maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' },
  section: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    padding: '2rem', 
    marginBottom: '2rem', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    border: '1px solid #e5e7eb' 
  },
  sectionTitle: { 
    fontSize: '1.5rem', 
    fontWeight: 'bold', 
    color: '#111827', 
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease'
  },
  button: { 
    padding: '0.75rem 1.5rem', 
    border: 'none', 
    borderRadius: '0.5rem', 
    fontSize: '0.875rem', 
    fontWeight: '500', 
    cursor: 'pointer', 
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem'
  }
};

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface RoleGuide {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: Step[];
  quickTips: string[];
  features: string[];
}

export default function GuidePage() {
  const { user, userProfile, loading } = useAuth();
  const { loading: roleLoading } = useRoleAccess(['donor', 'recipient', 'volunteer']);
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<string>('all');

  const roleGuides: Record<string, RoleGuide> = {
    donor: {
      title: 'Donor Guide',
      description: 'Learn how to effectively donate surplus food and reduce food waste in Olongapo City',
      icon: <FiPackage size={24} />,
      color: '#16a34a',
      steps: [
        {
          number: 1,
          title: 'Prepare Your Donation',
          description: 'Gather surplus food that is still safe for consumption. Ensure proper packaging and check expiration dates.',
          icon: <FiList size={20} />
        },
        {
          number: 2,
          title: 'Create Donation Listing',
          description: 'Go to your donor dashboard and click "Create Donation". Fill in details like food type, quantity, and pickup time.',
          icon: <FiCheckCircle size={20} />
        },
        {
          number: 3,
          title: 'Wait for Volunteer',
          description: 'A verified volunteer will claim your donation. You\'ll receive notifications about pickup arrangements.',
          icon: <FiClock size={20} />
        },
        {
          number: 4,
          title: 'Hand Over Donation',
          description: 'Meet the volunteer at the scheduled time. Confirm the handover in the app to complete the process.',
          icon: <FiShield size={20} />
        },
        {
          number: 5,
          title: 'Track Impact',
          description: 'Monitor your donation history and see how many meals you\'ve provided to the community.',
          icon: <FiStar size={20} />
        }
      ],
      quickTips: [
        'Donate within 4 hours of preparation for hot meals',
        'Clearly label allergens and ingredients',
        'Take clear photos of your donations',
        'Be responsive to volunteer messages',
        'Update listing status promptly'
      ],
      features: [
        'Create and manage donation listings',
        'Track donation history and impact',
        'Communicate with volunteers',
        'Receive community ratings',
        'View analytics and reports'
      ]
    },
    recipient: {
      title: 'Recipient Guide',
      description: 'Discover how to receive food donations for your organization and serve the community',
      icon: <FiHome size={24} />,
      color: '#2563eb',
      steps: [
        {
          number: 1,
          title: 'Browse Available Donations',
          description: 'Check the recipient dashboard for available food donations in your area.',
          icon: <FiList size={20} />
        },
        {
          number: 2,
          title: 'Claim Suitable Donations',
          description: 'Select donations that meet your organization\'s needs and capacity.',
          icon: <FiCheckCircle size={20} />
        },
        {
          number: 3,
          title: 'Coordinate Pickup',
          description: 'Work with the volunteer to arrange pickup details and timing.',
          icon: <FiMapPin size={20} />
        },
        {
          number: 4,
          title: 'Receive Donation',
          description: 'Meet the volunteer and verify the donation meets your expectations.',
          icon: <FiPackage size={20} />
        },
        {
          number: 5,
          title: 'Distribute and Report',
          description: 'Distribute food to beneficiaries and update the system about distribution.',
          icon: <FiUsers size={20} />
        }
      ],
      quickTips: [
        'Check donation listings regularly',
        'Only claim what you can distribute',
        'Provide clear pickup instructions',
        'Confirm receipt in the app',
        'Share impact stories with donors'
      ],
      features: [
        'Browse available food donations',
        'Claim and manage received donations',
        'Track distribution history',
        'Communicate with donors and volunteers',
        'Generate impact reports'
      ]
    },
    volunteer: {
      title: 'Volunteer Guide',
      description: 'Learn how to efficiently transport food donations between donors and recipients',
      icon: <FiTruck size={24} />,
      color: '#9333ea',
      steps: [
        {
          number: 1,
          title: 'Check Available Deliveries',
          description: 'View the volunteer dashboard for donation pickups needing transportation.',
          icon: <FiList size={20} />
        },
        {
          number: 2,
          title: 'Accept Delivery Task',
          description: 'Choose deliveries that fit your schedule and route. Consider distance and capacity.',
          icon: <FiCheckCircle size={20} />
        },
        {
          number: 3,
          title: 'Coordinate with Parties',
          description: 'Contact both donor and recipient to arrange optimal pickup and delivery times.',
          icon: <FiMessageCircle size={20} />
        },
        {
          number: 4,
          title: 'Execute Delivery',
          description: 'Pick up from donor, transport safely, and deliver to recipient promptly.',
          icon: <FiTruck size={20} />
        },
        {
          number: 5,
          title: 'Complete Documentation',
          description: 'Update task status, add delivery notes, and confirm completion.',
          icon: <FiClipboard size={20} />
        }
      ],
      quickTips: [
        'Maintain food safety during transport',
        'Communicate delays immediately',
        'Verify donation conditions',
        'Use proper storage containers',
        'Follow traffic and safety rules'
      ],
      features: [
        'Browse available delivery tasks',
        'Accept and manage deliveries',
        'Track delivery history and metrics',
        'Communicate with donors and recipients',
        'Earn community ratings and recognition'
      ]
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'donor': return <FiPackage size={20} />;
      case 'recipient': return <FiHome size={20} />;
      case 'volunteer': return <FiTruck size={20} />;
      default: return <FiUser size={20} />;
    }
  };

  const filteredGuides = activeRole === 'all' 
    ? roleGuides 
    : { [activeRole]: roleGuides[activeRole] };

  if (loading || roleLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            border: '4px solid #16a34a', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading guide...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Header Section */}
        <div style={styles.section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                Dashboard Guide
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
                Learn how to make the most of your Food Forward Olongapo experience
              </p>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '0.5rem',
              border: '1px solid #bbf7d0'
            }}>
              <FiHelpCircle size={20} color="#16a34a" />
              <span style={{ color: '#166534', fontWeight: '500' }}>Need Help?</span>
            </div>
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button
              onClick={() => setActiveRole('all')}
              style={{
                ...styles.button,
                backgroundColor: activeRole === 'all' ? '#111827' : '#f3f4f6',
                color: activeRole === 'all' ? 'white' : '#374151'
              }}
            >
              <FiBook size={16} />
              All Guides
            </button>
            {Object.keys(roleGuides).map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                style={{
                  ...styles.button,
                  backgroundColor: activeRole === role ? roleGuides[role].color : '#f3f4f6',
                  color: activeRole === role ? 'white' : '#374151'
                }}
              >
                {getRoleIcon(role)}
                {role.charAt(0).toUpperCase() + role.slice(1)} Guide
              </button>
            ))}
          </div>

          {/* User-specific Welcome */}
          {userProfile && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f0f9ff',
              borderRadius: '0.5rem',
              border: '1px solid #bae6fd',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: roleGuides[userProfile.role]?.color || '#6b7280',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {getRoleIcon(userProfile.role)}
                </div>
                <div>
                  <h3 style={{ fontWeight: '600', color: '#0c4a6e', marginBottom: '0.25rem' }}>
                    Welcome, {userProfile.displayName}!
                  </h3>
                  <p style={{ color: '#0369a1', marginBottom: '0.5rem' }}>
                    You're viewing as a <strong>{userProfile.role}</strong>. Focus on your role's guide to get started quickly.
                  </p>
                  <button
                    onClick={() => setActiveRole(userProfile.role)}
                    style={{
                      ...styles.button,
                      backgroundColor: roleGuides[userProfile.role]?.color || '#6b7280',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    <FiTarget size={14} />
                    Show My Role Guide
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role Guides */}
        {Object.entries(filteredGuides).map(([role, guide]) => (
          <div key={role} style={styles.section}>
            {/* Guide Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              justifyContent: 'space-between',
              marginBottom: '2rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: guide.color,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    {guide.icon}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                      {guide.title}
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
                      {guide.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => router.push(`/dashboard/${role}`)}
                style={{
                  ...styles.button,
                  backgroundColor: guide.color,
                  color: 'white',
                  whiteSpace: 'nowrap'
                }}
              >
                <FiPlay size={16} />
                Go to {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Step-by-Step Guide */}
              <div>
                <h3 style={styles.sectionTitle}>
                  <FiList />
                  Step-by-Step Guide
                </h3>
                <div>
                  {guide.steps.map((step) => (
                    <div key={step.number} style={styles.stepCard}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: guide.color,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {step.number}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ color: guide.color }}>
                              {step.icon}
                            </div>
                            <h4 style={{ fontWeight: '600', color: '#111827' }}>
                              {step.title}
                            </h4>
                          </div>
                          <p style={{ color: '#6b7280', lineHeight: '1.5' }}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Tips & Features */}
              <div>
                {/* Quick Tips */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={styles.sectionTitle}>
                    <FiStar />
                    Quick Tips
                  </h3>
                  <div style={styles.card}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {guide.quickTips.map((tip, index) => (
                        <li key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '0.75rem',
                          padding: '0.75rem 0',
                          borderBottom: index < guide.quickTips.length - 1 ? '1px solid #e2e8f0' : 'none'
                        }}>
                          <div style={{ 
                            width: '20px', 
                            height: '20px', 
                            backgroundColor: guide.color, 
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '0.125rem'
                          }}>
                            <FiCheckCircle size={12} color="white" />
                          </div>
                          <span style={{ color: '#374151', lineHeight: '1.4' }}>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Key Features */}
                <div>
                  <h3 style={styles.sectionTitle}>
                    <FiTarget />
                    Key Features
                  </h3>
                  <div style={styles.card}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {guide.features.map((feature, index) => (
                        <li key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem',
                          padding: '0.75rem 0',
                          borderBottom: index < guide.features.length - 1 ? '1px solid #e2e8f0' : 'none'
                        }}>
                          <div style={{ color: guide.color }}>
                            <FiArrowRight size={16} />
                          </div>
                          <span style={{ color: '#374151' }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Additional Resources */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiHelpCircle />
            Additional Resources
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={styles.card}>
              <h4 style={{ fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Community Guidelines</h4>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Learn about our community standards, safety protocols, and best practices for all users.
              </p>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '0.5rem 1rem'
                }}
              >
                Read Guidelines
              </button>
            </div>

            <div style={styles.card}>
              <h4 style={{ fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Food Safety Tips</h4>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Essential food handling and safety guidelines to ensure all donations are safe for consumption.
              </p>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '0.5rem 1rem'
                }}
              >
                Safety Guide
              </button>
            </div>

            <div style={styles.card}>
              <h4 style={{ fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Contact Support</h4>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Need help? Our support team is available to assist you with any questions or issues.
              </p>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '0.5rem 1rem'
                }}
              >
                Get Help
              </button>
            </div>
          </div>
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