'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Clean, compact inline styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  nav: {
    position: 'fixed' as const,
    top: 0,
    width: '100%',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    zIndex: 50,
    padding: '0 1rem'
  },
  navContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '4rem',
    maxWidth: '80rem',
    margin: '0 auto'
  },
  hero: {
    paddingTop: '7rem',
    paddingBottom: '4rem',
    textAlign: 'center' as const,
    paddingLeft: '1rem',
    paddingRight: '1rem'
  },
  section: {
    padding: '3rem 1rem'
  }
}

interface Comment {
  id: string
  text: string
  userName: string
  userId: string
  timestamp: any
  userPhotoURL?: string
}

interface VolunteerOpportunity {
  id: string
  title: string
  description: string
  date: string
  location: string
  volunteersNeeded: number
  volunteersSignedUp: number
  type: 'distribution' | 'awareness' | 'fundraising'
  status: 'active' | 'completed'
}

interface SuccessStory {
  id: string
  title: string
  description: string
  impact: string
  partnerName: string
  date: string
  imageUrl?: string
}

interface Partner {
  id: string
  name: string
  type: 'restaurant' | 'bakery' | 'cafe' | 'supermarket' | 'individual'
  joinDate: string
  mealsDonated: number
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [volunteerOpportunities, setVolunteerOpportunities] = useState<VolunteerOpportunity[]>([])
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([])
  const [topPartners, setTopPartners] = useState<Partner[]>([])
  const [stats, setStats] = useState({
    mealsProvided: 847,
    wasteReduced: 623,
    co2Saved: 156,
    activePartners: 12,
    totalVolunteers: 45,
    completedDistributions: 42
  })

  // Sample data initialization
  useEffect(() => {
    const sampleOpportunities: VolunteerOpportunity[] = [
      {
        id: '1',
        title: "Weekend Food Distribution",
        description: "Help distribute surplus food to families in need across Olongapo City. We need volunteers for packing and distribution.",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: "Rizal Triangle, Olongapo City",
        volunteersNeeded: 15,
        volunteersSignedUp: 8,
        type: "distribution",
        status: "active"
      },
      {
        id: '2',
        title: "Food Waste Awareness Campaign",
        description: "Join our awareness drive in local communities. Educate residents about food conservation and our mission.",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: "Gordon College, Olongapo City",
        volunteersNeeded: 10,
        volunteersSignedUp: 3,
        type: "awareness",
        status: "active"
      },
      {
        id: '3',
        title: "Community Kitchen Support",
        description: "Assist in our community kitchen preparing meals from donated ingredients for local shelters.",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: "Food Forward Community Kitchen, Olongapo",
        volunteersNeeded: 8,
        volunteersSignedUp: 6,
        type: "distribution",
        status: "active"
      }
    ]

    const sampleStories: SuccessStory[] = [
      {
        id: '1',
        title: "Bakery Reduces Waste by 80%",
        description: "Local bakery 'Panaderia Ilonggo' partnered with us and now redirects their daily unsold bread to families in need.",
        impact: "Saves 50kg of bread weekly, feeding 200+ people",
        partnerName: "Panaderia Ilonggo",
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: '2',
        title: "School Feeding Program Success",
        description: "Through our partnership with Olongapo Elementary School, we provide nutritious meals to 150 students daily.",
        impact: "150 students receive daily meals, improved attendance by 25%",
        partnerName: "Olongapo Elementary School",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ]

    const samplePartners: Partner[] = [
      {
        id: '1',
        name: "Panaderia Ilonggo",
        type: "bakery",
        joinDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mealsDonated: 1240
      },
      {
        id: '2',
        name: "Grand Olongapo Hotel",
        type: "restaurant",
        joinDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mealsDonated: 856
      },
      {
        id: '3',
        name: "Olongapo City Market",
        type: "supermarket",
        joinDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mealsDonated: 723
      }
    ]

    const sampleComments: Comment[] = [
      {
        id: '1',
        text: "Amazing initiative! I've been volunteering for 3 months and the impact we're making is incredible.",
        userName: "Maria Santos",
        userId: 'user1',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        text: "As a restaurant owner, this platform helped me reduce food waste significantly while helping our community.",
        userName: "Juan Dela Cruz",
        userId: 'user2',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ]

    setVolunteerOpportunities(sampleOpportunities)
    setSuccessStories(sampleStories)
    setTopPartners(samplePartners)
    setComments(sampleComments)
    setLoading(false)
  }, [])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const newCommentObj: Comment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      userName: "Current User",
      userId: 'current-user',
      timestamp: new Date()
    }

    setComments(prev => [newCommentObj, ...prev])
    setNewComment('')
  }

  const handleVolunteerSignUp = async (opportunityId: string, opportunityTitle: string) => {
    setVolunteerOpportunities(prev => 
      prev.map(opp => 
        opp.id === opportunityId 
          ? { ...opp, volunteersSignedUp: opp.volunteersSignedUp + 1 }
          : opp
      )
    )

    setStats(prev => ({
      ...prev,
      totalVolunteers: prev.totalVolunteers + 1
    }))

    alert(`Thank you for signing up for "${opportunityTitle}"! We'll contact you with details.`)
  }

  const getPartnerIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return '🍽️'
      case 'bakery': return '🥖'
      case 'cafe': return '☕'
      case 'supermarket': return '🛒'
      default: return '🤝'
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ 
            width: '3rem', 
            height: '3rem', 
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #16a34a',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ color: '#6b7280' }}>Loading Food Forward...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '2.5rem', 
              height: '2.5rem', 
              borderRadius: '0.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <Image 
                src="/logo.jpeg" 
                alt="Food Forward Logo" 
                width={40}
                height={40}
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                Food Forward
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                📍 Olongapo City
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <Link 
                href="/dashboard"
                style={{
                  backgroundColor: '#16a34a',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  textDecoration: 'none'
                }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/auth/signin"
                  style={{
                    color: '#374151',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem'
                  }}
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup"
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    textDecoration: 'none'
                  }}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '1.5rem' 
          }}>
            <Image 
              src="/logo.jpeg" 
              alt="Food Forward Logo" 
              width={100}
              height={100}
              style={{
                objectFit: 'contain',
              }}
            />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#dcfce7',
            color: '#166534',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '1.5rem'
          }}>
            🌍 Serving Olongapo City
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            Reducing Food Waste,
            <span style={{ color: '#16a34a', display: 'block' }}>One Meal at a Time</span>
          </h1>
          
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            marginBottom: '2rem',
            maxWidth: '42rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.6'
          }}>
            Connect restaurants with surplus food to communities in need. Help us build a sustainable future.
          </p>

          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link 
              href="/auth/signup"
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '0.875rem 1.75rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '1rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              Join Now →
            </Link>
            <button style={{
              border: '2px solid #16a34a',
              color: '#16a34a',
              padding: '0.875rem 1.75rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ ...styles.section, backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem' }}>
              How It Works
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Simple steps to make a big impact
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { icon: '💚', title: 'Donate Food', desc: 'Restaurants post available food donations' },
              { icon: '🤝', title: 'Connect', desc: 'Food banks claim donations for those in need' },
              { icon: '📈', title: 'Track Impact', desc: 'See the difference you make in your community' },
            ].map((feature, index) => (
              <div key={index} style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Volunteer Network Section */}
      <section style={{ ...styles.section, backgroundColor: 'white' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem' }}>
              Volunteer Opportunities
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Make a direct impact in your community
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {volunteerOpportunities.map((opportunity) => (
              <div key={opportunity.id} style={{
                backgroundColor: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>
                    {opportunity.type === 'distribution' ? '🚚' : 
                     opportunity.type === 'awareness' ? '📢' : '💰'}
                  </span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {opportunity.title}
                  </h3>
                </div>
                
                <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>{opportunity.description}</p>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>📅</span>
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>
                      {new Date(opportunity.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>📍</span>
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>{opportunity.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>👥</span>
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>
                      {opportunity.volunteersSignedUp} / {opportunity.volunteersNeeded} volunteers
                    </span>
                  </div>
                </div>

                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '3px',
                  marginBottom: '1rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(opportunity.volunteersSignedUp / opportunity.volunteersNeeded) * 100}%`,
                    height: '100%',
                    backgroundColor: '#16a34a',
                    borderRadius: '3px'
                  }} />
                </div>

                <button
                  onClick={() => handleVolunteerSignUp(opportunity.id, opportunity.title)}
                  disabled={opportunity.volunteersSignedUp >= opportunity.volunteersNeeded}
                  style={{
                    backgroundColor: opportunity.volunteersSignedUp >= opportunity.volunteersNeeded ? '#9ca3af' : '#16a34a',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: opportunity.volunteersSignedUp >= opportunity.volunteersNeeded ? 'not-allowed' : 'pointer',
                    width: '100%',
                    fontSize: '0.875rem'
                  }}
                >
                  {opportunity.volunteersSignedUp >= opportunity.volunteersNeeded ? 'Fully Booked' : 'Sign Up'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Interested in creating volunteer opportunities?
            </p>
            <Link 
              href="/auth/signup"
              style={{
                border: '1px solid #16a34a',
                color: '#16a34a',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-block',
                fontSize: '0.875rem'
              }}
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      {/* Community Stories Section */}
      <section style={{ ...styles.section, backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem' }}>
              Community Impact
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Celebrating our partners and their impact
            </p>
          </div>

          {/* Success Stories */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem', textAlign: 'center' }}>
              Success Stories
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {successStories.map((story) => (
                <div key={story.id} style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderTop: '3px solid #16a34a'
                }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.75rem' }}>
                    {story.title}
                  </h4>
                  <p style={{ color: '#6b7280', marginBottom: '0.75rem', lineHeight: '1.5', fontSize: '0.875rem' }}>{story.description}</p>
                  <div style={{ 
                    backgroundColor: '#dcfce7', 
                    padding: '0.5rem', 
                    borderRadius: '0.25rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem'
                  }}>
                    <strong style={{ color: '#166534' }}>Impact:</strong> 
                    <span style={{ color: '#166534', marginLeft: '0.25rem' }}>{story.impact}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: '0.75rem', 
                    color: '#6b7280' 
                  }}>
                    <span>By {story.partnerName}</span>
                    <span>{new Date(story.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Partners */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem', textAlign: 'center' }}>
              Top Partners
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {topPartners.map((partner, index) => (
                <div key={partner.id} style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: index < 2 ? '2px solid #fbbf24' : '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    {getPartnerIcon(partner.type)}
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                    {partner.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    {partner.mealsDonated} meals donated
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Community Comments */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem', textAlign: 'center' }}>
              Community Feedback
            </h3>
            
            {user ? (
              <form onSubmit={handleAddComment} style={{ 
                marginBottom: '2rem', 
                maxWidth: '500px', 
                margin: '0 auto 2rem',
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your experience or suggestions..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      resize: 'vertical',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem'
                    }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Post Comment
                </button>
              </form>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '2rem',
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                maxWidth: '300px',
                margin: '0 auto 2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Join the conversation
                </p>
                <Link 
                  href="/auth/signin"
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontSize: '0.875rem'
                  }}
                >
                  Sign In to Comment
                </Link>
              </div>
            )}

            {/* Comments List */}
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              {comments.map((comment) => (
                <div key={comment.id} style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.75rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  borderLeft: '3px solid #16a34a'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      color: '#166534',
                      fontSize: '0.75rem'
                    }}>
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.875rem' }}>{comment.userName}</div>
                      <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                        {new Date(comment.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  <p style={{ color: '#374151', lineHeight: '1.4', margin: 0, fontSize: '0.875rem' }}>{comment.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ ...styles.section, backgroundColor: '#16a34a', color: 'white', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '2rem' }}>
            Our Impact in Olongapo City
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { number: stats.mealsProvided.toString(), label: 'Meals Provided' },
              { number: stats.wasteReduced.toString(), label: 'Kg Waste Reduced' },
              { number: stats.co2Saved.toString(), label: 'Kg CO₂ Saved' },
              { number: stats.activePartners.toString(), label: 'Active Partners' },
              { number: stats.totalVolunteers.toString(), label: 'Volunteers' },
            ].map((stat, index) => (
              <div key={index}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {stat.number}
                </div>
                <div style={{ opacity: 0.9, fontSize: '0.875rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#1f2937', color: 'white', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              width: '1.5rem', 
              height: '1.5rem', 
              borderRadius: '0.25rem', 
              overflow: 'hidden',
              position: 'relative'
            }}>
              <Image 
                src="/logo.jpeg" 
                alt="Food Forward Logo" 
                width={24}
                height={24}
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Food Forward</span>
          </div>
          <p style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '0.875rem' }}>© 2025 Food Forward. All rights reserved.</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
            Building a sustainable future in Olongapo City
          </p>
        </div>
      </footer>
    </div>
  )
}