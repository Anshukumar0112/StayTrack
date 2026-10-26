"use client";

import React, { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Property } from "@/types/property";
import { MapPinIcon, ShieldCheckIcon, AlertTriangleIcon, ExternalLinkIcon } from "@/components/ui/Icons";

interface PropertyLocationSectionProps {
  property: Property;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  delhi: [28.6139, 77.209],
  "new delhi": [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  "greater noida": [28.4744, 77.504],
  ghaziabad: [28.6692, 77.4538],
  faridabad: [28.4089, 77.3178],
};

const DEFAULT_CENTER: [number, number] = [28.5355, 77.391]; // Delhi NCR

export default function PropertyLocationSection({
  property,
}: PropertyLocationSectionProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<any>(null);

  const displayCity = property.city || "Delhi NCR";
  const displayArea = property.area || "";

  const hasExactLocation =
    Boolean(property.isExactLocation) &&
    typeof property.latitude === "number" &&
    typeof property.longitude === "number" &&
    !isNaN(property.latitude) &&
    !isNaN(property.longitude) &&
    property.latitude >= -90 &&
    property.latitude <= 90 &&
    property.longitude >= -180 &&
    property.longitude <= 180 &&
    !(property.latitude === 0 && property.longitude === 0);

  const hasApproximateLocation =
    !hasExactLocation &&
    typeof property.approximateLatitude === "number" &&
    typeof property.approximateLongitude === "number" &&
    !isNaN(property.approximateLatitude) &&
    !isNaN(property.approximateLongitude) &&
    property.approximateLatitude >= -90 &&
    property.approximateLatitude <= 90 &&
    property.approximateLongitude >= -180 &&
    property.approximateLongitude <= 180 &&
    !(property.approximateLatitude === 0 && property.approximateLongitude === 0);

  // Determine city-level approximate center if coordinates are missing
  let cityCenter = DEFAULT_CENTER;
  const key = displayCity.toLowerCase().trim();
  for (const [cityName, coords] of Object.entries(CITY_COORDINATES)) {
    if (key.includes(cityName) || cityName.includes(key)) {
      cityCenter = coords;
      break;
    }
  }

  const centerLat = hasExactLocation
    ? (property.latitude as number)
    : hasApproximateLocation
    ? (property.approximateLatitude as number)
    : cityCenter[0];

  const centerLng = hasExactLocation
    ? (property.longitude as number)
    : hasApproximateLocation
    ? (property.approximateLongitude as number)
    : cityCenter[1];

  const zoomLevel = hasExactLocation ? 15 : hasApproximateLocation ? 14 : 12;

  useEffect(() => {
    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (isCancelled || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: zoomLevel,
          scrollWheelZoom: false,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.setView([centerLat, centerLng], zoomLevel);
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Clean up previous markers / circles
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }

      if (hasExactLocation) {
        // Drop pinpoint marker ONLY when caller is authorized for exact location
        const customPinIcon = L.divIcon({
          className: "staytrack-map-pin",
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background-color: #111716;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(17,23,22,0.3);
              border: 2px solid white;
            ">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        markerRef.current = L.marker([centerLat, centerLng], { icon: customPinIcon }).addTo(map);
      } else if (hasApproximateLocation) {
        // Public map: Render approximate neighborhood circle without dropping a pinpoint on the building
        circleRef.current = L.circle([centerLat, centerLng], {
          radius: 750,
          color: "#111716",
          fillColor: "#111716",
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: "5, 5",
        }).addTo(map);
      }
    }

    void initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng, zoomLevel, hasExactLocation, hasApproximateLocation]);

  const googleMapsUrl = hasExactLocation
    ? `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${displayArea ? displayArea + ", " : ""}${displayCity}, India`)}`;

  return (
    <section id="location" className="pb-8 border-b border-border/70 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Where you&apos;ll be
          </h2>
          <p className="text-xs text-muted flex items-center gap-1.5 font-medium mt-0.5">
            <MapPinIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {displayArea ? `${displayArea}, ` : ""}
              {displayCity}, India
            </span>
          </p>
        </div>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors self-start sm:self-auto bg-surface px-3 py-1.5 rounded-full border border-border shadow-2xs hover:bg-surface-muted"
        >
          <span>Open in Google Maps</span>
          <ExternalLinkIcon className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Confirmed Street Address Banner (Only visible to host, admin, or confirmed guests) */}
      {property.address && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 text-xs flex items-start gap-3 shadow-2xs">
          <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
            <MapPinIcon className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="space-y-0.5">
            <p className="font-extrabold uppercase tracking-wide text-[11px] text-emerald-800">
              Confirmed Street Address
            </p>
            <p className="font-bold text-foreground text-xs sm:text-sm">
              {property.address}
            </p>
            <p className="text-[11px] text-emerald-700">
              Visible only to you as the host, admin, or confirmed guest for this stay.
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-72 sm:h-96 rounded-3xl overflow-hidden border border-border/80 shadow-subtle bg-surface-muted">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Location Status Overlay Badge */}
        {hasExactLocation ? (
          <div className="absolute bottom-3 left-3 z-20 bg-surface/95 backdrop-blur-md border border-emerald-200/80 px-3 py-1.5 rounded-xl shadow-md text-[11px] text-emerald-950 flex items-center gap-1.5 pointer-events-none">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Exact building location confirmed. Directions unlocked.</span>
          </div>
        ) : hasApproximateLocation ? (
          <div className="absolute bottom-3 left-3 z-20 bg-surface/95 backdrop-blur-md border border-border px-3 py-1.5 rounded-xl shadow-md text-[11px] text-zinc-700 flex items-center gap-1.5 pointer-events-none">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Approximate neighborhood shown ({displayCity}, India). Exact map pin provided upon booking confirmation.</span>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 z-20 bg-surface/95 backdrop-blur-md border border-amber-200/80 px-3 py-1.5 rounded-xl shadow-md text-[11px] text-zinc-700 flex items-center gap-1.5 pointer-events-none">
            <MapPinIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Approximate area shown ({displayCity}, India). Exact map pin not specified by host.</span>
          </div>
        )}
      </div>
    </section>
  );
}

