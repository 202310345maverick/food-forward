'use client';

import { useState, useEffect } from 'react';
import { useGeolocation } from '@/hooks/UseGeoLocation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface LocationTrackerProps {
  operationId: string;
  volunteerId: string;
  isActive: boolean;
  updateInterval?: number;
}

export function LocationTracker({ 
  operationId, 
  volunteerId, 
  isActive, 
  updateInterval = 30000 
}: LocationTrackerProps) {
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const {
    location,
    error,
    isLoading,
    isSupported
  } = useGeolocation({
    enabled: isActive,
    highAccuracy: true,
    timeout: 15000
  });

  // Upload location to Firebase
  useEffect(() => {
    if (!location || !isActive || isUploading) return;

    const shouldUpdate = Date.now() - lastUpdate >= updateInterval;
    
    if (shouldUpdate) {
      const updateLocation = async () => {
        setIsUploading(true);
        try {
          const donationRef = doc(db, 'donations', operationId);
          await updateDoc(donationRef, {
            currentLocation: {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed,
              heading: location.heading,
              timestamp: new Date(location.timestamp)
            },
            lastLocationUpdate: new Date()
          });
          setLastUpdate(Date.now());
        } catch (err) {
          console.error('Failed to update location:', err);
        } finally {
          setIsUploading(false);
        }
      };

      updateLocation();
    }
  }, [location, isActive, operationId, lastUpdate, updateInterval, isUploading]);

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          📍 GPS not supported on this device
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          ❌ Location error: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            isActive 
              ? isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              : 'bg-gray-400'
          }`} />
          <div>
            <p className="text-sm font-medium text-blue-900">
              {isActive ? 'Live GPS Tracking' : 'GPS Tracking Paused'}
            </p>
            <p className="text-xs text-blue-700">
              {location ? (
                `Accuracy: ${location.accuracy.toFixed(1)}m`
              ) : isLoading ? (
                'Getting location...'
              ) : (
                'Waiting for location'
              )}
            </p>
          </div>
        </div>
        
        {isUploading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        )}
      </div>

      {location && (
        <div className="mt-2 text-xs text-blue-800 space-y-1">
          <div className="flex justify-between">
            <span>Latitude:</span>
            <span>{location.latitude.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span>Longitude:</span>
            <span>{location.longitude.toFixed(6)}</span>
          </div>
          {location.speed && (
            <div className="flex justify-between">
              <span>Speed:</span>
              <span>{(location.speed * 3.6).toFixed(1)} km/h</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}