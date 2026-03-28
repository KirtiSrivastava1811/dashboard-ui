import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Clock,
  DollarSign,
  Navigation,
  Calendar,
  User,
  Route,
  TrendingUp,
  Battery,
  Activity,
  RefreshCw,
  ArrowLeft,
  Zap,
  Target,
  CheckCircle2,
  Circle,
  Maximize2,
  Minimize2,
} from "lucide-react";

/**
 * Live User Tracker with Google Maps
 * Real-time journey visualization with location tracking
 * 
 * Usage:
 * <UserLiveTrackerWithMaps 
 *   userId="user-uuid"
 *   userName="John Doe"
 *   googleMapsApiKey="YOUR_API_KEY"
 *   onBack={() => navigate('/users')}
 * />
 */

const UserLiveTrackerWithMaps = ({ 
  userId, 
  userName, 
  googleMapsApiKey,
  onBack 
}) => {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  // Stats
  const [stats, setStats] = useState({
    totalDistance: 0,
    totalExpense: 0,
    meetingsCount: 0,
    locationsCount: 0,
    activeTime: 0,
    currentSpeed: 0,
  });

  // Initialize Google Maps
  useEffect(() => {
    if (!googleMapsApiKey) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=geometry`;
    script.async = true;
    script.onload = () => {
      console.log("✅ Google Maps loaded");
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [googleMapsApiKey]);

  // Fetch timeline data
  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Use the same API URL as your Dashboard
      const apiUrl = process.env.REACT_APP_API_URL || "https://geo-track-1.onrender.com";

      const [logsRes, meetingsRes, expensesRes] = await Promise.all([
        fetch(`${apiUrl}/admin/users/${userId}/location-logs?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/admin/users/${userId}/meetings?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/admin/users/${userId}/expenses?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [logsData, meetingsData, expensesData] = await Promise.all([
        logsRes.json(),
        meetingsRes.json(),
        expensesRes.json(),
      ]);

      // Combine and sort events
      const events = [
        ...(logsData.locationLogs || []).map((log) => ({
          type: "location",
          timestamp: new Date(log.timestamp),
          data: log,
          coordinates: {
            lat: log.latitude,
            lng: log.longitude,
          },
        })),
        ...(meetingsData.meetings || []).map((meeting) => ({
          type: "meeting",
          timestamp: new Date(meeting.startTime),
          data: meeting,
          coordinates: {
            lat: Number(meeting.startLatitude),
            lng: Number(meeting.startLongitude),
          },
        })),
        ...(expensesData.expenses || []).map((expense) => ({
          type: "expense",
          timestamp: new Date(Number(expense.travelDate)),
          data: expense,
          coordinates: null, // Expenses don't have direct coordinates
        })),
      ]
        .filter((e) => e.coordinates === null || (e.coordinates.lat && e.coordinates.lng))
        .sort((a, b) => b.timestamp - a.timestamp);

      setTimelineData(events);

      // Calculate stats
      const totalDist =
        expensesData.expenses?.reduce(
          (sum, e) => sum + (Number(e.distanceKm) || 0),
          0
        ) || 0;
      const totalExp =
        expensesData.expenses?.reduce(
          (sum, e) => sum + (Number(e.amountSpent) || 0),
          0
        ) || 0;

      setStats({
        totalDistance: totalDist,
        totalExpense: totalExp,
        meetingsCount: meetingsData.meetings?.length || 0,
        locationsCount: logsData.locationLogs?.length || 0,
        activeTime: calculateActiveTime(events),
        currentSpeed: calculateSpeed(events),
      });

      // Update map
      if (events.length > 0 && window.google) {
        updateMap(events);
      }
    } catch (error) {
      console.error("❌ Error fetching timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateActiveTime = (events) => {
    if (events.length < 2) return 0;
    const firstEvent = events[events.length - 1].timestamp;
    const lastEvent = events[0].timestamp;
    return Math.round((lastEvent - firstEvent) / (1000 * 60));
  };

  const calculateSpeed = (events) => {
    const locationEvents = events.filter(
      (e) => e.type === "location" && e.coordinates
    );
    if (locationEvents.length < 2) return 0;

    const latest = locationEvents[0];
    const previous = locationEvents[1];
    const timeDiff = (latest.timestamp - previous.timestamp) / (1000 * 60 * 60); // hours

    if (timeDiff === 0) return 0;

    // Calculate distance between two points
    const R = 6371; // Earth's radius in km
    const dLat = ((latest.coordinates.lat - previous.coordinates.lat) * Math.PI) / 180;
    const dLon = ((latest.coordinates.lng - previous.coordinates.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((previous.coordinates.lat * Math.PI) / 180) *
        Math.cos((latest.coordinates.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance / timeDiff);
  };

  const updateMap = (events) => {
    if (!mapRef.current || !window.google) return;

    const validEvents = events.filter((e) => e.coordinates);
    if (validEvents.length === 0) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      const firstEvent = validEvents[validEvents.length - 1];
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: firstEvent.coordinates,
        zoom: 13,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#1e293b" }],
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#cbd5e1" }],
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#0f172a" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0f172a" }],
          },
        ],
      });
    }

    // Clear existing markers and polyline
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // Add markers
    validEvents.forEach((event, index) => {
      const isFirst = index === validEvents.length - 1;
      const isLast = index === 0;

      const marker = new window.google.maps.Marker({
        position: event.coordinates,
        map: mapInstanceRef.current,
        title: `${event.type} - ${event.timestamp.toLocaleString()}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: getEventColor(event.type),
          fillOpacity: isLast ? 1 : 0.7,
          strokeColor: "#ffffff",
          strokeWeight: isLast ? 3 : 2,
          scale: isLast ? 12 : isFirst ? 10 : 7,
        },
        label: isFirst
          ? {
              text: "START",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "bold",
            }
          : isLast
          ? {
              text: "NOW",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "bold",
            }
          : null,
      });

      // Add click listener
      marker.addListener("click", () => {
        setSelectedEvent(event);
      });

      markersRef.current.push(marker);
    });

    // Draw route polyline
    const pathCoordinates = validEvents
      .slice()
      .reverse()
      .map((e) => e.coordinates);

    polylineRef.current = new window.google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: "#06b6d4",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapInstanceRef.current,
    });

    // Fit bounds to show all markers
    const bounds = new window.google.maps.LatLngBounds();
    validEvents.forEach((event) => {
      bounds.extend(event.coordinates);
    });
    mapInstanceRef.current.fitBounds(bounds);
  };

  useEffect(() => {
    fetchTimelineData();

    if (autoRefresh) {
      const interval = setInterval(fetchTimelineData, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, autoRefresh]);

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg font-light">Loading live tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-slate-700/50 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Live Tracker
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {userName} • {currentDate.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-xl transition-all border ${
                  autoRefresh
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {autoRefresh ? "Live" : "Paused"}
                  </span>
                </div>
              </button>
              <button
                onClick={fetchTimelineData}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={<Route className="w-6 h-6" />}
            label="Distance"
            value={`${stats.totalDistance.toFixed(1)} km`}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Expenses"
            value={`₹${stats.totalExpense.toLocaleString()}`}
            gradient="from-amber-500 to-orange-500"
          />
          <StatCard
            icon={<User className="w-6 h-6" />}
            label="Meetings"
            value={stats.meetingsCount}
            gradient="from-green-500 to-emerald-500"
          />
          <StatCard
            icon={<MapPin className="w-6 h-6" />}
            label="Locations"
            value={stats.locationsCount}
            gradient="from-purple-500 to-pink-500"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Active Time"
            value={`${stats.activeTime} min`}
            gradient="from-red-500 to-rose-500"
          />
          <StatCard
            icon={<Navigation className="w-6 h-6" />}
            label="Speed"
            value={`${stats.currentSpeed} km/h`}
            gradient="from-violet-500 to-purple-500"
          />
        </div>

        <div className={`grid gap-6 ${mapExpanded ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {/* Timeline */}
          {!mapExpanded && (
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Journey Timeline</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-slate-400">Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-400">Meeting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-slate-400">Expense</span>
                  </div>
                </div>
              </div>

              {timelineData.length === 0 ? (
                <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-12 text-center">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">
                    No Activity Yet
                  </h3>
                  <p className="text-slate-500">Waiting for user to start their journey</p>
                </div>
              ) : (
                <div className="relative max-h-[calc(100vh-400px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/30">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-purple-500"></div>

                  <div className="space-y-6">
                    {timelineData.map((event, index) => (
                      <TimelineEvent
                        key={`${event.type}-${event.timestamp.getTime()}-${index}`}
                        event={event}
                        isFirst={index === 0}
                        isLast={index === timelineData.length - 1}
                        isSelected={selectedEvent === event}
                        onClick={() => setSelectedEvent(event)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Map & Details */}
          <div className={`space-y-4 ${mapExpanded ? 'col-span-1' : ''}`}>
            {/* Map */}
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  Route Map
                </h3>
                <button
                  onClick={() => setMapExpanded(!mapExpanded)}
                  className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  {mapExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div
                ref={mapRef}
                className={`bg-slate-900/50 ${
                  mapExpanded ? 'h-[calc(100vh-280px)]' : 'h-80'
                }`}
              ></div>
            </div>

            {/* Selected Event Details */}
            {!mapExpanded && selectedEvent && (
              <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  Event Details
                </h3>
                <EventDetails event={selectedEvent} />
              </div>
            )}

            {/* Quick Stats */}
            {!mapExpanded && (
              <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Journey Stats
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Start Time</span>
                    <span className="text-white font-medium">
                      {timelineData.length > 0
                        ? formatTime(timelineData[timelineData.length - 1].timestamp)
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latest Update</span>
                    <span className="text-white font-medium">
                      {timelineData.length > 0 ? formatTime(timelineData[0].timestamp) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Events</span>
                    <span className="text-white font-medium">{timelineData.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Speed</span>
                    <span className="text-white font-medium">
                      {stats.currentSpeed} km/h
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components (StatCard, TimelineEvent, EventDetails remain the same)
const StatCard = ({ icon, label, value, gradient }) => (
  <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all group">
    <div className="flex items-center justify-between mb-2">
      <div
        className={`p-2 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-20 text-white group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
    </div>
    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

const TimelineEvent = ({ event, isFirst, isLast, isSelected, onClick }) => {
  const eventColor = isSelected
    ? "ring-2 ring-cyan-500 bg-slate-800/70"
    : "bg-slate-800/30";

  return (
    <div
      className={`relative pl-20 pr-4 cursor-pointer transition-all hover:scale-[1.02] ${
        isSelected ? "scale-[1.02]" : ""
      }`}
      onClick={onClick}
    >
      <div className="absolute left-0 flex items-center">
        <div
          className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center ${eventColor} transition-all`}
          style={{
            borderColor: getEventColor(event.type),
            backgroundColor: `${getEventColor(event.type)}20`,
          }}
        >
          <div style={{ color: getEventColor(event.type) }}>
            {getEventIcon(event.type)}
          </div>
        </div>
      </div>

      <div
        className={`rounded-2xl border border-slate-700/50 p-4 ${eventColor} transition-all`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-white capitalize">
              {event.type === "location" && "Location Update"}
              {event.type === "meeting" && `Meeting: ${event.data.clientName || "Client"}`}
              {event.type === "expense" &&
                `Expense: ${event.data.transportMode || "Travel"}`}
            </h4>
            <p className="text-sm text-slate-400 mt-1">
              {event.timestamp.toLocaleString()}
            </p>
          </div>
          {isFirst && (
            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-lg font-medium border border-cyan-500/30">
              Latest
            </span>
          )}
        </div>

        <div className="text-sm text-slate-300 space-y-1">
          {event.type === "location" && (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>
                  {event.data.latitude?.toFixed(6)}, {event.data.longitude?.toFixed(6)}
                </span>
              </div>
              {event.data.pincode && (
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3 text-slate-500" />
                  <span>Pincode: {event.data.pincode}</span>
                </div>
              )}
              {event.data.battery && (
                <div className="flex items-center gap-2">
                  <Battery className="w-3 h-3 text-slate-500" />
                  <span>Battery: {event.data.battery}%</span>
                </div>
              )}
            </>
          )}

          {event.type === "meeting" && (
            <>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Status: {event.data.status}</span>
              </div>
              {event.data.comments && (
                <p className="text-slate-400 text-xs mt-2">{event.data.comments}</p>
              )}
            </>
          )}

          {event.type === "expense" && (
            <>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-slate-500" />
                <span>
                  {event.data.currency || "₹"}{" "}
                  {Number(event.data.amountSpent).toLocaleString()}
                </span>
              </div>
              {event.data.startLocation && event.data.endLocation && (
                <div className="flex items-center gap-2">
                  <Route className="w-3 h-3 text-slate-500" />
                  <span>
                    {event.data.startLocation} → {event.data.endLocation}
                  </span>
                </div>
              )}
              {event.data.distanceKm && (
                <div className="flex items-center gap-2">
                  <Navigation className="w-3 h-3 text-slate-500" />
                  <span>{event.data.distanceKm} km</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const EventDetails = ({ event }) => {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-slate-400 text-xs uppercase mb-1">Type</p>
        <p className="text-white font-medium capitalize">{event.type}</p>
      </div>
      <div>
        <p className="text-slate-400 text-xs uppercase mb-1">Timestamp</p>
        <p className="text-white font-medium">{event.timestamp.toLocaleString()}</p>
      </div>

      {event.type === "location" && (
        <>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Coordinates</p>
            <p className="text-white font-mono text-xs">
              {event.data.latitude?.toFixed(6)}, {event.data.longitude?.toFixed(6)}
            </p>
            <a
              href={`https://www.google.com/maps?q=${event.data.latitude},${event.data.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 text-xs hover:underline mt-1 block"
            >
              View on Google Maps →
            </a>
          </div>
          {event.data.accuracy && (
            <div>
              <p className="text-slate-400 text-xs uppercase mb-1">Accuracy</p>
              <p className="text-white">{event.data.accuracy}m</p>
            </div>
          )}
          {event.data.battery && (
            <div>
              <p className="text-slate-400 text-xs uppercase mb-1">Battery</p>
              <p className="text-white">{event.data.battery}%</p>
            </div>
          )}
        </>
      )}

      {event.type === "meeting" && (
        <>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Client</p>
            <p className="text-white font-medium">{event.data.clientName || "Unknown"}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Status</p>
            <p className="text-white">{event.data.status}</p>
          </div>
          {event.data.comments && (
            <div>
              <p className="text-slate-400 text-xs uppercase mb-1">Comments</p>
              <p className="text-white text-xs">{event.data.comments}</p>
            </div>
          )}
        </>
      )}

      {event.type === "expense" && (
        <>
          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">Amount</p>
            <p className="text-white font-medium">
              {event.data.currency || "₹"} {Number(event.data.amountSpent).toLocaleString()}
            </p>
          </div>
          {event.data.distanceKm && (
            <div>
              <p className="text-slate-400 text-xs uppercase mb-1">Distance</p>
              <p className="text-white">{event.data.distanceKm} km</p>
            </div>
          )}
          {event.data.transportMode && (
            <div>
              <p className="text-slate-400 text-xs uppercase mb-1">Transport</p>
              <p className="text-white">{event.data.transportMode}</p>
            </div>
          )}
          {event.data.startLocation && (
            <div>
              <p className="text-slate-400 text-xs uppercase mb-1">Route</p>
              <p className="text-white text-xs">
                {event.data.startLocation} → {event.data.endLocation || "..."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const getEventIcon = (type) => {
  switch (type) {
    case "location":
      return <MapPin className="w-5 h-5" />;
    case "meeting":
      return <User className="w-5 h-5" />;
    case "expense":
      return <DollarSign className="w-5 h-5" />;
    default:
      return <Circle className="w-5 h-5" />;
  }
};

const getEventColor = (type) => {
  switch (type) {
    case "location":
      return "#3b82f6";
    case "meeting":
      return "#10b981";
    case "expense":
      return "#f59e0b";
    default:
      return "#6b7280";
  }
};

export default UserLiveTrackerWithMaps;