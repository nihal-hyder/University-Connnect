"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scheduleMaintenance } from "@/lib/actions/admin";
import { DEFAULT_MAINTENANCE_MESSAGE } from "@/lib/site-status";

/** Pick a future start time; until then every page shows a notice. */
export function ScheduleMaintenanceForm() {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        // datetime-local is in the admin's own time zone; send an exact instant.
        const when = new Date(startsAt);
        if (Number.isNaN(when.getTime())) {
          toast.error("Choose a date and time.");
          return;
        }
        start(async () => {
          const res = await scheduleMaintenance(when.toISOString(), message);
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Scheduled.");
            setStartsAt("");
            setMessage("");
            router.refresh();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="maintenance-start">Start time</Label>
        <Input id="maintenance-start" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maintenance-message">
          Message for visitors <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="maintenance-message" maxLength={500} value={message} placeholder={DEFAULT_MAINTENANCE_MESSAGE} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <Button type="submit" variant="outline" disabled={pending || !startsAt}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Schedule
      </Button>
    </form>
  );
}
