import { useEffect, useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import CheckoutPage from "./Checkoutpage";

const PRODUCT_ID = "69589d3ba7306459dd47fd87";
const API_BASE = "https://geo-track-1.onrender.com";

export default function BillingPlansPage({ onNavigateToSlotExpansion }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyLicense, setCompanyLicense] = useState(null);
  const [userCount, setUserCount] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      console.warn("No auth token found");
      return;
    }

    const fetchLicense = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/license/my-license`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("📄 COMPANY LICENSE:", data);

        setCompanyLicense(data);
      } catch (err) {
        console.error("Failed to load company license:", err);
        setCompanyLicense(null);
      }
    };

    fetchLicense();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchUserCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/license/my-license/user-count`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("👥 USER COUNT:", data);

        setUserCount(data);
      } catch (err) {
        console.error("Failed to load user count:", err);
      }
    };

    fetchUserCount();
  }, [token]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // ✅ This endpoint returns an array of License documents
        // Each License has a populated 'licenseType' field
        const res = await fetch(
          `https://lisence-system.onrender.com/api/license/licenses-by-product/69589d3ba7306459dd47fd87`
        );
        const data = await res.json();

        console.log("🔍 RAW API RESPONSE:", data);
        console.log("🔍 First license structure:", data.licenses?.[0]);

        const transformedPlans = (data?.licenses || []).map((plan) => ({
          ...plan,
          licenseType: plan.licenseType,
        }));

        setPlans(transformedPlans);
      } catch (err) {
        console.error("Failed to load plans", err);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const isCurrentPlan = (plan) => {
    if (!companyLicense?.license?.plan) return false;
    if (!plan?.licenseType?.name) return false;

    return (
      companyLicense.license.plan.toLowerCase() === 
      plan.licenseType.name.toLowerCase()
    );
  };

  const openModal = (plan) => {
    const currentPlan = companyLicense?.license?.plan || "";
    const isRenew = currentPlan.toLowerCase() === plan.licenseType?.name.toLowerCase();

    console.log("🎯 SELECTED PLAN:", {
      licenseDatabaseId: plan._id,  // ⬅️ This is what we send to backend!
      licenseTypeId: plan.licenseType._id,  // ⬅️ This is just for display
      licenseTypeName: plan.licenseType?.name,
      price: plan.licenseType?.price?.amount
    });

    // ✅ CRITICAL: Store the License document's _id, NOT the licenseType._id
    setSelectedPlan({
      licenseId: plan._id,  // ⬅️ The License document _id (what backend needs!)
      licenseTypeId: plan.licenseType._id,  // Keep for reference
      name: plan.licenseType?.name,
      price: plan.licenseType?.price?.amount,
      isRenew,
    });

    setBillingCycle("monthly");
    setShowModal(true);
  };

  const handleProceed = () => {
    console.log("✅ PROCEED WITH PAYMENT:", {
      licenseId: selectedPlan.licenseId,  // ⬅️ License document _id
      billingCycle: billingCycle,
    });

    // Calculate amounts based on billing cycle
    const basePrice = selectedPlan.price;
    let subtotal = basePrice;
    let discount = 0;

    switch (billingCycle) {
      case 'monthly':
        subtotal = basePrice;
        discount = 0;
        break;
      case 'quarterly':
        subtotal = basePrice * 3;
        discount = subtotal * 0.05; // 5% off
        break;
      case 'half-yearly':
        subtotal = basePrice * 6;
        discount = subtotal * 0.10; // 10% off
        break;
      case 'yearly':
        subtotal = basePrice * 12;
        discount = subtotal * 0.20; // 20% off
        break;
    }

    const afterDiscount = subtotal - discount;
    const gst = Math.round(afterDiscount * 0.18);
    const total = afterDiscount + gst;

    // ✅ CORRECT FORMAT: This is what CheckoutPage expects
    setCheckoutData({
      // Required fields for backend (sent to createOrder)
      licenseId: selectedPlan.licenseId,  // ⬅️ License document _id (NOT licenseTypeId!)
      billingCycle: billingCycle,          // ⬅️ 'monthly', 'quarterly', 'half-yearly', 'yearly'
      
      // Display fields (for UI only)
      name: selectedPlan.name,
      type: selectedPlan.isRenew ? 'renewal' : 'upgrade',
      description: `${selectedPlan.name} - ${billingCycle} billing`,
      displayAmount: total,
      
      // Breakdown for display
      breakdown: {
        subtotal: afterDiscount,
        discount: discount,
        credit: 0,
        gst: gst,
      }
    });

    setShowModal(false);
    setShowCheckout(true);
  };

  // Show checkout if active
  if (showCheckout) {
    return (
      <CheckoutPage
        orderData={checkoutData}
        onBack={() => {
          setShowCheckout(false);
          setShowModal(true);
        }}
        onSuccess={(data) => {
          console.log('✅ Payment successful:', data);
          setShowCheckout(false);
          setCheckoutData(null);
          window.location.reload();
        }}
      />
    );
  }

  if (loading) return <div className="p-6">Loading plans...</div>;

  console.log("COMPANY LICENSE:", companyLicense);
  console.log("CURRENT PLAN:", companyLicense?.license?.plan);

  plans.forEach((p, i) => {
    console.log(
      "PLAN", i,
      "NAME:", p.licenseType?.name,
      "LICENSE _ID:", p._id,  // ⬅️ This is what we send to backend
      "LICENSETYPE _ID:", p.licenseType?._id,  // ⬅️ This is just for matching
      "MATCH:", isCurrentPlan(p)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* LICENSE STATUS BANNER */}
      {companyLicense?.license && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          companyLicense.license.isExpired 
            ? 'bg-red-50 border-red-300' 
            : companyLicense.license.isExpiringSoon 
            ? 'bg-yellow-50 border-yellow-300' 
            : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg mb-1">
                {companyLicense.company.name}
              </h3>
              <p className="text-sm text-gray-600">
                Current Plan: <strong>{companyLicense.license.plan}</strong>
              </p>
              <p className="text-sm text-gray-600">
                License Key: <code className="bg-gray-200 px-2 py-0.5 rounded">{companyLicense.license.licenseKey}</code>
              </p>
            </div>
            <div className="text-right">
              {companyLicense.license.expiresAt ? (
                <>
                  <p className="text-sm text-gray-600">
                    {companyLicense.license.isExpired ? 'Expired' : 'Expires'}: 
                  </p>
                  <p className="text-base font-semibold">
                    {new Date(companyLicense.license.expiresAt).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">No expiry</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USER COUNT INFO */}
      {userCount && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
          <p className="text-sm text-gray-600">
            <strong>Current Usage:</strong> {userCount.currentUsers || 0} users out of {userCount.maxUsers || 'unlimited'}
          </p>
        </div>
      )}

      {/* PLANS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const type = plan.licenseType;
          if (!type) return null;

          const active = isCurrentPlan(plan);

          return (
            <div
              key={plan._id}
              className={`relative p-6 rounded-2xl ${
                active ? "border-4 border-green-500" : ""
              }`}
              style={{
                background: "#ecf0f3",
                boxShadow: active
                  ? "inset 3px 3px 6px #c5c8cf, inset -3px -3px 6px #ffffff"
                  : "8px 8px 16px #c5c8cf, -8px -8px 16px #ffffff",
              }}
            >
              {active && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 
                    bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow">
                  ✓ Active Plan
                </div>
              )}

              <h3 className="text-lg font-semibold mb-1">{type.name}</h3>

              <p className="text-sm text-gray-600 mb-2">
                {type.description || "No description available"}
              </p>

              <div className="text-2xl font-bold mb-1">
                ₹{type.price?.amount ?? 0}
              </div>

              <p className="text-sm text-gray-500 mb-3">
                per user / {type.price?.billingPeriod || "monthly"}
              </p>

              {Array.isArray(type.features) && (
                <ul className="text-sm text-gray-600 mb-4 space-y-1">
                  {type.features.map((f, i) => (
                    <li key={i}>• {f.uiLabel || f}</li>
                  ))}
                </ul>
              )}

              {plan.maxLimits && (
                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  <div>Users: {plan.maxLimits.users}</div>
                  <div>Storage: {plan.maxLimits.storageGB} GB</div>
                  <div>API Calls: {plan.maxLimits.apiCalls}</div>
                </div>
              )}

              {active && companyLicense?.license?.expiresAt && (
                <p className="text-xs text-green-700 mb-3">
                  {companyLicense.license.isExpired ? 'Expired on' : 'Renews on'}{" "}
                  <strong>
                    {new Date(companyLicense.license.expiresAt).toLocaleDateString()}
                  </strong>
                </p>
              )}

              {active ? (
                <button
                  disabled
                  className="w-full py-2 rounded-xl font-semibold bg-green-200 text-green-800 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => openModal(plan)}
                  className="w-full py-2 rounded-xl text-white font-medium"
                  style={{
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                  }}
                >
                  {companyLicense?.license ? 'Upgrade' : 'Select Plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* SLOT EXPANSION BANNER */}
      {companyLicense?.license && (
        <div 
          className="mt-8 p-6 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(67,233,123,0.1) 0%, rgba(56,249,215,0.1) 100%)',
            border: '2px solid rgba(67,233,123,0.3)',
            boxShadow: '6px 6px 12px rgba(163,177,198,0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <h3 className="text-xl font-bold mb-1" style={{ color: '#1e293b' }}>
                  Need More Capacity?
                </h3>
                <p className="text-sm" style={{ color: '#64748b' }}>
                  Add extra user or client slots to your current plan without upgrading
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onNavigateToSlotExpansion) {
                  onNavigateToSlotExpansion();
                }
              }}
              className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                boxShadow: '4px 4px 8px rgba(67, 233, 123, 0.4)',
              }}
            >
              <TrendingUp className="w-5 h-5" />
              Expand Slots
            </button>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-xl overflow-hidden">
            <div className="px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedPlan?.isRenew
                      ? "Renew Subscription"
                      : "Upgrade Plan"}
                  </h3>
                  <p className="text-sm opacity-90">
                    {selectedPlan?.name}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* BILLING CYCLE SELECTOR */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Choose Billing Cycle
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['monthly', 'quarterly', 'half-yearly', 'yearly'].map((cycle) => {
                    const discounts = {
                      monthly: 0,
                      quarterly: 5,
                      'half-yearly': 10,
                      yearly: 20
                    };
                    const discount = discounts[cycle];

                    return (
                      <button
                        key={cycle}
                        onClick={() => setBillingCycle(cycle)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          billingCycle === cycle
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <div className="text-sm font-semibold capitalize">
                          {cycle === 'half-yearly' ? 'Half-Yearly' : cycle}
                        </div>
                        {discount > 0 && (
                          <div className="text-xs text-green-600 font-semibold">
                            Save {discount}%
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-700">
                {billingCycle === 'monthly' ? (
                  <>
                    Pay monthly with no long-term commitment.
                    <div className="text-gray-500 mt-1">
                      Cancel anytime.
                    </div>
                  </>
                ) : billingCycle === 'quarterly' ? (
                  <>
                    Pay every 3 months and save 5%.
                    <div className="text-gray-500 mt-1">
                      Best for short-term projects.
                    </div>
                  </>
                ) : billingCycle === 'half-yearly' ? (
                  <>
                    Pay every 6 months and save 10%.
                    <div className="text-gray-500 mt-1">
                      Great value for medium-term needs.
                    </div>
                  </>
                ) : (
                  <>
                    Pay annually and save 20%.
                    <div className="text-gray-500 mt-1">
                      Maximum savings for long-term use.
                    </div>
                  </>
                )}
              </div>

              {/* ORDER SUMMARY */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-sm font-semibold mb-2">Order Summary</p>
                <div className="flex justify-between text-sm mb-1">
                  <span>Plan:</span>
                  <span className="font-semibold">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Base Price:</span>
                  <span className="font-semibold">₹{selectedPlan?.price}/user</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Billing Cycle:</span>
                  <span className="font-semibold capitalize">{billingCycle}</span>
                </div>
                {billingCycle !== 'monthly' && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span className="font-semibold">
                      {billingCycle === 'quarterly' ? '5%' : 
                       billingCycle === 'half-yearly' ? '10%' : '20%'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 rounded-xl bg-gray-200 text-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={handleProceed}
                className="px-8 py-2 rounded-xl bg-purple-600 text-white font-semibold"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}