/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { getHostBookings, getHostVisits, getMyProperties } from "@/lib/api";
import { Booking, getBookingId, getBookingStatus } from "@/types/booking";
import { VisitBooking } from "@/types/visit";
import { Property } from "@/types/property";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Building2Icon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
} from "@/components/ui/Icons";

export default function HostCalendarPage() {
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/host/calendar", "host");
    } else if (firebaseUser) {
      setLoading(true);
      Promise.allSettled([getHostBookings(), getHostVisits(), getMyProperties()])
        .then(([bRes, vRes, pRes]) => {
          if (bRes.status === "fulfilled" && Array.isArray(bRes.value)) {
            setBookings(bRes.value);
          }
          if (vRes.status === "fulfilled" && Array.isArray(vRes.value)) {
            setVisits(vRes.value);
          }
          if (pRes.status === "fulfilled" && Array.isArray(pRes.value)) {
            setProperties(pRes.value);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [firebaseUser, authLoading]);

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Filter bookings by selected property
  const filteredBookings = useMemo(() => {
    if (selectedPropertyId === "all") return bookings;
    return bookings.filter((b) => b.propertyId === selectedPropertyId);
  }, [bookings, selectedPropertyId]);

  const filteredVisits = useMemo(() => {
    if (selectedPropertyId === "all") return visits;
    return visits.filter((v) => v.propertyId === selectedPropertyId);
  }, [visits, selectedPropertyId]);

  // Check what events are on a specific day of the month
  const getEventsForDay = (dayNum: number) => {
    const dayDate = new Date(year, month, dayNum);
    const dayStr = dayDate.toISOString().split("T")[0];

    const dayBookings = filteredBookings.filter((b) => {
      const start = b.startDate ? b.startDate.slice(0, 10) : "";
      const end = b.endDate ? b.endDate.slice(0, 10) : "";
      if (start === dayStr || end === dayStr) return true;
      if (start && end && dayStr >= start && dayStr <= end) return true;
      return false;
    });

    const dayVisits = filteredVisits.filter((v) => {
      const vDate = v.visitDate ? v.visitDate.slice(0, 10) : "";
      return vDate === dayStr;
    });

    return { bookings: dayBookings, visits: dayVisits };
  };

  // Events for currently selected date
  const selectedDateEvents = useMemo(() => {
    const dayStr = selectedDate.toISOString().split("T")[0];

    const dayBookings = filteredBookings.filter((b) => {
      const start = b.startDate ? b.startDate.slice(0, 10) : "";
      const end = b.endDate ? b.endDate.slice(0, 10) : "";
      if (start === dayStr || end === dayStr) return true;
      if (start && end && dayStr >= start && dayStr <= end) return true;
      return false;
    });

    const dayVisits = filteredVisits.filter((v) => {
      const vDate = v.visitDate ? v.visitDate.slice(0, 10) : "";
      return vDate === dayStr;
    });

    return { bookings: dayBookings, visits: dayVisits };
  }, [selectedDate, filteredBookings, filteredVisits]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton
            fallbackUrl="/host"
            label="Back to Dashboard"
            className="text-xs font-semibold mb-2"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Host Calendar</h1>
          <p className="text-xs text-muted font-medium mt-1">
            Track reservations, scheduled guest visits, and property occupancy schedules
          </p>
        </div>

        {/* Property Filter */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-primary shadow-2xs"
          >
            <option value="all">All Properties ({properties.length})</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || `Property #${p.id}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={goToToday}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-surface-muted hover:bg-border/60 border border-border text-foreground transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-subtle">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted">Loading calendar schedule...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid (2 Cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-4">
            {/* Month Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-extrabold text-foreground">
                {monthNames[month]} {year}
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted uppercase">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[85px] rounded-xl bg-surface-muted/30" />
              ))}

              {/* Days of Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(year, month, dayNum);
                const isSelected = isSameDay(cellDate, selectedDate);
                const isToday = isSameDay(cellDate, new Date());
                const { bookings: dayBookings, visits: dayVisits } = getEventsForDay(dayNum);
                const hasEvents = dayBookings.length > 0 || dayVisits.length > 0;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => setSelectedDate(cellDate)}
                    className={`min-h-[70px] sm:min-h-[85px] p-2 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : isToday
                        ? "border-border bg-surface font-extrabold shadow-2xs"
                        : "border-border/60 hover:border-border hover:bg-surface-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold leading-none ${
                          isToday
                            ? "w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center -ml-0.5"
                            : isSelected
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>

                    {/* Event Indicators */}
                    <div className="space-y-1 w-full overflow-hidden mt-1">
                      {dayBookings.slice(0, 2).map((b, bIdx) => {
                        const st = getBookingStatus(b);
                        const isConfirmed = st === "confirmed" || b.paymentStatus === "captured";
                        return (
                          <div
                            key={bIdx}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${
                              isConfirmed
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {b.guestName ? b.guestName.split(" ")[0] : "Booking"}
                          </div>
                        );
                      })}
                      {dayVisits.slice(0, 1).map((v, vIdx) => (
                        <div
                          key={`v-${vIdx}`}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate bg-sky-100 text-sky-800"
                        >
                          Visit
                        </div>
                      ))}
                      {(dayBookings.length > 2 || (dayBookings.length + dayVisits.length > 2)) && (
                        <span className="text-[9px] font-extrabold text-muted block pl-1">
                          +{dayBookings.length + dayVisits.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted pt-3 border-t border-border flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Confirmed Stay</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Pending Booking</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>Scheduled Visit</span>
              </span>
            </div>
          </div>

          {/* Selected Date Details Panel (1 Col) */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-4">
              <div className="border-b border-border pb-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Selected Schedule
                </span>
                <h3 className="text-base font-extrabold text-foreground mt-0.5">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
              </div>

              {selectedDateEvents.bookings.length === 0 && selectedDateEvents.visits.length === 0 ? (
                <div className="py-10 text-center text-xs font-semibold text-muted">
                  <CalendarDaysIcon className="w-8 h-8 text-muted/60 mx-auto mb-2" />
                  <span>No check-ins or visits scheduled for this date.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Bookings on this date */}
                  {selectedDateEvents.bookings.map((b, idx) => {
                    const st = getBookingStatus(b);
                    const bId = getBookingId(b);
                    const isConfirmed = st === "confirmed" || b.paymentStatus === "captured";

                    return (
                      <div
                        key={bId || idx}
                        className="p-3.5 rounded-xl border border-border bg-surface-muted/50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isConfirmed
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isConfirmed ? "Confirmed Stay" : "Pending Approval"}
                          </span>
                          <span className="font-mono text-[11px] text-muted">
                            #{bId.slice(0, 6)}
                          </span>
                        </div>

                        <div className="font-extrabold text-foreground text-sm">
                          {b.propertyTitle || "Property Reservation"}
                        </div>

                        <div className="flex items-center gap-2 text-muted">
                          <UserIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Guest: {b.guestName || b.userName || "Verified Guest"}</span>
                        </div>

                        <div className="flex items-center gap-2 text-muted">
                          <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Dates: {b.startDate} – {b.endDate}</span>
                        </div>

                        <div className="pt-1">
                          <Link
                            href={`/host/bookings/${bId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          >
                            <span>View Full Reservation →</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {/* Visits on this date */}
                  {selectedDateEvents.visits.map((v, idx) => (
                    <div
                      key={v.id || idx}
                      className="p-3.5 rounded-xl border border-border bg-sky-50/50 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800">
                          Property Visit
                        </span>
                        <span className="text-[11px] text-muted">{v.timeSlot || "Scheduled"}</span>
                      </div>
                      <div className="font-extrabold text-foreground">
                        {v.propertyTitle || "Scheduled Visit"}
                      </div>
                      <div className="text-muted">Visitor: {v.visitorName || "Prospective Tenant"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Summary Card */}
            <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircleIcon className="w-4 h-4 text-primary" />
                <span>Calendar Sync</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                All confirmed reservations automatically block property availability across StayTrack search and direct bookings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}