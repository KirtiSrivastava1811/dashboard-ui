import React from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

import {
  TrendingUp, TrendingDown, Users, Activity,
  AlertTriangle, CheckCircle, Target
} from "lucide-react";

/* ================= CARD ================= */
const NeumorphicCard = ({ children }) => (
  <div
    className="p-5 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
    style={{
      background: "#ecf0f3",
      boxShadow:
        "6px 6px 12px rgba(163,177,198,0.6), -6px -6px 12px rgba(255,255,255,0.5)",
    }}
  >
    {children}
  </div>
);

/* ================= STAT CARD ================= */
const StatCard = ({ title, value, change, positive, icon: Icon, gradient }) => (
  <NeumorphicCard>
    <div className="flex justify-between items-center">

      <div>
        <p className="text-xs text-gray-500 tracking-wide">{title}</p>

        <h2 className="text-2xl font-bold text-gray-900">
          {value}
        </h2>

        <div className="flex items-center gap-1 mt-1">
          {positive ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span className={`text-xs ${positive ? "text-green-500" : "text-red-500"}`}>
            {change}%
          </span>
        </div>
      </div>

      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: gradient }}
      >
        <Icon className="text-white w-5 h-5" />
      </div>

    </div>
  </NeumorphicCard>
);

/* ================= MAIN ================= */
const AnalyticsPage = ({ analyticsData }) => {
  if (!analyticsData) return null;

  const { stats, distribution } = analyticsData;
  const inactive = stats.totalClients - stats.activeClients;

  return (
    <div className="space-y-6">

      {/* ===== STATS ===== */}
      <div className="grid md:grid-cols-3 gap-4">

        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          change={5}
          positive={true}
          icon={Users}
          gradient="linear-gradient(135deg,#667eea,#764ba2)"
        />

        <StatCard
          title="Active Clients"
          value={stats.activeClients}
          change={3}
          positive={true}
          icon={Activity}
          gradient="linear-gradient(135deg,#43e97b,#38f9d7)"
        />

        <StatCard
          title="Inactive Clients"
          value={inactive}
          change={-2}
          positive={false}
          icon={AlertTriangle}
          gradient="linear-gradient(135deg,#ff758c,#ff7eb3)"
        />

      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid md:grid-cols-2 gap-4">

        <NeumorphicCard>
          <h3 className="text-base font-bold text-gray-800 mb-2">
            Client Status
          </h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: "Active", value: stats.activeClients },
                  { name: "Inactive", value: inactive }
                ]}
                dataKey="value"
                innerRadius={40}
                outerRadius={70}
              >
                <Cell fill="#43e97b" />
                <Cell fill="#ff6b6b" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </NeumorphicCard>

        <NeumorphicCard>
          <h3 className="text-base font-bold text-gray-800 mb-2">
            Top Areas
          </h3>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribution || []}>
              <XAxis dataKey="area" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="clients" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </NeumorphicCard>

      </div>

      {/* ===== ACTION ===== */}
      <NeumorphicCard>
        <h3 className="flex items-center gap-2 text-gray-800 font-bold mb-3">
          <Target className="w-4 h-4" />
          Action Items
        </h3>

        <div className="space-y-2">

          {inactive > 0 && (
            <div className="p-3 rounded-xl bg-red-50 flex items-center gap-2">
              <AlertTriangle className="text-red-500" />
              <span className="text-gray-700">
                {inactive} inactive clients
              </span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-green-50 flex items-center gap-2">
            <CheckCircle className="text-green-500" />
            <span className="text-gray-700">
              System working perfectly
            </span>
          </div>

        </div>
      </NeumorphicCard>

    </div>
  );
};

export default AnalyticsPage;