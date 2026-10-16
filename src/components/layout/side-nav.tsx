"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bookmark,
  Building2,
  CalendarCheck,
  CalendarPlus,
  ClipboardList,
  Compass,
  FileCheck2,
  Flag,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  Library,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icons are referenced by name so navigation config can be built in Server
 * Components (component functions cannot cross the server/client boundary).
 */
const ICONS = {
  overview: LayoutDashboard,
  compass: Compass,
  volunteer: HeartHandshake,
  ticket: Ticket,
  applications: ClipboardList,
  saved: Bookmark,
  bell: Bell,
  settings: Settings,
  calendar: CalendarCheck,
  create: CalendarPlus,
  users: Users,
  handshake: Handshake,
  chart: BarChart3,
  building: Building2,
  shield: ShieldCheck,
  flag: Flag,
  library: Library,
  log: ScrollText,
  scan: ScanLine,
  check: FileCheck2,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;
export type SideNavItem = { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean };
export type SideNavGroup = { label?: string; items: SideNavItem[] };

function active(pathname: string, item: SideNavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SideNav({ groups, label }: { groups: SideNavGroup[]; label: string }) {
  const pathname = usePathname();
  const all = groups.flatMap((g) => g.items);

  return (
    <>
      {/* Desktop: vertical list */}
      <nav aria-label={label} className="hidden lg:block">
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-6")}>
            {group.label ? <p className="eyebrow mb-2 px-3">{group.label}</p> : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive = active(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground",
                        "aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_2px_0_0_var(--signal)]",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="ml-auto rounded-full bg-signal-soft px-1.5 text-[11px] font-medium text-signal-ink tabular-nums">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Mobile / tablet: horizontal scrolling tabs */}
      <nav aria-label={label} className="-mx-4 overflow-x-auto border-b border-border px-4 sm:-mx-6 sm:px-6 lg:hidden">
        <ul className="flex min-w-max gap-1 pb-px">
          {all.map((item) => {
            const isActive = active(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex items-center gap-1.5 px-3 py-3 text-sm whitespace-nowrap text-foreground/70 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-signal"
                >
                  {item.label}
                  {item.badge ? (
                    <span className="rounded-full bg-signal-soft px-1.5 text-[11px] font-medium text-signal-ink">{item.badge}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
