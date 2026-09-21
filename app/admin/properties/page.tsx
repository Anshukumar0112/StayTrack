"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { listAdminProperties, approveProperty, requestPropertyChanges, rejectProperty } from "@/lib/api";
import { Property } from "@/types/property";

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [verificationFilter, setVerificationFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [modalProperty, setModalProperty] = useState<Property | null>(null);
  const [modalMode, setModalMode] = useState<"approve" | "changes" | "reject" | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const fetchProperties = () => {
    setLoading(true);
    listAdminProperties({
      verificationStatus: verificationFilter !== "all" ? verificationFilter : undefined,
      page: 1,
      pageSize: 30,
    })
      .then((res) => {
        if (res && Array.isArray(res.content)) {
          setProperties(res.content);
        } else if (Array.isArray(res)) {
          setProperties(res);
        } else {
          setProperties([]);
        }
      })
      .catch((err) => console.warn("Fetch admin properties error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProperties();
  }, [verificationFilter]);

  const handleExecuteModalAction = async () => {
    if (!modalProperty || !modalMode) return;
    setActionLoadingId(modalProperty.id);

    try {
      if (modalMode === "approve") {
        await approveProperty(modalProperty.id, noteInput);
        alert(`Property "${modalProperty.title}" approved!`);
      } else if (modalMode === "changes") {
        await requestPropertyChanges(modalProperty.id, noteInput);
        alert("Requested changes from host.");
      } else if (modalMode === "reject") {
        await rejectProperty(modalProperty.id, noteInput);
        alert("Property listing rejected.");
      }
      setModalProperty(null);
      setModalMode(null);
      setNoteInput("");
      fetchProperties();
    } catch (err: any) {
      alert("Action failed: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-950">Property Verification Queue</h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">Review host submissions and control property listing status</p>
          </div>

          <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
            {["pending", "approved", "changes_required", "rejected", "all"].map((status) => (
              <button
                key={status}
                onClick={() => setVerificationFilter(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                  verificationFilter === status ? "bg-black text-white" : "text-zinc-600 hover:text-black"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <GlassCard className="border border-zinc-200">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading properties queue...</div>
          ) : properties.length > 0 ? (
            <div className="divide-y divide-zinc-200">
              {properties.map((p) => (
                <div key={p.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="clay-badge px-2.5 py-0.5 text-[10px] font-bold uppercase">{p.propertyType || "Flat"}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        p.verificationStatus === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.verificationStatus === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-900 animate-pulse"
                      }`}>
                        {p.verificationStatus || "Pending"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-950">{p.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      📍 {p.city}, {p.area} • Host ID: <span className="font-mono text-zinc-700">{p.hostId}</span> • Price: ₹{p.price || p.pricePerNight || 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setModalProperty(p); setModalMode("approve"); setNoteInput(""); }}
                      disabled={actionLoadingId === p.id}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => { setModalProperty(p); setModalMode("changes"); setNoteInput(""); }}
                      disabled={actionLoadingId === p.id}
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✏ Request Changes
                    </button>
                    <button
                      onClick={() => { setModalProperty(p); setModalMode("reject"); setNoteInput(""); }}
                      disabled={actionLoadingId === p.id}
                      className="rounded-xl border border-zinc-300 hover:bg-red-50 text-red-700 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-zinc-400">
              No properties found matching status filter "{verificationFilter}".
            </div>
          )}
        </GlassCard>

        {/* Verification Note Modal */}
        {modalProperty && modalMode && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
              <h3 className="text-base font-black text-zinc-950 capitalize">
                {modalMode} Property: {modalProperty.title}
              </h3>
              <p className="text-xs text-zinc-500">
                Provide an administrative note or feedback reason for the host:
              </p>
              <textarea
                rows={3}
                placeholder={modalMode === "reject" ? "Reason for rejection..." : "Note to host..."}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full p-3 text-xs border border-zinc-300 rounded-xl focus:border-black outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setModalProperty(null); setModalMode(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteModalAction}
                  disabled={actionLoadingId === modalProperty.id}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
