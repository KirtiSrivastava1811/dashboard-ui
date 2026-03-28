import React, { useState } from "react";
import { DollarSign, Check, X, AlertCircle, Loader, CreditCard, Smartphone, CheckCircle2 } from "lucide-react";

//const API_BASE_URL = "http://localhost:5000";
const API_BASE_URL = "https://geo-track-1.onrender.com";

const PaymentButton = ({ expense, onPaymentComplete }) => {
  const [showModal, setShowModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  const token = localStorage.getItem("token");

  const handleRecordPayment = async () => {
    if (!transactionId.trim()) {
      setError("Please enter transaction ID / reference number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/mark-paid/${expense.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMode: paymentMode,
          transactionId: transactionId,
          notes: notes || `Payment via ${paymentMode}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Payment failed");
      }

      console.log("✅ Payment recorded successfully:", data);
      setPaymentData(data);
      setSuccess(true);
      
      // ✅ Auto-close modal and refresh after showing success
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setTransactionId("");
        setNotes("");
        
        // ✅ Call the callback to trigger parent refresh
        if (onPaymentComplete) {
  console.log("🔄 Sending updated expense back to parent");

  // ✅ Backend already returns updated expense
  onPaymentComplete(data.expense);
}

      }, 2000); // Reduced from 2500 to 2000ms for faster feedback

    } catch (err) {
      console.error("❌ Payment recording failed:", err);
      setError(err.message || "Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Better status detection
 const status =
  (expense.payment_status || expense.paymentStatus || "").toUpperCase();

const isPaid = status === "PAID";

  const isProcessing = expense.payment_status === "PROCESSING" || expense.paymentStatus === "PROCESSING";

  // ✅ Get amount with fallback
  const expenseAmount = expense.amount_spent || expense.amountSpent || 0;
  const currency = expense.currency || "₹";

  return (
    <>
      {/* ✅ Enhanced Payment Button with better visual states */}
      <button
        onClick={() => {
  if (isPaid) return;
  setShowModal(true);
}}

        disabled={isPaid || isProcessing}
        className="px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 hover:scale-105 disabled:hover:scale-100"
        style={
          isPaid
            ? {
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                cursor: 'not-allowed',
                opacity: 0.7
              }
            : isProcessing
            ? {
                background: 'rgba(102, 126, 234, 0.2)',
                color: '#667eea',
                cursor: 'not-allowed',
              }
            : {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '3px 3px 8px rgba(102, 126, 234, 0.5)',
              }
        }
      >
        {isPaid ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Paid
          </>
        ) : isProcessing ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Processing
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4" />
            Mark as Paid
          </>
        )}
      </button>

      {/* Payment Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !loading && !success && setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: '#ecf0f3',
              boxShadow: '12px 12px 24px rgba(163,177,198,0.6), -12px -12px 24px rgba(255,255,255, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: '#1e293b' }}>
                {success ? "Payment Recorded!" : "Record Payment"}
              </h3>
              {!success && (
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <X className="w-5 h-5" style={{ color: '#ef4444' }} />
                </button>
              )}
            </div>

            {/* ✅ Success Animation */}
            {success ? (
              <div className="text-center py-8">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"
                  style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    boxShadow: '0 8px 16px rgba(67, 233, 123, 0.5)',
                  }}
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h4 className="text-2xl font-bold mb-2" style={{ color: '#1e293b' }}>
                  Payment Recorded!
                </h4>
                <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                  {currency} {Number(expenseAmount).toLocaleString()} paid via {paymentMode}
                </p>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#43e97b' }}>
                    Transaction ID
                  </p>
                  <p className="text-sm font-mono" style={{ color: '#1e293b' }}>
                    {transactionId}
                  </p>
                </div>
                <p className="text-xs mt-4" style={{ color: '#94a3b8' }}>
                  Refreshing data...
                </p>
              </div>
            ) : (
              <>
                {/* Expense Details Card - Enhanced */}
                <div
                  className="mb-6 p-5 rounded-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                    border: '2px solid rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#667eea' }}>
                    <DollarSign className="w-4 h-4" />
                    Expense Details
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: '#64748b' }}>Amount to Pay:</span>
                      <span className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                        {currency} {Number(expenseAmount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: '#64748b' }}>Trip:</span>
                      <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                        {expense.trip_name || expense.tripName || "Expense"}
                      </span>
                    </div>
                    {(expense.transport_mode || expense.transportMode) && (
                      <div className="flex justify-between">
                        <span className="text-sm" style={{ color: '#64748b' }}>Transport:</span>
                        <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                          {expense.transport_mode || expense.transportMode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Box */}
                <div
                  className="mb-6 p-3 rounded-xl flex items-start gap-2"
                  style={{ background: 'rgba(102, 126, 234, 0.1)' }}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#667eea' }} />
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#667eea' }}>
                      💡 How it works
                    </p>
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      Transfer money to the employee, then record the transaction details here for audit trail.
                    </p>
                  </div>
                </div>

                {/* Payment Mode Selection - Enhanced */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-3" style={{ color: '#1e293b' }}>
                    Payment Method Used
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { mode: "UPI", icon: <Smartphone className="w-4 h-4" /> },
                      { mode: "IMPS", icon: <CreditCard className="w-4 h-4" /> },
                      { mode: "NEFT", icon: <CreditCard className="w-4 h-4" /> },
                      { mode: "RTGS", icon: <CreditCard className="w-4 h-4" /> }
                    ].map(({ mode, icon }) => (
                      <button
                        key={mode}
                        onClick={() => setPaymentMode(mode)}
                        className="p-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                        style={
                          paymentMode === mode
                            ? {
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                              }
                            : {
                                background: '#ffffff',
                                color: '#64748b',
                                boxShadow: '2px 2px 4px rgba(163,177,198,0.3)',
                              }
                        }
                      >
                        <div className="flex items-center justify-center gap-2">
                          {icon}
                          {mode}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setPaymentMode("BANK_TRANSFER")}
                    className="p-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={
                      paymentMode === "BANK_TRANSFER"
                        ? {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                          }
                        : {
                            background: '#ffffff',
                            color: '#64748b',
                            boxShadow: '2px 2px 4px rgba(163,177,198,0.3)',
                          }
                    }
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1" />
                    Bank Transfer
                  </button>
                  <button
                    onClick={() => setPaymentMode("CASH")}
                    className="p-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={
                      paymentMode === "CASH"
                        ? {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                          }
                        : {
                            background: '#ffffff',
                            color: '#64748b',
                            boxShadow: '2px 2px 4px rgba(163,177,198,0.3)',
                          }
                    }
                  >
                    💵 Cash
                  </button>
                </div>

                {/* Transaction ID - Enhanced */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    Transaction ID / UTR / Reference *
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => {
                      setTransactionId(e.target.value);
                      setError(null);
                    }}
                    placeholder={
                      paymentMode === "CASH" 
                        ? "Cash receipt number" 
                        : paymentMode === "UPI"
                        ? "UPI Transaction ID (12 digits)"
                        : "Enter UTR or reference number"
                    }
                    className="w-full p-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-2"
                    style={{
                      background: '#ffffff',
                      border: '2px solid #e6eaf0',
                      color: '#1e293b',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                    {paymentMode === "UPI" && "UPI transaction ID (12 digits)"}
                    {(paymentMode === "IMPS" || paymentMode === "NEFT" || paymentMode === "RTGS") && "UTR number from bank"}
                    {paymentMode === "BANK_TRANSFER" && "Reference number from your bank"}
                    {paymentMode === "CASH" && "Receipt number or any reference"}
                  </p>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this payment"
                    rows={2}
                    className="w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: '#ffffff',
                      border: '2px solid #e6eaf0',
                      color: '#1e293b',
                    }}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div
                    className="mb-4 p-3 rounded-xl flex items-start gap-2 animate-shake"
                    style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
                    <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                      {error}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50"
                    style={{
                      background: '#ffffff',
                      color: '#64748b',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.3)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={loading || !transactionId.trim()}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: loading || !transactionId.trim()
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      color: 'white',
                      boxShadow: loading || !transactionId.trim() 
                        ? 'none' 
                        : '4px 4px 8px rgba(67, 233, 123, 0.4)',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Record Payment
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentButton;