'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { UserRole } from '@/types/foodForward'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
      return
    }
    
    if (!loading && user && requiredRole && userProfile?.role !== requiredRole) {
      router.push('/unauthorized')
    }
  }, [user, loading, userProfile, requiredRole, router])

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <div>Redirecting to login...</div>
  }

  if (requiredRole && userProfile?.role !== requiredRole) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return <>{children}</>
}