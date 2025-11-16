'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function DashboardRedirect() {
  const { user, userProfile, loading, isDonor, isRecipient, isVolunteer, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user && userProfile) {
        // Redirect to role-specific dashboard
        if (isDonor) {
          router.push('/dashboard/donor')
        } else if (isRecipient) {
          router.push('/dashboard/recipient')
        } else if (isVolunteer) {
          router.push('/dashboard/volunteer')
        } else if (isAdmin) {
          router.push('/dashboard/admin')
        } else {
          // Fallback - redirect to role selection
          router.push('/auth/role-selection')
        }
      } else if (!user) {
        // Redirect to sign-in if not authenticated
        router.push('/auth/signin')
      }
    }
  }, [user, userProfile, loading, isDonor, isRecipient, isVolunteer, isAdmin, router])

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          border: '4px solid #16a34a', 
          borderTopColor: 'transparent', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        <p style={{ color: '#6b7280' }}>Redirecting to your dashboard...</p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}