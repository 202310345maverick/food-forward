export interface Coordinates {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates> {
  // For production, use a proper geocoding service like:
  // - Google Maps Geocoding API
  // - Mapbox Geocoding API
  // - OpenStreetMap Nominatim
  
  // For now, we'll use a simple mock that returns coordinates for Olongapo areas
  const addressLower = address.toLowerCase();
  
  // Common Olongapo areas with approximate coordinates
  const locations: { [key: string]: Coordinates } = {
    'olongapo city': { lat: 14.8295, lng: 120.2821 },
    'subic': { lat: 14.8794, lng: 120.2353 },
    'barretto': { lat: 14.8550, lng: 120.2678 },
    'castillejos': { lat: 14.9306, lng: 120.1986 },
    'sbfz': { lat: 14.7953, lng: 120.2792 },
    'mabayuan': { lat: 14.8450, lng: 120.2750 },
    'new cabalan': { lat: 14.8150, lng: 120.2850 },
    'old cabalan': { lat: 14.8250, lng: 120.2750 },
    'gordon heights': { lat: 14.8350, lng: 120.2950 },
    'asinan': { lat: 14.8550, lng: 120.2950 },
    'kalaklan': { lat: 14.8450, lng: 120.2650 },
    'new ilalim': { lat: 14.8150, lng: 120.2750 },
  };

  // Try to find matching location
  for (const [key, coords] of Object.entries(locations)) {
    if (addressLower.includes(key)) {
      // Add slight variation to make markers distinct
      const variation = 0.002;
      return {
        lat: coords.lat + (Math.random() * variation * 2 - variation),
        lng: coords.lng + (Math.random() * variation * 2 - variation)
      };
    }
  }

  // Default to Olongapo City center with variation
  const variation = 0.01;
  return {
    lat: 14.8295 + (Math.random() * variation * 2 - variation),
    lng: 120.2821 + (Math.random() * variation * 2 - variation)
  };
}

// Batch geocode multiple addresses
export async function geocodeAddresses(addresses: string[]): Promise<Map<string, Coordinates>> {
  const results = new Map<string, Coordinates>();
  
  for (const address of addresses) {
    try {
      const coords = await geocodeAddress(address);
      results.set(address, coords);
    } catch (error) {
      console.error(`Failed to geocode address: ${address}`, error);
      // Fallback to default coordinates
      results.set(address, { lat: 14.8295, lng: 120.2821 });
    }
  }
  
  return results;
}