"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateApplicationStatus } from "@/lib/actions/volunteers";
import type { VolunteerStatus } from "@/lib/events/labels";
import { ORGANISER_TRANSITIONS, TRANSITION_VERB } from "@/lib/volunteers/transitions";
import { cn } from "@/lib/utils";

type Target = "under_review" | "shortlisted" | "interview_requested" | "offered" | "waitlisted" | "rejected" | "completed";

const MESSAGE_HINT: Partial<Record<Target, string>> = {
  offered: "What happens next, the commitment and anything they should know. Sent with the offer.",
  interview_requested: "Suggest times or how to book an interview.",
  rejected: "Optional, but a kind sentence helps. Required if they had already accepted.",
  completed: "Optional thank-you message.",
};

/**
 * Organiser controls for one application. Only transitions the database
 * allows from the current status are offered; the database re-checks.
 */
export function ApplicationStatusControls({
  applicationId,
  status,
  societySlug,
  eventStarted,
}: {
  applicationId: string;
  status: VolunteerStatus;
  societySlug: string;
  eventStarted: boolean;
}) {
  const router = useRouter();
  const options = ORGANISER_TRANSITIONS[status].filter((s) => s !== "completed" || eventStarted) as Target[];
  const [target, setTarget] = useState<Target | null>(null);
  const [message, setMessage] = useState("");
  const [expires, setExpires] = useState("");
  const [pending, start] = useTransition();

  if (!options.length) {
    return <p className="text-sm text-muted-foreground">No further decisions are possible from this status.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Decision">
        {options.map((o) => (
          <Button
            key={o}
            type="button"
            size="sm"
            variant={target === o ? "default" : o === "rejected" ? "ghost" : "outline"}
            aria-pressed={target === o}
            className={cn(o === "rejected" && target !== o && "text-destructive hover:text-destructive")}
            onClick={() => setTarget(target === o ? null : o)}
          >
            {TRANSITION_VERB[o]}
          </Button>
        ))}
      </div>
      {target ? (
        <form
          className="space-y-3 rounded-lg border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await updateApplicationStatus(applicationId, target, { societySlug }, message, expires || undefined);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(res.message ?? "Updated.");
              setTarget(null);
              setMessage("");
              setExpires("");
              router.refresh();
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="status-message">Message to the applicant</Label>
            <Textarea id="status-message" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} aria-describedby="status-message-hint" />
            <p id="status-message-hint" className="text-[13px] text-muted-foreground">
              {MESSAGE_HINT[target] ?? "Optional. Shown to the applicant with the status change."}
            </p>
          </div>
          {target === "offered" ? (
            <div className="space-y-1.5">
              <Label htmlFor="offer-expires">Respond by (optional)</Label>
              <Input id="offer-expires" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className="sm:max-w-xs" />
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} variant={target === "rejected" ? "destructive" : "default"}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {TRANSITION_VERB[target]}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
