import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Route as RouteIcon,
  Target,
  Activity,
  Eye,
  PlayCircle,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle as LeafletCircle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = "https://geo-track-1.onrender.com/api";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

const StatCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => (
  <NeumorphicCard className={onClick ? "cursor-pointer hover:shadow-xl transition-all" : ""}>
    <div onClick={onClick} className="flex items-center justify-between mb-2">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
          {title}
        </p>
        <h3 className="text-3xl font-bold" style={{ color: '#1e293b' }}>
          {value}
        </h3>
      </div>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: gradient,
          boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
        }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-xs" style={{ color: '#64748b' }}>{subtitle}</p>
  </NeumorphicCard>
);

const JourneyTrackingPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [journeyData, setJourneyData] = useState(null);
  const [quickVisits, setQuickVisits] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("summary");
  const [clients, setClients] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null); // ✅ DEBUG INFO

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUsers();
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchJourneyData();
    }
  }, [selectedUser, dateRange]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("👥 Users fetched:", data);
      setUsers(data.users || []);
    } catch (err) {
      console.error("❌ Error fetching users:", err);
      setError("Failed to load users");
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/clients?limit=15000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("🏢 Clients fetched:", data);
      setClients(data.clients || []);
    } catch (err) {
      console.error("❌ Error fetching clients:", err);
    }
  };

  const fetchJourneyData = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError("");
    setDebugInfo(null);

    try {
      console.log("🔄 Fetching journey data for user:", selectedUser.id);
      
      // ✅ FIX 1: Correct endpoint (locationLogs not logs)
      const logsUrl = `${API_BASE_URL}/admin/users/${selectedUser.id}/location-logs?limit=10000`;
      console.log("📍 Fetching location logs from:", logsUrl);
      
      const logsResponse = await fetch(logsUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!logsResponse.ok) {
        const errorText = await logsResponse.text();
        console.error("❌ Location logs error:", logsResponse.status, errorText);
        throw new Error(`Location logs failed: ${logsResponse.status} ${errorText}`);
      }

      const logsData = await logsResponse.json();
      console.log("📍 Location logs response:", logsData);

      // ✅ FIX 2: Check response structure (might be locationLogs or logs)
      let logs = logsData.locationLogs || logsData.logs || [];
      console.log("📍 Parsed logs count:", logs.length);

      // Filter logs by date range
      logs = logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate >= dateRange.start && logDate <= dateRange.end;
      });
      console.log("📍 Filtered logs count:", logs.length);

      // ✅ FIX 3: Correct meetings endpoint
      const meetingsUrl = `${API_BASE_URL}/admin/users/${selectedUser.id}/meetings?limit=1000`;
      console.log("📅 Fetching meetings from:", meetingsUrl);
      
      const meetingsResponse = await fetch(meetingsUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!meetingsResponse.ok) {
        const errorText = await meetingsResponse.text();
        console.error("❌ Meetings error:", meetingsResponse.status, errorText);
        throw new Error(`Meetings failed: ${meetingsResponse.status} ${errorText}`);
      }

      const meetingsData = await meetingsResponse.json();
      console.log("📅 Meetings response:", meetingsData);

      let meetings = meetingsData.meetings || [];
      console.log("📅 Parsed meetings count:", meetings.length);

      // Filter meetings by date range
      meetings = meetings.filter(meeting => {
        if (!meeting.startTime) return false;
        const meetingDate = new Date(meeting.startTime).toISOString().split('T')[0];
        return meetingDate >= dateRange.start && meetingDate <= dateRange.end;
      });
      console.log("📅 Filtered meetings count:", meetings.length);


      // ✅ Fetch Quick Visits
      const quickVisitsUrl = `${API_BASE_URL}/quick-visits/admin/user/${selectedUser.id}?limit=1000`;
      console.log("⚡ Fetching quick visits from:", quickVisitsUrl);

      const quickVisitsResponse = await fetch(quickVisitsUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!quickVisitsResponse.ok) {
        const errorText = await quickVisitsResponse.text();
        console.error("❌ Quick visits error:", quickVisitsResponse.status, errorText);
        throw new Error(`Quick visits failed: ${quickVisitsResponse.status}`);
      }

      const quickVisitsData = await quickVisitsResponse.json();
      console.log("⚡ Quick visits response:", quickVisitsData);

      let qv = quickVisitsData.visits || quickVisitsData.quickVisits || [];

      // Filter quick visits by date range
      qv = qv.filter(v => {
        const visitDate = new Date(v.createdAt).toISOString().split('T')[0];
        return visitDate >= dateRange.start && visitDate <= dateRange.end;
      });

      console.log("⚡ Filtered quick visits count:", qv.length);

      setQuickVisits(qv);


      // Calculate journey metrics
      const journeyMetrics = calculateJourneyMetrics(logs, meetings);
      console.log("📊 Calculated metrics:", journeyMetrics);

      setJourneyData({
        logs,
        meetings,
        metrics: journeyMetrics,
      });

      // ✅ Set debug info
      setDebugInfo({
        logsCount: logs.length,
        meetingsCount: meetings.length,
        dateRange: dateRange,
        userId: selectedUser.id,
      });

    } catch (err) {
      console.error("❌ Error fetching journey data:", err);
      setError(`Failed to fetch data: ${err.message}`);
      
      // ✅ Show debug info even on error
      setDebugInfo({
        error: err.message,
        userId: selectedUser.id,
        dateRange: dateRange,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateJourneyMetrics = (logs, meetings) => {
    console.log("🧮 Calculating metrics with logs:", logs.length, "meetings:", meetings.length);
    
    if (logs.length === 0) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        startLocation: null,
        endLocation: null,
        clientVisits: [],
        visitedClients: 0,
        plannedClients: meetings.length,
        route: [],
      };
    }

    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Calculate total distance using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < sortedLogs.length; i++) {
      const dist = calculateDistance(
        sortedLogs[i - 1].latitude,
        sortedLogs[i - 1].longitude,
        sortedLogs[i].latitude,
        sortedLogs[i].longitude
      );
      totalDistance += dist;
    }

    // Calculate duration
    const startTime = new Date(sortedLogs[0].timestamp);
    const endTime = new Date(sortedLogs[sortedLogs.length - 1].timestamp);
    const totalDuration = Math.round((endTime - startTime) / 60000); // in minutes

    // Match meetings with client locations
    const clientVisits = meetings.map(meeting => {
      const client = clients.find(c => c.id === meeting.clientId || c.name === meeting.clientName);
      
      // Find closest log to meeting time
      const meetingTime = new Date(meeting.startTime);
      const closestLog = sortedLogs.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.timestamp) - meetingTime);
        const currDiff = Math.abs(new Date(curr.timestamp) - meetingTime);
        return currDiff < prevDiff ? curr : prev;
      });

      // Check if visit was completed (has end time)
      const visitStatus = meeting.endTime ? 'completed' : 'in-progress';

      // Calculate distance to client location if available
      let distanceToClient = null;
      if (client && client.latitude && client.longitude && closestLog) {
        distanceToClient = calculateDistance(
          closestLog.latitude,
          closestLog.longitude,
          client.latitude,
          client.longitude
        );
      }

      return {
        ...meeting,
        client,
        closestLog,
        visitStatus,
        distanceToClient,
        verified: distanceToClient !== null && distanceToClient < 0.5, // Within 500m
      };
    });

    const visitedClients = clientVisits.filter(v => v.visitStatus === 'completed').length;

    const metrics = {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration,
      startLocation: sortedLogs[0],
      endLocation: sortedLogs[sortedLogs.length - 1],
      clientVisits,
      visitedClients,
      plannedClients: meetings.length,
      route: sortedLogs.map(log => [log.latitude, log.longitude]),
    };

    console.log("✅ Metrics calculated:", metrics);
    return metrics;
  };

  // Haversine formula to calculate distance between two lat/lng points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  const exportReport = () => {
    if (!journeyData) return;

    const { metrics, logs, meetings } = journeyData;
    const csvContent = [
      ['Journey Report', selectedUser?.full_name || selectedUser?.email],
      ['Date Range', `${dateRange.start} to ${dateRange.end}`],
      [''],
      ['Summary'],
      ['Total Distance (KM)', metrics.totalDistance],
      ['Total Duration (mins)', metrics.totalDuration],
      ['Planned Clients', metrics.plannedClients],
      ['Visited Clients', metrics.visitedClients],
      ['Visit Rate', `${((metrics.visitedClients / metrics.plannedClients) * 100).toFixed(1)}%`],
      [''],
      ['Client Visits'],
      ['Client Name', 'Check-In Time', 'Check-Out Time', 'Duration (mins)', 'Status', 'Location Verified'],
      ...metrics.clientVisits.map(visit => [
        visit.clientName || 'Unknown',
        visit.startTime ? new Date(visit.startTime).toLocaleString() : 'N/A',
        visit.endTime ? new Date(visit.endTime).toLocaleString() : 'N/A',
        visit.startTime && visit.endTime 
          ? Math.round((new Date(visit.endTime) - new Date(visit.startTime)) / 60000)
          : 'N/A',
        visit.visitStatus,
        visit.verified ? 'Yes' : 'No',
      ]),
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journey_report_${selectedUser?.full_name}_${dateRange.start}_${dateRange.end}.csv`;
    link.click();
  };

  const createMarkerIcon = (type, color) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="color: white; font-size: 16px;">${type === 'start' ? '🚀' : type === 'end' ? '🏁' : '📍'}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };


  const createQuickVisitIcon = (visitType) => {
  const config = {
    met_success: '#43e97b',
    not_available: '#fbbf24',
    office_closed: '#ef4444',
    phone_call: '#4facfe'
  };

  return L.divIcon({
    className: 'quick-visit-marker',
    html: `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: ${config[visitType] || '#94a3b8'};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: white;
      ">
        ⚡
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
};


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
            Journey Tracking & Reports
          </h2>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Track agent movements, client visits, and generate Uber-style journey reports
          </p>
        </div>
        <div className="flex gap-3">
          {journeyData && (
            <button
              onClick={exportReport}
              className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                boxShadow: '4px 4px 8px rgba(67, 233, 123, 0.4)',
              }}
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          )}
          <button
            onClick={fetchJourneyData}
            disabled={loading}
            className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <NeumorphicCard>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
              Select Agent
            </label>
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                setSelectedUser(user);
              }}
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: '#e6eaf0',
                border: 'none',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            >
              <option value="">Select an agent...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: '#e6eaf0',
                border: 'none',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            />
          </div>

          <div className="col-span-3">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: '#e6eaf0',
                border: 'none',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: '#e6eaf0',
                border: 'none',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="map">Map View</option>
            </select>
          </div>
        </div>
      </NeumorphicCard>

      {/* ✅ DEBUG INFO */}
      {debugInfo && (
        <div
          className="p-4 rounded-2xl text-xs font-mono"
          style={{
            background: "#f3f4f6",
            border: "1px solid #d1d5db",
          }}
        >
          <p className="font-bold mb-2">🐛 Debug Info:</p>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

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

      {/* Content based on selection */}
      {!selectedUser ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#1e293b' }}>
              Select an Agent
            </h3>
            <p style={{ color: '#64748b' }}>
              Choose an agent from the dropdown above to view their journey data
            </p>
          </div>
        </NeumorphicCard>
      ) : loading ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: '#667eea' }} />
            <p style={{ color: '#64748b' }}>Loading journey data...</p>
          </div>
        </NeumorphicCard>
      ) : !journeyData ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <RouteIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#1e293b' }}>
              No Data Available
            </h3>
            <p style={{ color: '#64748b' }}>
              No journey data found for the selected date range
            </p>
          </div>
        </NeumorphicCard>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <StatCard
              title="Total Distance"
              value={`${journeyData.metrics.totalDistance} km`}
              subtitle="Total traveled"
              icon={Navigation}
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
            <StatCard
              title="Duration"
              value={`${Math.floor(journeyData.metrics.totalDuration / 60)}h ${journeyData.metrics.totalDuration % 60}m`}
              subtitle="Active time"
              icon={Clock}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            />
            <StatCard
              title="Clients Visited"
              value={journeyData.metrics.visitedClients}
              subtitle={`of ${journeyData.metrics.plannedClients} planned`}
              icon={CheckCircle}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            />
            <StatCard
              title="Visit Rate"
              value={`${journeyData.metrics.plannedClients > 0 ? ((journeyData.metrics.visitedClients / journeyData.metrics.plannedClients) * 100).toFixed(1) : 0}%`}
              subtitle="Completion rate"
              icon={Target}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            />
            <StatCard
              title="Location Logs"
              value={journeyData.logs.length}
              subtitle="GPS points"
              icon={Activity}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            />
          </div>

          {/* View Content - keeping the same as original */}
          {viewMode === 'summary' && journeyData.metrics.startLocation && (
            <div className="grid grid-cols-2 gap-4">
              {/* Journey Overview */}
              <NeumorphicCard>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
                  <RouteIcon className="w-5 h-5" style={{ color: '#667eea' }} />
                  Journey Overview
                </h3>

                <div className="space-y-4">
                  {/* Start Location */}
                  <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#43e97b' }}>
                      <span className="text-white text-lg">🚀</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#43e97b' }}>Start Location</p>
                      <p className="text-sm font-bold" style={{ color: '#1e293b' }}>
                        {new Date(journeyData.metrics.startLocation.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-xs" style={{ color: '#64748b' }}>
                        {journeyData.metrics.startLocation.latitude.toFixed(4)}, {journeyData.metrics.startLocation.longitude.toFixed(4)}
                      </p>
                      {journeyData.metrics.startLocation.pincode && (
                        <p className="text-xs" style={{ color: '#64748b' }}>
                          Pincode: {journeyData.metrics.startLocation.pincode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* End Location */}
                  <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ef4444' }}>
                      <span className="text-white text-lg">🏁</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>End Location</p>
                      <p className="text-sm font-bold" style={{ color: '#1e293b' }}>
                        {new Date(journeyData.metrics.endLocation.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-xs" style={{ color: '#64748b' }}>
                        {journeyData.metrics.endLocation.latitude.toFixed(4)}, {journeyData.metrics.endLocation.longitude.toFixed(4)}
                      </p>
                      {journeyData.metrics.endLocation.pincode && (
                        <p className="text-xs" style={{ color: '#64748b' }}>
                          Pincode: {journeyData.metrics.endLocation.pincode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </NeumorphicCard>

              {/* Visit Summary */}
              <NeumorphicCard>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
                  <Target className="w-5 h-5" style={{ color: '#4facfe' }} />
                  Visit Summary
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
                      <CheckCircle className="w-6 h-6 mx-auto mb-1" style={{ color: '#43e97b' }} />
                      <p className="text-xl font-bold" style={{ color: '#1e293b' }}>
                        {journeyData.metrics.visitedClients}
                      </p>
                      <p className="text-xs" style={{ color: '#64748b' }}>Completed</p>
                    </div>

                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(251, 191, 36, 0.1)' }}>
                      <AlertCircle className="w-6 h-6 mx-auto mb-1" style={{ color: '#fbbf24' }} />
                      <p className="text-xl font-bold" style={{ color: '#1e293b' }}>
                        {journeyData.metrics.clientVisits.filter(v => v.visitStatus === 'in-progress').length}
                      </p>
                      <p className="text-xs" style={{ color: '#64748b' }}>In Progress</p>
                    </div>

                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                      <XCircle className="w-6 h-6 mx-auto mb-1" style={{ color: '#ef4444' }} />
                      <p className="text-xl font-bold" style={{ color: '#1e293b' }}>
                        {journeyData.metrics.plannedClients - journeyData.metrics.visitedClients}
                      </p>
                      <p className="text-xs" style={{ color: '#64748b' }}>Not Visited</p>
                    </div>
                  </div>

                  {/* Location Verified */}
                  {journeyData.metrics.clientVisits.length > 0 && (
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold" style={{ color: '#667eea' }}>
                          Location Verified Visits
                        </span>
                        <span className="text-lg font-bold" style={{ color: '#1e293b' }}>
                          {journeyData.metrics.clientVisits.filter(v => v.verified).length}
                        </span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: '#e6eaf0' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(journeyData.metrics.clientVisits.filter(v => v.verified).length / journeyData.metrics.clientVisits.length) * 100}%`,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </NeumorphicCard>
            </div>
          )}

          {/* Rest of the view modes remain the same */}
          {viewMode === 'detailed' && (
            <NeumorphicCard>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1e293b' }}>
                Detailed Visit Report
              </h3>

              <div className="space-y-3">
                {journeyData.metrics.clientVisits.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
                    <p style={{ color: '#64748b' }}>No client visits recorded</p>
                  </div>
                ) : (
                  journeyData.metrics.clientVisits.map((visit, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl"
                      style={{
                        background: '#ffffff',
                        boxShadow: '2px 2px 4px rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-base font-bold mb-1" style={{ color: '#1e293b' }}>
                            {visit.clientName || 'Unknown Client'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: visit.visitStatus === 'completed' 
                                  ? 'rgba(67, 233, 123, 0.2)' 
                                  : 'rgba(251, 191, 36, 0.2)',
                                color: visit.visitStatus === 'completed' ? '#43e97b' : '#fbbf24',
                              }}
                            >
                              {visit.visitStatus}
                            </span>
                            {visit.verified && (
                              <span
                                className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                                style={{
                                  background: 'rgba(102, 126, 234, 0.2)',
                                  color: '#667eea',
                                }}
                              >
                                <CheckCircle className="w-3 h-3" />
                                Location Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>Check-In</p>
                          <p className="text-sm" style={{ color: '#1e293b' }}>
                            {visit.startTime ? new Date(visit.startTime).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>Check-Out</p>
                          <p className="text-sm" style={{ color: '#1e293b' }}>
                            {visit.endTime ? new Date(visit.endTime).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {visit.distanceToClient !== null && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                          <MapPin className="w-3 h-3" />
                          <span>
                            Distance to client location: {(visit.distanceToClient * 1000).toFixed(0)}m
                          </span>
                        </div>
                      )}

                      {visit.comments && (
                        <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                          <p className="text-xs" style={{ color: '#64748b' }}>{visit.comments}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </NeumorphicCard>
          )}

          {viewMode === 'map' && journeyData.metrics.route.length > 0 && (
            <NeumorphicCard style={{ padding: 0, overflow: 'hidden', minHeight: '600px' }}>
              <MapContainer
                center={journeyData.metrics.route[0]}
                zoom={13}
                style={{ height: '600px', width: '100%', borderRadius: '16px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Route Polyline */}
                <Polyline
                  positions={journeyData.metrics.route}
                  color="#667eea"
                  weight={4}
                  opacity={0.7}
                />

                {/* Start Marker */}
                <Marker
                  position={journeyData.metrics.route[0]}
                  icon={createMarkerIcon('start', '#43e97b')}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <h3 className="font-bold text-sm mb-1">Journey Start</h3>
                      <p className="text-xs">
                        {new Date(journeyData.metrics.startLocation.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* End Marker */}
                <Marker
                  position={journeyData.metrics.route[journeyData.metrics.route.length - 1]}
                  icon={createMarkerIcon('end', '#ef4444')}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <h3 className="font-bold text-sm mb-1">Journey End</h3>
                      <p className="text-xs">
                        {new Date(journeyData.metrics.endLocation.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Client Visit Markers */}
                {journeyData.metrics.clientVisits.map((visit, idx) => {
                  if (!visit.closestLog) return null;
                  
                  return (
                    <React.Fragment key={idx}>
                      <Marker
                        position={[visit.closestLog.latitude, visit.closestLog.longitude]}
                        icon={createMarkerIcon('visit', visit.verified ? '#4facfe' : '#fbbf24')}
                      >
                        <Popup>
                          <div style={{ minWidth: '250px' }}>
                            <h3 className="font-bold text-sm mb-2">{visit.clientName || 'Unknown Client'}</h3>
                            <div className="space-y-1 text-xs">
                              <p><strong>Status:</strong> {visit.visitStatus}</p>
                              <p><strong>Check-In:</strong> {new Date(visit.startTime).toLocaleString()}</p>
                              {visit.endTime && (
                                <p><strong>Check-Out:</strong> {new Date(visit.endTime).toLocaleString()}</p>
                              )}
                              {visit.distanceToClient !== null && (
                                <p>
                                  <strong>Distance:</strong> {(visit.distanceToClient * 1000).toFixed(0)}m
                                  {visit.verified && ' ✓'}
                                </p>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                      
                      {/* Accuracy circle if verified */}
                      {visit.verified && (
                        <LeafletCircle
                          center={[visit.closestLog.latitude, visit.closestLog.longitude]}
                          radius={500}
                          pathOptions={{
                            color: '#4facfe',
                            fillColor: '#4facfe',
                            fillOpacity: 0.1,
                            weight: 1,
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Quick Visit Markers */}
{quickVisits.map((visit, idx) => {
  if (!visit.latitude || !visit.longitude) return null;

  return (
    <Marker
      key={`qv-${idx}`}
      position={[visit.latitude, visit.longitude]}
      icon={createQuickVisitIcon(visit.visitType)}
    >
      <Popup>
        <div style={{ minWidth: '220px' }}>
          <h3 className="font-bold text-sm mb-2">Quick Visit</h3>
          <div className="space-y-1 text-xs">
            <p><strong>Type:</strong> {visit.visitType}</p>
            <p><strong>Time:</strong> {new Date(visit.createdAt).toLocaleString()}</p>
            {visit.notes && (
              <p><strong>Notes:</strong> {visit.notes}</p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
})}

              </MapContainer>
            </NeumorphicCard>
          )}
        </>
      )}
    </div>
  );
};

export default JourneyTrackingPage;