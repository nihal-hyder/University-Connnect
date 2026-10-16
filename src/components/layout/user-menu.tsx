"use client";

import Link from "next/link";
import { Bell, LayoutDashboard, LogOut, Settings, Shield, Users } from "lucide-react";
import { clearPrivateCaches } from "@/components/pwa/service-worker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MenuViewer = {
  name: string;
  email: string | null;
  isAdmin: boolean;
  societies: { slug: string; name: string }[];
  unread: number;
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function UserMenu({ viewer }: { viewer: MenuViewer }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative gap-2 px-1.5" aria-label="Account menu">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials(viewer.name)}
          </span>
          {viewer.unread > 0 ? (
            <span className="absolute top-1 right-1 size-2.5 rounded-full bg-signal ring-2 ring-background" aria-label={`${viewer.unread} unread notifications`} />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium text-foreground">{viewer.name}</p>
          {viewer.email ? <p className="truncate text-xs text-muted-foreground">{viewer.email}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/notifications">
              <Bell /> Notifications
              {viewer.unread > 0 ? <span className="ml-auto text-xs text-signal-ink">{viewer.unread} new</span> : null}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings /> Profile & settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {viewer.societies.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Your societies</DropdownMenuLabel>
            {viewer.societies.map((s) => (
              <DropdownMenuItem asChild key={s.slug}>
                <Link href={`/manage/${s.slug}`}>
                  <Users /> <span className="truncate">{s.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {viewer.isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield /> Platform admin
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <form
          action="/auth/signout"
          method="post"
          onSubmit={(e) => {
            // Remove offline ticket copies from this device before signing out.
            e.preventDefault();
            const form = e.currentTarget;
            void clearPrivateCaches().finally(() => form.submit());
          }}
        >
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
