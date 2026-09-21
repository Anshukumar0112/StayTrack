"use client";

import { useState } from "react";

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
          <div className="h-80 sm:h-96 w-full rounded-3xl bg-zinc-100 border border-zinc-200 overflow-hidden relative shadow-md">
            <img
              src={galleryImages[activeIdx]}
              alt={title}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <span className="clay-badge px-3 py-1 text-xs font-extrabold">Verified Listing</span>
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">₹0 Brokerage</span>
            </div>
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`h-20 w-28 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                    activeIdx === i ? "border-black scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`${title} ${i}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="h-80 w-full rounded-3xl bg-zinc-100 border border-zinc-200 flex items-center justify-center relative overflow-hidden">
          <div className="relative z-10 text-center">
            <span className="text-6xl">🏡</span>
            <p className="text-xs font-bold text-zinc-700 mt-3">Verified Property Photo</p>
          </div>

          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <span className="clay-badge px-3 py-1 text-xs font-extrabold">Verified Listing</span>
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">₹0 Brokerage</span>
          </div>
        </div>
      )}
    </div>
  );
}
