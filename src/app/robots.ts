import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/x/"],
    },
    sitemap: "https://www.fartgirlsolana.com/sitemap.xml",
    host: "https://www.fartgirlsolana.com",
  };
}