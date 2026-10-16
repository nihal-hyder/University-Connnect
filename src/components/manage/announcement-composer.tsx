"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { sendAnnouncement } from "@/lib/actions/events";

export type AudienceOption = { value: string; label: string; count: number };

/** Compose a message to a chosen group of this event's participants. */
export function AnnouncementComposer({
  eventId,
  societySlug,
  audiences,
  shifts,
}: {
  eventId: string;
  societySlug: string;
  audiences: AudienceOption[];
  shifts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [audience, setAudience] = useState(audiences[0]?.value ?? "");
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(true);
  const [pending, start] = useTransition();
  const selected = audiences.find((a) => a.value === audience);

  if (!audiences.length) return <p className="text-sm text-muted-foreground">Your role can&rsquo;t message participants of this event.</p>;

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await sendAnnouncement({ eventId, audience, shiftId, title, body, sendEmail: email, ctx: { societySlug } });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(res.message ?? "Sent.");
          setTitle("");
          setBody("");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ann-audience">Send to</Label>
          <NativeSelect id="ann-audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
            {audiences.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
                {a.value !== "shift" ? ` (${a.count})` : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        {audience === "shift" ? (
          <div className="space-y-1.5">
            <Label htmlFor="ann-shift">Shift</Label>
            <NativeSelect id="ann-shift" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ann-title">Title</Label>
        <Input id="ann-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Venue changed to Hall B" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ann-body">Message</Label>
        <Textarea id="ann-body" required rows={5} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do people need to know? Times, what to bring, where to meet…" />
        <p className="text-right text-xs text-muted-foreground tabular-nums">{body.length}/2000</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox checked={email} onCheckedChange={(c) => setEmail(c === true)} className="mt-0.5" />
        <span>
          Also send by email
          <span className="block text-muted-foreground">Everyone gets an in-app notification. Email respects each person&rsquo;s reminder preferences.</span>
        </span>
      </label>
      <Button type="submit" disabled={pending || !title.trim() || !body.trim() || (audience === "shift" && !shiftId)}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        Send{selected && selected.value !== "shift" ? ` to ${selected.count}` : ""}
      </Button>
    </form>
  );
}
