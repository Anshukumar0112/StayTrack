"use client";

import React, { useEffect, useRef } from "react";
import { Property } from "@/types/property";

interface PropertyMapProps {
  properties: Property[];
  activeCity?: string;
  hoveredPropertyId?: string | null;
  onHoverProperty?: (id: string | null) => void;
  onSelectProperty?: (id: string) => void;
  className?: string;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  delhi: [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  "greater noida": [28.4744, 77.504],
  ghaziabad: [28.6692, 77.4538],
  faridabad: [28.4089, 77.3178],
};

const DEFAULT_CENTER: [number, number] = [28.58, 77.22];

function getCityCenter(city?: string): [number, number] {
  if (!city) return DEFAULT_CENTER;
  const key = city.trim().toLowerCase();
  for (const [name, coords] of Object.entries(CITY_COORDINATES)) {
    if (key.includes(name) || name.includes(key)) {
      return coords;
    }
  }
  return DEFAULT_CENTER;
}

// Generate deterministically jittered coordinates if exact lat/lng is missing
function getPropertyCoordinates(property: Property, index: number, cityCenter: [number, number]): [number, number] {
  if (property.latitude && property.longitude && property.latitude !== 0 && property.longitude !== 0) {
    return [property.latitude, property.longitude];
  }
  const idNum = (property.id || `${index}`).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const angle = (idNum % 360) * (Math.PI / 180);
  const radius = 0.012 + ((idNum % 5) * 0.006); // ~1km - 3km spread
  const latOffset = Math.sin(angle) * radius;
  const lngOffset = Math.cos(angle) * radius;
  return [cityCenter[0] + latOffset, cityCenter[1] + lngOffset];
}

function formatBadgePrice(property: Property): string {
  const price = property.dailyPrice ?? property.pricePerNight ?? property.monthlyPrice ?? property.pricePerMonth ?? property.price ?? 0;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  if (price >= 1000) return `₹${Math.round(price).toLocaleString()}`;
  return `₹${price}`;
}

export default function PropertyMap({
  properties,
  activeCity,
  hoveredPropertyId,
  onHoverProperty,
  onSelectProperty,
  className = "w-full h-full",
}: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  // Ensure Leaflet CSS stylesheet is present in the document head
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  // Initialize map and markers dynamically
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const center = getCityCenter(activeCity);
        const map = L.map(mapContainerRef.current, {
          center: center,
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          subdomains: ["a", "b", "c"],
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      if (!map || !isMounted) return;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker: any) => {
        map.removeLayer(marker);
      });
      markersRef.current = {};

      const cityCenter = getCityCenter(activeCity);
      const bounds: [number, number][] = [];

      properties.forEach((prop, idx) => {
        const propId = prop.id || (prop as any).propertyId || `prop-${idx}`;
        const coords = getPropertyCoordinates(prop, idx, cityCenter);
        bounds.push(coords);

        const priceText = formatBadgePrice(prop);
        const isHovered = hoveredPropertyId === propId;

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `
            <div class="staytrack-price-marker ${isHovered ? "is-active" : ""}" data-prop-id="${propId}">
              <span class="marker-price">${priceText}</span>
            </div>
          `,
          iconSize: [60, 28],
          iconAnchor: [30, 14],
        });

        const marker = L.marker(coords, { icon: customIcon }).addTo(map);

        marker.on("click", () => {
          if (onSelectProperty) onSelectProperty(propId);
        });

        marker.on("mouseover", () => {
          if (onHoverProperty) onHoverProperty(propId);
        });

        marker.on("mouseout", () => {
          if (onHoverProperty) onHoverProperty(null);
        });

        markersRef.current[propId] = marker;
      });

      // Fit map to markers bounds or center on active city
      if (bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 13, { animate: true });
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
        }
      } else {
        map.setView(cityCenter, 12, { animate: true });
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [properties, activeCity]);

  // Update marker highlight styles when hoveredPropertyId changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([propId, marker]: [string, any]) => {
      const el = marker.getElement();
      if (!el) return;
      const markerDiv = el.querySelector(".staytrack-price-marker");
      if (markerDiv) {
        if (propId === hoveredPropertyId) {
          markerDiv.classList.add("is-active");
          el.style.zIndex = "999";
        } else {
          markerDiv.classList.remove("is-active");
          el.style.zIndex = "200";
        }
      }
    });
  }, [hoveredPropertyId]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border/80 shadow-xs bg-surface ${className}`}>
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px] z-10" />

      {/* Embedded Custom Styles for Price Markers */}
      <style jsx global>{`
        .custom-leaflet-marker {
          background: transparent !important;
          border: none !important;
        }
        .staytrack-price-marker {
          background-color: #ffffff;
          color: #111716;
          border: 1.5px solid #e4e4e0;
          padding: 4px 10px;
          border-radius: 9999px;
          font-weight: 800;
          font-size: 11px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-origin: center center;
        }
        .staytrack-price-marker:hover,
        .staytrack-price-marker.is-active {
          background-color: #111716 !important;
          color: #ffffff !important;
          border-color: #111716 !important;
          transform: scale(1.15);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          z-index: 1000 !important;
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
          background-color: #f6f5f1 !important;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
