"use client";

import { useEffect, useState } from "react";
import {
  getMyProperties,
  getHostBookings,
  acceptBooking,
  rejectBooking,
  getEligibility,
  getMySubscription,
} from "@/lib/api";
import { Property } from "@/types/property";
import { Booking } from "@/types/booking";
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  CloseIcon,
  ShieldCheckIcon,
} from "@/components/ui/Icons";

// Host sub-components
import HostWelcome from "@/components/host/HostWelcome";
import HostMetrics from "@/components/host/HostMetrics";
import HostRecentBookings from "@/components/host/HostRecentBookings";
import HostPropertiesList from "@/components/host/HostPropertiesList";
import HostEarningsChart from "@/components/host/HostEarningsChart";
import HostQuickActions from "@/components/host/HostQuickActions";

export default function HostDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string }>({
    eligible: true,
  });
  const [subscription, setSubscription] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchHostData = async () => {
    setLoading(true);
    try {
      const [propsData, bookingsData, eligData, subData] = await Promise.allSettled([
        getMyProperties(),
        getHostBookings(),
        getEligibility(),
        getMySubscription(),
      ]);
      if (propsData.status === "fulfilled" && Array.isArray(propsData.value)) {
        setProperties(propsData.value);
      }
      if (bookingsData.status === "fulfilled" && Array.isArray(bookingsData.value)) {
        setBookings(bookingsData.value);
      }
      if (eligData.status === "fulfilled" && eligData.value) {
        setEligibility(eligData.value);
      }
      if (subData.status === "fulfilled") {
        setSubscription(subData.value);
      }
    } catch (err) {
      console.warn("Host dashboard load warning:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostData();
  }, []);

  const handleAccept = async (bookingId: string) => {
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      await acceptBooking(bookingId);
      setBannerMessage({
        type: "success",
        text: "Booking request accepted! The guest has been notified to complete payment.",
      });
      fetchHostData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept booking request.";
      setBannerMessage({ type: "error", text: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!confirm("Are you sure you want to decline this reservation request?")) return;
    try {
      setActionLoadingId(bookingId);
      setBannerMessage(null);
      await rejectBooking(bookingId);
      setBannerMessage({ type: "success", text: "Reservation request declined." });
      fetchHostData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline booking request.";
      setBannerMessage({ type: "error", text: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Alert Feedback */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
            bannerMessage.type === "success"
              ? "bg-success-light border-success/25 text-success"
              : "bg-error-light border-error/25 text-error"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {bannerMessage.type === "success" ? (
              <CheckCircleIcon className="w-4 h-4 shrink-0 text-success" />
            ) : (
              <AlertTriangleIcon className="w-4 h-4 shrink-0 text-error" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-muted hover:text-foreground cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Welcome Section */}
      <HostWelcome
        eligible={eligibility.eligible}
        ineligibilityReason={eligibility.reason}
      />

      {/* Summary Metric Cards Row */}
      <HostMetrics
        properties={properties}
        bookings={bookings}
        loading={loading}
      />

      {/* Lower Content: Flexbox 2-column on desktop */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left / Main Column: Bookings + Properties */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
          <HostRecentBookings
            bookings={bookings}
            loading={loading}
            actionLoadingId={actionLoadingId}
            onAccept={handleAccept}
            onReject={handleReject}
          />

          <HostPropertiesList
            properties={properties}
            loading={loading}
          />
        </div>

        {/* Right Column: Earnings Chart + Quick Actions + Assurance */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-6">
          <HostEarningsChart
            bookings={bookings}
            loading={loading}
          />

          <HostQuickActions />

          {/* Direct Marketplace Assurance Card */}
          <div className="p-5 rounded-3xl bg-white border border-border shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
              <span>StayTrack Direct Assurance</span>
            </div>
            <ul className="text-[11px] text-muted space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">✓</span>
                <span>100% direct guest reservation with zero middleman deductions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">✓</span>
                <span>Direct settlement into your designated bank account.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">✓</span>
                <span>Set your own accommodation rules and verification criteria.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
