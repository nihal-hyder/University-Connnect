import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.fullName,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f3ee",
    theme_color: "#204e39",
    lang: "en-PK",
    categories: ["education", "events", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My tickets", url: "/dashboard/registrations", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Explore events", url: "/explore", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
