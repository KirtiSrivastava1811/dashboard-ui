import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Shield,
  CheckCircle,
  ArrowLeft,
  Lock,
  X,
  AlertCircle,
  Loader,
  User,
} from 'lucide-react';
import { purchaseLicense, createOrder, verifyPayment, initializeRazorpay } from '../api/payment';
import { getLmsUserId } from '../api/license';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_RnRpO2zJanwL9L";

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

const CheckoutPage = ({ orderData, onBack, onSuccess }) => {
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(true);
  
  // Payment form state
  const [billingInfo, setBillingInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
  });

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const userEmail = localStorage.getItem("userEmail");
  const userName = localStorage.getItem("userName");
  const companyName = localStorage.getItem("companyName");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    // Pre-fill billing info from localStorage
    setBillingInfo(prev => ({
      ...prev,
      email: userEmail || "",
      name: userName || companyName || "",
    }));
  }, [userEmail, userName, companyName]);

  // Load Razorpay script on mount
  useEffect(() => {
    const loadRazorpay = async () => {
      const loaded = await initializeRazorpay();
      if (!loaded && mounted) {
        setError("Failed to load payment gateway. Please refresh the page.");
      }
    };
    loadRazorpay();
  }, []);

  const validateForm = () => {
    // Validate billing info
    if (!billingInfo.name || !billingInfo.email || !billingInfo.phone) {
      setError("Please fill in all required billing information");
      return false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(billingInfo.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Validate Indian phone number
    const cleanPhone = billingInfo.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return false;
    }

    // Validate GST if provided
    if (billingInfo.gstNumber && billingInfo.gstNumber.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(billingInfo.gstNumber.trim())) {
        setError("Please enter a valid GST number or leave it empty");
        return false;
      }
    }

    // Validate pincode if provided
    if (billingInfo.pincode && !/^\d{6}$/.test(billingInfo.pincode)) {
      setError("Please enter a valid 6-digit pincode");
      return false;
    }

    return true;
  };

  // FIXED handlePayment function for Checkoutpage.js
// Replace your existing handlePayment function (lines 121-252) with this:

const handlePayment = async () => {
  if (!validateForm()) {
    return;
  }

  setProcessingPayment(true);
  setError("");

  try {
    console.log("=== PAYMENT DEBUG START ===");
    console.log("1. userEmail:", userEmail);
    console.log("2. orderData:", orderData);
    console.log("=== PAYMENT DEBUG END ===");

    // ✅ VALIDATION: Check required fields
    if (!userEmail) {
      throw new Error("User email is missing. Please login again.");
    }

    if (!orderData?.licenseId) {
      throw new Error("License ID is missing. Please select a plan again.");
    }

    if (!orderData?.billingCycle) {
      throw new Error("Billing cycle is missing. Please select a plan again.");
    }

    // ✅ STEP 1: Check if user already has an lms_user_id (for upgrades)
    console.log("📤 Checking for existing lms_user_id for email:", userEmail);
    let existingLmsUserId = null;
    try {
      existingLmsUserId = await getLmsUserId(userEmail);
      console.log("✅ Found existing lms_user_id:", existingLmsUserId);
    } catch (error) {
      console.log("ℹ️ No existing lms_user_id found (new purchase)");
    }

    // ✅ STEP 2: Purchase license (creates pending transaction in LMS)
    const totalAmount = Math.round(orderData.displayAmount * 100); // Convert to paise
    
    console.log("📤 Purchasing license with payload:", {
      name: billingInfo.name,
      email: billingInfo.email,
      orgName: billingInfo.address || "",
      licenseId: orderData.licenseId,
      billingCycle: orderData.billingCycle,
      source: "Geotrack",
      amount: totalAmount,
      currency: "INR",
    });

    const purchaseResponse = await purchaseLicense({
      name: billingInfo.name,              // User's full name
      email: billingInfo.email,            // User's email
      orgName: billingInfo.address || "",  // Organization/address
      licenseId: orderData.licenseId,      // License plan ID
      billingCycle: orderData.billingCycle, // monthly/quarterly/yearly
      source: "Geotrack",                  // Product name
      amount: totalAmount,                 // Total amount in paise
      currency: "INR"                      // Currency
    });

    console.log("✅ License purchase created:", purchaseResponse);
    
    // Extract userId from purchase response (the LMS creates a user and returns the ID)
    const lmsUserIdFromPurchase = purchaseResponse.userId || purchaseResponse._id;
    console.log("✅ LMS User ID from purchase response:", lmsUserIdFromPurchase);

    // ✅ STEP 3: Create Razorpay order using userId from purchase response
    console.log("📤 Creating Razorpay order with payload:", {
      userId: lmsUserIdFromPurchase,
      licenseId: orderData.licenseId,
      billingCycle: orderData.billingCycle,
      amount: totalAmount,
    });

    const orderResponse = await createOrder({
      userId: lmsUserIdFromPurchase,  // ← Use userId from purchase response!
      licenseId: orderData.licenseId,
      billingCycle: orderData.billingCycle,
      amount: totalAmount, // Convert to paise
    });

    console.log("✅ Razorpay order created:", orderResponse);

    // ✅ Validate response
    if (!orderResponse?.orderId) {
      throw new Error("Invalid response from payment gateway");
    }

    // ✅ STEP 4: Initialize Razorpay checkout
    const options = {
      key: orderResponse.key || RAZORPAY_KEY_ID,
      amount: orderResponse.amountInPaise,
      currency: orderResponse.currency || "INR",
      name: "GeoTrack SaaS",
      description: orderData.description || `Purchase ${orderData.name}`,
      order_id: orderResponse.orderId,
      prefill: {
        name: billingInfo.name,
        email: billingInfo.email,
        contact: billingInfo.phone,
      },
      notes: {
        address: billingInfo.address,
        city: billingInfo.city,
        state: billingInfo.state,
        pincode: billingInfo.pincode,
        gstNumber: billingInfo.gstNumber,
      },
      theme: {
        color: "#667eea",
      },
      handler: async function (response) {
        console.log("✅ Razorpay payment response:", response);
        
        if (!mounted) {
          console.log("⚠️ Component unmounted, skipping state update");
          return;
        }
        
        try {
          // ✅ STEP 5: Verify payment
          const verificationResponse = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          console.log("✅ Payment verified:", verificationResponse);

          if (mounted) {
            setTransactionId(verificationResponse.transactionId || response.razorpay_payment_id);
            setPaymentSuccess(true);
            setProcessingPayment(false);

            setTimeout(() => {
              if (onSuccess && mounted) {
                onSuccess(verificationResponse);
              }
              
              // Refresh the page after successful payment
              setTimeout(() => {
                console.log("🔄 Refreshing page to update license status...");
                window.location.reload();
              }, 2000); // Refresh after showing success message
            }, 2000);
          }
        } catch (err) {
          console.error("❌ Payment verification failed:", err);
          
          if (mounted) {
            const errorMessage = err.response?.data?.message 
              || err.response?.data?.error 
              || err.message 
              || "Payment verification failed. Please contact support.";
            setError(errorMessage);
            setProcessingPayment(false);
          }
        }
      },
      modal: {
        ondismiss: function () {
          console.log("❌ Payment cancelled by user");
          if (mounted) {
            setProcessingPayment(false);
            setError("Payment was cancelled");
          }
        }
      }
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();

  } catch (err) {
    console.error("❌ Payment error:", err);
    console.error("❌ Error response:", err.response?.data);
    
    if (mounted) {
      let errorMessage = "Payment processing failed. Please try again.";
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProcessingPayment(false);
    }
  }
};


// ============================================
// ALTERNATIVE VERSION: If above doesn't work
// ============================================
// This version adds the 'amount' field (like the working TypeScript version)

const handlePaymentWithAmount = async () => {
  if (!validateForm()) {
    return;
  }

  setProcessingPayment(true);
  setError("");

  try {
    // Validate userId
    if (!userId || userId === "null" || userId === "undefined") {
      throw new Error("User session expired. Please login again.");
    }

    // Validate orderData
    if (!orderData?.licenseId) {
      throw new Error("License ID is missing. Please select a plan again.");
    }

    if (!orderData?.billingCycle) {
      throw new Error("Billing cycle is missing. Please select a plan again.");
    }

    if (!orderData?.displayAmount) {
      throw new Error("Amount is missing. Please select a plan again.");
    }

    // 📦 Prepare the payload WITH amount field
    const payload = {
      userId: userId,
      licenseId: orderData.licenseId,
      billingCycle: orderData.billingCycle,
      amount: Math.round(orderData.displayAmount * 100), // Convert to paise
    };

    console.log("📤 Sending payload with amount:", JSON.stringify(payload, null, 2));

    const orderResponse = await createOrder(payload);

    console.log("✅ Order created:", orderResponse);

    // Validate response
    if (!orderResponse?.orderId) {
      throw new Error("Invalid response from payment gateway");
    }

    // Rest of the code remains the same...
    const options = {
      key: orderResponse.key || RAZORPAY_KEY_ID,
      amount: orderResponse.amountInPaise,
      currency: orderResponse.currency || "INR",
      name: "GeoTrack SaaS",
      description: orderData.description || `Purchase ${orderData.name}`,
      order_id: orderResponse.orderId,
      prefill: {
        name: billingInfo.name,
        email: billingInfo.email,
        contact: billingInfo.phone,
      },
      notes: {
        address: billingInfo.address,
        city: billingInfo.city,
        state: billingInfo.state,
        pincode: billingInfo.pincode,
        gstNumber: billingInfo.gstNumber,
      },
      theme: {
        color: "#667eea",
      },
      handler: async function (response) {
        if (!mounted) return;
        
        try {
          const verificationResponse = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (mounted) {
            setTransactionId(verificationResponse.transactionId || response.razorpay_payment_id);
            setPaymentSuccess(true);
            setProcessingPayment(false);

            setTimeout(() => {
              if (onSuccess && mounted) {
                onSuccess(verificationResponse);
              }
            }, 2000);
          }
        } catch (err) {
          if (mounted) {
            setError(err.response?.data?.message || "Payment verification failed");
            setProcessingPayment(false);
          }
        }
      },
      modal: {
        ondismiss: function () {
          if (mounted) {
            setProcessingPayment(false);
            setError("Payment was cancelled");
          }
        }
      }
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();

  } catch (err) {
    console.error("❌ Payment error:", err);
    
    if (mounted) {
      let errorMessage = "Payment processing failed. Please try again.";
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProcessingPayment(false);
    }
  }
};

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#ecf0f3' }}>
        <NeumorphicCard className="max-w-2xl w-full">
          <div className="text-center py-12">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                boxShadow: '6px 6px 12px rgba(67, 233, 123, 0.4)',
              }}
            >
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ color: '#1e293b' }}>
              Payment Successful!
            </h2>
            <p className="text-lg mb-6" style={{ color: '#64748b' }}>
              Your order has been confirmed
            </p>
            <div className="bg-white rounded-xl p-6 mb-6" style={{ boxShadow: 'inset 2px 2px 4px rgba(148,163,184,0.2)' }}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-left">
                  <p className="font-semibold mb-1" style={{ color: '#94a3b8' }}>Order Type</p>
                  <p className="font-bold" style={{ color: '#1e293b' }}>{orderData.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold mb-1" style={{ color: '#94a3b8' }}>Amount Paid</p>
                  <p className="font-bold text-2xl" style={{ color: '#43e97b' }}>₹{orderData.displayAmount?.toLocaleString()}</p>
                </div>
              </div>
              {transactionId && (
                <div className="mt-4 pt-4 border-t text-xs" style={{ borderColor: '#e6eaf0' }}>
                  <p style={{ color: '#64748b' }}>Transaction ID: <span className="font-mono font-semibold">{transactionId}</span></p>
                </div>
              )}
            </div>
            <p className="text-sm mb-8" style={{ color: '#64748b' }}>
              A confirmation email has been sent to {billingInfo.email}
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </NeumorphicCard>
      </div>
    );
  }

  // Processing Screen
  if (processingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#ecf0f3' }}>
        <NeumorphicCard className="max-w-md w-full">
          <div className="text-center py-12">
            <Loader className="w-16 h-16 mx-auto mb-6 animate-spin" style={{ color: '#667eea' }} />
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#1e293b' }}>
              Processing Payment
            </h2>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Please do not close this window or press back...
            </p>
          </div>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: '#ecf0f3' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 mb-4"
            style={{
              background: '#ecf0f3',
              boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
              color: '#667eea',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold" style={{ color: '#1e293b' }}>
            Secure Checkout
          </h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Complete your purchase securely with Razorpay
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-4 rounded-2xl border-l-4 flex items-center gap-3"
            style={{
              background: "#fed7d7",
              borderColor: "#fc8181",
            }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: '#c53030' }} />
            <p style={{ color: "#c53030" }} className="font-medium flex-1">
              {error}
            </p>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4" style={{ color: '#c53030' }} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Information */}
            <NeumorphicCard>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#1e293b' }}>
                    Billing Information
                  </h2>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    Enter your billing details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    Full Name / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={billingInfo.name}
                    onChange={(e) => setBillingInfo({ ...billingInfo, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="John Doe / Acme Corp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={billingInfo.email}
                    onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={billingInfo.phone}
                    onChange={(e) => setBillingInfo({ ...billingInfo, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={billingInfo.address}
                    onChange={(e) => setBillingInfo({ ...billingInfo, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={billingInfo.city}
                    onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="Mumbai"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={billingInfo.state}
                    onChange={(e) => setBillingInfo({ ...billingInfo, state: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="Maharashtra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={billingInfo.pincode}
                    onChange={(e) => setBillingInfo({ ...billingInfo, pincode: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="400001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={billingInfo.gstNumber}
                    onChange={(e) => setBillingInfo({ ...billingInfo, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: '#e6eaf0',
                      border: 'none',
                      color: '#1e293b',
                      boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
                    }}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>
            </NeumorphicCard>

            {/* Payment Method Notice */}
            <NeumorphicCard>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold" style={{ color: '#1e293b' }}>
                    Secure Payment via Razorpay
                  </h2>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    Supports Credit/Debit Cards, UPI, Net Banking & Wallets
                  </p>
                </div>
              </div>
            </NeumorphicCard>

            {/* Security Notice */}
            <div
              className="p-4 rounded-xl flex items-center gap-3"
              style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.2)',
              }}
            >
              <Lock className="w-5 h-5" style={{ color: '#667eea' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                  Secure Payment
                </p>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  Your payment information is encrypted and secure with Razorpay
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary - 1 column */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <NeumorphicCard>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#1e293b' }}>
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#667eea' }}>
                      {orderData.type || 'Plan'}
                    </p>
                    <p className="text-lg font-bold" style={{ color: '#1e293b' }}>
                      {orderData.name}
                    </p>
                    {orderData.description && (
                      <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                        {orderData.description}
                      </p>
                    )}
                  </div>

                  {orderData.billingCycle && (
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#64748b' }}>Billing Cycle</p>
                      <p className="text-sm font-bold capitalize" style={{ color: '#1e293b' }}>
                        {orderData.billingCycle}
                      </p>
                    </div>
                  )}

                  <div className="pt-4" style={{ borderTop: '2px solid rgba(148, 163, 184, 0.2)' }}>
                    {orderData.breakdown && (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm" style={{ color: '#64748b' }}>Subtotal</span>
                          <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                            ₹{orderData.breakdown.subtotal?.toLocaleString()}
                          </span>
                        </div>
                        
                        {orderData.breakdown.discount > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm" style={{ color: '#43e97b' }}>Discount</span>
                            <span className="text-sm font-semibold" style={{ color: '#43e97b' }}>
                              - ₹{orderData.breakdown.discount?.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {orderData.breakdown.credit > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm" style={{ color: '#43e97b' }}>Upgrade Credit</span>
                            <span className="text-sm font-semibold" style={{ color: '#43e97b' }}>
                              - ₹{orderData.breakdown.credit?.toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        {orderData.breakdown.gst && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm" style={{ color: '#64748b' }}>GST (18%)</span>
                            <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                              ₹{orderData.breakdown.gst?.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between items-center pt-3 mt-3" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                      <span className="text-lg font-bold" style={{ color: '#1e293b' }}>Total</span>
                      <span className="text-2xl font-bold" style={{ color: '#43e97b' }}>
                        ₹{orderData.displayAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={processingPayment}
                  className="w-full px-6 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    color: 'white',
                    boxShadow: '4px 4px 8px rgba(67, 233, 123, 0.4)',
                  }}
                >
                  <Shield className="w-5 h-5" />
                  Pay ₹{orderData.displayAmount?.toLocaleString()}
                </button>

                <p className="text-xs text-center mt-4" style={{ color: '#94a3b8' }}>
                  By completing this purchase you agree to our terms and conditions
                </p>
              </NeumorphicCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;