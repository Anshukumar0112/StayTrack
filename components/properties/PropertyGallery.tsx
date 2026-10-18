"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BadgeCheckIcon,
  Building2Icon,
  CameraIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";

interface PropertyGalleryProps {
  images?: string[];
  title: string;
  isVerified?: boolean;
  propertyType?: string;
}

export default function PropertyGallery({
  images,
  title,
  isVerified = false,
  propertyType,
}: PropertyGalleryProps) {
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [mobileIdx, setMobileIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Filter valid authentic images provided by host
  const rawImages = Array.isArray(images) ? images : [];
  const validImages = rawImages.filter(
    (img, idx) =>
      typeof img === "string" && img.trim().length > 0 && !failedIndices.has(idx)
  );

  const handleImageError = (index: number) => {
    setFailedIndices((prev) => {
      const updated = new Set(prev);
      updated.add(index);
      return updated;
    });
  };

  const openLightbox = (index: number) => {
    setLightboxIdx(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextLightbox = useCallback(() => {
    if (validImages.length === 0) return;
    setLightboxIdx((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  const prevLightbox = useCallback(() => {
    if (validImages.length === 0) return;
    setLightboxIdx((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, nextLightbox, prevLightbox]);

  // ==========================================
  // CASE 1: ZERO IMAGES -> COMPACT FALLBACK
  // ==========================================
  if (validImages.length === 0) {
    return (
      <div className="h-56 sm:h-64 w-full rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#F6F5F1] via-[#EFECE5] to-[#E3E0D6] border border-border/80 flex flex-col items-center justify-center relative overflow-hidden shadow-subtle p-6 text-center">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#718D87]/5 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#111716]/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-2.5 max-w-sm">
          <div className="w-13 h-13 rounded-2xl bg-surface border border-border/90 flex items-center justify-center shadow-xs text-primary">
            <Building2Icon className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {propertyType ? `${propertyType} in Delhi NCR` : "Direct Stay Listing"}
            </h3>
            <p className="text-xs text-muted mt-1 font-medium leading-relaxed">
              Authentic property verification on file. Photography will be published shortly by host.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CASE 2: SINGLE IMAGE
  // ==========================================
  if (validImages.length === 1) {
    return (
      <div className="relative w-full">
        <div
          onClick={() => openLightbox(0)}
          className="h-80 sm:h-[440px] w-full rounded-2xl sm:rounded-3xl bg-surface-muted border border-border overflow-hidden relative shadow-subtle group cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={validImages[0]}
            alt={title}
            onError={() => handleImageError(0)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          />

          {/* Top Left Badges */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
            {isVerified && (
              <span className="inline-flex items-center gap-1.5 bg-surface/95 backdrop-blur-md border border-border text-foreground px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                <BadgeCheckIcon className="w-3.5 h-3.5 text-primary" />
                <span>Verified Listing</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 bg-[#111716] text-white px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
              Direct Host
            </span>
          </div>

          <div className="absolute bottom-4 right-4 z-10 bg-[#111716]/80 hover:bg-[#111716] backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all">
            <CameraIcon className="w-3.5 h-3.5" />
            <span>View photo</span>
          </div>
        </div>

        {/* Fullscreen Lightbox */}
        {lightboxOpen && (
          <LightboxModal
            images={validImages}
            title={title}
            currentIndex={lightboxIdx}
            onClose={closeLightbox}
            onNext={nextLightbox}
            onPrev={prevLightbox}
            onSelectIndex={setLightboxIdx}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // CASE 3: MULTI-IMAGE (≥ 2 IMAGES)
  // ==========================================
  return (
    <div className="relative w-full space-y-3">
      {/* ---------------- Desktop Grid ---------------- */}
      <div className="hidden md:block relative">
        {validImages.length >= 5 ? (
          /* 5-Photo Mosaic: 1 Large Hero (Left) + 2x2 Grid (Right) */
          <div className="grid grid-cols-4 grid-rows-2 gap-2.5 h-[440px] rounded-3xl overflow-hidden border border-border/80 shadow-subtle bg-surface-muted">
            {/* Hero Left (takes 2 cols, 2 rows) */}
            <div
              onClick={() => openLightbox(0)}
              className="col-span-2 row-span-2 relative h-full w-full cursor-pointer overflow-hidden group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={validImages[0]}
                alt={`${title} - Primary Photo`}
                onError={() => handleImageError(0)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>

            {/* Supporting Photos (4 on right) */}
            {validImages.slice(1, 5).map((img, i) => {
              const actualIdx = i + 1;
              return (
                <div
                  key={actualIdx}
                  onClick={() => openLightbox(actualIdx)}
                  className="col-span-1 row-span-1 relative h-full w-full cursor-pointer overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${title} - Photo ${actualIdx + 1}`}
                    onError={() => handleImageError(actualIdx)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              );
            })}
          </div>
        ) : validImages.length >= 3 ? (
          /* 3-4 Photos Layout: 1 Hero (Left 60%) + 2 Stacked (Right 40%) */
          <div className="grid grid-cols-3 grid-rows-2 gap-2.5 h-[420px] rounded-3xl overflow-hidden border border-border/80 shadow-subtle bg-surface-muted">
            <div
              onClick={() => openLightbox(0)}
              className="col-span-2 row-span-2 relative h-full w-full cursor-pointer overflow-hidden group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={validImages[0]}
                alt={`${title} - Primary Photo`}
                onError={() => handleImageError(0)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
            {validImages.slice(1, 3).map((img, i) => {
              const actualIdx = i + 1;
              return (
                <div
                  key={actualIdx}
                  onClick={() => openLightbox(actualIdx)}
                  className="col-span-1 row-span-1 relative h-full w-full cursor-pointer overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${title} - Photo ${actualIdx + 1}`}
                    onError={() => handleImageError(actualIdx)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              );
            })}
          </div>
        ) : (
          /* 2 Photos Layout: 50 / 50 */
          <div className="grid grid-cols-2 gap-2.5 h-[400px] rounded-3xl overflow-hidden border border-border/80 shadow-subtle bg-surface-muted">
            {validImages.map((img, i) => (
              <div
                key={i}
                onClick={() => openLightbox(i)}
                className="relative h-full w-full cursor-pointer overflow-hidden group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`${title} - Photo ${i + 1}`}
                  onError={() => handleImageError(i)}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
        )}

        {/* Top-Left Trust Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
          {isVerified && (
            <span className="inline-flex items-center gap-1.5 bg-surface/95 backdrop-blur-md border border-border text-foreground px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
              <BadgeCheckIcon className="w-3.5 h-3.5 text-primary" />
              <span>Verified Listing</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 bg-[#111716] text-white px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
            Direct Host
          </span>
        </div>

        {/* Bottom-Right "Show All Photos" Trigger */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/95 hover:bg-surface text-foreground font-semibold text-xs border border-border shadow-md backdrop-blur-md transition-all cursor-pointer focus-ring"
        >
          <CameraIcon className="w-3.5 h-3.5 text-primary" />
          <span>Show all {validImages.length} photos</span>
        </button>
      </div>

      {/* ---------------- Mobile Carousel View (< md) ---------------- */}
      <div className="md:hidden relative w-full">
        <div
          onClick={() => openLightbox(mobileIdx)}
          className="h-72 sm:h-80 w-full rounded-2xl bg-surface-muted border border-border overflow-hidden relative shadow-subtle group cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={validImages[mobileIdx]}
            alt={`${title} - Photo ${mobileIdx + 1}`}
            onError={() => handleImageError(mobileIdx)}
            className="h-full w-full object-cover"
          />

          {/* Top-Left Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
            {isVerified && (
              <span className="inline-flex items-center gap-1 bg-surface/95 backdrop-blur-md border border-border text-foreground px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs">
                <BadgeCheckIcon className="w-3 h-3 text-primary" />
                <span>Verified</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-[#111716] text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs">
              Direct Host
            </span>
          </div>

          {/* Photo Counter */}
          <div className="absolute bottom-3 right-3 z-10 bg-[#111716]/80 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-xs">
            {mobileIdx + 1} / {validImages.length}
          </div>
        </div>

        {/* Thumbnail Navigator Strip */}
        <div className="flex gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar touch-pan-x">
          {validImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMobileIdx(i)}
              className={`h-14 w-18 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                mobileIdx === i
                  ? "border-[#111716] scale-[1.02] shadow-xs"
                  : "border-border opacity-70 hover:opacity-100"
              }`}
              title={`View photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- Fullscreen Lightbox Modal ---------------- */}
      {lightboxOpen && (
        <LightboxModal
          images={validImages}
          title={title}
          currentIndex={lightboxIdx}
          onClose={closeLightbox}
          onNext={nextLightbox}
          onPrev={prevLightbox}
          onSelectIndex={setLightboxIdx}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// Lightbox Modal for Authentic Image Inspection
// ----------------------------------------------------
interface LightboxModalProps {
  images: string[];
  title: string;
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectIndex: (index: number) => void;
}

function LightboxModal({
  images,
  title,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onSelectIndex,
}: LightboxModalProps) {
  const currentImage = images[currentIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Lightbox Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10">
            {currentIndex + 1} of {images.length}
          </span>
          <span className="text-white/80 text-xs font-medium truncate max-w-xs sm:max-w-md">
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer focus-ring"
          aria-label="Close photo gallery"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Main Image Display Stage */}
      <div className="relative flex-1 flex items-center justify-center py-4 overflow-hidden">
        {images.length > 1 && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 sm:left-6 z-20 h-11 w-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg"
            aria-label="Previous photo"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`${title} - Photo ${currentIndex + 1}`}
          className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl select-none"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 sm:right-6 z-20 h-11 w-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg"
            aria-label="Next photo"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Navigator */}
      <div className="pt-3 border-t border-white/10 shrink-0">
        <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-3xl mx-auto py-1 no-scrollbar">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`h-14 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                currentIndex === idx
                  ? "border-white scale-105 shadow-md"
                  : "border-transparent opacity-50 hover:opacity-100"
              }`}
              title={`View photo ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

