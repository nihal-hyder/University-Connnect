import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Check that a volunteer certificate was issued through the platform.",
};

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const { code } = await searchParams;
  if (typeof code === "string" && code.trim()) {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
    if (clean) redirect(`/certificates/${clean}`);
  }
  return (
    <div className="page-container max-w-xl py-16 md:py-24">
      <p className="eyebrow text-signal-ink">Certificates</p>
      <h1 className="mt-2 font-display text-headline">Verify a certificate</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        Enter the verification code printed on the certificate. We will show who issued it, for which role and when, and whether
        it is still valid.
      </p>
      <form action="/verify" method="get" className="mt-8 flex gap-2">
        <label htmlFor="verify-code" className="sr-only">
          Verification code
        </label>
        <Input id="verify-code" name="code" required autoComplete="off" placeholder="CC-XXXX-XXXX-XXXX" className="font-mono uppercase" />
        <Button type="submit">Verify</Button>
      </form>
    </div>
  );
}
