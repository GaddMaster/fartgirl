import type { MetadataRoute } from "next";

const baseUrl = "https://www.fartgirlsolana.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/comic`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}