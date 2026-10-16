import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Certificates are personal; never let search engines index them.
export const metadata: Metadata = { title: "Certificate verification", robots: { index: false, follow: false } };

const lookup = cache(async (code: string) => {
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) return null;
  const supabase = await createClient();
  // Returns only what is printed on the certificate: no email, no account id.
  const { data } = await supabase.rpc("verify_certificate", { p_code: code });
  return data?.[0] ?? null;
});

export default async function CertificatePage({ params }: PageProps<"/certificates/[code]">) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase();
  const cert = await lookup(code);

  if (!cert) {
    return (
      <div className="page-container max-w-xl py-16 md:py-24">
        <ShieldAlert className="size-8 text-destructive" aria-hidden />
        <h1 className="mt-4 font-display text-headline">No certificate with this code</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          We couldn&rsquo;t find a certificate with the code <span className="font-mono text-foreground">{code}</span>. Check the
          code for typing mistakes. If it still doesn&rsquo;t match, the certificate was not issued through {siteConfig.name}.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/verify">Try another code</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl py-12 md:py-16">
      <div
        className={
          cert.revoked
            ? "mb-6 flex items-center gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive"
            : "mb-6 flex items-center gap-2 rounded-lg bg-success-soft px-4 py-3 text-sm text-success"
        }
        role="status"
      >
        {cert.revoked ? <ShieldAlert className="size-4" aria-hidden /> : <BadgeCheck className="size-4" aria-hidden />}
        {cert.revoked
          ? "This certificate was revoked by the issuing society and is no longer valid."
          : `Valid. This certificate was issued through ${siteConfig.name}.`}
      </div>

      <article className="relative overflow-hidden rounded-xl border border-border bg-surface px-6 py-12 text-center shadow-[0_1px_0_var(--border),0_24px_48px_-32px_oklch(0.2_0.02_160/0.35)] sm:px-14 sm:py-16">
        <div className="pointer-events-none absolute inset-3 rounded-lg border border-border" aria-hidden />
        <LogoMark className="mx-auto size-8" />
        <p className="eyebrow mt-6 text-signal-ink">Certificate of volunteer service</p>
        <p className="mt-8 text-sm text-muted-foreground">This certifies that</p>
        <h1 className="mt-2 font-display text-[2.5rem] leading-tight italic">{cert.recipient_name}</h1>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-7">
          served as <strong className="font-medium">{cert.role_title}</strong> at{" "}
          <strong className="font-medium">{cert.event_title}</strong>, organised by {cert.society_name}
          {cert.event_date ? `, on ${formatDate(cert.event_date)}` : ""}.
        </p>
        <dl className="mx-auto mt-12 grid max-w-md grid-cols-2 gap-6 border-t border-border pt-6 text-left text-sm">
          <div>
            <dt className="text-muted-foreground">Issued by</dt>
            <dd className="mt-1 font-medium">{cert.issuer_name}</dd>
            <dd className="text-muted-foreground">{cert.society_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Issued on</dt>
            <dd className="mt-1 font-medium">{formatDate(cert.issued_at)}</dd>
            <dd className="font-mono text-xs text-muted-foreground">{code}</dd>
          </div>
        </dl>
      </article>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Certificates are issued by the organising society based on the volunteer&rsquo;s actual participation. {siteConfig.name}{" "}
        records who issued them but does not independently verify attendance.
      </p>
    </div>
  );
}
