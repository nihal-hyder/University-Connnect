"use client";

import { CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { googleCalendarUrl, outlookCalendarUrl, type CalendarItem } from "@/lib/calendar";

/** Google / Outlook links plus an .ics download (Apple Calendar and others). */
export function AddToCalendar({
  item,
  icsHref,
  size = "default",
  variant = "outline",
  label = "Add to calendar",
}: {
  item: CalendarItem;
  icsHref: string;
  size?: "default" | "sm";
  variant?: "outline" | "ghost";
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <CalendarPlus /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem asChild>
          <a href={googleCalendarUrl(item)} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={outlookCalendarUrl(item)} target="_blank" rel="noopener noreferrer">
            Outlook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={icsHref} download>
            <Download /> Apple Calendar / .ics file
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
