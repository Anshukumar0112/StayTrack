import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/properties",
          "/properties/*",
          "/stays/*",
          "/sitemap",
          "/about",
          "/how-it-works",
          "/contact",
          "/help",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/admin/",
          "/host/",
          "/trips/",
          "/chat/",
          "/booking/",
          "/profile",
          "/notifications",
          "/login",
          "/register",
          "/auth",
          "/api/",
        ],
      },
    ],
    sitemap: "https://staytrack.in/sitemap.xml",
  };
}
