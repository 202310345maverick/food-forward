'use client';

import { useState, useEffect, useRef } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

interface UseGeolocationProps {
  enabled?: boolean;
  highAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onLocationUpdate?: (location: Location) => void;
}

export function useGeolocation({
  enabled = true,
  highAccuracy = true,
  timeout = 10000,
  maximumAge = 60000,
  onLocationUpdate
}: UseGeolocationProps = {}) {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchId = useRef<number | null>(null);

  const updateLocation = (position: GeolocationPosition) => {
    const newLocation: Location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed || undefined,
      heading: position.coords.heading || undefined,
      timestamp: position.timestamp
    };

    setLocation(newLocation);
    setError(null);
    setIsLoading(false);
    onLocationUpdate?.(newLocation);
  };

  const handleError = (err: GeolocationPositionError) => {
    setError(err.message);
    setIsLoading(false);
    setLocation(null);
  };

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoading(true);

    // Get current position first
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge
      }
    );

    // Then watch for updates
    watchId.current = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [enabled, highAccuracy, timeout, maximumAge]);

  return {
    location,
    error,
    isLoading,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator
  };
}