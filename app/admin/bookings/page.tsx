"use client";

import { useEffect, useState, useMemo } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { listAdminBookings, cancelAdminBooking } from "@/lib/api";
import {
  CalendarDaysIcon,
  SearchIcon,
  CloseIcon,
  AlertTriangleIcon,
  CheckIcon,
  MapPinIcon,
  CreditCardIcon,
  Building2Icon,
} from "@/components/ui/Icons";
import { formatCurrency } from "@/lib/utils";

type BookingTab = "all" | "confirmed" | "payment_pending" | "requested" | "completed" | "cancelled";

const TABS: { key: BookingTab; label: string }[] = [
  { key: "all", label: "All Bookings" },
  { key: "confirmed", label: "Confirmed" },
  { key: "payment_pending", label: "Pending Payment" },
  { key: "requested", label: "Requested" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled / Rejected" },
];

export default function AdminBookingsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BookingTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cancellation Modal
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Details Modal
  const [detailModalBooking, setDetailModalBooking] = useState<any | null>(null);

  const fetchBookings = () => {
    if (!isAdmin) return;
    setLoading(true);
    setFetchError(null);
    listAdminBookings({
      status: activeTab === "all" ? undefined : activeTab,
      pageSize: 100,
    })
      .then((res) => {
        const list = res?.bookings || res?.content || res?.data || (Array.isArray(res) ? res : []);
        setBookings(Array.isArray(list) ? list : []);
      })
      .catch((err: any) => {
        console.warn("Notice: fetch admin bookings:", err?.message);
        setFetchError(err?.message || "Unable to fetch bookings from server");
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchBookings();
    }
  }, [isAdmin, activeTab]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter((b) => {
      const id = String(b.bookingId || b.id || "").toLowerCase();
      const customerId = String(b.customerId || "").toLowerCase();
      const customerName = String(b.customerName || b.guestName || "").toLowerCase();
      const hostId = String(b.hostId || "").toLowerCase();
      const propTitle = String(b.propertyTitle || b.title || "").toLowerCase();
      const status = String(b.bookingStatus || b.status || "").toLowerCase();
      return (
        id.includes(q) ||
        customerId.includes(q) ||
        customerName.includes(q) ||
        hostId.includes(q) ||
        propTitle.includes(q) ||
        status.includes(q)
      );
    });
  }, [bookings, searchQuery]);

  const stats = useMemo(() => {
    let confirmed = 0;
    let pendingPayment = 0;
    let requested = 0;
    let completed = 0;
    let cancelled = 0;

    bookings.forEach((b) => {
      const st = String(b.bookingStatus || b.status || "").toLowerCase();
      if (st === "confirmed") confirmed++;
      else if (st === "payment_pending" || st === "accepted") pendingPayment++;
      else if (st === "requested") requested++;
      else if (st === "completed") completed++;
      else if (st === "cancelled" || st === "rejected") cancelled++;
    });

    return {
      total: bookings.length,
      confirmed,
      pendingPayment,
      requested,
      completed,
      cancelled,
    };
  }, [bookings]);

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    const bookingId = cancelModalBooking.bookingId || cancelModalBooking.id;
    setActionLoadingId(bookingId);
    try {
      await cancelAdminBooking(bookingId, cancelReason || "Cancelled by platform administrator");
      setCancelModalBooking(null);
      setCancelReason("");
      fetchBookings();
    } catch (err: any) {
      alert(`Failed to cancel booking: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (guardLoading || !isAdmin) {
    return (
      <div className="py-24 flex items-center justify-center text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-zinc-950">Platform Bookings Console</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Audit customer reservations, monitor payment transitions, and resolve host-guest disputes across all accommodations
        </p>
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <GlassCard className="p-4 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Bookings</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{stats.total}</p>
        </GlassCard>
        <GlassCard className="p-4 border border-emerald-200 bg-emerald-50/30">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Confirmed</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{stats.confirmed}</p>
        </GlassCard>
        <GlassCard className="p-4 border border-amber-200 bg-amber-50/30">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Pay</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{stats.pendingPayment}</p>
        </GlassCard>
        <GlassCard className="p-4 border border-blue-200 bg-blue-50/30">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Requested</p>
          <p className="text-2xl font-black text-blue-900 mt-1">{stats.requested}</p>
        </GlassCard>
        <GlassCard className="p-4 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-zinc-800 mt-1">{stats.completed}</p>
        </GlassCard>
        <GlassCard className="p-4 border border-rose-200 bg-rose-50/30">
          <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Cancelled</p>
          <p className="text-2xl font-black text-rose-900 mt-1">{stats.cancelled}</p>
        </GlassCard>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200 overflow-x-auto w-full sm:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white text-zinc-950 shadow-xs border border-zinc-200"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ID, guest, host, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
          />
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-zinc-400">Loading platform bookings...</div>
      ) : fetchError ? (
        <GlassCard className="p-12 text-center border border-amber-200 bg-amber-50/20 space-y-3">
          <AlertTriangleIcon className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900">Bookings Sync Notice</h3>
          <p className="text-xs text-zinc-600 max-w-md mx-auto">{fetchError}</p>
          <button
            type="button"
            onClick={fetchBookings}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </GlassCard>
      ) : filteredBookings.length === 0 ? (
        <GlassCard className="p-12 text-center border border-zinc-200 space-y-2">
          <CalendarDaysIcon className="w-8 h-8 text-zinc-400 mx-auto" />
          <p className="text-sm font-bold text-zinc-800">No bookings found</p>
          <p className="text-xs text-zinc-500">
            {searchQuery ? `No reservations matching "${searchQuery}"` : "No bookings recorded in this category yet"}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const bookingId = b.bookingId || b.id;
            const status = String(b.bookingStatus || b.status || "requested").toLowerCase();
            const paymentStatus = String(b.paymentStatus || "pending").toLowerCase();
            const amount = Number(b.totalAmount || b.amount || b.totalPrice || 0);
            const isCancelled = status === "cancelled" || status === "rejected";

            return (
              <GlassCard
                key={bookingId}
                className="p-5 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Section: Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                      #{bookingId}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : status === "payment_pending" || status === "accepted"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : status === "completed"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : isCancelled
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-300"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </span>

                    {/* Payment Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        paymentStatus === "captured"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : paymentStatus === "cancelled" || paymentStatus === "refunded"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-zinc-50 text-zinc-600 border border-zinc-200"
                      }`}
                    >
                      Pay: {paymentStatus}
                    </span>
                  </div>

                  {/* Property & Dates */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-700 pt-1">
                    <span className="font-bold text-zinc-950 text-sm flex items-center gap-1">
                      <Building2Icon className="w-3.5 h-3.5 text-zinc-400" />
                      {b.propertyTitle || "Stay Accommodation"}
                    </span>
                    {(b.startDate || b.checkInDate) && (
                      <span className="text-zinc-500 font-medium">
                        📅 {b.startDate || b.checkInDate} → {b.endDate || b.checkOutDate}
                      </span>
                    )}
                    {b.guestsCount && (
                      <span className="text-zinc-500 font-medium">👥 {b.guestsCount} guests</span>
                    )}
                  </div>

                  {/* Customer & Host IDs */}
                  <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-zinc-500">
                    <span>
                      Guest: <strong className="text-zinc-700">{b.customerName || b.customerId || "Verified Guest"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Host ID: <strong className="text-zinc-700">{b.hostId || "N/A"}</strong>
                    </span>
                  </div>

                  {/* Cancellation Reason if present */}
                  {b.adminCancellationReason && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-center gap-1.5 mt-1">
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Admin reason: {b.adminCancellationReason}</span>
                    </div>
                  )}
                </div>

                {/* Right Section: Price & Action Buttons */}
                <div className="flex items-center gap-3 md:self-center shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Total Amount</p>
                    <p className="text-base font-black text-zinc-950">{formatCurrency(amount)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailModalBooking(b)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Details
                  </button>

                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelModalBooking(b);
                        setCancelReason("");
                      }}
                      disabled={actionLoadingId === bookingId}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === bookingId ? "Cancelling..." : "Cancel Dispute"}
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="text-base font-extrabold text-zinc-950">Reservation Audit Sheet</h3>
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 rounded-2xl">
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Booking ID</span>
                  <span className="font-mono font-bold text-zinc-900">{detailModalBooking.bookingId || detailModalBooking.id}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Status</span>
                  <span className="font-bold text-zinc-900 capitalize">{detailModalBooking.bookingStatus || detailModalBooking.status}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Guest ID</span>
                  <span className="font-mono text-zinc-700 truncate block">{detailModalBooking.customerId}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Host ID</span>
                  <span className="font-mono text-zinc-700 truncate block">{detailModalBooking.hostId}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl space-y-1">
                <span className="text-zinc-400 block text-[10px] font-bold uppercase">Property</span>
                <p className="font-bold text-zinc-950">{detailModalBooking.propertyTitle || "Stay Listing"}</p>
                <p className="text-zinc-500 text-[11px] font-mono">Property ID: {detailModalBooking.propertyId}</p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Check In</span>
                  <span className="font-bold text-zinc-900">{detailModalBooking.startDate || detailModalBooking.checkInDate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Check Out</span>
                  <span className="font-bold text-zinc-900">{detailModalBooking.endDate || detailModalBooking.checkOutDate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Payment Mode</span>
                  <span className="font-bold text-zinc-900 uppercase">{detailModalBooking.paymentMethod || "Razorpay"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase">Payment Status</span>
                  <span className="font-bold text-zinc-900 uppercase">{detailModalBooking.paymentStatus || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-950">Cancel Reservation via Admin Override</h3>
              <p className="text-xs text-zinc-500 mt-1">
                This will mark the reservation as cancelled, update payment status, and notify both guest and host.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Cancellation Reason</label>
              <textarea
                rows={3}
                placeholder="E.g., Host uncontactable, Guest disputed payment, Double-booking..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 rounded-2xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={actionLoadingId !== null}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId !== null ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
