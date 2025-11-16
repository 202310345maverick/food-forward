'use client';

import { useEffect, useState } from 'react';

interface LogisticsItem {
  id: string;
  type: 'pickup' | 'delivery';
  donorId: string;
  recipientId: string;
  donorName: string;
  recipientName: string;
  items: string[];
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  address: string;
  coordinates?: { lat: number; lng: number };
  deliveryCoordinates?: { lat: number; lng: number };
  priority: 'low' | 'medium' | 'high';
  volunteerId?: string;
  volunteerName?: string;
  currentLocation?: { lat: number; lng: number; timestamp: Date };
  createdAt: any;
  updatedAt: any;
  quantity: string;
  expiryDate?: string;
  estimatedDuration?: number;
  distance?: number;
}

interface LogisticsMapProps {
  logistics: LogisticsItem[];
  onLogisticSelect: (logistic: LogisticsItem) => void;
  selectedLogistic: LogisticsItem | null;
  showRoutes?: boolean;
  showHeatmap?: boolean;
}

export default function LogisticsMap({ 
  logistics, 
  onLogisticSelect, 
  selectedLogistic,
  showRoutes = true,
  showHeatmap = false 
}: LogisticsMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter out completed logistics
  const activeLogistics = logistics.filter(logistic => logistic.status !== 'completed');

  if (!isClient) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading logistics map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Simple static map placeholder with list view */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Logistics Operations Map</h3>
          <p className="text-gray-500 mb-4">
            {activeLogistics.length} active operations in Olongapo City
          </p>
          
          {/* Operations Summary */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">{activeLogistics.filter(l => l.type === 'pickup').length}</div>
              <div className="text-sm text-gray-600">Pickups</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-green-600">{activeLogistics.filter(l => l.type === 'delivery').length}</div>
              <div className="text-sm text-gray-600">Deliveries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Operations List Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg max-w-sm max-h-96 overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Active Operations</h3>
          <p className="text-sm text-gray-500">{activeLogistics.length} operations</p>
        </div>
        
        <div className="overflow-y-auto max-h-64">
          {activeLogistics.map((logistic) => (
            <div
              key={logistic.id}
              className={`p-3 border-b cursor-pointer transition-colors ${
                selectedLogistic?.id === logistic.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onLogisticSelect(logistic)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      logistic.priority === 'high' ? 'bg-red-500' :
                      logistic.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">
                      {logistic.type === 'pickup' ? '📦 Pickup' : '🚚 Delivery'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      logistic.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      logistic.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      logistic.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {logistic.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {logistic.donorName} → {logistic.recipientName}
                  </p>
                  
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {logistic.address}
                  </p>
                  
                  {logistic.distance && (
                    <p className="text-xs text-blue-600 mt-1">
                      Distance: {logistic.distance.toFixed(1)} km
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {activeLogistics.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No active operations</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4">
        <h4 className="font-semibold text-sm mb-3">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Low Priority</span>
          </div>
        </div>
      </div>
    </div>
  );
}