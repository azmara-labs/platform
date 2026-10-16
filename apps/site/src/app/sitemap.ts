import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const siteUrl = "https://platform.azmara.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const docPages: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: `${siteUrl}${page.url}`,
    changeFrequency: "weekly",
  }));

  return [
    { url: siteUrl, changeFrequency: "monthly" },
    { url: `${siteUrl}/playground`, changeFrequency: "monthly" },
    ...docPages,
  ];
}
