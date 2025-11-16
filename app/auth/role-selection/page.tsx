'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/foodForward';
import Link from 'next/link';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { updateProfile, userProfile } = useAuth();
  const router = useRouter();

  const handleRoleSelect = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      await updateProfile({ role: selectedRole });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'donor',
      title: 'Food Donor',
      description: 'Restaurants, cafes, or households with surplus food to share',
      icon: '🏪',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'recipient',
      title: 'Food Recipient',
      description: 'Individuals or organizations in need of food assistance',
      icon: '🤝',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'volunteer',
      title: 'Volunteer',
      description: 'Help transport food from donors to recipients',
      icon: '🚗',
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <span className="text-3xl font-bold text-white">Food Forward</span>
          </Link>
          
          <h2 className="text-4xl font-bold text-white mb-4">
            Choose Your Role
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Select how you'd like to participate in reducing food waste and fighting hunger
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                selectedRole === role.id 
                  ? 'border-white bg-white/20' 
                  : 'border-white/20 hover:border-white/40'
              }`}
              onClick={() => setSelectedRole(role.id as UserRole)}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{role.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <button
            onClick={handleRoleSelect}
            disabled={!selectedRole || loading}
            className="w-full max-w-md bg-white text-green-600 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Continuing...</span>
              </span>
            ) : (
              `Continue as ${selectedRole ? roles.find(r => r.id === selectedRole)?.title : '...'}`
            )}
          </button>

          <div className="text-center">
            <Link href="/" className="text-white/80 hover:text-white transition-colors duration-200">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}