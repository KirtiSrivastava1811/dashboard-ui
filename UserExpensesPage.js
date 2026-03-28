import React, { useState, useEffect } from "react";
import { RefreshCw, Paperclip, ArrowLeft, DollarSign, TrendingUp, MapPin, Calendar, Route } from "lucide-react";
import PaymentButton from "./PaymentButton";
import PaymentSummaryDashboard from "./PaymentSummaryDashboard";

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

const UserExpensesPage = ({
  selectedUser,
  expenses: initialExpenses,
  pagination,
  refreshTrigger = 0,
  onBack,
  onRefresh,
  onPageChange,
}) => {
  // ✅ LOCAL STATE: Manage expenses locally to allow instant updates
  const [expenses, setExpenses] = useState(initialExpenses);

  useEffect(() => {
  setExpenses(prev => {
    // ✅ Store all already paid expenses safely
    const paidMap = new Map(
      prev
        .filter(exp => (exp.payment_status || "").toUpperCase() === "PAID")
        .map(exp => [exp.id, exp])
    );

    // ✅ Merge backend list, but keep PAID ones locked
    return initialExpenses.map(exp =>
      paidMap.has(exp.id) ? paidMap.get(exp.id) : exp
    );
  });
}, [initialExpenses]);



  const handlePaymentComplete = (updatedExpense) => {
  console.log("✅ Payment completed for:", updatedExpense.id);

  // ✅ Replace expense with backend-confirmed object
  setExpenses(prev =>
    prev.map(exp =>
      exp.id === updatedExpense.id ? updatedExpense : exp
    )
  );
};


  const gotoPage = (p) => {
    if (p < 1 || p > (pagination.totalPages || 1)) return;
    onPageChange(p);
  };

  // Handle both camelCase and snake_case property names
  const getAmount = (exp) => Number(exp.amount_spent || exp.amountSpent || 0);
  const getDistance = (exp) => Number(exp.distance_km || exp.distanceKm || 0);

  // Calculate stats
  const totalAmount = expenses.reduce((sum, exp) => sum + getAmount(exp), 0);
  const avgAmount = expenses.length > 0 ? Math.round(totalAmount / expenses.length) : 0;
  const totalDistance = expenses.reduce((sum, exp) => sum + getDistance(exp), 0);

  // Pagination with first and last
  const pages = [];
  const startPage = Math.max(1, pagination.page - 1);
  const endPage = Math.min(pagination.totalPages, pagination.page + 1);
  
  if (startPage > 1) pages.push(1);
  if (startPage > 2) pages.push('...');
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  if (endPage < pagination.totalPages - 1) pages.push('...');
  if (endPage < pagination.totalPages) pages.push(pagination.totalPages);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 mb-2 text-sm font-semibold transition-all hover:scale-105"
            style={{ color: '#667eea' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
          <h2 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
            Expense Logs
            {selectedUser ? ` - ${selectedUser.full_name || selectedUser.email}` : ""}
          </h2>
          {selectedUser && (
            <p className="text-sm" style={{ color: '#64748b' }}>
              User ID: {selectedUser.id?.substring(0, 12)}...
            </p>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ✅ PAYMENT SUMMARY DASHBOARD */}
      <PaymentSummaryDashboard 
        userId={selectedUser?.id}
        refreshTrigger={refreshTrigger}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Total Expenses
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {pagination.total || expenses.length}
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Total Amount
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                ₹{totalAmount.toLocaleString()}
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Avg Amount
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                ₹{avgAmount.toLocaleString()}
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Total Distance
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {totalDistance.toFixed(1)}km
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <MapPin className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#1e293b' }}>No expenses found</h3>
            <p style={{ color: '#64748b' }}>This user hasn't recorded any expenses yet</p>
          </div>
        </NeumorphicCard>
      ) : (
        <div className="space-y-4">
          {expenses.map((exp) => {
            // Handle both receiptImages and receiptUrls + receipt_images
            let attachmentsList = [];
            if (Array.isArray(exp.receipt_images)) {
              attachmentsList = exp.receipt_images.filter(
                (url) => url && url.trim().length > 0
              );
            } else if (Array.isArray(exp.receiptImages)) {
              attachmentsList = exp.receiptImages.filter(
                (url) => url && url.trim().length > 0
              );
            } else if (Array.isArray(exp.receiptUrls)) {
              attachmentsList = exp.receiptUrls.filter(
                (url) => url && url.trim().length > 0
              );
            }

            // Handle different date field names
            const recordedDate = exp.travel_date
              ? new Date(Number(exp.travel_date)).toLocaleString()
              : exp.travelDate
              ? new Date(Number(exp.travelDate)).toLocaleString()
              : exp.created_at
              ? new Date(exp.created_at).toLocaleString()
              : exp.createdAt
              ? new Date(exp.createdAt).toLocaleString()
              : "-";

            // Check if multi-leg
            const isMultiLeg = exp.is_multi_leg || exp.isMultiLeg || false;
            const legs = exp.legs || [];

            // Get values with fallbacks
            const tripName = exp.trip_name || exp.tripName;
            const transportMode = exp.transport_mode || exp.transportMode;
            const startLocation = exp.start_location || exp.startLocation;
            const endLocation = exp.end_location || exp.endLocation;
            const distanceKm = exp.distance_km || exp.distanceKm;
            const amountSpent = exp.amount_spent || exp.amountSpent;
            const currency = exp.currency || "₹";
            const notes = exp.notes;

            return (
              <NeumorphicCard key={exp.id} className="hover:shadow-xl transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: isMultiLeg 
                          ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                          : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
                      }}
                    >
                      {isMultiLeg ? (
                        <Route className="w-6 h-6 text-white" />
                      ) : (
                        <DollarSign className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#1e293b' }}>
                        {tripName || transportMode || "Expense"}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: '#43e97b' }}
                        >
                          {amountSpent != null
                            ? `${currency} ${Number(amountSpent).toLocaleString()}`
                            : "-"}
                        </span>
                        {isMultiLeg && (
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{
                              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                              color: 'white',
                            }}
                          >
                            {legs.length} Legs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#667eea' }}>Distance</p>
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                      {distanceKm != null ? `${distanceKm} km` : "-"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl" style={{ background: 'rgba(240, 147, 251, 0.1)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#f093fb' }}>Transport Mode</p>
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                      {transportMode || "-"}
                    </p>
                  </div>
                </div>

                {/* Locations (Only for single-leg) */}
                {!isMultiLeg && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#43e97b' }} />
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>From</p>
                        <p className="text-sm" style={{ color: '#1e293b' }}>
                          {startLocation || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fa709a' }} />
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>To</p>
                        <p className="text-sm" style={{ color: '#1e293b' }}>
                          {endLocation || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multi-Leg Segments */}
                {isMultiLeg && legs.length > 0 && (
                  <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(250, 112, 154, 0.1)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Route className="w-4 h-4" style={{ color: '#fa709a' }} />
                      <p className="text-sm font-semibold" style={{ color: '#fa709a' }}>
                        Journey Breakdown ({legs.length} legs)
                      </p>
                    </div>
                    <div className="space-y-3">
                      {legs.map((leg, idx) => {
                        const legNumber = leg.leg_number || leg.legNumber || idx + 1;
                        const legAmount = leg.amount_spent || leg.amountSpent;
                        const legStartLocation = leg.start_location || leg.startLocation;
                        const legEndLocation = leg.end_location || leg.endLocation;
                        const legDistance = leg.distance_km || leg.distanceKm;
                        const legTransport = leg.transport_mode || leg.transportMode;
                        const legNotes = leg.notes;

                        return (
                          <div
                            key={leg.id || idx}
                            className="p-3 rounded-lg"
                            style={{
                              background: '#ffffff',
                              boxShadow: '2px 2px 6px rgba(0,0,0,0.1)',
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-xs font-bold px-2 py-1 rounded"
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                }}
                              >
                                Leg {legNumber}
                              </span>
                              <span className="text-xs font-semibold" style={{ color: '#43e97b' }}>
                                {leg.currency || currency} {Number(legAmount).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="font-medium mb-1" style={{ color: '#94a3b8' }}>From</p>
                                <p style={{ color: '#1e293b' }}>{legStartLocation}</p>
                              </div>
                              <div>
                                <p className="font-medium mb-1" style={{ color: '#94a3b8' }}>To</p>
                                <p style={{ color: '#1e293b' }}>{legEndLocation}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <p className="font-medium" style={{ color: '#94a3b8' }}>
                                  {legDistance} km · {legTransport}
                                </p>
                              </div>
                            </div>
                            {legNotes && (
                              <p className="text-xs mt-2" style={{ color: '#64748b' }}>
                                {legNotes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#94a3b8' }}>Notes</p>
                    <p className="text-sm" style={{ color: '#1e293b' }}>{notes}</p>
                  </div>
                )}

                {/* Receipt Images */}
                {attachmentsList.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>
                      Receipts ({attachmentsList.length})
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {attachmentsList.map((img, idx) => {
                        const imageSrc = img.startsWith("data:")
                          ? img
                          : img.startsWith("http")
                          ? img
                          : `data:image/webp;base64,${img}`;

                        return (
                          <img
                            key={idx}
                            src={imageSrc}
                            alt={`Receipt ${idx + 1}`}
                            style={{
                              width: 90,
                              height: 90,
                              objectFit: "cover",
                              borderRadius: 10,
                              border: "2px solid rgba(102, 126, 234, 0.3)",
                              cursor: "pointer",
                              transition: 'transform 0.2s',
                            }}
                            className="hover:scale-110"
                            onClick={() => window.open(imageSrc, "_blank")}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      Recorded: {recordedDate}
                    </span>
                    {(attachmentsList.length > 0 || isMultiLeg) && (
                      <div className="flex items-center gap-3">
                        {attachmentsList.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" style={{ color: '#667eea' }} />
                            <span className="text-xs font-semibold" style={{ color: '#667eea' }}>
                              {attachmentsList.length} receipt{attachmentsList.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {isMultiLeg && (
                          <div className="flex items-center gap-1">
                            <Route className="w-3 h-3" style={{ color: '#fa709a' }} />
                            <span className="text-xs font-semibold" style={{ color: '#fa709a' }}>
                              {legs.length} leg{legs.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* ✅ Payment Button with improved callback */}
                  <PaymentButton
                  expense={exp}
                  onPaymentComplete={handlePaymentComplete}
                />

                </div>
              </NeumorphicCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: '#64748b' }}>
              Page <span className="font-semibold" style={{ color: '#1e293b' }}>{pagination.page}</span> of{" "}
              <span className="font-semibold" style={{ color: '#1e293b' }}>{pagination.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => gotoPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: '#ecf0f3',
                  boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                  color: '#667eea',
                }}
              >
                Previous
              </button>
              {pages.map((p, idx) => (
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm" style={{ color: '#94a3b8' }}>...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => gotoPage(p)}
                    className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                    style={
                      p === pagination.page
                        ? {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                          }
                        : {
                            background: '#ecf0f3',
                            boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                            color: '#667eea',
                          }
                    }
                  >
                    {p}
                  </button>
                )
              ))}
              <button
                onClick={() => gotoPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: '#ecf0f3',
                  boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                  color: '#667eea',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
};

export default UserExpensesPage;