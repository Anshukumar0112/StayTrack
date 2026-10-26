import { MetadataRoute } from "next";
import { SUPPORTED_LOCATIONS } from "@/lib/locations";

function parseValidDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://staytrack.in";
  const currentDate = new Date();

  // Static Canonical Public Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sitemap`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Canonical Location Landing Pages
  const locationRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCATIONS.map((loc) => ({
    url: `${baseUrl}/stays/${loc.id}`,
    lastModified: currentDate,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Canonical Property Detail Pages (Safely fetched with timeout & fallback)
  let propertyRoutes: MetadataRoute.Sitemap = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiUrl}/api/properties`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    }).catch(() => null);
    clearTimeout(timeout);

    if (res && res.ok) {
      const properties = await res.json();
      if (Array.isArray(properties)) {
        propertyRoutes = properties
          .filter((p: any) => p && (p.id || p.propertyId))
          .map((p: any) => ({
            url: `${baseUrl}/properties/${p.id || p.propertyId}`,
            lastModified: parseValidDate(p.createdAt),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          }));
      }
    }
  } catch (err) {
    console.warn("Notice: Backend offline during sitemap prerender fallback:", err);
  }

  return [...staticRoutes, ...locationRoutes, ...propertyRoutes];
}
