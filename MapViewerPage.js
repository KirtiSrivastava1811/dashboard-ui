import React, { useState,
  useEffect,
  useRef,
  useCallback,
  useMemo } from 'react';
import {
  MapPin,
  Users,
  RefreshCw,
  Filter,
  Layers,
  Navigation,
  Clock,
  Eye,
  Calendar,
  TrendingUp,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
  User as UserIcon,
  Circle,
  Route as RouteIcon,
  Navigation2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle as LeafletCircle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = "https://geo-track-1.onrender.com/api";

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createUserIcon = (isOnline) => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${isOnline 
          ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
          : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
        };
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      ${isOnline ? `
        <div style="
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #43e97b;
          border: 2px solid white;
          position: absolute;
          bottom: 0;
          right: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        "></div>
      ` : ''}
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const createClientIcon = () => {
  return L.divIcon({
    className: 'custom-client-marker',
    html: `
      <div style="
        width: 32px;
        height: 40px;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" style="transform: rotate(45deg);">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

// Component to handle map events and controls
const MapController = ({ center, zoom, onMoveEnd }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  useEffect(() => {
    map.on('moveend', () => {
      const newCenter = map.getCenter();
      const newZoom = map.getZoom();
      if (onMoveEnd) {
        onMoveEnd({ center: newCenter, zoom: newZoom });
      }
    });
  }, [map, onMoveEnd]);

  return null;
};

const NeumorphicCard = ({ children, className = "" }) => (
  <div
    className={`p-5 rounded-2xl ${className}`}
    style={{
      background: '#ecf0f3',
      boxShadow: '6px 6px 12px rgba(163,177,198,0.6), -6px -6px 12px rgba(255,255,255, 0.5)',
      border: '1px solid rgba(255,255,255,0.8)',
    }}
  >
    {children}
  </div>
);


// Add this BEFORE the MapViewerPage component
const MapBoundsTracker = ({ onBoundsChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    },
    zoomend: () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    },
  });
  return null;
};

const MapViewerPage = ({ onViewUserDetails, onRefresh }) => {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [userLocations, setUserLocations] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickVisits, setQuickVisits] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  // Filters
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showClients, setShowClients] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAccuracyCircles, setShowAccuracyCircles] = useState(false);
  
  // Map state
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]); // Mumbai default [lat, lng]
  const [mapZoom, setMapZoom] = useState(12);

    // Add these RIGHT AFTER your existing states
  const [clientsCache, setClientsCache] = useState([]);
  const [userLocationsCache, setUserLocationsCache] = useState({});
  const [mapBounds, setMapBounds] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
    
  const mapRef = useRef(null);
  const token = localStorage.getItem("token");

  // Filter logic
  const filteredUsers = users.filter((user) => {
    const location = userLocations[user.id];
    
    if (showOnlineOnly && !location?.clockedIn) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !user.full_name?.toLowerCase().includes(searchLower) &&
        !user.email?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    
    return true;
  });
  
  // Filter clients FIRST
  const filteredClients = clients.filter((client) => {
    if (!client.latitude || !client.longitude) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!client.name?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Then compute visible clients SECOND
  const visibleClients = useMemo(() => {
    if (!mapBounds) return filteredClients;

    return filteredClients.filter((client) =>
      mapBounds.contains([client.latitude, client.longitude])
    );
  }, [mapBounds, filteredClients]);

  // Group users by location to handle overlapping
  const groupedUsers = useMemo(() => {
    const groups = {};
    
    filteredUsers.forEach(user => {
      const location = userLocations[user.id];
      if (!location?.location) return;
      
      const { latitude, longitude } = location.location;
      const key = `${latitude.toFixed(5)}_${longitude.toFixed(5)}`;
      
      if (!groups[key]) {
        groups[key] = {
          lat: latitude,
          lng: longitude,
          users: []
        };
      }
      groups[key].users.push({ user, location });
    });
    
    return groups;
  }, [filteredUsers, userLocations]);

  // Group clients by location to handle overlapping
  const groupedClients = useMemo(() => {
    const groups = {};
    
    visibleClients.forEach(client => {
      const key = `${client.latitude.toFixed(5)}_${client.longitude.toFixed(5)}`;
      if (!groups[key]) {
        groups[key] = {
          lat: client.latitude,
          lng: client.longitude,
          clients: []
        };
      }
      groups[key].clients.push(client);
    });
    
    return groups;
  }, [visibleClients]);

  // Helper function to offset overlapping markers
  const getOffsetPosition = (lat, lng, index, total) => {
    if (total === 1) return [lat, lng];
    
    // Create a circle of markers around the original position
    const radius = 0.0001 * (total > 5 ? 2 : 1); // Adjust radius based on count
    const angle = (2 * Math.PI * index) / total;
    
    return [
      lat + radius * Math.cos(angle),
      lng + radius * Math.sin(angle)
    ];
  };


  const createQuickVisitIcon = (visitType) => {
  const config = {
    met_success: { color: '#43e97b', icon: '✓', label: 'Met' },
    not_available: { color: '#fbbf24', icon: '✗', label: 'N/A' },
    office_closed: { color: '#ef4444', icon: '🔒', label: 'Closed' },
    phone_call: { color: '#4facfe', icon: '📞', label: 'Call' }
  };
  const { color, icon } = config[visitType] || config.met_success;
  return L.divIcon({
    className: 'custom-quick-visit-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        color: white;
      ">
        ${icon}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

  // Fetch data
  useEffect(() => {
    fetchAllData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAllData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch users
      const usersRes = await fetch(`${API_BASE_URL}/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      // Fetch clients
      // Fetch clients - ONLY on initial load or manual refresh
if (isInitialLoad || !autoRefresh) {
  console.log('🔄 Fetching all clients...');
  const clientsRes = await fetch(`${API_BASE_URL}/admin/clients?limit=15000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const clientsData = await clientsRes.json();
  const fetchedClients = clientsData.clients || [];
  setClients(fetchedClients);
  setClientsCache(fetchedClients); // Cache it!
  setIsInitialLoad(false);
} else {
  // Use cached clients on auto-refresh
  console.log('✅ Using cached clients:', clientsCache.length);
  setClients(clientsCache);
}

      // Fetch latest location for each user
      const locationPromises = (usersData.users || []).map(async (user) => {
  try {
    // ✅ CORRECT ENDPOINT PATH
    const logsRes = await fetch(
      `${API_BASE_URL}/admin/users/${user.id}/location-logs?limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // ✅ HANDLE 404 GRACEFULLY
    if (logsRes.status === 404) {
      console.log(`⚠️ No location data for user ${user.id}`);
      
      // Still fetch clock status
      const clockRes = await fetch(
        `${API_BASE_URL}/admin/clock-status/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const clockData = await clockRes.json();
      
      return {
        userId: user.id,
        user: user,
        location: null,
        clockedIn: clockData.clocked_in || false,
        lastSeen: clockData.last_seen || null,
      };
    }
    
    // ✅ CHECK FOR OTHER ERRORS
    if (!logsRes.ok) {
      throw new Error(`Location fetch failed: ${logsRes.status}`);
    }
    
    const logsData = await logsRes.json();
    
    // ✅ CHANGED: Use locationLogs instead of logs
    const latestLog = logsData.locationLogs?.[0];
    
    // Also get clock status
    const clockRes = await fetch(
      `${API_BASE_URL}/admin/clock-status/${user.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!clockRes.ok) {
      throw new Error(`Clock status fetch failed: ${clockRes.status}`);
    }
    
    const clockData = await clockRes.json();

    return {
      userId: user.id,
      user: user,
      location: latestLog,
      clockedIn: clockData.clocked_in || false,
      lastSeen: clockData.last_seen || null,
    };
  } catch (err) {
    // ✅ IMPROVED ERROR LOGGING
    console.warn(`Failed to fetch data for user ${user.id}:`, err.message);
    return { 
      userId: user.id, 
      user: user, 
      location: null, 
      clockedIn: false,
      lastSeen: null 
    };
  }
});

      const locationResults = await Promise.all(locationPromises);
      const locationsMap = {};
      locationResults.forEach((result) => {
        locationsMap[result.userId] = result;
      });
      setUserLocations(locationsMap);
    setUserLocationsCache(locationsMap);


    console.log('🔄 Fetching quick visits for all users...');
    const quickVisitPromises = (usersData.users || []).map(async (user) => {
      try {
        const qvRes = await fetch(
          `${API_BASE_URL}/quick-visits/admin/user/${user.id}?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!qvRes.ok) {
          console.warn(`Quick visits fetch failed for user ${user.id}:`, qvRes.status);
          return { userId: user.id, visits: [] };
        }
        
        const qvData = await qvRes.json();
        return {
          userId: user.id,
          visits: qvData.quickVisits || []
        };
      } catch (err) {
        console.warn(`Failed to fetch quick visits for user ${user.id}:`, err.message);
        return { userId: user.id, visits: [] };
      }
    });

    const quickVisitResults = await Promise.all(quickVisitPromises);
    const quickVisitsMap = {};
    quickVisitResults.forEach((result) => {
      quickVisitsMap[result.userId] = result.visits;
    });
    setQuickVisits(quickVisitsMap);

    console.log('✅ Quick visits loaded:', Object.keys(quickVisitsMap).length, 'users');


      // Auto-center map on first location
      if (locationResults.length > 0) {
        const firstLocation = locationResults.find(r => r.location);
        if (firstLocation?.location) {
          setMapCenter([firstLocation.location.latitude, firstLocation.location.longitude]);
        }
      }

    } catch (err) {
      console.error("Error fetching map data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };




  // Stats
  const onlineCount = Object.values(userLocations).filter(l => l.clockedIn).length;
  const usersWithLocation = Object.values(userLocations).filter(l => l.location).length;
  const clientsWithGPS = clients.filter(c => c.latitude && c.longitude).length;
  const totalQuickVisits = Object.values(quickVisits).reduce((sum, visits) => sum + visits.length, 0);
const quickVisitsByType = Object.values(quickVisits).reduce((acc, visits) => {
  visits.forEach(v => {
    acc[v.visitType] = (acc[v.visitType] || 0) + 1;
  });
  return acc;
}, {});

  // Center map on user
  const centerOnUser = (user) => {
    const location = userLocations[user.id];
    if (location?.location) {
      setMapCenter([location.location.latitude, location.location.longitude]);
      setMapZoom(16);
      setSelectedUser(user);
    }
  };

  // Center map on client
  const centerOnClient = (client) => {
    if (client.latitude && client.longitude) {
      setMapCenter([client.latitude, client.longitude]);
      setMapZoom(16);
      setSelectedClient(client);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Stats */}
      <div className="grid grid-cols-4 gap-4">
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Online Users
              </p>
              <h3 className="text-3xl font-bold" style={{ color: '#1e293b' }}>
  {visibleClients.length}
</h3>
<p className="text-xs" style={{ color: '#94a3b8' }}>
  of {clientsWithGPS} total
</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </NeumorphicCard>
        <NeumorphicCard>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
        Cache Status
      </p>
      <h3 className="text-xl font-bold" style={{ color: '#1e293b' }}>
        {clientsCache.length > 0 ? '✅ Active' : '⏳ Loading'}
      </h3>
    </div>
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
      }}
    >
      <Layers className="w-6 h-6 text-white" />
    </div>
  </div>
</NeumorphicCard>
<NeumorphicCard>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
        Quick Visits
      </p>
      <h3 className="text-3xl font-bold" style={{ color: '#1e293b' }}>
        {totalQuickVisits}
      </h3>
      <p className="text-xs" style={{ color: '#94a3b8' }}>
        {quickVisitsByType.met_success || 0} successful
      </p>
    </div>
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
      }}
    >
      <Activity className="w-6 h-6 text-white" />
    </div>
  </div>
</NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Users Tracked
              </p>
              <h3 className="text-3xl font-bold" style={{ color: '#1e293b' }}>
                {usersWithLocation}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Clients on Map
              </p>
              <h3 className="text-3xl font-bold" style={{ color: '#1e293b' }}>
                {clientsWithGPS}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Auto-Refresh
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: '#43e97b' }}
                />
                <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                  {autoRefresh ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
  setIsInitialLoad(false); // Force fresh fetch
  fetchAllData();
}}
              disabled={loading}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <RefreshCw className={`w-6 h-6 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </NeumorphicCard>
      </div>

      {/* Filters Bar */}
      <NeumorphicCard>
        <div className="grid grid-cols-12 gap-4">
          {/* Search */}
          <div className="col-span-4 relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
              style={{ color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search users or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-sm font-medium transition-all"
              style={{
                background: '#e6eaf0',
                border: 'none',
                borderRadius: '12px',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            />
          </div>

          {/* Refresh Interval */}
          <div className="col-span-2">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="w-full px-4 py-3 text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: '#e6eaf0',
                border: 'none',
                borderRadius: '12px',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            >
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
            </select>
          </div>

          {/* Accuracy Circles Toggle */}
          <div className="col-span-2">
            <button
              onClick={() => setShowAccuracyCircles(!showAccuracyCircles)}
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2`}
              style={
                showAccuracyCircles
                  ? {
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: 'white',
                      boxShadow: '4px 4px 8px rgba(240, 147, 251, 0.4)',
                    }
                  : {
                      background: '#ecf0f3',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                      color: '#64748b',
                    }
              }
            >
              <Navigation2 className="w-4 h-4" />
              Accuracy
            </button>
          </div>

          {/* Toggle Buttons */}
          <div className="col-span-4 flex gap-2">
            <button
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2`}
              style={
                showOnlineOnly
                  ? {
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      color: 'white',
                      boxShadow: '4px 4px 8px rgba(67, 233, 123, 0.4)',
                    }
                  : {
                      background: '#ecf0f3',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                      color: '#64748b',
                    }
              }
            >
              <Circle className="w-4 h-4" />
              Online
            </button>

            <button
              onClick={() => setShowUsers(!showUsers)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2`}
              style={
                showUsers
                  ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                    }
                  : {
                      background: '#ecf0f3',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                      color: '#64748b',
                    }
              }
            >
              <Users className="w-4 h-4" />
              Users
            </button>

            <button
              onClick={() => setShowClients(!showClients)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2`}
              style={
                showClients
                  ? {
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      color: 'white',
                      boxShadow: '4px 4px 8px rgba(79, 172, 254, 0.4)',
                    }
                  : {
                      background: '#ecf0f3',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                      color: '#64748b',
                    }
              }
            >
              <MapPin className="w-4 h-4" />
              Clients
            </button>
          </div>
        </div>
      </NeumorphicCard>

      {/* Error Message */}
      {error && (
        <div
          className="p-4 rounded-2xl border-l-4"
          style={{
            background: "#fed7d7",
            borderColor: "#fc8181",
          }}
        >
          <p style={{ color: "#c53030" }} className="font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Map Container */}
      <div className="grid grid-cols-4 gap-4">
        {/* Main Map */}
        <div className="col-span-3">
          <NeumorphicCard className="relative" style={{ minHeight: '600px', padding: 0, overflow: 'hidden' }}>
            {loading && (
  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-[1000] rounded-2xl">
    <div className="text-center">
      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: '#667eea' }} />
      <p className="text-sm font-semibold" style={{ color: '#667eea' }}>
        {isInitialLoad ? 'Loading all data...' : 'Refreshing locations...'}
      </p>
    </div>
  </div>
)}
            
            {/* Leaflet Map */}
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '600px', width: '100%', borderRadius: '16px' }}
              zoomControl={false}
              ref={mapRef}
            >
              {/* OpenStreetMap Tiles */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Map Controller */}
              <MapController 
                center={mapCenter} 
                zoom={mapZoom}
                onMoveEnd={(data) => {
                  // Can track map movement if needed
                }}
              />
              {/* Add this NEW component */}
<MapBoundsTracker onBoundsChange={setMapBounds} />

              {/* User Markers - With overlap handling */}
  {showUsers && Object.values(groupedUsers).map((group) => {
                return group.users.map(({ user, location }, index) => {
                  const { latitude, longitude, accuracy } = location.location;
                  const isOnline = location.clockedIn;
                  const [offsetLat, offsetLng] = getOffsetPosition(
                    latitude, 
                    longitude, 
                    index, 
                    group.users.length
                  );

                return (
                  <React.Fragment key={user.id}>
                    <Marker
                      position={[offsetLat, offsetLng]}
                      icon={createUserIcon(isOnline)}
                      eventHandlers={{
                        click: () => {
                          setSelectedUser(user);
                          setMapCenter([latitude, longitude]);
                          setMapZoom(16);
                        },
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: '200px' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                              style={{
                                background: isOnline
                                  ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                                  : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                              }}
                            >
                              {(user.full_name || user.email || "").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm">{user.full_name || "No name"}</h3>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          
                          {group.users.length > 1 && (
                            <div className="mb-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}>
                              📍 {group.users.length} users at this location
                            </div>
                          )}
                          
                          <div className="space-y-1 text-xs">
                            <p><strong>Status:</strong> <span style={{ color: isOnline ? '#43e97b' : '#94a3b8' }}>{isOnline ? 'Online' : 'Offline'}</span></p>
                            <p><strong>Pincode:</strong> {location.location.pincode || 'N/A'}</p>
                            <p><strong>Accuracy:</strong> {accuracy ? `${accuracy}m` : 'N/A'}</p>
                            <p><strong>Last Update:</strong> {new Date(location.location.timestamp).toLocaleTimeString()}</p>
                            {location.location.activity && (
                              <p><strong>Activity:</strong> {location.location.activity}</p>
                            )}
                          </div>

                          <button
                            onClick={() => onViewUserDetails && onViewUserDetails(user)}
                            className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-semibold text-white"
                            style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                          >
                            View Full Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Accuracy Circle */}
                    {showAccuracyCircles && accuracy && index === 0 && (
                      <LeafletCircle
                        center={[latitude, longitude]}
                        radius={accuracy}
                        pathOptions={{
                          color: isOnline ? '#43e97b' : '#94a3b8',
                          fillColor: isOnline ? '#43e97b' : '#94a3b8',
                          fillOpacity: 0.1,
                          weight: 1,
                        }}
                      />
                    )}
                  </React.Fragment>
                  
                );
              });
              })}

              {/* Client Markers - With overlap handling */}
                {showClients && Object.values(groupedClients).map((group) => {
                return group.clients.map((client, index) => {
                  const [offsetLat, offsetLng] = getOffsetPosition(
                    group.lat,
                    group.lng,
                    index,
                    group.clients.length
                  );

                  return (
                <Marker
                  key={client.id}
                  position={[offsetLat, offsetLng]}
                  icon={createClientIcon()}
                  eventHandlers={{
                    click: () => {
                      setSelectedClient(client);
                      setMapCenter([group.lat, group.lng]);
                      setMapZoom(16);
                    },
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          }}
                        >
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{client.name}</h3>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: client.status === 'active' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                              color: client.status === 'active' ? '#43e97b' : '#64748b',
                            }}
                          >
                            {client.status}
                          </span>
                        </div>
                      </div>
                      
                      {group.clients.length > 1 && (
                        <div className="mb-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'rgba(79, 172, 254, 0.2)', color: '#4facfe' }}>
                          📍 {group.clients.length} clients at this location
                        </div>
                      )}
                      
                      <div className="space-y-1 text-xs">
                        {client.email && <p><strong>Email:</strong> {client.email}</p>}
                        {client.phone && <p><strong>Phone:</strong> {client.phone}</p>}
                        {client.pincode && <p><strong>Pincode:</strong> {client.pincode}</p>}
                        <p><strong>Coordinates:</strong> {client.latitude.toFixed(4)}, {client.longitude.toFixed(4)}</p>
                      </div>

                      <a
                        href={`https://www.google.com/maps?q=${client.latitude},${client.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-semibold text-white block text-center"
                        style={{
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        }}
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </Popup>
                </Marker>
                );
              });
              })}

              {/* Quick Visit Markers */}
{showUsers && Object.entries(quickVisits).map(([userId, visits]) => {
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  return visits.map((visit, idx) => {
    if (!visit.latitude || !visit.longitude) return null;

    const visitTypeLabels = {
      met_success: 'Met Successfully',
      not_available: 'Not Available',
      office_closed: 'Office Closed',
      phone_call: 'Phone Call'
    };

    return (
      <Marker
        key={`qv-${visit.id}`}
        position={[visit.latitude, visit.longitude]}
        icon={createQuickVisitIcon(visit.visitType)}
      >
        <Popup>
          <div style={{ minWidth: '220px' }}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: visit.visitType === 'met_success' ? '#43e97b' 
                    : visit.visitType === 'not_available' ? '#fbbf24'
                    : visit.visitType === 'office_closed' ? '#ef4444' 
                    : '#4facfe',
                }}
              >
                <span className="text-white text-lg">
                  {visit.visitType === 'met_success' ? '✓' 
                    : visit.visitType === 'not_available' ? '✗'
                    : visit.visitType === 'office_closed' ? '🔒' 
                    : '📞'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm">Quick Visit</h3>
                <p className="text-xs text-gray-500">{visitTypeLabels[visit.visitType]}</p>
              </div>
            </div>

            <div className="space-y-1 text-xs mb-3">
              <p><strong>Agent:</strong> {user.full_name || user.email}</p>
              <p><strong>Client:</strong> {visit.clientName || 'Unknown'}</p>
              <p><strong>Time:</strong> {new Date(visit.createdAt).toLocaleString()}</p>
              {visit.notes && <p><strong>Notes:</strong> {visit.notes}</p>}
            </div>

            {visit.clientLatitude && visit.clientLongitude && (
              <a
                href={`https://www.google.com/maps?q=${visit.clientLatitude},${visit.clientLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white block text-center"
                style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                }}
              >
                View Client Location
              </a>
            )}
          </div>
        </Popup>
      </Marker>
    );
  });
})}
            </MapContainer>
          </NeumorphicCard>
        </div>

        

        {/* Sidebar with User/Client List */}
        <div className="col-span-1">
          <NeumorphicCard style={{ maxHeight: '600px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1e293b' }}>
              Live Locations
            </h3>
            
            <div className="space-y-3 overflow-y-auto flex-1" style={{ maxHeight: '520px' }}>
              {/* Users Section */}
              {showUsers && filteredUsers.map((user) => {
                const location = userLocations[user.id];
                const hasLocation = location?.location;
                const isOnline = location?.clockedIn;

                return (
                  <div
                    key={user.id}
                    onClick={() => hasLocation && centerOnUser(user)}
                    className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                    style={{
                      background: selectedUser?.id === user.id ? 'rgba(102, 126, 234, 0.1)' : '#ffffff',
                      boxShadow: '2px 2px 4px rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{
                          background: isOnline
                            ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                            : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                        }}
                      >
                        {(user.full_name || user.email || "").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>
                          {user.full_name || "No name"}
                        </p>
                        <div className="flex items-center gap-1">
                          {isOnline && (
                            <Circle className="w-2 h-2 fill-current" style={{ color: '#43e97b' }} />
                          )}
                          <span className="text-xs" style={{ color: isOnline ? '#43e97b' : '#94a3b8' }}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {hasLocation && (
                      <div className="text-xs" style={{ color: '#64748b' }}>
                        <p className="truncate">📍 {location.location.pincode || 'No pincode'}</p>
                        <p className="truncate">
                          🕐 {new Date(location.location.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    
                    {!hasLocation && (
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        No location data
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Clients Section */}
              {showClients && (
                <>
                  {filteredUsers.length > 0 && filteredClients.length > 0 && (
                    <div className="border-t pt-3 mt-3" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#94a3b8' }}>
                        Clients
                      </p>
                    </div>
                  )}
                  
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => centerOnClient(client)}
                      className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                      style={{
                        background: selectedClient?.id === client.id ? 'rgba(79, 172, 254, 0.1)' : '#ffffff',
                        boxShadow: '2px 2px 4px rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          }}
                        >
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>
                            {client.name}
                          </p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: client.status === 'active' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                              color: client.status === 'active' ? '#43e97b' : '#64748b',
                            }}
                          >
                            {client.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs" style={{ color: '#64748b' }}>
                        <p className="truncate">📍 {client.pincode || 'No pincode'}</p>
                        {client.email && (
                          <p className="truncate">✉️ {client.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {filteredUsers.length === 0 && filteredClients.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
                  <p className="text-sm" style={{ color: '#64748b' }}>
                    No locations to display
                  </p>
                </div>
              )}
            </div>
          </NeumorphicCard>
        </div>
      </div>

      {/* Legend */}
      <NeumorphicCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}></div>
              <span className="text-sm font-medium" style={{ color: '#64748b' }}>Online User</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' }}></div>
              <span className="text-sm font-medium" style={{ color: '#64748b' }}>Offline User</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}></div>
              <span className="text-sm font-medium" style={{ color: '#64748b' }}>Client Location</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: '#64748b' }}>Powered by OpenStreetMap</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#43e97b' }}></div>
          <span className="text-sm font-medium" style={{ color: '#64748b' }}>Quick Visit (Success)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: '#fbbf24' }}></div>
          <span className="text-sm font-medium" style={{ color: '#64748b' }}>Quick Visit (Other)</span>
        </div>
          
          <div className="text-xs" style={{ color: '#94a3b8' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
};

export default MapViewerPage;