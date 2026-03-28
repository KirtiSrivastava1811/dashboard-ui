import React from "react";
import {
  MapPin,
  CheckCircle,
  XCircle,
  User,
  DollarSign,
  Calendar,
  Eye,
  TrendingUp
} from "lucide-react";

const StatCard = ({ title, value, subtitle, icon: Icon, gradient }) => (
  <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition">
    <div className="flex items-center justify-between mb-2">
      <div>
        <p className="text-xs text-gray-400 font-semibold">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
        style={{ background: gradient }}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-xs text-gray-400">{subtitle}</p>
  </div>
);

const UsersPage = ({
  users,
  userClockIns,
  userExpenses,
  userMeetings,
  onViewLogs,
  onViewMeetings,
  onViewExpenses,
}) => {

  const totalExpenses = Object.values(userExpenses).reduce((sum, val) => sum + (val || 0), 0);
  const clockedInCount = Object.values(userClockIns).filter((c) => c?.clocked_in).length;

  return (
    <div className="space-y-5">

      {/* 🔹 STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={users.length}
          subtitle="Team members"
          icon={User}
          gradient="linear-gradient(135deg,#667eea,#764ba2)"
        />
        <StatCard
          title="Clocked In"
          value={clockedInCount}
          subtitle="Working now"
          icon={CheckCircle}
          gradient="linear-gradient(135deg,#43e97b,#38f9d7)"
        />
        <StatCard
          title="With GPS"
          value={users.filter((u) => u.pincode).length}
          subtitle="Tracked users"
          icon={MapPin}
          gradient="linear-gradient(135deg,#4facfe,#00f2fe)"
        />
        <StatCard
          title="Expenses"
          value={`₹${(totalExpenses / 1000).toFixed(1)}K`}
          subtitle="Total spend"
          icon={DollarSign}
          gradient="linear-gradient(135deg,#fa709a,#fee140)"
        />
      </div>

      {/* 🔹 USER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {users.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-400">
            No users found
          </div>
        ) : (
          users.map((user) => {

            const isOnline = userClockIns[user.id]?.clocked_in;
            const lastSeen = userClockIns[user.id]?.last_seen;
            const expense = userExpenses[user.id] || 0;
            const meetings = userMeetings[user.id] || { total: 0, completed: 0 };

            return (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition"
              >

                {/* 👤 HEADER */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                  >
                    {(user.full_name || user.email || "U")[0]}
                  </div>

                  <div className="flex-1">
                    <p className="text-slate-800 font-semibold text-sm">
                      {user.full_name || "No Name"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* STATUS */}
                <div className="mb-3">
                  {isOnline ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <XCircle className="w-3 h-3" />
                      Offline
                    </span>
                  )}
                </div>

                {/* METRICS */}
                <div className="grid grid-cols-2 gap-2 mb-3">

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Meetings</p>
                    <p className="text-slate-800 font-semibold">
                      {meetings.total}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Expense</p>
                    <p className="text-slate-800 font-semibold">
                      ₹{expense}
                    </p>
                  </div>

                </div>

                {/* LOCATION */}
                {user.pincode && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin className="w-3 h-3" />
                    {user.pincode}
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex gap-2">

                  <button
                    onClick={() => onViewLogs(user)}
                    className="flex-1 bg-blue-100 text-blue-600 py-1 rounded text-xs font-semibold"
                  >
                    Logs
                  </button>

                  <button
                    onClick={() => onViewMeetings(user)}
                    className="flex-1 bg-pink-100 text-pink-600 py-1 rounded text-xs font-semibold"
                  >
                    Meet
                  </button>

                  <button
                    onClick={() => onViewExpenses(user)}
                    className="flex-1 bg-green-100 text-green-600 py-1 rounded text-xs font-semibold"
                  >
                    Expense
                  </button>

                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UsersPage;