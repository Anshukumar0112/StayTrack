"use client";

import { useEffect, useState } from "react";
import { getStayProperties } from "@/lib/api";
import { Property } from "@/types/property";
import { isSupportedLocation } from "@/lib/locations";
import { ACCOMMODATION_CATEGORIES, normalizeCategoryKey } from "@/lib/categories";
import CategorySection from "./CategorySection";

export default function CategoryShowcase() {
  const [groupedProperties, setGroupedProperties] = useState<Record<string, Property[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStayProperties()
      .then((data) => {
        if (data && Array.isArray(data)) {
          const ncrOnly = data.filter((stay) => isSupportedLocation(stay.city));
          
          // Group properties strictly by normalized category key
          const grouped: Record<string, Property[]> = {
            BNB: [],
            HOSTEL: [],
            PG: [],
            HOTEL: [],
            FLAT: [],
          };

          ncrOnly.forEach((stay) => {
            const key = normalizeCategoryKey(stay.propertyType);
            if (grouped[key]) {
              grouped[key].push(stay);
            }
          });

          setGroupedProperties(grouped);
        } else {
          setGroupedProperties({ BNB: [], HOSTEL: [], PG: [], HOTEL: [], FLAT: [] });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch category properties:", err);
        setGroupedProperties({ BNB: [], HOSTEL: [], PG: [], HOTEL: [], FLAT: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-4">
      {/* 5 Distinct Data-Driven Category Sections in Canonical Order */}
      {ACCOMMODATION_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          properties={groupedProperties[cat.id] || []}
          loading={loading}
        />
      ))}
    </div>
  );
}
