// hooks/useRoleAccess.ts
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function useRoleAccess(allowedRoles: string[]) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [accessGranted, setAccessGranted] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin')
        return
      }

      if (userProfile) {
        const userRole = userProfile.role
        
        // Check if user is already on the correct page
        const isOnCorrectPage = pathname.includes(`/dashboard/${userRole}`)
        
        if (allowedRoles.includes(userRole)) {
          setAccessGranted(true)
        } else if (!isOnCorrectPage) {
          // Only redirect if not already on the correct page
          switch (userRole) {
            case 'donor':
              router.push('/dashboard/donor')
              break
            case 'recipient':
              router.push('/dashboard/recipient')
              break
            case 'volunteer':
              router.push('/dashboard/volunteer')
              break
            default:
              router.push('/dashboard')
          }
        } else {
          // User is on correct page but role doesn't match allowed roles
          setAccessGranted(false)
        }
      }
    }
  }, [user, userProfile, loading, allowedRoles, router, pathname])

  return { 
    user, 
    userProfile, 
    loading, 
    accessGranted,
    hasAccess: allowedRoles.includes(userProfile?.role || '')
  }
}