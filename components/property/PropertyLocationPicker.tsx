"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { MapPinIcon, ShieldCheckIcon } from "@/components/ui/Icons";

interface PropertyLocationPickerProps {
  city: string;
  latitude?: number;
  longitude?: number;
  onChange: (coords: { latitude?: number; longitude?: number }) => void;
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

const DEFAULT_NCR_CENTER: [number, number] = [28.5355, 77.391];

function getCityCenter(cityStr?: string): [number, number] {
  if (!cityStr) return DEFAULT_NCR_CENTER;
  const key = cityStr.trim().toLowerCase();
  for (const [name, coords] of Object.entries(CITY_COORDINATES)) {
    if (key.includes(name) || name.includes(key)) {
      return coords;
    }
  }
  return DEFAULT_NCR_CENTER;
}

export default function PropertyLocationPicker({
  city,
  latitude,
  longitude,
  onChange,
}: PropertyLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [inputLat, setInputLat] = useState<string>(
    latitude !== undefined && latitude !== null ? String(latitude) : ""
  );
  const [inputLng, setInputLng] = useState<string>(
    longitude !== undefined && longitude !== null ? String(longitude) : ""
  );

  // Sync internal string inputs if parent props change
  useEffect(() => {
    setInputLat(latitude !== undefined && latitude !== null ? String(latitude) : "");
    setInputLng(longitude !== undefined && longitude !== null ? String(longitude) : "");
  }, [latitude, longitude]);

  const hasValidCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0);

  // Inject Leaflet CSS
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  // Initialize and update map
  useEffect(() => {
    let isCancelled = false;

    async function setupMap() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (isCancelled || !mapContainerRef.current) return;

      const cityCenter = getCityCenter(city);
      const initialCenter: [number, number] = hasValidCoords
        ? [latitude as number, longitude as number]
        : cityCenter;
      const initialZoom = hasValidCoords ? 15 : 12;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          scrollWheelZoom: false,
          attributionControl: false,
        });

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: "abcd",
          }
        ).addTo(map);

        map.on("click", (e) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          onChange({ latitude: lat, longitude: lng });
        });

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      const customPinIcon = L.divIcon({
        className: "staytrack-host-pin",
        html: `
          <div style="
            width: 38px;
            height: 38px;
            background-color: #111716;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(17,23,22,0.4);
            border: 2.5px solid white;
            cursor: grab;
          ">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      if (hasValidCoords) {
        const coords: [number, number] = [latitude as number, longitude as number];
        if (!markerRef.current) {
          const marker = L.marker(coords, {
            icon: customPinIcon,
            draggable: true,
          }).addTo(map);

          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            const lat = Number(pos.lat.toFixed(6));
            const lng = Number(pos.lng.toFixed(6));
            onChange({ latitude: lat, longitude: lng });
          });

          markerRef.current = marker;
        } else {
          markerRef.current.setLatLng(coords);
        }
      } else {
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
          markerRef.current = null;
        }
      }
    }

    void setupMap();

    return () => {
      isCancelled = true;
    };
  }, [hasValidCoords, latitude, longitude, city, onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleCenterCity = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const center = getCityCenter(city);
    mapInstanceRef.current.setView(center, 13, { animate: true });
  }, [city]);

  const handleManualCoordinateCommit = useCallback(() => {
    const lat = parseFloat(inputLat.trim());
    const lng = parseFloat(inputLng.trim());

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numeric values for latitude and longitude.");
      return;
    }

    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and +90 degrees.");
      return;
    }

    if (lng < -180 || lng > 180) {
      alert("Longitude must be between -180 and +180 degrees.");
      return;
    }

    const finalLat = Number(lat.toFixed(6));
    const finalLng = Number(lng.toFixed(6));
    onChange({ latitude: finalLat, longitude: finalLng });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([finalLat, finalLng], 15, { animate: true });
    }
  }, [inputLat, inputLng, onChange]);

  const handleClearPin = useCallback(() => {
    onChange({ latitude: undefined, longitude: undefined });
    setInputLat("");
    setInputLng("");
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
            Property Map Location (Interactive Pin)
          </label>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Click on the map or drag the pin to set your exact location.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCenterCity}
            className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2.5 py-1 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white cursor-pointer transition-colors"
          >
            Center on {city || "City"}
          </button>
          {hasValidCoords && (
            <button
              type="button"
              onClick={handleClearPin}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/50 cursor-pointer transition-colors"
            >
              Clear Pin
            </button>
          )}
        </div>
      </div>

      {/* Map Element */}
      <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-zinc-200 shadow-inner bg-zinc-100">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating helper overlay */}
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-zinc-200 px-3 py-1.5 rounded-xl shadow-sm text-[11px] font-medium text-zinc-700 pointer-events-none flex items-center gap-1.5 max-w-[90%]">
          {hasValidCoords ? (
            <>
              <MapPinIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Pin set: {latitude?.toFixed(4)}, {longitude?.toFixed(4)} (Drag to adjust)
              </span>
            </>
          ) : (
            <>
              <MapPinIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Click anywhere on the map to place your property pin</span>
            </>
          )}
        </div>

        {/* Bottom privacy info */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 bg-white/95 backdrop-blur-md border border-zinc-200 px-3 py-1.5 rounded-xl shadow-sm text-[11px] text-zinc-600 flex items-center gap-1.5 pointer-events-none">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
          <span>Guests only see an approximate neighborhood map until booking confirmation.</span>
        </div>
      </div>

      {/* Manual Coordinates Input Strip */}
      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
            Exact Coordinates (Optional Fine-Tuning)
          </span>
          {hasValidCoords && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Pin Configured
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div className="sm:col-span-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude (e.g. 28.4595)"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-900 focus:outline-none focus:border-black"
            />
          </div>
          <div className="sm:col-span-2">
            <input
              type="number"
              step="any"
              placeholder="Longitude (e.g. 77.0266)"
              value={inputLng}
              onChange={(e) => setInputLng(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-900 focus:outline-none focus:border-black"
            />
          </div>
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={handleManualCoordinateCommit}
              className="w-full h-full min-h-[36px] px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
