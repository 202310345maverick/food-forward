'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { UserProfile, UserRole } from '@/types/foodForward';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
  isDonor: boolean;
  isRecipient: boolean;
  isVolunteer: boolean;
  isAdmin: boolean; // Add this
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setError(null);
      
      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setUserProfile({
              uid: user.uid,
              email: profileData.email || user.email!,
              displayName: profileData.displayName || user.displayName || 'User',
              role: profileData.role || 'donor',
              phone: profileData.phone || '',
              address: profileData.address || '',
              rating: profileData.rating || 5,
              totalDonations: profileData.totalDonations || 0,
              totalReceived: profileData.totalReceived || 0,
              totalDeliveries: profileData.totalDeliveries || 0,
              createdAt: profileData.createdAt || new Date(),
              updatedAt: profileData.updatedAt || new Date()
            } as UserProfile);
          } else {
            // Check if we have role data from signup (stored in localStorage temporarily)
            const signupData = localStorage.getItem('foodForward_signupData');
            let roleFromSignup: UserRole = 'donor';
            
            if (signupData) {
              try {
                const data = JSON.parse(signupData);
                roleFromSignup = data.role || 'donor';
                // Clear the temporary storage
                localStorage.removeItem('foodForward_signupData');
              } catch {
                // If parsing fails, use default role
                roleFromSignup = 'donor';
              }
            }

            // Create initial profile with role from signup
            const initialProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              displayName: user.displayName || 'User',
              role: roleFromSignup,
              phone: '',
              address: '',
              rating: 5,
              totalDonations: 0,
              totalReceived: 0,
              totalDeliveries: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await setDoc(doc(db, 'users', user.uid), initialProfile);
            setUserProfile(initialProfile);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setError('Failed to load user profile');
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      setError(errorMessage);
      throw error;
    }
  };

  const updateProfile = async (profile: Partial<UserProfile>): Promise<void> => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    
    try {
      setError(null);
      const updatedProfile = {
        ...profile,
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setUserProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
      throw error;
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const isDonor = userProfile?.role === 'donor';
  const isRecipient = userProfile?.role === 'recipient';
  const isVolunteer = userProfile?.role === 'volunteer';
  const isAdmin = userProfile?.role === 'admin'; // Add this

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    error,
    logout,
    updateProfile,
    clearError,
    isDonor,
    isRecipient,
    isVolunteer,
    isAdmin, // Add this
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}