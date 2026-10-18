/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import {
  Booking,
  getBookingId,
  getBookingAmount,
  calculateStayDuration,
} from "@/types/booking";
import { createBookingOrder, verifyBookingPayment } from "@/lib/api";
import {
  CreditCardIcon,
  ShieldCheckIcon,
  LockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CloseIcon,
  CalendarDaysIcon,
  Building2Icon,
  MapPinIcon,
  CopyIcon,
  CheckIcon,
} from "@/components/ui/Icons";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type CheckoutState =
  | "review"
  | "initiating"
  | "gateway_open"
  | "verifying"
  | "success"
  | "dismissed"
  | "failed";

export interface CheckoutModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (bookingId: string) => void;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

export default function CheckoutModal({
  booking,
  isOpen,
  onClose,
  onPaymentSuccess,
  userEmail,
  userName,
  userPhone,
}: CheckoutModalProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("review");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copiedRef, setCopiedRef] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset state when a new booking is selected or modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckoutState("review");
      setErrorMessage("");
      setCopiedRef(false);
      setImgError(false);
    }
  }, [isOpen, booking]);

  // Load Razorpay SDK if not present
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!isOpen || !booking) return null;

  const displayId = getBookingId(booking);
  const amount = getBookingAmount(booking);
  const stayDuration = calculateStayDuration(booking);
  const title = booking.propertyTitle || "StayTrack Property";
  const category = booking.propertyType || booking.bookingType || "Stay";
  const location = booking.area
    ? `${booking.area}${booking.city ? `, ${booking.city}` : ""}`
    : booking.city || "Verified Location";
  const photo = booking.propertyImage;

  const handleCopyRef = () => {
    if (!navigator.clipboard || !displayId) return;
    navigator.clipboard.writeText(displayId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleStartPayment = async () => {
    try {
      setCheckoutState("initiating");
      setErrorMessage("");

      // Ensure SDK loaded
      if (!window.Razorpay) {
        let retries = 0;
        while (!window.Razorpay && retries < 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          retries++;
        }
      }

      if (!window.Razorpay) {
        setCheckoutState("failed");
        setErrorMessage("Payment gateway SDK failed to load. Please check your internet connection and retry.");
        return;
      }

      // Backend call - idempotent order creation
      const orderRes = await createBookingOrder(displayId);

      const options = {
        key: orderRes.keyId || orderRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "StayTrack",
        description: `Reservation #${displayId.slice(0, 8)}`,
        order_id: orderRes.orderId || orderRes.id,
        prefill: {
          name: booking.guestName || userName || "",
          email: userEmail || "",
          contact: booking.contactPhone || userPhone || "",
        },
        notes: {
          bookingId: displayId,
          stayDuration,
        },
        theme: {
          color: "#111716",
        },
        modal: {
          ondismiss: function () {
            setCheckoutState("dismissed");
          },
          escape: true,
          backdropclose: false,
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            setCheckoutState("verifying");
            await verifyBookingPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setCheckoutState("success");
            if (onPaymentSuccess) {
              onPaymentSuccess(displayId);
            }
          } catch (err: any) {
            setCheckoutState("failed");
            setErrorMessage(
              err?.message ||
                "Payment was received by the gateway but verification with StayTrack server timed out. Please contact support."
            );
          }
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response: any) {
        setCheckoutState("failed");
        const reason =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment was declined by your bank or the gateway. No funds were captured.";
        setErrorMessage(reason);
      });

      setCheckoutState("gateway_open");
      rzp.open();
    } catch (err: any) {
      setCheckoutState("failed");
      setErrorMessage(err?.message || "Failed to set up checkout order. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-surface-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheckIcon className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 id="checkout-modal-title" className="text-base font-bold text-foreground">
                {checkoutState === "success"
                  ? "Booking Confirmed"
                  : checkoutState === "verifying"
                  ? "Verifying Payment"
                  : checkoutState === "gateway_open"
                  ? "Payment Gateway Active"
                  : checkoutState === "dismissed"
                  ? "Payment Incomplete"
                  : checkoutState === "failed"
                  ? "Payment Issue"
                  : "Secure Checkout"}
              </h2>
              <p className="text-[11px] text-muted font-medium">
                Official 256-bit encrypted Razorpay checkout
              </p>
            </div>
          </div>

          {/* Close Button (disabled while verifying) */}
          {checkoutState !== "verifying" && (
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface-muted transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
              aria-label="Close checkout"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* STATE: SUCCESS */}
          {checkoutState === "success" && (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircleIcon className="w-8 h-8 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Payment Received & Confirmed</h3>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Your reservation is confirmed! The host has been notified of your stay.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-muted border border-border text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-muted">
                  <span>Booking Reference</span>
                  <span className="font-mono font-bold text-foreground">#{displayId.slice(0, 10)}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Amount Paid</span>
                  <span className="font-bold text-foreground">₹{amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Stay Duration</span>
                  <span className="font-medium text-foreground">{stayDuration}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 transition-opacity shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* STATE: VERIFYING */}
          {checkoutState === "verifying" && (
            <div className="text-center py-10 space-y-4 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 animate-spin">
                <CreditCardIcon className="w-7 h-7 stroke-[1.75]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Confirming Payment...</h3>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Verifying cryptographic signature with Razorpay and updating your reservation. Please do not close or reload this window.
                </p>
              </div>
            </div>
          )}

          {/* STATE: INITIATING */}
          {checkoutState === "initiating" && (
            <div className="text-center py-10 space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-surface-muted text-primary flex items-center justify-center mx-auto border border-border animate-pulse">
                <LockIcon className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Connecting to Razorpay...</h3>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Preparing your secure payment session. The checkout gateway will open shortly.
                </p>
              </div>
            </div>
          )}

          {/* STATE: GATEWAY_OPEN */}
          {checkoutState === "gateway_open" && (
            <div className="py-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                <CreditCardIcon className="w-7 h-7 stroke-[1.75]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Razorpay Gateway Open</h3>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Please complete your payment in the Razorpay pop-up window. Your reservation hold is actively preserved.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs text-left flex items-start gap-2.5">
                <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Pop-up not showing?</p>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                    Your browser might have blocked the window. You can reopen the gateway below or cancel to retry.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartPayment}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Reopen Gateway
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutState("dismissed")}
                  className="py-2.5 px-4 rounded-xl bg-surface border border-border text-foreground text-xs font-semibold hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STATE: DISMISSED */}
          {checkoutState === "dismissed" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                  <AlertTriangleIcon className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold">Payment Window Was Closed</h4>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    You closed the payment window before finishing. Don&apos;t worry—your reservation hold is still active and no funds were deducted.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleStartPayment}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCardIcon className="w-4 h-4" />
                  <span>Resume Payment (₹{amount.toLocaleString("en-IN")})</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border text-foreground font-medium text-xs hover:bg-surface-muted transition-colors text-center cursor-pointer"
                >
                  Return to Trips
                </button>
              </div>
            </div>
          )}

          {/* STATE: FAILED */}
          {checkoutState === "failed" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 flex items-start gap-3">
                <div className="p-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5">
                  <AlertTriangleIcon className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold">Payment Could Not Be Completed</h4>
                  <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                    {errorMessage || "The transaction was declined by your bank or the gateway. No charges were made."}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-muted border border-border text-xs text-muted space-y-1">
                <p className="font-semibold text-foreground text-[11px]">Helpful recovery advice:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
                  <li>Verify card limits, UPI balance, or netbanking credentials.</li>
                  <li>Try another payment method (Cards, UPI, or Netbanking).</li>
                  <li>If your account was debited, Razorpay issues automated refunds within 3–5 working days.</li>
                </ul>
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleStartPayment}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCardIcon className="w-4 h-4" />
                  <span>Retry Payment</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface border border-border text-foreground font-medium text-xs hover:bg-surface-muted transition-colors text-center cursor-pointer"
                >
                  Close & Try Later
                </button>
              </div>
            </div>
          )}

          {/* STATE: REVIEW (Default view) */}
          {checkoutState === "review" && (
            <>
              {/* Property Snapshot */}
              <div className="flex gap-3.5 p-3.5 rounded-2xl bg-surface-muted/50 border border-border">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-surface-muted overflow-hidden shrink-0 border border-border relative">
                  {photo && !imgError ? (
                    <img
                      src={photo}
                      alt={title}
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Building2Icon className="w-8 h-8 stroke-[1.5]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
                      {category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">{title}</h3>
                    <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5 truncate">
                      <MapPinIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{location}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <CalendarDaysIcon className="w-3 h-3 text-primary shrink-0" />
                      <span>{stayDuration}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="font-mono text-[10px] hover:text-foreground flex items-center gap-1 cursor-pointer"
                      title="Copy Reference ID"
                    >
                      <span>#{displayId.slice(0, 8)}</span>
                      {copiedRef ? (
                        <CheckIcon className="w-2.5 h-2.5 text-emerald-500" />
                      ) : (
                        <CopyIcon className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground tracking-tight">Price Breakdown</h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Zero Brokerage
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-muted">
                    <span>Base Stay Fee ({stayDuration})</span>
                    <span className="font-semibold text-foreground">₹{amount.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between items-center text-muted">
                    <div className="flex items-center gap-1.5">
                      <span>StayTrack Platform Fee</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Free
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0</span>
                  </div>

                  <div className="flex justify-between items-center text-muted">
                    <span>Security Deposit</span>
                    <span className="font-semibold text-foreground">₹0 (None)</span>
                  </div>

                  <div className="pt-2.5 border-t border-border flex justify-between items-center text-sm font-bold text-foreground">
                    <span>Total Payable</span>
                    <span className="text-base font-extrabold text-foreground">
                      ₹{amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Supported Payment Channels */}
              <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border text-[11px] text-muted space-y-2">
                <div className="flex items-center justify-between text-foreground font-semibold text-xs">
                  <span className="flex items-center gap-1.5">
                    <LockIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Razorpay Certified Partner</span>
                  </span>
                  <span className="text-[10px] text-muted">All Indian Methods</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-medium">UPI (GPay / PhonePe / Paytm)</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-medium">Cards (Visa / MC / RuPay)</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-medium">Netbanking</span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleStartPayment}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCardIcon className="w-4 h-4" />
                  <span>Proceed to Pay ₹{amount.toLocaleString("en-IN")}</span>
                </button>
                <p className="text-[10px] text-center text-muted">
                  By proceeding, you authorize StayTrack to confirm your reservation upon gateway verification.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
