import { NextResponse, type NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { createElement } from "react";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/lib/env/public";
import { formatDate } from "@/lib/format";
import { CERT_SIZE, CertificateCard, ogFonts } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FORMATS = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg" } as const;
type Format = keyof typeof FORMATS;

/**
 * Downloads a certificate as PDF, PNG or JPG. Only the recipient and the
 * issuing society can download (RLS on certificates: own or issuer); anyone
 * can still verify it publicly at /certificates/<code>.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/certificates/[code]/download">) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase();
  const format = (request.nextUrl.searchParams.get("format") ?? "pdf").toLowerCase() as Format;
  if (!(format in FORMATS) || !/^[A-Z0-9-]{4,40}$/.test(code)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: c } = await supabase
    .from("certificates")
    .select("code, recipient_name, role_title, event_title, society_name, event_date, issuer_name, issued_at, revoked_at")
    .eq("code", code)
    .maybeSingle();
  if (!c) return new NextResponse("Not found", { status: 404 });
  if (c.revoked_at) return new NextResponse("This certificate was revoked and can no longer be downloaded.", { status: 410 });

  const verifyUrl = `${publicEnv.siteUrl.replace(/^https?:\/\//, "")}/certificates/${c.code}`;
  const image = new ImageResponse(
    createElement(CertificateCard, {
      recipient: c.recipient_name,
      role: c.role_title,
      event: c.event_title,
      society: c.society_name,
      eventDate: c.event_date ? formatDate(c.event_date) : null,
      issuer: c.issuer_name,
      issuedOn: formatDate(c.issued_at),
      code: c.code,
      verifyUrl,
    }),
    { ...CERT_SIZE, fonts: await ogFonts() },
  );
  const png = Buffer.from(await image.arrayBuffer());

  let body: Buffer | Uint8Array = png;
  if (format === "jpg") {
    body = await sharp(png).flatten({ background: "#f6f3ee" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  } else if (format === "pdf") {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Certificate ${c.code} – ${c.recipient_name}`);
    pdf.setAuthor(c.issuer_name);
    pdf.setSubject(`${c.role_title}, ${c.event_title}`);
    pdf.setCreator(siteConfig.fullName);
    pdf.setKeywords(["certificate", c.code]);
    const page = pdf.addPage([841.89, 595.28]); // A4 landscape, points
    const img = await pdf.embedPng(png);
    page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    body = await pdf.save();
  }

  const filename = `certificate-${c.code}.${format}`;
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": FORMATS[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
