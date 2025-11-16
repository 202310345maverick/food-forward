'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import Link from 'next/link'
import Image from 'next/image'
import { 
  FiArrowLeft, 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiCheck, 
  FiAlertCircle,
  FiMapPin,
  FiUser,
  FiTruck,
  FiHome,
  FiShield,
  FiX
} from 'react-icons/fi'

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #ecfdf5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid #d1fae5',
    width: '100%',
    maxWidth: '900px',
    padding: '2rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  button: {
    width: '100%',
    backgroundColor: '#16a34a',
    color: 'white',
    padding: '0.875rem 2rem',
    borderRadius: '0.5rem',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
  },
  roleCard: {
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const
  }
}

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [resetEmail, setResetEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Check for success message from sign-up
  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user
      
      // Get user role from Firestore to ensure proper dashboard routing
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log('User signed in with role:', userData.role)
        
        // Redirect to role-specific dashboard
        switch (userData.role) {
          case 'donor':
            router.push('/dashboard/donor')
            break
          case 'recipient':
            router.push('/dashboard/recipient')
            break
          case 'volunteer':
            router.push('/dashboard/volunteer')
            break
          case 'admin':
            router.push('/dashboard/admin')
            break
          default:
            router.push('/dashboard')
        }
      } else {
        setError('User profile not found. Please contact support.')
      }
    } catch (err: any) {
      console.error('Signin error:', err)
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address')
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.')
      } else {
        setError('Failed to sign in. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordClick = () => {
    setResetEmail(formData.email)
    setShowResetModal(true)
    setError('')
    setResetEmailSent(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      setError('Please enter your email address')
      return
    }

    setError('')
    setResetLoading(true)

    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetEmailSent(true)
      setTimeout(() => {
        setShowResetModal(false)
        setResetEmailSent(false)
      }, 3000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.')
      } else {
        setError('Failed to send reset email. Please try again.')
      }
    } finally {
      setResetLoading(false)
    }
  }

  const closeResetModal = () => {
    setShowResetModal(false)
    setResetEmail('')
    setError('')
    setResetEmailSent(false)
  }

  const userTypes = [
    { 
      value: 'donor', 
      label: 'Donor', 
      desc: 'Restaurant/Food Business',
      icon: <FiUser size={20} style={{ color: '#16a34a' }} />,
      color: '#16a34a'
    },
    { 
      value: 'recipient', 
      label: 'Recipient', 
      desc: 'Food Bank/Organization',
      icon: <FiHome size={20} style={{ color: '#2563eb' }} />,
      color: '#2563eb'
    },
    { 
      value: 'volunteer', 
      label: 'Volunteer', 
      desc: 'Delivery & Logistics',
      icon: <FiTruck size={20} style={{ color: '#9333ea' }} />,
      color: '#9333ea'
    },
    { 
      value: 'admin', 
      label: 'Admin', 
      desc: 'Platform Management',
      icon: <FiShield size={20} style={{ color: '#dc2626' }} />,
      color: '#dc2626'
    }
  ]

  return (
    <div style={styles.container}>
      <div style={{ width: '100%', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link 
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#16a34a',
              textDecoration: 'none',
              fontWeight: '500',
              marginBottom: '1rem'
            }}
          >
            <FiArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
            Back to Home
          </Link>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{ 
              width: '2.5rem', 
              height: '2.5rem', 
              borderRadius: '0.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'white',
              border: '1px solid #d1fae5'
            }}>
              <Image 
                src="/logo.jpeg" 
                alt="Food Forward Logo" 
                width={32}
                height={32}
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                Food Forward
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center' }}>
                <FiMapPin size={12} style={{ marginRight: '0.25rem' }} />
                Olongapo City
              </p>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Left Column - Welcome & Role Info */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
                Welcome Back
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                Sign in to your Food Forward account
              </p>
            </div>

            {/* Role Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                Platform Roles
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {userTypes.map((type) => (
                  <div
                    key={type.value}
                    style={{
                      ...styles.roleCard,
                      borderColor: type.color,
                      backgroundColor: `${type.color}08`
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      {type.icon}
                    </div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: type.color, 
                      fontSize: '0.75rem', 
                      marginBottom: '0.25rem' 
                    }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{type.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Info */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '0.5rem',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <FiCheck size={16} style={{ color: '#065f46' }} />
                <div style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '500' }}>
                  Join Our Mission
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                Reducing food waste and fighting hunger in Olongapo City through community collaboration.
              </div>
            </div>
          </div>

          {/* Right Column - Sign In Form */}
          <div>
            {successMessage && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <FiCheck size={14} />
                {successMessage}
              </div>
            )}

            {error && !showResetModal && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <FiAlertCircle size={14} />
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    style={{ 
                      ...styles.input, 
                      paddingLeft: '2.5rem',
                      borderColor: error && error.includes('email') ? '#dc2626' : '#d1d5db'
                    }}
                    placeholder="Enter your email"
                    required
                  />
                  <FiMail 
                    size={16} 
                    style={{ 
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} 
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#16a34a',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    style={{ 
                      ...styles.input, 
                      paddingLeft: '2.5rem', 
                      paddingRight: '3rem',
                      borderColor: error && error.includes('password') ? '#dc2626' : '#d1d5db'
                    }}
                    placeholder="Enter your password"
                    required
                  />
                  <FiLock 
                    size={16} 
                    style={{ 
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  style={{
                    width: '1rem',
                    height: '1rem',
                    marginRight: '0.5rem'
                  }}
                />
                <label htmlFor="remember-me" style={{ fontSize: '0.75rem', color: '#374151' }}>
                  Remember me on this device
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#15803d'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#16a34a'
                  }
                }}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '0.5rem'
                    }}></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In to Your Account'
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
                Don't have an account?{' '}
                <Link href="/auth/signup" style={{ color: '#16a34a', fontWeight: '600', textDecoration: 'none' }}>
                  Create an account
                </Link>
              </p>

              {/* Quick Sign-up Links */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <Link 
                  href="/auth/signup?role=donor"
                  style={{ 
                    color: '#16a34a', 
                    fontSize: '0.7rem', 
                    fontWeight: '500', 
                    textDecoration: 'none',
                    padding: '0.5rem',
                    border: '1px solid #d1fae5',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    backgroundColor: '#f0fdf4'
                  }}
                >
                  <FiUser size={12} />
                  Donor
                </Link>
                <Link 
                  href="/auth/signup?role=recipient"
                  style={{ 
                    color: '#2563eb', 
                    fontSize: '0.7rem', 
                    fontWeight: '500', 
                    textDecoration: 'none',
                    padding: '0.5rem',
                    border: '1px solid #dbeafe',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    backgroundColor: '#f0f9ff'
                  }}
                >
                  <FiHome size={12} />
                  Recipient
                </Link>
                <Link 
                  href="/auth/signup?role=volunteer"
                  style={{ 
                    color: '#9333ea', 
                    fontSize: '0.7rem', 
                    fontWeight: '500', 
                    textDecoration: 'none',
                    padding: '0.5rem',
                    border: '1px solid #f3e8ff',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    backgroundColor: '#faf5ff'
                  }}
                >
                  <FiTruck size={12} />
                  Volunteer
                </Link>
                <Link 
                  href="/auth/signup?role=admin"
                  style={{ 
                    color: '#dc2626', 
                    fontSize: '0.7rem', 
                    fontWeight: '500', 
                    textDecoration: 'none',
                    padding: '0.5rem',
                    border: '1px solid #fecaca',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    backgroundColor: '#fef2f2'
                  }}
                >
                  <FiShield size={12} />
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                Reset Your Password
              </h3>
              <button
                onClick={closeResetModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            {resetEmailSent ? (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <FiCheck size={16} />
                Password reset email sent! Check your inbox and spam folder.
              </div>
            ) : (
              <>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <FiAlertCircle size={16} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        style={{ 
                          ...styles.input, 
                          paddingLeft: '2.5rem',
                          borderColor: error ? '#dc2626' : '#d1d5db'
                        }}
                        placeholder="Enter your email"
                        required
                      />
                      <FiMail 
                        size={16} 
                        style={{ 
                          position: 'absolute',
                          left: '1rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9ca3af'
                        }} 
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{
                      ...styles.button,
                      opacity: resetLoading ? 0.6 : 1,
                      cursor: resetLoading ? 'not-allowed' : 'pointer',
                      marginBottom: '1rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!resetLoading) {
                        e.currentTarget.style.backgroundColor = '#15803d'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!resetLoading) {
                        e.currentTarget.style.backgroundColor = '#16a34a'
                      }
                    }}
                  >
                    {resetLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          border: '2px solid white',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginRight: '0.5rem'
                        }}></div>
                        Sending...
                      </div>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .card {
            grid-template-columns: 1fr;
            max-width: 400px;
          }
        }
      `}</style>
    </div>
  )
}