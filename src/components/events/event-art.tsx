import { cn } from "@/lib/utils";

/**
 * Original generative artwork used when an event has no uploaded cover.
 * Deterministic: the same event always gets the same composition. Palettes are
 * keyed by category; the motif (jaali lattice, rings, bands, sunburst) by slug.
 */

const PALETTES = {
  green: { bg: "#1f4d3a", fg: "#e9e2cf", mid: "#2f6a51" },
  terracotta: { bg: "#b4532c", fg: "#f6e6d6", mid: "#c96a41" },
  indigo: { bg: "#2c3763", fg: "#e6e3f1", mid: "#3d4b82" },
  ochre: { bg: "#c4912f", fg: "#2a2214", mid: "#d3a64d" },
  plum: { bg: "#58283f", fg: "#f2dde6", mid: "#743753" },
  teal: { bg: "#1e5b5a", fg: "#ddeeea", mid: "#2b7472" },
  ink: { bg: "#22262a", fg: "#e9e5db", mid: "#353a40" },
  sand: { bg: "#e6dac2", fg: "#5d4127", mid: "#d9c8a6" },
} as const;

type PaletteKey = keyof typeof PALETTES;

const CATEGORY_PALETTE: Record<string, PaletteKey> = {
  "software-ai": "indigo",
  cybersecurity: "ink",
  "data-science": "plum",
  "robotics-engineering": "ochre",
  "science-research": "teal",
  "business-entrepreneurship": "terracotta",
  "finance-economics": "ochre",
  "debate-mun": "plum",
  "arts-design": "terracotta",
  "photography-media": "ink",
  "music-performing-arts": "plum",
  "literature-writing": "sand",
  sports: "terracotta",
  "social-impact": "green",
  "health-medicine": "sand",
  careers: "indigo",
  "culture-festivals": "ochre",
};

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function EventArt({
  seed,
  category,
  className,
  label,
}: {
  seed: string;
  category?: string | null;
  className?: string;
  label?: string;
}) {
  const h = hash(seed);
  const palette = PALETTES[(category && CATEGORY_PALETTE[category]) || (Object.keys(PALETTES)[h % 8] as PaletteKey)];
  const motif = h % 4;
  const id = `art-${h.toString(36)}`;
  const shift = (h >> 4) % 60;

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ backgroundColor: palette.bg }} aria-hidden="true">
      <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <pattern id={`${id}-jaali`} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={`rotate(${shift % 2 ? 45 : 0})`}>
            <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="none" stroke={palette.fg} strokeOpacity="0.28" strokeWidth="1.2" />
            <circle cx="20" cy="20" r="4" fill={palette.fg} fillOpacity="0.18" />
          </pattern>
        </defs>

        {motif === 0 && (
          <>
            <rect width="400" height="250" fill={`url(#${id}-jaali)`} />
            <circle cx={300 - shift} cy={90} r={70} fill={palette.mid} />
            <circle cx={300 - shift} cy={90} r={70} fill={`url(#${id}-jaali)`} />
          </>
        )}

        {motif === 1 && (
          <g fill="none" stroke={palette.fg} strokeOpacity="0.35">
            {Array.from({ length: 9 }).map((_, i) => (
              <circle key={i} cx={360 - shift} cy={260} r={40 + i * 26} strokeWidth={i % 3 === 0 ? 2 : 1} />
            ))}
            <circle cx={360 - shift} cy={260} r={36} fill={palette.mid} stroke="none" />
          </g>
        )}

        {motif === 2 && (
          <g>
            {Array.from({ length: 7 }).map((_, i) => (
              <rect
                key={i}
                x={-80 + i * 70 + shift}
                y={-60}
                width={26}
                height={420}
                fill={i % 2 ? palette.mid : palette.fg}
                fillOpacity={i % 2 ? 1 : 0.14}
                transform="rotate(28 200 125)"
              />
            ))}
          </g>
        )}

        {motif === 3 && (
          <g>
            <circle cx={200 + shift - 30} cy={250} r={120} fill={palette.mid} />
            {Array.from({ length: 18 }).map((_, i) => {
              const a = Math.PI + (i * Math.PI) / 17;
              const cx = 200 + shift - 30;
              return (
                <line
                  key={i}
                  x1={cx + Math.cos(a) * 130}
                  y1={250 + Math.sin(a) * 130}
                  x2={cx + Math.cos(a) * 230}
                  y2={250 + Math.sin(a) * 230}
                  stroke={palette.fg}
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        )}
      </svg>
      {label ? (
        <span
          className="absolute bottom-3 left-4 font-display text-lg italic"
          style={{ color: palette.fg, opacity: 0.9 }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
