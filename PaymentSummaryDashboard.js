import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle } from "lucide-react";

const API_BASE_URL = "https://geo-track-1.onrender.com";

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

const PaymentSummaryDashboard = ({ userId = null, refreshTrigger = 0 }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPaymentSummary();
  }, [userId, refreshTrigger]);

  const fetchPaymentSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = userId ? `?userId=${userId}` : "";
      const response = await fetch(`${API_BASE_URL}/api/payments/summary${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payment summary");
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("Error fetching payment summary:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <NeumorphicCard>
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm mt-4" style={{ color: '#64748b' }}>Loading payment summary...</p>
        </div>
      </NeumorphicCard>
    );
  }

  if (error) {
    return (
      <NeumorphicCard>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>{error}</p>
        </div>
      </NeumorphicCard>
    );
  }

  if (!summary) return null;

  const totalExpenses = parseInt(summary.total_expenses) || 0;
  const paidExpenses = parseInt(summary.paid_expenses) || 0;
  const pendingExpenses = parseInt(summary.pending_expenses) || 0;
  const totalAmount = parseFloat(summary.total_amount) || 0;
  const paidAmount = parseFloat(summary.paid_amount) || 0;
  const pendingAmount = parseFloat(summary.pending_amount) || 0;

  const paidPercentage = totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0;
  const pendingPercentage = totalAmount > 0 ? ((pendingAmount / totalAmount) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold" style={{ color: '#1e293b' }}>
          Payment Summary
        </h3>
        <button
          onClick={fetchPaymentSummary}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '3px 3px 6px rgba(102, 126, 234, 0.4)',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Amount */}
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Total Amount
              </p>
              <h3 className="text-2xl font-bold mb-1" style={{ color: '#1e293b' }}>
                ₹{totalAmount.toLocaleString()}
              </h3>
              <p className="text-xs" style={{ color: '#64748b' }}>
                {totalExpenses} expense{totalExpenses !== 1 ? 's' : ''}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        {/* Paid Amount */}
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Paid Amount
              </p>
              <h3 className="text-2xl font-bold mb-1" style={{ color: '#43e97b' }}>
                ₹{paidAmount.toLocaleString()}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {paidExpenses} paid
                </p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(67, 233, 123, 0.2)',
                    color: '#43e97b',
                  }}
                >
                  {paidPercentage}%
                </span>
              </div>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(67, 233, 123, 0.2)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${paidPercentage}%`,
                background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
              }}
            ></div>
          </div>
        </NeumorphicCard>

        {/* Pending Amount */}
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Pending Amount
              </p>
              <h3 className="text-2xl font-bold mb-1" style={{ color: '#f093fb' }}>
                ₹{pendingAmount.toLocaleString()}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {pendingExpenses} pending
                </p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(240, 147, 251, 0.2)',
                    color: '#f093fb',
                  }}
                >
                  {pendingPercentage}%
                </span>
              </div>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(240, 147, 251, 0.2)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${pendingPercentage}%`,
                background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
              }}
            ></div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Detailed Breakdown */}
      <NeumorphicCard>
        <h4 className="text-sm font-bold mb-4" style={{ color: '#1e293b' }}>
          Expense Breakdown
        </h4>
        <div className="space-y-3">
          {/* Paid Row */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: '#43e97b' }}></div>
              <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>Paid Expenses</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: '#43e97b' }}>
                ₹{paidAmount.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                {paidExpenses} of {totalExpenses}
              </p>
            </div>
          </div>

          {/* Pending Row */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(240, 147, 251, 0.1)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f093fb' }}></div>
              <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>Pending Expenses</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: '#f093fb' }}>
                ₹{pendingAmount.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                {pendingExpenses} of {totalExpenses}
              </p>
            </div>
          </div>
        </div>

        {/* Action Needed Badge */}
        {pendingExpenses > 0 && (
          <div
            className="mt-4 p-3 rounded-xl flex items-center gap-2"
            style={{ background: 'rgba(240, 147, 251, 0.1)' }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: '#f093fb' }} />
            <div>
              <p className="text-xs font-bold" style={{ color: '#f093fb' }}>
                Action Required
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                {pendingExpenses} expense{pendingExpenses !== 1 ? 's' : ''} waiting for payment
              </p>
            </div>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
};

export default PaymentSummaryDashboard;