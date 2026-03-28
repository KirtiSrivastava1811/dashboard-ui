// Dashboard.js - Multi-Company Version with Collapsible Sidebar
import React, { useState, useEffect } from "react";
import { HardDrive, Package, TrendingUp, FileText, Users, LogOut, Home, RefreshCw, Settings, Sparkles, Phone, Building2, ChevronDown, Crown, ArrowRight, ChevronLeft, ChevronRight, Menu, Plus ,MapPin,CreditCard } from "lucide-react";

// Import page components
import AnalyticsPage from "./AnalyticsPage";
import ClientsPage from "./ClientsPage";
import UsersPage from "./UsersPage";
import UserLogsPage from "./UserLogsPage";
import UserMeetingsPage from "./UserMeetingsPage";
import UserExpensesPage from "./UserExpensesPage";
import UserManagementPage from "./UserManagementPage";
import ClientServicesPage from './ClientServicesPage';
import ClientServicesModal from './ClientServicesModal';
import CompanyManagementPage from './CompanyManagementPage';
import BillingPlansPage from './BillingPlansPage';
import BillingHistoryPage from './BillingHistoryPage';
import PlanUsageWidget from './PlanUsageWidget';
import MapViewerPage from './MapViewerPage';
import JourneyTrackingPage from './JourneyTrackingPage';
import SlotExpansionPage from './Slot';
import BankAccountSettings from './AdminBankAccountSettings';
import PaymentSummaryDashboard from "./PaymentSummaryDashboard";

const API_BASE_URL = "https://geo-track-1.onrender.com";

const Dashboard = () => {
  const [currentPage, setCurrentPage] = useState("analytics");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [planPreview, setPlanPreview] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Company context state
  const [userCompany, setUserCompany] = useState({
    id: "",
    name: "",
    subdomain: "",
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // clients + pagination
  const [clients, setClients] = useState([]);
  const [clientsPage, setClientsPage] = useState(1);
  const CLIENTS_PER_PAGE = 50;
  const [clientsTotalPages, setClientsTotalPages] = useState(1);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [billingOpen, setBillingOpen] = useState(false);  

  // users
  const [users, setUsers] = useState([]);
  const [userExpenses, setUserExpenses] = useState({});
  const [userClockIns, setUserClockIns] = useState({});
  const [userMeetings, setUserMeetings] = useState({});

  // user detail pages
  const [locationLogs, setLocationLogs] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [meetingsPagination, setMeetingsPagination] = useState({ 
    page: 1, limit: 20, total: 0, totalPages: 1 
  });
  const [expenses, setExpenses] = useState([]);
  const [expensesPagination, setExpensesPagination] = useState({ 
    page: 1, limit: 20, total: 0, totalPages: 1 
  });
  const [refreshPaymentTrigger, setRefreshPaymentTrigger] = useState(0);

  const [selectedClientForServices, setSelectedClientForServices] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  // Auth check with company context
  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      
      if (!payload?.isAdmin && !payload?.isSuperAdmin) {
        alert("Unauthorized – Admin access only");
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setCurrentUserId(payload.id);
      setIsAdmin(payload.isAdmin || false);
      setIsSuperAdmin(payload.isSuperAdmin || false);

      setUserCompany({
        id: payload.companyId || localStorage.getItem("companyId") || "",
        name: localStorage.getItem("companyName") || "No Company",
        subdomain: localStorage.getItem("companySubdomain") || "",
      });

    } catch (e) {
      console.error("❌ Token parse error:", e);
      alert("Invalid token. Please login again.");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }, []);

  // Fetch plan preview for sidebar
  useEffect(() => {
    const fetchPlanPreview = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans/my-plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setPlanPreview({
            name: data.plan.displayName,
            isFreePlan: data.plan.planName === 'starter',
            usersUsed: data.usage.users.current,
            usersMax: data.usage.users.max,
            clientsUsed: data.usage.clients.current,
            clientsMax: data.usage.clients.max,
            clientsUnlimited: data.usage.clients.unlimited,
            storageUsed: parseFloat(data.usage?.storage_used_mb || 0),
            storageMax: data.plan.limits.storage.maxGB ? data.plan.limits.storage.maxGB * 1024 : null,
          });
        }
      } catch (err) {
        console.error("Failed to load plan preview:", err);
      }
    };
    
    if (token) fetchPlanPreview();
  }, [token]);

  // Outside click close
  useEffect(() => {
    const handler = (e) => {
      if (profileOpen && !e.target.closest(".profile-dropdown")) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  useEffect(() => {
    if (currentPage === "billingPlans" || currentPage === "billingHistory") {
      setBillingOpen(true);
    }
  }, [currentPage]);

  // Main fetch whenever page or selectedUser changes
  useEffect(() => {
    fetchData();
  }, [currentPage, selectedUser, clientsPage]);

  // Refresh users frequently when on users or user management page
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPage === "users" || currentPage === "userManagement") {
        fetchUsers();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (currentPage === "analytics") {
        await Promise.all([fetchAnalytics(), fetchSyncStatus()]);
      }else if (currentPage === "mapViewer") {  // ← ADD THIS
      // Map viewer fetches its own data
      setLoading(false);
      return;
      } 
      else if (currentPage === "clients") {
        await fetchClients(clientsPage, CLIENTS_PER_PAGE);
      } else if (currentPage === "users") {
        await fetchUsers();
        await fetchAllUserExpenses();
        await fetchAllUserMeetingsSummary();
      } else if (currentPage === "userManagement") {
        await fetchUsers();
      } else if (currentPage === "userLogs") {
        await fetchUserLogs();
      } else if (currentPage === "userMeetings") {
        await fetchUserMeetingsDetail(meetingsPagination.page, meetingsPagination.limit);
      } else if (currentPage === "userExpenses") {
        await fetchUserExpensesDetail(expensesPagination.page, expensesPagination.limit);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      
      if (err.message?.includes("SESSION_INVALIDATED") || err.message?.includes("401")) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      
      setError(err.message || "Error loading data");
    }

    setLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      const analyticsRes = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!analyticsRes.ok) throw new Error("Failed to fetch analytics");
      const data = await analyticsRes.json();

      const clientsRes = await fetch(`${API_BASE_URL}/api/admin/clients?limit=10000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const clientsData = await clientsRes.json();

      setAnalyticsData({
        stats: data.stats,
        trends: data.trends,
        distribution: data.distribution,
        leaderboard: data.leaderboard,
      });

    } catch (err) {
      console.error("Analytics error:", err);
      setError("Failed to load analytics.");
    }
  };

  const fetchClients = async (page = 1, limit = CLIENTS_PER_PAGE) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/clients?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch clients");
      const data = await response.json();
      setClients(data.clients || []);
      if (data.pagination) {
        setClientsPage(data.pagination.page || page);
        setClientsTotalPages(data.pagination.totalPages || 1);
        setClientsTotal(data.pagination.total || (data.clients || []).length);
      }
    } catch (err) {
      console.error("Clients error:", err);
      setError("Failed to load clients.");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      const fetchedUsers = data.users || [];
      setUsers(fetchedUsers);

      if (currentPage === "users") {
        const clockStatusMap = {};
        for (const user of fetchedUsers) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/admin/clock-status/${user.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const result = await res.json();
              clockStatusMap[user.id] = {
                clocked_in: result.clocked_in,
                last_seen: result.last_seen,
              };
            }
          } catch (err) {
            console.error(`Clock-status fetch failed → User: ${user.id}`, err);
          }
        }
        setUserClockIns(clockStatusMap);

        const meetingsMap = {};
        for (const user of fetchedUsers) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/admin/user-meetings/${user.id}?limit=5`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const result = await res.json();
              const mList = result.meetings || [];
              meetingsMap[user.id] = {
                total: mList.length,
                completed: mList.filter((m) => m.status === "COMPLETED").length || 0,
                inProgress: mList.filter((m) => m.status === "IN_PROGRESS").length || 0,
              };
            }
          } catch (err) {
            meetingsMap[user.id] = { total: 0, completed: 0, inProgress: 0 };
          }
        }
        setUserMeetings(meetingsMap);
      }
    } catch (err) {
      console.error("Users error:", err);
      setError("Failed to load users.");
    }
  };

  const fetchAllUserExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/expenses/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setUserExpenses({});
        return;
      }
      const data = await response.json();
      const map = {};
      (data.summary || []).forEach((row) => {
        map[row.id] = Number(row.total_expense) || 0;
      });
      setUserExpenses(map);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    }
  };

  const fetchAllUserMeetingsSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/meetings/summary/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const map = {};
      (data.summary || []).forEach((row) => {
        map[row.id] = {
          total: Number(row.total_meetings) || 0,
          completed: Number(row.completed_meetings) || 0,
          inProgress: Number(row.in_progress_meetings) || 0,
        };
      });
      setUserMeetings((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error("Failed to fetch meetings summary:", err);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch sync status");
      const data = await response.json();
      setSyncStatus(data.lastSync);
    } catch (err) {
      console.error("Sync status error:", err);
      setSyncStatus(null);
    }
  };

  const fetchUserLogs = async () => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/location-logs/${selectedUser.id}?limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch location logs");
      const data = await response.json();
      setLocationLogs(data.locationLogs || []);
    } catch (err) {
      console.error("Location logs error:", err);
      setLocationLogs([]);
    }
  };

  const fetchUserMeetingsDetail = async (page = 1, limit = 20) => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/user-meetings/${selectedUser.id}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch meetings");
      const data = await response.json();
      const m = data.meetings || [];
      setMeetings(m);
      if (data.pagination) {
        setMeetingsPagination({
          page: data.pagination.page || page,
          limit: data.pagination.limit || limit,
          total: data.pagination.total || m.length,
          totalPages: data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      console.error("Meetings error:", err);
      setMeetings([]);
    }
  };

  const fetchUserExpensesDetail = async (page = 1, limit = 20) => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/user-expenses/${selectedUser.id}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      const e = data.expenses || [];
      setExpenses(e);
      if (data.pagination) {
        setExpensesPagination({
          page: data.pagination.page || page,
          limit: data.pagination.limit || limit,
          total: data.pagination.total || e.length,
          totalPages: data.pagination.totalPages || 1,
        });
      }
      setRefreshPaymentTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Expenses error:", err);
      setExpenses([]);
    }
  };

  const handleViewUserLogs = (user) => {
    setSelectedUser(user);
    setCurrentPage("userLogs");
  };

  const handleViewUserMeetings = (user) => {
    setSelectedUser(user);
    setMeetingsPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
    setCurrentPage("userMeetings");
  };

  const handleViewUserExpenses = (user) => {
    setSelectedUser(user);
    setExpensesPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
    setCurrentPage("userExpenses");
  };

  const handleEditClientServices = (client) => {
    setSelectedClientForServices(client);
  };

  const navItems = [
  { id: "analytics", label: "Dashboard", icon: Home },
  { id: "mapViewer", label: "Map View", icon: MapPin },
  { id: "journeyTracking", label: "Journey Reports", icon: TrendingUp }, // ← ADD THIS
  { id: "clients", label: "Clients", icon: FileText },
  { id: "clientServices", label: "Client Services", icon: Package },
  { id: "users", label: "Team Activity", icon: Users },
  { id: "userManagement", label: "User Management", icon: Settings },
  { id: "bankSettings", label: "Bank Account", icon: CreditCard },
  { id: "slotExpansion", label: "Expand Capacity", icon: Plus },
  ...(isSuperAdmin) ? [
    { id: "companyManagement", label: "Company Management", icon: Building2 },
  ] : []
];

  const sidebarWidth = sidebarCollapsed ? "w-20" : "w-72";
  const mainMargin = sidebarCollapsed ? "ml-20" : "ml-72";

  return (
    <div className="min-h-screen" style={{ background: '#ecf0f3' }}>
      {/* Collapsible Sidebar */}
      <aside 
  className={`fixed top-0 left-0 h-full ${sidebarWidth} flex flex-col transition-all duration-300`}
  style={{ background: '#ecf0f3', zIndex: 40 }}
>
  {/* Toggle Button */}
  <button
    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
    className="absolute -right-3 top-8 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 z-50"
    style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      boxShadow: '2px 2px 6px rgba(102,126,234,0.4)',
    }}
  >
    {sidebarCollapsed ? (
      <ChevronRight className="w-4 h-4 text-white" />
    ) : (
      <ChevronLeft className="w-4 h-4 text-white" />
    )}
  </button>

  {/* Scrollable Content Container */}
  <div className={`flex-1 overflow-y-auto overflow-x-hidden ${sidebarCollapsed ? 'px-3' : 'px-6'} py-6`}>
    {/* Logo */}
    {!sidebarCollapsed ? (
      <div 
        className="mb-8 p-5 rounded-2xl flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '4px 4px 8px rgba(102,126,234,0.3), -2px -2px 6px rgba(255,255,255,0.1)',
        }}
      >
        <img src="/logo.png" alt="GeoTrack" className="w-10 h-10 object-contain" />
        <span className="text-xl font-bold text-white">GeoTrack</span>
      </div>
    ) : (
      <div 
        className="mb-8 p-3 rounded-2xl flex items-center justify-center mx-auto"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '4px 4px 8px rgba(102,126,234,0.3)',
          width: '48px',
        }}
      >
        <img src="/logo.png" alt="GeoTrack" className="w-8 h-8 object-contain" />
      </div>
    )}

    {/* Company Context */}
    {!sidebarCollapsed && !isSuperAdmin && userCompany.name && (
      <div 
        className="mb-6 p-3 rounded-xl border border-slate-200"
        style={{
          background: '#f8fafc',
          boxShadow: '2px 2px 4px rgba(148,163,184,0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3.5 h-3.5" style={{ color: '#667eea' }} />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94a3b8' }}>
            Company
          </span>
        </div>
        <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>
          {userCompany.name}
        </p>
      </div>
    )}

    {/* Super Admin Badge */}
    {!sidebarCollapsed && isSuperAdmin && (
      <div 
        className="mb-6 p-3 rounded-xl border"
        style={{
          background: 'linear-gradient(135deg, rgba(250,112,154,0.1), rgba(254,225,64,0.1))',
          border: '1px solid rgba(250,112,154,0.3)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#fa709a' }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#fa709a' }}>
            Super Admin
          </span>
        </div>
        <p className="text-xs" style={{ color: '#64748b' }}>
          All companies access
        </p>
      </div>
    )}

    {/* Navigation */}
    <nav className="space-y-2 mb-6">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full ${sidebarCollapsed ? 'p-3' : 'p-4'} rounded-xl flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} transition-all duration-200 group relative`}
            style={
              isActive
                ? {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '3px 3px 6px rgba(102,126,234,0.4)',
                    color: 'white',
                  }
                : {
                    background: 'transparent',
                    color: '#64748b',
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.boxShadow = '2px 2px 4px rgba(148,163,184,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Icon 
              className="w-5 h-5 flex-shrink-0" 
              style={{ color: isActive ? 'white' : '#94a3b8' }}
            />
            {!sidebarCollapsed && (
              <span 
                className="font-medium text-sm"
                style={{ color: isActive ? 'white' : '#64748b' }}
              >
                {item.label}
              </span>
            )}
            {sidebarCollapsed && (
              <div 
                className="absolute left-full ml-2 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50"
                style={{
                  background: '#1e293b',
                  color: 'white',
                  fontSize: '12px',
                }}
              >
                {item.label}
              </div>
            )}
          </button>
        );
      })}
    </nav>

    {/* Plan Preview */}
    {!sidebarCollapsed && planPreview && (
      <div>
        <button
          onClick={() => setCurrentPage("billingPlans")}
          className="w-full p-4 rounded-xl transition-all duration-200 group"
          style={{
            background: planPreview?.isFreePlan 
              ? 'linear-gradient(135deg, rgba(148,163,184,0.1) 0%, rgba(100,116,139,0.1) 100%)'
              : 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
            border: `1px solid ${planPreview?.isFreePlan ? 'rgba(148,163,184,0.2)' : 'rgba(102,126,234,0.2)'}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '3px 3px 6px rgba(102,126,234,0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {planPreview?.isFreePlan ? (
                <Sparkles className="w-4 h-4" style={{ color: '#94a3b8' }} />
              ) : (
                <Crown className="w-4 h-4" style={{ color: '#667eea' }} />
              )}
              <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                {planPreview?.name}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#667eea' }} />
          </div>
          
          {/* Users */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: '#64748b' }}>Users</span>
              <span className="text-xs font-semibold" style={{ color: '#1e293b' }}>
                {planPreview.usersUsed}/{planPreview.usersMax}
              </span>
            </div>
            <div className="h-1 rounded-full" style={{ background: '#e6eaf0' }}>
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min((planPreview.usersUsed / planPreview.usersMax) * 100, 100)}%`,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              />
            </div>
          </div>

          {/* Clients */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: '#64748b' }}>Clients</span>
              <span className="text-xs font-semibold" style={{ color: '#1e293b' }}>
                {planPreview.clientsUnlimited ? 'Unlimited' : `${planPreview.clientsUsed}/${planPreview.clientsMax}`}
              </span>
            </div>
            {!planPreview.clientsUnlimited && (
              <div className="h-1 rounded-full" style={{ background: '#e6eaf0' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((planPreview.clientsUsed / planPreview.clientsMax) * 100, 100)}%`,
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: '#64748b' }}>Storage</span>
              <span className="text-xs font-semibold" style={{ color: '#1e293b' }}>
                {planPreview.storageMax === null ? 'Unlimited' : 
                  `${(planPreview.storageUsed / 1024).toFixed(1)}/${(planPreview.storageMax / 1024).toFixed(0)} GB`
                }
              </span>
            </div>
            {planPreview.storageMax !== null && (
              <div className="h-1 rounded-full" style={{ background: '#e6eaf0' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((planPreview.storageUsed / planPreview.storageMax) * 100, 100)}%`,
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  }}
                />
              </div>
            )}
          </div>
        </button>
      </div>
    )}

    {/* Collapsed Plan Icon */}
    {sidebarCollapsed && planPreview && (
      <div className="mt-6">
        <button
          onClick={() => setCurrentPage("billingPlans")}
          className="w-full p-3 rounded-xl flex items-center justify-center transition-all hover:scale-105 relative group"
          style={{
            background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
          }}
        >
          <Crown className="w-5 h-5" style={{ color: '#667eea' }} />
          <div
            className="absolute left-full ml-2 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50"
            style={{
              background: '#1e293b',
              color: 'white',
              fontSize: '12px',
            }}
          >
            Billing & Plans
          </div>
        </button>
      </div>
    )}
  </div>
</aside>

      {/* Main Content */}
      <main className={`${mainMargin} p-8 transition-all duration-300`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-800 capitalize">
            {currentPage.replace(/([A-Z])/g, " $1")}
          </h1>

          <div className="flex items-center gap-4">
            {/* Refresh */}
            {["analytics", "clients", "users"].includes(currentPage) && (
              <button
                onClick={fetchData}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '4px 4px 8px rgba(102,126,234,0.4)',
                }}
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Profile */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{
                  background: '#f8fafc',
                  boxShadow: '3px 3px 6px rgba(148,163,184,0.2)',
                }}
              >
                <Users className="w-5 h-5 text-slate-600" />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-4 w-64 rounded-2xl p-4 z-50"
                  style={{
                    background: '#ecf0f3',
                    boxShadow:
                      '6px 6px 12px rgba(163,177,198,0.4), -6px -6px 12px rgba(255,255,255,0.8)',
                  }}
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {isSuperAdmin ? "Super Admin Account" : "Admin Account"}
                  </p>
                  <p className="text-xs truncate text-slate-500">
                    {localStorage.getItem("userEmail") || ""}
                  </p>

                  <div className="my-3 border-t border-slate-200" />

                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.href = "/login";
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: '#fee2e2',
                      boxShadow: '2px 2px 4px rgba(239,68,68,0.2)',
                    }}
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-600">
                      Logout
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-5 rounded-2xl bg-red-100 border-l-4 border-red-400">
            <p className="font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Page Routing */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <TrendingUp className="w-10 h-10 text-indigo-500 animate-pulse" />
          </div>
        ) : currentPage === "analytics" ? (
          <AnalyticsPage
            analyticsData={analyticsData}
            syncStatus={syncStatus}
            onRefresh={fetchData}
            onGoToClients={() => setCurrentPage("clients")}
            onGoToUsers={() => setCurrentPage("users")}
          />
          ) : currentPage === "mapViewer" ? (
          <MapViewerPage
            onViewUserDetails={handleViewUserLogs}
            onRefresh={fetchData}
          />

          ) : currentPage === "journeyTracking" ? (
          <JourneyTrackingPage />
        
        ) : currentPage === "clients" ? (
          <ClientsPage
            clients={clients}
            clientsPage={clientsPage}
            clientsTotalPages={clientsTotalPages}
            clientsTotal={clientsTotal}
            onRefresh={() => fetchClients(clientsPage, CLIENTS_PER_PAGE)}
            onPageChange={setClientsPage}
            onEditServices={handleEditClientServices}
          />
        ) : currentPage === "clientServices" ? (
          <ClientServicesPage
            onRefresh={fetchData}
            onEditServices={handleEditClientServices}
          />
        ) : currentPage === "users" ? (
          <UsersPage
            users={users}
            userClockIns={userClockIns}
            userExpenses={userExpenses}
            userMeetings={userMeetings}
            onRefresh={fetchUsers}
            onViewLogs={handleViewUserLogs}
            onViewMeetings={handleViewUserMeetings}
            onViewExpenses={handleViewUserExpenses}
          />
          ) : currentPage === "bankSettings" ? (  // ← ADD THIS
          <BankAccountSettings />
        ) : currentPage === "userManagement" ? (
          <UserManagementPage
            users={users}
            currentUserId={currentUserId}
            onRefresh={fetchUsers}
          />
        ) : currentPage === "userLogs" ? (
          <UserLogsPage
            selectedUser={selectedUser}
            locationLogs={locationLogs}
            onBack={() => setCurrentPage("users")}
            onRefresh={fetchUserLogs}
          />
        ) : currentPage === "userMeetings" ? (
          <UserMeetingsPage
            selectedUser={selectedUser}
            meetings={meetings}
            pagination={meetingsPagination}
            onBack={() => setCurrentPage("users")}
            onRefresh={() =>
              fetchUserMeetingsDetail(
                meetingsPagination.page,
                meetingsPagination.limit
              )
            }
            onPageChange={(page) =>
              fetchUserMeetingsDetail(page, meetingsPagination.limit)
            }
          />
        ) : currentPage === "userExpenses" ? (
  <UserExpensesPage
    selectedUser={selectedUser}
    expenses={expenses}
    pagination={expensesPagination}
    refreshTrigger={refreshPaymentTrigger}  // ← ADD THIS LINE
    onBack={() => setCurrentPage("users")}
    onRefresh={() =>
      fetchUserExpensesDetail(
        expensesPagination.page,
        expensesPagination.limit
      )
    }
    onPageChange={(page) =>
      fetchUserExpensesDetail(page, expensesPagination.limit)
    }
  />
        ) : currentPage === "companyManagement" ? (
          <CompanyManagementPage onRefresh={fetchData} />
        ) : currentPage === "billingPlans" ? (
          <>
            <PlanUsageWidget />
            <div className="mt-6">
              <BillingPlansPage />
            </div>
          </>
        ) : currentPage === "billingHistory" ? (
          <BillingHistoryPage />

        ) : currentPage === "slotExpansion" ? (
        <SlotExpansionPage />
        ) : null}

        {/* Client Services Modal */}
        {selectedClientForServices && (
          <ClientServicesModal
            client={selectedClientForServices}
            onClose={() => setSelectedClientForServices(null)}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
