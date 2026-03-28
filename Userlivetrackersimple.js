import React, { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  DollarSign,
  Navigation,
  User,
  Route,
  TrendingUp,
  Battery,
  Activity,
  RefreshCw,
  ArrowLeft,
  Zap,
  Target,
  Circle,
  ExternalLink,
} from "lucide-react";

/**
 * Simple Live User Tracker - Timeline Only
 * No Google Maps API required - perfect for quick testing
 * 
 * Usage:
 * <UserLiveTrackerSimple 
 *   userId="user-uuid"
 *   userName="John Doe"
 *   onBack={() => navigate('/users')}
 * />
 */

const UserLiveTrackerSimple = ({ userId, userName, onBack }) => {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false); // Disabled by default for testing

  const [stats, setStats] = useState({
    totalDistance: 0,
    totalExpense: 0,
    meetingsCount: 0,
    locationsCount: 0,
    activeTime: 0,
  });

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

      console.log("🔍 Fetching timeline for user:", userId);

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

      console.log("📊 Data fetched:", {
        logs: logsData.locationLogs?.length || 0,
        meetings: meetingsData.meetings?.length || 0,
        expenses: expensesData.expenses?.length || 0,
      });

      // Combine events
      const events = [
        ...(logsData.locationLogs || []).map((log) => ({
          type: "location",
          timestamp: new Date(log.timestamp),
          data: log,
        })),
        ...(meetingsData.meetings || []).map((meeting) => ({
          type: "meeting",
          timestamp: new Date(meeting.startTime),
          data: meeting,
        })),
        ...(expensesData.expenses || []).map((expense) => ({
          type: "expense",
          timestamp: new Date(Number(expense.travelDate || expense.travel_date)),
          data: expense,
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setTimelineData(events);

      // Calculate stats
      const totalDist =
        expensesData.expenses?.reduce(
          (sum, e) => sum + (Number(e.distanceKm || e.distance_km) || 0),
          0
        ) || 0;
      const totalExp =
        expensesData.expenses?.reduce(
          (sum, e) => sum + (Number(e.amountSpent || e.amount_spent) || 0),
          0
        ) || 0;

      setStats({
        totalDistance: totalDist,
        totalExpense: totalExp,
        meetingsCount: meetingsData.meetings?.length || 0,
        locationsCount: logsData.locationLogs?.length || 0,
        activeTime: calculateActiveTime(events),
      });

      console.log("✅ Timeline loaded:", events.length, "events");
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

  useEffect(() => {
    fetchTimelineData();

    if (autoRefresh) {
      const interval = setInterval(fetchTimelineData, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, autoRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg font-light">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
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
                  Activity Timeline
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {userName} • {new Date().toLocaleDateString()}
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 mb-8">
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
        </div>

        {/* Timeline */}
        <div className="space-y-4">
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
              <p className="text-slate-500">This user hasn't recorded any activities</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-purple-500"></div>

              {/* Events */}
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
      </div>
    </div>
  );
};

// Components

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
      className={`relative pl-20 pr-4 cursor-pointer transition-all hover:scale-[1.01] ${
        isSelected ? "scale-[1.01]" : ""
      }`}
      onClick={onClick}
    >
      {/* Event marker */}
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

      {/* Event content */}
      <div
        className={`rounded-2xl border border-slate-700/50 p-4 ${eventColor} transition-all`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-white capitalize">
              {event.type === "location" && "Location Update"}
              {event.type === "meeting" &&
                `Meeting: ${event.data.clientName || "Client"}`}
              {event.type === "expense" &&
                `Expense: ${event.data.transportMode || event.data.transport_mode || "Travel"}`}
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

        {/* Event details */}
        <div className="text-sm text-slate-300 space-y-2">
          {event.type === "location" && (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="font-mono text-xs">
                  {event.data.latitude?.toFixed(6)},{" "}
                  {event.data.longitude?.toFixed(6)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${event.data.latitude},${event.data.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 ml-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              {event.data.pincode && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-500" />
                  <span>Pincode: {event.data.pincode}</span>
                </div>
              )}
              {event.data.battery && (
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-slate-500" />
                  <span>Battery: {event.data.battery}%</span>
                </div>
              )}
              {event.data.accuracy && (
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-500" />
                  <span>Accuracy: {event.data.accuracy}m</span>
                </div>
              )}
            </>
          )}

          {event.type === "meeting" && (
            <>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Status: {event.data.status}</span>
              </div>
              {event.data.startLatitude && event.data.startLongitude && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="font-mono text-xs">
                    {Number(event.data.startLatitude).toFixed(6)},{" "}
                    {Number(event.data.startLongitude).toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${event.data.startLatitude},${event.data.startLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 ml-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
              {event.data.comments && (
                <p className="text-slate-400 text-xs mt-2 pl-6">
                  {event.data.comments}
                </p>
              )}
            </>
          )}

          {event.type === "expense" && (
            <>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                <span>
                  {event.data.currency || "₹"}{" "}
                  {Number(
                    event.data.amountSpent || event.data.amount_spent
                  ).toLocaleString()}
                </span>
              </div>
              {(event.data.startLocation || event.data.start_location) &&
                (event.data.endLocation || event.data.end_location) && (
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-slate-500" />
                    <span className="text-xs">
                      {event.data.startLocation || event.data.start_location} →{" "}
                      {event.data.endLocation || event.data.end_location}
                    </span>
                  </div>
                )}
              {(event.data.distanceKm || event.data.distance_km) && (
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-slate-500" />
                  <span>
                    {event.data.distanceKm || event.data.distance_km} km
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
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

export default UserLiveTrackerSimple;