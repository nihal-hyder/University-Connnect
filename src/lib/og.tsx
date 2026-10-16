import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/config/site";

/**
 * Link-preview cards (WhatsApp, LinkedIn, X, Facebook…), rendered with
 * next/og. Fonts are bundled in src/assets/fonts (SIL OFL) so rendering never
 * depends on a network fetch.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const COLORS = {
  paper: "#f6f3ee",
  surface: "#fcfbf8",
  ink: "#1f2328",
  muted: "#5f6368",
  green: "#204e39",
  greenSoft: "#e3efe8",
  signal: "#c85b32",
  signalSoft: "#f8e6dc",
  border: "#e4ded3",
};

let fontCache: Promise<{ name: string; data: Buffer; weight: 500; style: "normal" | "italic" }[]> | null = null;

export function ogFonts() {
  fontCache ??= (async () => {
    const dir = join(process.cwd(), "src/assets/fonts");
    const [serif, serifItalic, sans] = await Promise.all([
      readFile(join(dir, "newsreader-latin-500-normal.woff")),
      readFile(join(dir, "newsreader-latin-500-italic.woff")),
      readFile(join(dir, "geist-latin-500-normal.woff")),
    ]);
    return [
      { name: "Newsreader", data: serif, weight: 500 as const, style: "normal" as const },
      { name: "Newsreader", data: serifItalic, weight: 500 as const, style: "italic" as const },
      { name: "Geist", data: sans, weight: 500 as const, style: "normal" as const },
    ];
  })();
  return fontCache;
}

function Mark({ size = 44 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, background: COLORS.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: size * 0.42, height: size * 0.42, border: `${Math.max(2, size * 0.06)}px solid ${COLORS.paper}`, transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: size * 0.16, height: size * 0.16, borderRadius: 999, background: COLORS.signal }} />
      </div>
    </div>
  );
}

function Pill({ children, tone }: { children: string; tone: "green" | "signal" | "neutral" }) {
  const bg = tone === "green" ? COLORS.greenSoft : tone === "signal" ? COLORS.signalSoft : COLORS.surface;
  const fg = tone === "green" ? COLORS.green : tone === "signal" ? COLORS.signal : COLORS.ink;
  return (
    <div style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: bg, color: fg, fontSize: 24, border: `1px solid ${COLORS.border}` }}>{children}</div>
  );
}

/** Event preview: title, when, where, and the facts people decide on. */
export function EventCard({
  eyebrow,
  title,
  when,
  where,
  pills,
  coverUrl,
}: {
  eyebrow: string;
  title: string;
  when: string;
  where: string;
  pills: { label: string; tone: "green" | "signal" | "neutral" }[];
  coverUrl: string | null;
}) {
  const shortTitle = title.length > 78 ? `${title.slice(0, 76)}…` : title;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: COLORS.paper, fontFamily: "Geist", color: COLORS.ink }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "56px 56px 48px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark />
          <div style={{ fontFamily: "Newsreader", fontSize: 34 }}>{siteConfig.name}</div>
        </div>
        <div style={{ marginTop: 44, fontSize: 22, letterSpacing: 2, color: COLORS.signal, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ marginTop: 14, fontFamily: "Newsreader", fontSize: shortTitle.length > 48 ? 58 : 70, lineHeight: 1.05, letterSpacing: -1 }}>{shortTitle}</div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, fontSize: 28, color: COLORS.muted }}>
          <div style={{ display: "flex" }}>{when}</div>
          <div style={{ display: "flex" }}>{where}</div>
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          {pills.map((p) => (
            <Pill key={p.label} tone={p.tone}>
              {p.label}
            </Pill>
          ))}
        </div>
      </div>
      <div style={{ width: 360, display: "flex", background: COLORS.green, position: "relative", overflow: "hidden" }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img>
          <img src={coverUrl} alt="" width={360} height={630} style={{ objectFit: "cover", width: 360, height: 630 }} />
        ) : (
          <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", width: 520, height: 520, borderRadius: 999, border: `2px solid ${COLORS.paper}33`, top: -120, right: -200 }} />
            <div style={{ position: "absolute", width: 360, height: 360, borderRadius: 999, border: `2px solid ${COLORS.paper}22`, bottom: -140, left: -120 }} />
            <div style={{ width: 150, height: 150, border: `6px solid ${COLORS.paper}`, transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: COLORS.signal }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Generic site card for pages without their own image. */
export function SiteCard() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: COLORS.paper, padding: "64px 72px", fontFamily: "Geist", color: COLORS.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Mark size={56} />
        <div style={{ fontFamily: "Newsreader", fontSize: 42 }}>{siteConfig.name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "Newsreader", fontSize: 84, lineHeight: 1.02, letterSpacing: -2 }}>What&rsquo;s on at universities</div>
        <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 84, lineHeight: 1.02, letterSpacing: -2 }}>
          across Pakistan,&nbsp;<span style={{ fontStyle: "italic", color: COLORS.green }}>in one place.</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 26 }}>
        <Pill tone="neutral">Hackathons</Pill>
        <Pill tone="neutral">Competitions</Pill>
        <Pill tone="neutral">Workshops</Pill>
        <Pill tone="green">Volunteering</Pill>
      </div>
    </div>
  );
}

/** Printable certificate (A4 landscape proportions). Mirrors the /certificates page. */
export const CERT_SIZE = { width: 2000, height: 1414 };

export function CertificateCard({
  recipient,
  role,
  event,
  society,
  eventDate,
  issuer,
  issuedOn,
  code,
  verifyUrl,
}: {
  recipient: string;
  role: string;
  event: string;
  society: string;
  eventDate: string | null;
  issuer: string;
  issuedOn: string;
  code: string;
  verifyUrl: string;
}) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: COLORS.paper, padding: 56, fontFamily: "Geist", color: COLORS.ink }}>
      <div style={{ flex: 1, display: "flex", border: `3px solid ${COLORS.green}`, padding: 18 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            padding: "110px 140px 70px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Mark size={64} />
            <div style={{ fontFamily: "Newsreader", fontSize: 46 }}>{siteConfig.name}</div>
          </div>
          <div style={{ marginTop: 60, fontSize: 30, letterSpacing: 8, color: COLORS.signal, textTransform: "uppercase" }}>Certificate of volunteer service</div>
          <div style={{ marginTop: 110, fontSize: 36, color: COLORS.muted }}>This certifies that</div>
          <div style={{ marginTop: 18, fontFamily: "Newsreader", fontStyle: "italic", fontSize: recipient.length > 28 ? 104 : 128, lineHeight: 1.05, color: COLORS.ink }}>
            {recipient}
          </div>
          <div style={{ marginTop: 18, width: 520, height: 3, background: COLORS.signal }} />
          <div style={{ marginTop: 56, maxWidth: 1400, fontSize: 40, lineHeight: 1.5, textAlign: "center", display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
            {`served as ${role} at ${event}, organised by ${society}${eventDate ? `, on ${eventDate}` : ""}.`}
          </div>
          <div style={{ marginTop: "auto", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1px solid ${COLORS.border}`, paddingTop: 36 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 24, color: COLORS.muted }}>Issued by</div>
              <div style={{ fontFamily: "Newsreader", fontSize: 40 }}>{issuer}</div>
              <div style={{ fontSize: 26, color: COLORS.muted }}>{society}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 24, color: COLORS.muted }}>{`Issued on ${issuedOn}`}</div>
              <div style={{ fontSize: 30, letterSpacing: 2 }}>{code}</div>
              <div style={{ fontSize: 22, color: COLORS.muted }}>{`Verify at ${verifyUrl}`}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
