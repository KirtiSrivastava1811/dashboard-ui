import React, { useState, useEffect } from "react";
import { Save, Loader, Check, AlertCircle, CreditCard, Smartphone, Search, User, ArrowLeft } from "lucide-react";

const API_BASE_URL = "https://geo-track-1.onrender.com/api";

const AdminBankAccountSettings = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    upiId: "",
  });

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch bank details when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchUserBankDetails(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserBankDetails = async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/payments/admin/user-bank-account/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.bankAccount) {
          setFormData({
            accountNumber: data.bankAccount.account_number || "",
            ifscCode: data.bankAccount.ifsc_code || "",
            accountHolderName: data.bankAccount.account_holder_name || "",
            bankName: data.bankAccount.bank_name || "",
            upiId: data.bankAccount.upi_id || "",
          });
        } else {
          // No bank account exists, reset form
          setFormData({
            accountNumber: "",
            ifscCode: "",
            accountHolderName: "",
            bankName: "",
            upiId: "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch bank details:", err);
      setFormData({
        accountNumber: "",
        ifscCode: "",
        accountHolderName: "",
        bankName: "",
        upiId: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
    setSuccess(false);
  };

  const validateIFSC = (ifsc) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setError("Please select a user first");
      return;
    }

    setError(null);
    setSuccess(false);

    // Validation
    if (formData.ifscCode && !validateIFSC(formData.ifscCode)) {
      setError("Invalid IFSC code format");
      return;
    }

    if (formData.accountNumber && formData.accountNumber.length < 9) {
      setError("Account number should be at least 9 digits");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/payments/admin/update-user-bank-account/${selectedUser.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountNumber: formData.accountNumber || null,
          ifscCode: formData.ifscCode?.toUpperCase() || null,
          accountHolderName: formData.accountHolderName || null,
          bankName: formData.bankName || null,
          upiId: formData.upiId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save bank details");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error("Save failed:", err);
      setError(err.message || "Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  const handleBackToUserList = () => {
    setSelectedUser(null);
    setFormData({
      accountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      bankName: "",
      upiId: "",
    });
    setError(null);
    setSuccess(false);
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.full_name || "").toLowerCase().includes(searchLower) ||
      (user.email || "").toLowerCase().includes(searchLower) ||
      (user.phone || "").includes(searchTerm)
    );
  });

  // If no user selected, show user selection screen
  if (!selectedUser) {
    return (
      <div
        className="max-w-4xl mx-auto p-6 rounded-2xl"
        style={{
          background: '#ffffff',
          boxShadow: '8px 8px 16px rgba(163,177,198,0.6), -8px -8px 16px rgba(255,255,255, 0.5)',
        }}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e293b' }}>
            Manage User Bank Accounts
          </h2>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Select a user to add or update their bank account details
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm"
              style={{
                background: '#ffffff',
                border: '2px solid #e6eaf0',
                color: '#1e293b',
              }}
            />
          </div>
        </div>

        {/* User List */}
        {loadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin" style={{ color: '#667eea' }} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>
              {searchTerm ? "No users found matching your search" : "No users available"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="w-full p-4 rounded-xl text-left transition-all hover:scale-102"
                style={{
                  background: '#ffffff',
                  border: '2px solid #e6eaf0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e6eaf0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: '#1e293b' }}>
                      {user.full_name || "Unnamed User"}
                    </h3>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                      <span>{user.email}</span>
                      {user.phone && <span>• {user.phone}</span>}
                    </div>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Bank details form for selected user
  return (
    <div
      className="max-w-2xl mx-auto p-6 rounded-2xl"
      style={{
        background: '#ecf0f3',
        boxShadow: '8px 8px 16px rgba(163,177,198,0.6), -8px -8px 16px rgba(255,255,255, 0.5)',
      }}
    >
      {/* Back Button & Header */}
      <button
        onClick={handleBackToUserList}
        className="flex items-center gap-2 mb-4 text-sm font-semibold transition-all hover:scale-105"
        style={{ color: '#667eea' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to User List
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e293b' }}>
          Bank Account Details
        </h2>
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(102, 126, 234, 0.1)' }}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: '#667eea' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                {selectedUser.full_name || "Unnamed User"}
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                {selectedUser.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(67, 233, 123, 0.1)' }}
        >
          <Check className="w-5 h-5" style={{ color: '#43e97b' }} />
          <span className="text-sm font-semibold" style={{ color: '#43e97b' }}>
            Bank details saved successfully!
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(239, 68, 68, 0.1)' }}
        >
          <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
          <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>
            {error}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin" style={{ color: '#667eea' }} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bank Account Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5" style={{ color: '#667eea' }} />
              <h3 className="text-lg font-bold" style={{ color: '#1e293b' }}>
                Bank Account (for NEFT/IMPS/RTGS)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#64748b' }}>
                  Account Holder Name
                </label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full p-3 rounded-xl text-sm"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e6eaf0',
                    color: '#1e293b',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#64748b' }}>
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="1234567890"
                  className="w-full p-3 rounded-xl text-sm"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e6eaf0',
                    color: '#1e293b',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#64748b' }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  placeholder="HDFC0001234"
                  className="w-full p-3 rounded-xl text-sm uppercase"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e6eaf0',
                    color: '#1e293b',
                  }}
                  maxLength={11}
                />
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  11-character code (e.g., HDFC0001234)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#64748b' }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="HDFC Bank"
                  className="w-full p-3 rounded-xl text-sm"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e6eaf0',
                    color: '#1e293b',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: '#e6eaf0' }} />
            <span className="text-xs font-semibold uppercase" style={{ color: '#94a3b8' }}>
              OR
            </span>
            <div className="flex-1 h-px" style={{ background: '#e6eaf0' }} />
          </div>

          {/* UPI Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5" style={{ color: '#43e97b' }} />
              <h3 className="text-lg font-bold" style={{ color: '#1e293b' }}>
                UPI (Faster Payments)
              </h3>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#64748b' }}>
                UPI ID / VPA
              </label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleChange}
                placeholder="yourname@paytm"
                className="w-full p-3 rounded-xl text-sm"
                style={{
                  background: '#ffffff',
                  border: '2px solid #e6eaf0',
                  color: '#1e293b',
                }}
              />
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                User's UPI ID (e.g., yourname@paytm, yourname@phonepe)
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(102, 126, 234, 0.1)' }}
          >
            <p className="text-sm" style={{ color: '#667eea' }}>
              💡 <strong>Tip:</strong> You can add either bank account details OR UPI ID, or both. 
              UPI payments are typically faster (instant to few minutes) compared to bank transfers.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
            }}
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Bank Details
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminBankAccountSettings;