import React, { useState, useEffect } from "react";
import {
  RefreshCw, MapPin, Download, Search,
  CheckCircle, XCircle, User, ExternalLink, Plus, Edit
} from "lucide-react";
import ClientModal from "./ClientModal";

const ClientsPage = ({
  clients,
  clientsPage,
  clientsTotalPages,
  clientsTotal,
  onRefresh,
  onPageChange,
  onEditServices
}) => {

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClients, setFilteredClients] = useState(clients);

  useEffect(() => {
    let filtered = clients;

    if (searchTerm.trim() !== "") {
      filtered = clients.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  return (
    <div className="space-y-5">

      {/* 🔍 Search + Buttons */}
      <div className="flex items-center gap-3">

        <div className="relative w-full">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border text-slate-800 font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          className="px-3 py-2 bg-green-500 text-white rounded-lg flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* 📊 TABLE */}
      <div className="w-full bg-white rounded-xl shadow-md overflow-hidden">

        <div className="overflow-x-auto">
          <table className="w-full">

            {/* 🔹 TABLE HEAD */}
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Location</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">GPS</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Actions</th>
              </tr>
            </thead>

            {/* 🔹 TABLE BODY */}
            <tbody>

              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    No clients found
                  </td>
                </tr>
              ) : (

                filteredClients.map((client, idx) => (
                  <tr
                    key={client.id}
                    className="border-b hover:bg-gray-50 transition"
                  >

                    {/* 👤 CLIENT */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {client.name?.[0]}
                        </div>
                        <span className="text-slate-800 font-semibold">
                          {client.name}
                        </span>
                      </div>
                    </td>

                    {/* 📧 CONTACT */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-slate-800 text-sm font-semibold">
                          {client.email || "No Email"}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {client.phone || "No Phone"}
                        </p>
                      </div>
                    </td>

                    {/* ✅ STATUS */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        client.status === "active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        {client.status}
                      </span>
                    </td>

                    {/* 📍 LOCATION */}
                    <td className="px-4 py-3 text-slate-800 font-semibold">
                      {client.pincode || "N/A"}
                    </td>

                    {/* 🌍 GPS */}
                    <td className="px-4 py-3">
                      {client.latitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${client.latitude},${client.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 text-sm flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Map
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No GPS</span>
                      )}
                    </td>

                    {/* ⚙️ ACTIONS */}
                    <td className="px-4 py-3">
                      <button className="text-blue-500 hover:underline text-sm flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                    </td>

                  </tr>
                ))

              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;