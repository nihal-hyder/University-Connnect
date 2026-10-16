"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileFilters({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal /> Filters
          {count ? <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{count}</span> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-normal">Filter events</SheetTitle>
          <SheetDescription>Combine filters to narrow the list. Results update when you apply.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
