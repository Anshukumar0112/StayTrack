"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import {
  listAdminProperties,
  approveProperty,
  requestPropertyChanges,
  rejectProperty,
  updatePropertyAssignment,
  updatePropertyListingStatus,
  deleteAdminProperty,
} from "@/lib/api";
import { Property } from "@/types/property";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  StarIcon,
  Building2Icon,
  MapPinIcon,
  CheckIcon,
  EditIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  AlertTriangleIcon,
} from "@/components/ui/Icons";

const TABS = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "changes_required", label: "Changes Required" },
  { key: "rejected", label: "Rejected" },
  { key: "pending", label: "Pending" },
];

type ModalMode = "approve" | "changes" | "reject" | "hide" | "activate" | "delete";

export default function AdminPropertiesPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [properties, setProperties] = useState<Property[]>([]);
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [modalProperty, setModalProperty] = useState<Property | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const fetchProperties = () => {
    if (!isAdmin) return;
    setLoading(true);
    listAdminProperties({
      verificationStatus: verificationFilter !== "all" ? verificationFilter : undefined,
      page: 1,
      pageSize: 50,
    })
      .then((res) => {
        const propList = res?.properties || res?.content || res?.data || (Array.isArray(res) ? res : []);
        setProperties(Array.isArray(propList) ? propList : []);
      })
      .catch((err) => console.warn("Fetch admin properties error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchProperties();
    }
  }, [verificationFilter, isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const handleToggleAssignment = async (propertyId: string, assignment: { topVerified?: boolean; showInStay?: boolean }) => {
    setActionLoadingId(propertyId);
    try {
      await updatePropertyAssignment(propertyId, assignment);
      fetchProperties();
    } catch (err: any) {
      alert("Failed to update property assignment: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenModal = (property: Property, mode: ModalMode) => {
    setModalProperty(property);
    setModalMode(mode);
    setNoteInput("");
  };

  const handleExecuteModalAction = async () => {
    if (!modalProperty || !modalMode) return;
    const propId = modalProperty.id || modalProperty.propertyId || "";
    if (!propId) return;

    if (
      (modalMode === "changes" || modalMode === "reject" || modalMode === "hide" || modalMode === "delete") &&
      !noteInput.trim()
    ) {
      alert("Please provide a reason/note for this administrative action.");
      return;
    }

    setActionLoadingId(propId);

    try {
      if (modalMode === "approve") {
        await approveProperty(propId, noteInput);
      } else if (modalMode === "changes") {
        await requestPropertyChanges(propId, noteInput);
      } else if (modalMode === "reject") {
        await rejectProperty(propId, noteInput);
      } else if (modalMode === "hide") {
        await updatePropertyListingStatus(propId, "hidden", noteInput);
      } else if (modalMode === "activate") {
        await updatePropertyListingStatus(propId, "active", noteInput);
      } else if (modalMode === "delete") {
        await deleteAdminProperty(propId, noteInput);
      }

      setModalProperty(null);
      setModalMode(null);
      setNoteInput("");
      fetchProperties();
    } catch (err: any) {
      alert("Action failed: " + (err.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const getEmptyMessage = (filter: string) => {
    switch (filter) {
      case "approved":
        return "No approved properties found.";
      case "changes_required":
        return "No properties requiring changes found.";
      case "rejected":
        return "No rejected properties found.";
      case "pending":
        return "No properties awaiting verification found.";
      case "all":
      default:
        return "No properties found.";
    }
  };

  const getModalTitle = (mode: ModalMode) => {
    switch (mode) {
      case "approve":
        return "Approve Property";
      case "changes":
        return "Request Changes for Property";
      case "reject":
        return "Reject Property";
      case "hide":
        return "Hide Property Listing";
      case "activate":
        return "Activate Property Listing";
      case "delete":
        return "Delete Property Listing";
    }
  };

  const getModalPrompt = (mode: ModalMode) => {
    switch (mode) {
      case "changes":
        return "Specify what changes or corrections the host must make before re-verification (sent to host):";
      case "reject":
        return "Specify the reason for rejecting this property listing (sent to host):";
      case "hide":
        return "Specify the reason for hiding this listing from public view (sent to host):";
      case "activate":
        return "Provide an optional note for activating this listing:";
      case "delete":
        return "Specify the reason for deleting this property listing (sent to host):";
      case "approve":
      default:
        return "Provide an optional approval note for the host:";
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">Property Management</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Manage property lifecycle, verification, visibility, and section assignments
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-xl flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setVerificationFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                verificationFilter === tab.key ? "bg-black text-white" : "text-zinc-600 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="border border-zinc-200">
        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading properties...</div>
        ) : properties.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {properties.map((p, idx) => {
              const targetId = p.id || p.propertyId || `prop_${idx}`;
              const vStatus = (p.verificationStatus || "pending").toLowerCase();
              const lStatus = (p.listingStatus || "hidden").toLowerCase();
              const isApproved = vStatus === "approved";

              return (
                <div key={targetId} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="clay-badge px-2.5 py-0.5 text-[10px] font-bold uppercase">{p.propertyType || "Flat"}</span>

                      {/* Canonical Verification Status Badge */}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          vStatus === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : vStatus === "rejected"
                            ? "bg-red-100 text-red-800"
                            : vStatus === "changes_required"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-yellow-100 text-yellow-800 animate-pulse"
                        }`}
                      >
                        {vStatus.replace("_", " ")}
                      </span>

                      {/* Listing Visibility Pill */}
                      <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-zinc-200">
                        {lStatus}
                      </span>

                      {p.topVerified && (
                        <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <StarIcon className="w-3 h-3 text-white" />
                          <span>Top Verified</span>
                        </span>
                      )}
                      {p.showInStay && (
                        <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Building2Icon className="w-3 h-3 text-white" />
                          <span>Stay Section</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-zinc-950">{p.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>{p.city}, {p.area}</span>
                      </span>{" "}
                      • Host ID: <span className="font-mono text-zinc-700">{p.hostId}</span> • Price: ₹
                      {p.price || p.pricePerNight || 0}
                    </p>

                    {/* Section Assignment Toggles */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => handleToggleAssignment(targetId, { topVerified: !p.topVerified })}
                        disabled={actionLoadingId === targetId}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          p.topVerified
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                        }`}
                        title="Toggle Top Verified section assignment"
                      >
                        <StarIcon className="w-3 h-3 shrink-0" />
                        <span>{p.topVerified ? "Remove Top Verified" : "Assign Top Verified"}</span>
                      </button>
                      <button
                        onClick={() => handleToggleAssignment(targetId, { showInStay: !p.showInStay })}
                        disabled={actionLoadingId === targetId}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          p.showInStay
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                        }`}
                        title="Toggle Stay section assignment"
                      >
                        <Building2Icon className="w-3 h-3 shrink-0" />
                        <span>{p.showInStay ? "Remove Stay Section" : "Assign Stay Section"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Comprehensive Action Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isApproved && (
                      <button
                        onClick={() => handleOpenModal(p, "approve")}
                        disabled={actionLoadingId === targetId}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenModal(p, "changes")}
                      disabled={actionLoadingId === targetId}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>

                    {!isApproved && (
                      <button
                        onClick={() => handleOpenModal(p, "reject")}
                        disabled={actionLoadingId === targetId}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 hover:bg-red-50 text-red-700 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => handleOpenModal(p, lStatus === "active" ? "hide" : "activate")}
                        disabled={actionLoadingId === targetId}
                        className={`inline-flex items-center gap-1.5 rounded-xl font-bold text-xs px-3 py-2 transition-all cursor-pointer border ${
                          lStatus === "active"
                            ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        }`}
                      >
                        {lStatus === "active" ? (
                          <>
                            <EyeOffIcon className="w-3.5 h-3.5" />
                            <span>Hide Listing</span>
                          </>
                        ) : (
                          <>
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>Activate Listing</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenModal(p, "delete")}
                      disabled={actionLoadingId === targetId}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 hover:bg-red-100 text-red-800 font-bold text-xs px-3 py-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <TrashIcon className="w-3.5 h-3.5 text-red-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs font-semibold text-zinc-400">
            {getEmptyMessage(verificationFilter)}
          </div>
        )}
      </GlassCard>

      {/* Action Dialog Modal */}
      {modalProperty && modalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-zinc-950">
              {getModalTitle(modalMode)}: {modalProperty.title}
            </h3>

            {modalMode === "delete" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-800 flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>WARNING: This will permanently remove the listing from StayTrack. Host will be notified.</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-zinc-600 font-semibold">{getModalPrompt(modalMode)}</p>
              <textarea
                rows={3}
                placeholder={
                  modalMode === "changes"
                    ? "e.g., Please update property photos and correct room pricing..."
                    : modalMode === "reject"
                    ? "e.g., Property address does not match submitted documents..."
                    : modalMode === "hide"
                    ? "e.g., Temporarily hidden for safety inspection..."
                    : modalMode === "delete"
                    ? "e.g., Duplicate property listing..."
                    : "Optional note for host..."
                }
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full p-3 text-xs border border-zinc-300 rounded-xl focus:border-black outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setModalProperty(null);
                  setModalMode(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteModalAction}
                disabled={
                  actionLoadingId === (modalProperty.id || modalProperty.propertyId) ||
                  ((modalMode === "changes" || modalMode === "reject" || modalMode === "hide" || modalMode === "delete") &&
                    !noteInput.trim())
                }
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                  modalMode === "delete" || modalMode === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-zinc-800"
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
