import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { SampleBadge } from "@/components/common/tone-badge";
import type { SocietyListItem } from "@/lib/data/events";
import { mediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function SocietyAvatar({
  name,
  logoPath,
  className,
  size = 48,
}: {
  name: string;
  logoPath: string | null;
  className?: string;
  size?: number;
}) {
  const url = mediaUrl(logoPath);
  const letters = name
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(of|and|the|for|society|club)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-primary-soft font-display text-primary", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {url ? <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" /> : letters || name[0]}
    </span>
  );
}

export function SocietyTile({ society, className }: { society: SocietyListItem; className?: string }) {
  return (
    <article className={cn("group relative flex gap-4 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-surface", className)}>
      <SocietyAvatar name={society.name} logoPath={society.logo_path} />
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 font-medium text-foreground">
          <Link href={`/societies/${society.slug}`} className="truncate outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {society.name}
          </Link>
          <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified by platform staff" />
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          {society.university?.short_name ?? society.university?.name}
          {society.category ? ` · ${society.category.name}` : ""}
        </p>
        {society.is_demo ? <SampleBadge className="mt-1.5" /> : null}
      </div>
    </article>
  );
}
