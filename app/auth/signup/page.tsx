'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth'
import { auth, db } from '@/firebase/config'
import { doc, setDoc } from 'firebase/firestore'
import Link from 'next/link'
import Image from 'next/image'
import { 
  FiArrowLeft, 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiUser,
  FiHome,
  FiTruck,
  FiMapPin,
  FiPhone,
  FiTarget,
  FiCheck,
  FiX,
  FiSend,
  FiShield
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
    maxWidth: '1000px',
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
  userTypeCard: {
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  userTypeCardSelected: {
    padding: '1rem',
    border: '2px solid #16a34a',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    backgroundColor: '#f0fdf4',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
  },
  adminTypeCardSelected: {
    padding: '1rem',
    border: '2px solid #dc2626',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    backgroundColor: '#fef2f2',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
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
    maxWidth: '500px',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const
  }
}

export default function SignUpPage() {
  const router = useRouter()
  const initialRole = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('role') || 'donor' : 'donor'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: initialRole,
    phone: '',
    address: '',
    adminCode: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [verificationEmailSent, setVerificationEmailSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [showAdminCode, setShowAdminCode] = useState(false)

  const validAdminCodes = ['ADMIN2025', 'FOODFORWARD', 'OLONGAPOADMIN'];

  const getUserTypeLabel = () => {
    switch (formData.role) {
      case 'donor': return 'Restaurant/Business Name'
      case 'recipient': return 'Organization Name'
      case 'volunteer': return 'Full Name'
      case 'admin': return 'Administrator Name'
      default: return 'Full Name'
    }
  }

  const getUserTypePlaceholder = () => {
    switch (formData.role) {
      case 'donor': return 'e.g., Jollikod'
      case 'recipient': return 'e.g., Olongapo Community'
      case 'volunteer': return 'e.g., Juan Dela Cruz'
      case 'admin': return 'e.g., System Administrator'
      default: return 'Enter your name'
    }
  }

  const sendVerificationEmail = async (user: any) => {
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/auth/signin?verified=true`,
        handleCodeInApp: false
      })
      setVerificationEmailSent(true)
    } catch (error) {
      console.error('Error sending verification email:', error)
    }
  }

  const handleResendVerification = async () => {
    if (!auth.currentUser) return
    setResendLoading(true)
    try {
      await sendVerificationEmail(auth.currentUser)
    } catch (error) {
      console.error('Error resending verification:', error)
    } finally {
      setResendLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!formData.fullName.trim()) {
      setError(`Please enter your ${getUserTypeLabel().toLowerCase()}`)
      return
    }

    if (formData.role === 'admin') {
      if (!formData.adminCode.trim()) {
        setError('Admin code is required for administrator registration')
        return
      }
      if (!validAdminCodes.includes(formData.adminCode.toUpperCase())) {
        setError('Invalid admin code. Please check your code and try again.')
        return
      }
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      await updateProfile(user, {
        displayName: formData.fullName
      })

      await sendVerificationEmail(user)

      const userData: any = {
        uid: user.uid,
        email: formData.email,
        displayName: formData.fullName,
        role: formData.role,
        phone: formData.phone,
        address: formData.address,
        rating: 5,
        createdAt: new Date(),
        emailVerified: false,
        isVerified: false,
      }

      if (formData.role === 'donor') {
        userData.businessType = 'restaurant'
        userData.donationCount = 0
      } else if (formData.role === 'recipient') {
        userData.organizationType = 'food_bank'
        userData.peopleServed = 0
      } else if (formData.role === 'volunteer') {
        userData.availability = 'flexible'
        userData.hoursVolunteered = 0
      } else if (formData.role === 'admin') {
        userData.permissions = ['all']
        userData.adminLevel = 'super'
        userData.registeredWithCode = formData.adminCode
      }

      await setDoc(doc(db, 'users', user.uid), userData)
      setShowSuccessModal(true)
      
    } catch (err: any) {
      console.error('Signup error:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.')
      } else {
        setError('Failed to create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToLogin = () => {
    setShowSuccessModal(false)
    router.push('/auth/signin')
  }

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ 
      ...prev, 
      role,
      adminCode: ''
    }))
    setShowAdminCode(role === 'admin')
  }

  const userTypes = [
    { 
      value: 'donor', 
      label: 'Restaurant/Donor', 
      desc: 'Post food donations', 
      icon: <FiUser size={24} style={{ color: '#16a34a' }} />,
      requiresCode: false
    },
    { 
      value: 'recipient', 
      label: 'Food Bank/Recipient', 
      desc: 'Receive and distribute food', 
      icon: <FiHome size={24} style={{ color: '#2563eb' }} />,
      requiresCode: false
    },
    { 
      value: 'volunteer', 
      label: 'Volunteer', 
      desc: 'Help with food delivery', 
      icon: <FiTruck size={24} style={{ color: '#9333ea' }} />,
      requiresCode: false
    },
    { 
      value: 'admin', 
      label: 'Administrator', 
      desc: 'Manage platform operations', 
      icon: <FiShield size={24} style={{ color: '#dc2626' }} />,
      requiresCode: true
    }
  ]

  return (
    <div style={styles.container}>
      <div style={{ width: '100%', maxWidth: '1000px' }}>
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
          {/* Left Column - Role Selection */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
                Join Our Community
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                Choose your role and start making a difference
              </p>
            </div>

            {/* User Type Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                I want to join as:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {userTypes.map((type) => (
                  <div
                    key={type.value}
                    style={
                      formData.role === type.value 
                        ? type.value === 'admin' 
                          ? styles.adminTypeCardSelected 
                          : styles.userTypeCardSelected
                        : styles.userTypeCard
                    }
                    onClick={() => handleRoleChange(type.value)}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                        {type.icon}
                      </div>
                      <div style={{ 
                        fontWeight: '600', 
                        color: formData.role === type.value && type.value === 'admin' ? '#dc2626' : '#1f2937', 
                        fontSize: '0.75rem', 
                        marginBottom: '0.25rem' 
                      }}>
                        {type.label}
                        {type.requiresCode && (
                          <span style={{ 
                            fontSize: '0.6rem', 
                            color: '#dc2626', 
                            marginLeft: '0.25rem',
                            fontWeight: 'normal'
                          }}>
                            (Code)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{type.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Role Info */}
            <div style={{
              backgroundColor: formData.role === 'admin' ? '#fef2f2' : '#f0fdf4',
              border: formData.role === 'admin' ? '1px solid #fecaca' : '1px solid #bbf7d0',
              borderRadius: '0.5rem',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {formData.role === 'admin' ? (
                  <FiShield size={16} style={{ color: '#dc2626' }} />
                ) : (
                  <FiTarget size={16} style={{ color: '#065f46' }} />
                )}
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: formData.role === 'admin' ? '#dc2626' : '#065f46', 
                  fontWeight: '500' 
                }}>
                  Selected: <strong>{formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}</strong>
                </div>
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: formData.role === 'admin' ? '#b91c1c' : '#047857'
              }}>
                {formData.role === 'donor' && 'Create and manage food donations'}
                {formData.role === 'recipient' && 'Browse and claim available food'}
                {formData.role === 'volunteer' && 'Accept and complete delivery tasks'}
                {formData.role === 'admin' && 'Full system access and management'}
              </div>
            </div>

            {/* Admin Code Input */}
            {showAdminCode && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Admin Registration Code *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.adminCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminCode: e.target.value }))}
                    style={{ 
                      ...styles.input, 
                      paddingLeft: '2.5rem',
                      borderColor: formData.adminCode ? '#16a34a' : '#d1d5db'
                    }}
                    placeholder="Enter admin code"
                    required
                  />
                  <FiShield 
                    size={16} 
                    style={{ 
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: formData.adminCode ? '#16a34a' : '#9ca3af'
                    }} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Form */}
          <div>
            {error && (
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
                <FiTarget size={14} />
                {error}
              </div>
            )}

            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  {getUserTypeLabel()} *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    style={{ ...styles.input, paddingLeft: '2.5rem' }}
                    placeholder={getUserTypePlaceholder()}
                    required
                  />
                  <FiUser 
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

              {/* Contact Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      style={{ ...styles.input, paddingLeft: '2.5rem' }}
                      placeholder="+63 921 816 2137"
                    />
                    <FiPhone 
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
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      style={{ ...styles.input, paddingLeft: '2.5rem' }}
                      placeholder="Olongapo City"
                    />
                    <FiMapPin 
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
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    style={{ ...styles.input, paddingLeft: '2.5rem' }}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    style={{ ...styles.input, paddingLeft: '2.5rem', paddingRight: '3rem' }}
                    placeholder="Create a password"
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

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Confirm Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    style={{ ...styles.input, paddingLeft: '2.5rem', paddingRight: '3rem' }}
                    placeholder="Re-enter password"
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  backgroundColor: formData.role === 'admin' ? '#dc2626' : '#16a34a',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem'
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
                    Creating Account...
                  </div>
                ) : (
                  `Create ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} Account`
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Already have an account?{' '}
                <Link href="/auth/signin" style={{ color: '#16a34a', fontWeight: '600', textDecoration: 'none' }}>
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: '1.5rem' 
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: formData.role === 'admin' ? '#fef2f2' : '#f0fdf4',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${formData.role === 'admin' ? '#fecaca' : '#bbf7d0'}`
              }}>
                <FiCheck size={32} style={{ color: formData.role === 'admin' ? '#dc2626' : '#16a34a' }} />
              </div>
            </div>

            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: '#1f2937', 
              marginBottom: '1rem' 
            }}>
              {formData.role === 'admin' ? 'Administrator Account Created!' : 'Account Created Successfully!'}
            </h3>

            {verificationEmailSent ? (
              <>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#065f46',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FiMail size={16} />
                    <strong>Verification Email Sent</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    We've sent a verification link to <strong>{formData.email}</strong>. 
                    Please check your inbox.
                  </p>
                </div>

                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  style={{
                    ...styles.button,
                    marginBottom: '1rem',
                    backgroundColor: resendLoading ? '#9ca3af' : '#3b82f6',
                    opacity: resendLoading ? 0.6 : 1,
                    cursor: resendLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {resendLoading ? (
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
                    <>
                      <FiSend size={16} style={{ marginRight: '0.5rem' }} />
                      Resend Verification Email
                    </>
                  )}
                </button>
              </>
            ) : (
              <div style={{
                backgroundColor: '#fef3f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  We couldn't send a verification email. You can verify your email later from account settings.
                </p>
              </div>
            )}

            <button
              onClick={handleProceedToLogin}
              style={{
                ...styles.button,
                marginBottom: '1rem',
                backgroundColor: formData.role === 'admin' ? '#dc2626' : '#16a34a'
              }}
            >
              Proceed to Login
            </button>
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