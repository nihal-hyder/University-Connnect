"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ items, className }: { items: readonly NavItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={cn("items-center gap-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground",
            "aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-signal aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[10px]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav({ items, signedIn }: { items: readonly NavItem[]; signedIn: boolean }) {
  const pathname = usePathname();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,100vw)] bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-normal">Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col px-4">
          {items.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="border-b border-border py-3.5 font-display text-lg aria-[current=page]:text-primary"
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
          <div className="mt-6 flex flex-col gap-2">
            {signedIn ? (
              <SheetClose asChild>
                <Button asChild size="lg">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </SheetClose>
            ) : (
              <>
                <SheetClose asChild>
                  <Button asChild size="lg">
                    <Link href="/signup">Create an account</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Log in</Link>
                  </Button>
                </SheetClose>
              </>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
