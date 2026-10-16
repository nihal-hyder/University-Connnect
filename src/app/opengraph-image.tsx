import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { OG_SIZE, ogFonts, SiteCard } from "@/lib/og";

export const alt = `${siteConfig.fullName}: ${siteConfig.shortDescription}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<SiteCard />, { ...size, fonts: await ogFonts() });
}
