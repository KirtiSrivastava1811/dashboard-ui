import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Crown,
  Package
} from 'lucide-react';

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

const SlotExpansionPage = () => {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Slot quantities to purchase
  const [userSlots, setUserSlots] = useState(0);
  const [clientSlots, setClientSlots] = useState(0);
  
  // Pricing (these should ideally come from backend)
  const PRICE_PER_USER_SLOT = 50; // ₹50 per additional user slot
  const PRICE_PER_CLIENT_SLOT = 10; // ₹10 per additional client slot

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/my-plan`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch plan data");
      }

      const data = await response.json();
      setPlanData(data);
    } catch (err) {
      console.error("Plan data error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSlots = async () => {
    if (userSlots === 0 && clientSlots === 0) {
      setError("Please select at least one slot to purchase");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/purchase-slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          additionalUsers: userSlots,
          additionalClients: clientSlots,
          totalAmount: calculateTotal(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to purchase slots");
      }

      setSuccess(`Successfully purchased ${userSlots} user slots and ${clientSlots} client slots!`);
      setUserSlots(0);
      setClientSlots(0);
      
      // Refresh plan data
      setTimeout(() => {
        fetchPlanData();
        setSuccess("");
      }, 2000);
    } catch (err) {
      console.error("Purchase error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return (userSlots * PRICE_PER_USER_SLOT) + (clientSlots * PRICE_PER_CLIENT_SLOT);
  };

  const canPurchaseMoreUsers = () => {
    if (!planData?.plan?.limits?.users?.max) return true; // Unlimited plan
    return planData.usage.users.current < planData.plan.limits.users.max;
  };

  const canPurchaseMoreClients = () => {
    if (planData?.usage?.clients?.unlimited) return false; // Already unlimited
    if (!planData?.plan?.limits?.clients?.max) return true;
    return planData.usage.clients.current < planData.plan.limits.clients.max;
  };

  if (loading && !planData) {
    return (
      <NeumorphicCard>
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-3 animate-pulse" style={{ color: '#667eea' }} />
          <p style={{ color: '#64748b' }}>Loading slot expansion options...</p>
        </div>
      </NeumorphicCard>
    );
  }

  if (error && !planData) {
    return (
      <NeumorphicCard>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p style={{ color: '#ef4444' }}>{error}</p>
          <button 
            onClick={fetchPlanData}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#667eea', color: 'white' }}
          >
            Retry
          </button>
        </div>
      </NeumorphicCard>
    );
  }

  const isFreePlan = planData?.plan?.planName === 'starter';
  const total = calculateTotal();

  return (
    <div className="space-y-5">
      {/* Header */}
      <NeumorphicCard>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
            }}
          >
            <Plus className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
              Expand Your Capacity
            </h2>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Purchase additional user and client slots for your {planData?.plan?.displayName} plan
            </p>
          </div>
        </div>

        {isFreePlan && (
          <div 
            className="p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(245,158,11,0.1) 100%)',
              border: '2px solid rgba(251,191,36,0.3)',
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" style={{ color: '#f59e0b' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                  Consider upgrading your plan
                </p>
                <p className="text-xs" style={{ color: '#78350f' }}>
                  Higher tier plans offer better value for slot expansion
                </p>
              </div>
            </div>
          </div>
        )}
      </NeumorphicCard>

      {/* Messages */}
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

      {success && (
        <div
          className="p-4 rounded-2xl border-l-4"
          style={{
            background: "#c6f6d5",
            borderColor: "#48bb78",
          }}
        >
          <p style={{ color: "#22543d" }} className="font-medium">
            {success}
          </p>
        </div>
      )}

      {/* Current Usage */}
      <NeumorphicCard>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#1e293b' }}>
          Current Usage
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5" style={{ color: '#667eea' }} />
              <span className="text-sm font-semibold" style={{ color: '#667eea' }}>User Slots</span>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: '#1e293b' }}>
              {planData?.usage?.users?.current} / {planData?.usage?.users?.max || '∞'}
            </p>
            <p className="text-xs" style={{ color: '#64748b' }}>
              {planData?.usage?.users?.max 
                ? `${planData.usage.users.max - planData.usage.users.current} slots remaining`
                : 'Unlimited'
              }
            </p>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5" style={{ color: '#43e97b' }} />
              <span className="text-sm font-semibold" style={{ color: '#43e97b' }}>Client Slots</span>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: '#1e293b' }}>
              {planData?.usage?.clients?.current} / {planData?.usage?.clients?.unlimited ? '∞' : planData?.usage?.clients?.max}
            </p>
            <p className="text-xs" style={{ color: '#64748b' }}>
              {planData?.usage?.clients?.unlimited 
                ? 'Unlimited'
                : `${planData.usage.clients.max - planData.usage.clients.current} slots remaining`
              }
            </p>
          </div>
        </div>
      </NeumorphicCard>

      {/* Slot Selection */}
      <div className="grid grid-cols-2 gap-4">
        {/* User Slots */}
        <NeumorphicCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold mb-1" style={{ color: '#1e293b' }}>
                Additional User Slots
              </h4>
              <p className="text-sm" style={{ color: '#64748b' }}>
                ₹{PRICE_PER_USER_SLOT} per slot
              </p>
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

          <div className="flex items-center gap-4">
            <button
              onClick={() => setUserSlots(Math.max(0, userSlots - 1))}
              disabled={userSlots === 0}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
              style={{
                background: '#ecf0f3',
                boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
              }}
            >
              <Minus className="w-5 h-5" style={{ color: '#667eea' }} />
            </button>

            <div className="flex-1 text-center">
              <p className="text-3xl font-bold" style={{ color: '#1e293b' }}>
                {userSlots}
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>slots</p>
            </div>

            <button
              onClick={() => setUserSlots(userSlots + 1)}
              disabled={!canPurchaseMoreUsers()}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
              style={{
                background: '#ecf0f3',
                boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
              }}
            >
              <Plus className="w-5 h-5" style={{ color: '#667eea' }} />
            </button>
          </div>

          <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
            <p className="text-sm font-semibold" style={{ color: '#667eea' }}>
              Subtotal: ₹{userSlots * PRICE_PER_USER_SLOT}
            </p>
          </div>
        </NeumorphicCard>

        {/* Client Slots */}
        <NeumorphicCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold mb-1" style={{ color: '#1e293b' }}>
                Additional Client Slots
              </h4>
              <p className="text-sm" style={{ color: '#64748b' }}>
                ₹{PRICE_PER_CLIENT_SLOT} per slot
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>

          {planData?.usage?.clients?.unlimited ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#43e97b' }} />
              <p className="text-sm font-semibold" style={{ color: '#43e97b' }}>
                You have unlimited client slots
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setClientSlots(Math.max(0, clientSlots - 1))}
                  disabled={clientSlots === 0}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
                  style={{
                    background: '#ecf0f3',
                    boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                  }}
                >
                  <Minus className="w-5 h-5" style={{ color: '#43e97b' }} />
                </button>

                <div className="flex-1 text-center">
                  <p className="text-3xl font-bold" style={{ color: '#1e293b' }}>
                    {clientSlots}
                  </p>
                  <p className="text-xs" style={{ color: '#64748b' }}>slots</p>
                </div>

                <button
                  onClick={() => setClientSlots(clientSlots + 1)}
                  disabled={!canPurchaseMoreClients()}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
                  style={{
                    background: '#ecf0f3',
                    boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                  }}
                >
                  <Plus className="w-5 h-5" style={{ color: '#43e97b' }} />
                </button>
              </div>

              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
                <p className="text-sm font-semibold" style={{ color: '#43e97b' }}>
                  Subtotal: ₹{clientSlots * PRICE_PER_CLIENT_SLOT}
                </p>
              </div>
            </>
          )}
        </NeumorphicCard>
      </div>

      {/* Order Summary */}
      <NeumorphicCard>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
          <ShoppingCart className="w-5 h-5" style={{ color: '#667eea' }} />
          Order Summary
        </h3>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <span className="text-sm" style={{ color: '#64748b' }}>
              {userSlots} User Slots × ₹{PRICE_PER_USER_SLOT}
            </span>
            <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
              ₹{userSlots * PRICE_PER_USER_SLOT}
            </span>
          </div>

          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <span className="text-sm" style={{ color: '#64748b' }}>
              {clientSlots} Client Slots × ₹{PRICE_PER_CLIENT_SLOT}
            </span>
            <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
              ₹{clientSlots * PRICE_PER_CLIENT_SLOT}
            </span>
          </div>

          <div className="flex justify-between items-center py-3">
            <span className="text-lg font-bold" style={{ color: '#1e293b' }}>
              Total Amount
            </span>
            <span className="text-2xl font-bold" style={{ color: '#667eea' }}>
              ₹{total}
            </span>
          </div>
        </div>

        <button
          onClick={handlePurchaseSlots}
          disabled={loading || total === 0}
          className="w-full px-6 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            boxShadow: '4px 4px 8px rgba(67, 233, 123, 0.4)',
          }}
        >
          {loading ? (
            <>Processing...</>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Proceed to Payment
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-xs text-center mt-3" style={{ color: '#94a3b8' }}>
          Slots will be added to your account immediately after payment
        </p>
      </NeumorphicCard>

      {/* Benefits */}
      <NeumorphicCard>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#43e97b' }} />
          Why Expand Your Capacity?
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#43e97b' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>
                Scale Your Team
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                Add more users without upgrading your plan
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#43e97b' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>
                Grow Your Business
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                Handle more clients and opportunities
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#43e97b' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>
                Cost Effective
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                Pay only for what you need
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#43e97b' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>
                Instant Activation
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                Slots available immediately
              </p>
            </div>
          </div>
        </div>
      </NeumorphicCard>
    </div>
  );
};

export default SlotExpansionPage;