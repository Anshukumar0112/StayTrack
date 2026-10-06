"use client";

import { useState } from "react";
import { BadgeCheckIcon, Building2Icon, ImageOffIcon } from "@/components/ui/Icons";

interface PropertyGalleryProps {
  images?: string[];
  title: string;
}

export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const galleryImages = images && images.length > 0 ? images : [];

  return (
    <div className="space-y-3">
      {galleryImages.length > 0 ? (
        <>
          <div className="h-80 sm:h-96 w-full rounded-3xl bg-surface-muted border border-border overflow-hidden relative shadow-sm">
            <img
              src={galleryImages[activeIdx]}
              alt={title}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <span className="inline-flex items-center gap-1 bg-surface/90 backdrop-blur-md border border-border text-foreground px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                <BadgeCheckIcon className="w-3.5 h-3.5 text-primary" />
                Verified Listing
              </span>
              <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                Direct Host
              </span>
            </div>
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`h-20 w-28 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                    activeIdx === i ? "border-primary scale-105 shadow-xs" : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`${title} ${i}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="h-80 w-full rounded-3xl bg-surface-muted border border-border flex flex-col items-center justify-center relative overflow-hidden text-muted">
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center shadow-xs text-muted">
              <Building2Icon className="w-7 h-7 stroke-[1.5]" />
            </div>
            <p className="text-xs font-semibold text-muted">Property image unavailable</p>
          </div>

          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <span className="inline-flex items-center gap-1 bg-surface/90 backdrop-blur-md border border-border text-foreground px-3 py-1 rounded-full text-xs font-bold shadow-xs">
              <BadgeCheckIcon className="w-3.5 h-3.5 text-primary" />
              Verified Listing
            </span>
            <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-xs">
              Direct Host
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

