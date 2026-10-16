/**
 * Verified university email. Sign-up emails are verified by Supabase Auth, so
 * an address on a university's domain (or a subdomain of it) shows the person
 * controls an institutional mailbox. Mirrors private.email_domain_matches().
 */
export function emailMatchesDomains(email: string | null | undefined, domains: readonly string[] | null | undefined): boolean {
  if (!email || !email.includes("@") || !domains?.length) return false;
  const host = email.split("@").pop()!.toLowerCase();
  return domains.some((d) => {
    const dom = d.toLowerCase();
    return host === dom || host.endsWith(`.${dom}`);
  });
}

export function universityForEmail<T extends { email_domains: readonly string[] | null }>(email: string | null | undefined, universities: readonly T[]): T | null {
  return universities.find((u) => emailMatchesDomains(email, u.email_domains)) ?? null;
}

/** Parses an admin-entered list ("nust.edu.pk, seecs.edu.pk") into clean domains. */
export function parseDomains(input: string): string[] | null {
  const parts = input
    .split(/[\s,]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  if (parts.length > 10) return null;
  if (!parts.every((d) => /^(?=.{3,100}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d))) return null;
  return Array.from(new Set(parts));
}
