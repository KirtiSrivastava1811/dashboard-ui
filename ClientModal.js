import React, { useState, useEffect } from "react";
import { X, MapPin, User, Mail, Phone, FileText, Map, Navigation } from "lucide-react";

const ClientModal = ({ isOpen, onClose, client, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
    latitude: "",
    longitude: "",
    status: "active",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeTime, setGeocodeTime] = useState(null); // Track how long geocoding takes

  // Populate form when editing
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        pincode: client.pincode || "",
        latitude: client.latitude || "",
        longitude: client.longitude || "",
        status: client.status || "active",
        notes: client.notes || "",
      });
    } else {
      // Reset form for new client
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        pincode: "",
        latitude: "",
        longitude: "",
        status: "active",
        notes: "",
      });
    }
    setErrors({});
  }, [client, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.latitude && (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90)) {
      newErrors.latitude = "Latitude must be between -90 and 90";
    }

    if (formData.longitude && (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180)) {
      newErrors.longitude = "Longitude must be between -180 and 180";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const url = client
        ? `https://geo-track-1.onrender.com/clients/${client.id}`
        : "https://geo-track-1.onrender.com/clients";

      const method = client ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save client");
      }

      const data = await response.json();
      onSave(data);
      onClose();
    } catch (error) {
      console.error("Error saving client:", error);
      setErrors({ submit: "Failed to save client. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ✨ OPTIMIZED: Geocoding with caching
  const handleGeocode = async () => {
    if (!formData.address.trim()) {
      setErrors((prev) => ({ ...prev, address: "Please enter an address first" }));
      return;
    }

    // ✅ CHECK CACHE FIRST
    const cacheKey = `geocode_${formData.address.toLowerCase().trim()}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { lat, lng, timestamp } = JSON.parse(cached);
        
        // Cache valid for 30 days
        const isValid = (Date.now() - timestamp) < (30 * 24 * 60 * 60 * 1000);
        
        if (isValid) {
          console.log('✨ Using cached coordinates');
          setFormData((prev) => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString(),
          }));
          return; // Skip API call!
        }
      } catch (e) {
        // Invalid cache, continue to API call
      }
    }

    setIsGeocoding(true);
    setGeocodeTime(null);
    setErrors((prev) => ({ ...prev, geocode: "" }));
    
    const startTime = Date.now(); // ⏱️ Track timing

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://geo-track-1.onrender.com/api/admin/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address: formData.address }),
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      setGeocodeTime(duration);

      if (!response.ok) {
        throw new Error("Geocoding failed");
      }

      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setFormData((prev) => ({
          ...prev,
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
        }));
        
        // ✅ CACHE THE RESULT
        localStorage.setItem(cacheKey, JSON.stringify({
          lat: data.latitude,
          lng: data.longitude,
          timestamp: Date.now()
        }));
        
        setErrors((prev) => ({ ...prev, geocode: "" }));
        
        console.log(`✅ Geocoded in ${duration}s`);
      } else {
        throw new Error("No coordinates found for this address");
      }

    } catch (error) {
      console.error("Geocoding error:", error);
      setErrors((prev) => ({ 
        ...prev, 
        geocode: "Could not find coordinates for this address. Please try a more specific address or enter coordinates manually." 
      }));
    } finally {
      setIsGeocoding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      {/* ✨ FLOATING LOADING INDICATOR */}
      {isGeocoding && (
        <div 
          className="fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <div className="flex items-center gap-3">
            <Navigation className="w-5 h-5 animate-spin" />
            <div>
              <p className="font-semibold">Finding coordinates...</p>
              <p className="text-xs opacity-90 mt-1">
                This may take 2-3 seconds
                {geocodeTime && ` (${geocodeTime}s so far)`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl"
        style={{
          background: "#ecf0f3",
          boxShadow: "8px 8px 20px rgba(163,177,198,0.6), -8px -8px 20px rgba(255,255,255, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: "rgba(148, 163, 184, 0.2)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: "#1e293b" }}>
              {client ? "Edit Client" : "Add New Client"}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{
                background: "#ecf0f3",
                boxShadow: "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                color: "#64748b",
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 160px)" }}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                <User className="w-4 h-4 inline mr-1" />
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter client name"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: "#ecf0f3",
                  boxShadow: errors.name
                    ? "inset 3px 3px 6px rgba(239, 68, 68, 0.2), inset -3px -3px 6px rgba(255,255,255, 0.5)"
                    : "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                  color: "#1e293b",
                  border: errors.name ? "1px solid #ef4444" : "none",
                }}
              />
              {errors.name && (
                <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="client@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: "#ecf0f3",
                  boxShadow: errors.email
                    ? "inset 3px 3px 6px rgba(239, 68, 68, 0.2), inset -3px -3px 6px rgba(255,255,255, 0.5)"
                    : "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                  color: "#1e293b",
                  border: errors.email ? "1px solid #ef4444" : "none",
                }}
              />
              {errors.email && (
                <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 1234567890"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: "#ecf0f3",
                  boxShadow: "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                  color: "#1e293b",
                }}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                <Map className="w-4 h-4 inline mr-1" />
                Address
              </label>
              <div className="space-y-2">
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all resize-none"
                  style={{
                    background: "#ecf0f3",
                    boxShadow: errors.address
                      ? "inset 3px 3px 6px rgba(239, 68, 68, 0.2), inset -3px -3px 6px rgba(255,255,255, 0.5)"
                      : "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                    color: "#1e293b",
                    border: errors.address ? "1px solid #ef4444" : "none",
                  }}
                />
                {errors.address && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>
                    {errors.address}
                  </p>
                )}
                
                {/* Geocode Button */}
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={isGeocoding || !formData.address.trim()}
                  className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: isGeocoding 
                      ? "#ecf0f3"
                      : "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                    color: isGeocoding ? "#64748b" : "white",
                    boxShadow: isGeocoding
                      ? "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)"
                      : "4px 4px 8px rgba(67, 233, 123, 0.4)",
                  }}
                >
                  <Navigation className={`w-4 h-4 ${isGeocoding ? 'animate-spin' : ''}`} />
                  {isGeocoding ? "Finding Coordinates..." : "Get Coordinates from Address"}
                </button>

                {/* ✨ SUCCESS MESSAGE */}
                {geocodeTime && !isGeocoding && (
                  <p className="text-xs text-center" style={{ color: "#43e97b" }}>
                    ✓ Found in {geocodeTime}s
                  </p>
                )}

                {errors.geocode && (
                  <div
                    className="p-3 rounded-xl text-xs"
                    style={{
                      background: "rgba(251, 191, 36, 0.1)",
                      border: "1px solid #fbbf24",
                      color: "#f59e0b",
                    }}
                  >
                    {errors.geocode}
                  </div>
                )}
              </div>
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                <MapPin className="w-4 h-4 inline mr-1" />
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="400001"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: "#ecf0f3",
                  boxShadow: "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                  color: "#1e293b",
                }}
              />
            </div>

            {/* GPS Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                  Latitude
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="19.0760"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                  style={{
                    background: "#ecf0f3",
                    boxShadow: errors.latitude
                      ? "inset 3px 3px 6px rgba(239, 68, 68, 0.2), inset -3px -3px 6px rgba(255,255,255, 0.5)"
                      : "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                    color: "#1e293b",
                    border: errors.latitude ? "1px solid #ef4444" : "none",
                  }}
                />
                {errors.latitude && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {errors.latitude}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                  Longitude
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="72.8777"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                  style={{
                    background: "#ecf0f3",
                    boxShadow: errors.longitude
                      ? "inset 3px 3px 6px rgba(239, 68, 68, 0.2), inset -3px -3px 6px rgba(255,255,255, 0.5)"
                      : "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                    color: "#1e293b",
                    border: errors.longitude ? "1px solid #ef4444" : "none",
                  }}
                />
                {errors.longitude && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {errors.longitude}
                  </p>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: "#ecf0f3",
                  boxShadow: "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                  color: "#1e293b",
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
                <FileText className="w-4 h-4 inline mr-1" />
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any additional notes..."
                rows="3"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all resize-none"
                style={{
                  background: "#ecf0f3",
                  boxShadow: "inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255, 0.8)",
                  color: "#1e293b",
                }}
              />
            </div>

            {errors.submit && (
              <div
                className="p-4 rounded-xl text-sm"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid #ef4444",
                  color: "#ef4444",
                }}
              >
                {errors.submit}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div
          className="p-6 border-t flex items-center justify-end gap-3"
          style={{ borderColor: "rgba(148, 163, 184, 0.2)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#ecf0f3",
              boxShadow: "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
              color: "#64748b",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4)",
            }}
          >
            {isSubmitting ? "Saving..." : client ? "Update Client" : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;