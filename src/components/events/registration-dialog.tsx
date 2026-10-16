"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { registerForEvent } from "@/app/(public)/events/[slug]/actions";
import { defaultAnswers, FormRenderer } from "@/components/forms/form-renderer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { answersSchema, type FormAnswers, type FormField } from "@/lib/forms/schema";

type Props = {
  eventId: string;
  eventTitle: string;
  mode: "individual" | "team";
  teamMin: number | null;
  teamMax: number | null;
  termsText: string | null;
  fields: FormField[];
  willWaitlist: boolean;
  requiresApproval: boolean;
  triggerLabel: string;
};

type Member = { name: string; email: string };

/** Anonymous funnel count: the form was opened. Once per event per browser session. */
function recordStart(eventId: string) {
  try {
    const key = `cc_started_${eventId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  void fetch("/api/views", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId, kind: "start" }),
    keepalive: true,
  }).catch(() => undefined);
}

export function RegistrationDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; reference: string } | null>(null);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<Member[]>(() =>
    Array.from({ length: Math.max(0, (props.teamMin ?? 1) - 1) }, () => ({ name: "", email: "" })),
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  const form = useForm<FormAnswers>({
    resolver: zodResolver(answersSchema(props.fields)),
    defaultValues: defaultAnswers(props.fields),
  });

  const maxExtra = Math.max(0, (props.teamMax ?? 1) - 1);
  const minExtra = Math.max(0, (props.teamMin ?? 1) - 1);

  const onSubmit = form.handleSubmit((answers) => {
    setError(null);
    if (props.mode === "team" && teamName.trim().length < 2) return setError("Enter a team name.");
    if (props.termsText && !termsAccepted) return setError("Please accept the event terms to continue.");
    startTransition(async () => {
      const res = await registerForEvent({
        eventId: props.eventId,
        answers,
        teamName: props.mode === "team" ? teamName : undefined,
        teamMembers: props.mode === "team" ? members : undefined,
      });
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) form.setError(k, { message: v[0] });
        }
        return;
      }
      setResult(res.data);
    });
  });

  const statusCopy: Record<string, { title: string; body: string }> = {
    confirmed: { title: "You're registered", body: "Your place is confirmed. Your QR ticket is in My registrations." },
    pending: { title: "Registration received", body: "The organisers review registrations for this event. We'll notify you when they decide." },
    waitlisted: { title: "You're on the waitlist", body: "The event is full right now. If a place opens up we'll notify you straight away." },
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) recordStart(props.eventId);
        if (!o && result) window.location.reload();
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          {props.triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-background sm:max-w-xl">
        {result ? (
          <div className="py-4 text-center" role="status">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
            <DialogTitle className="mt-4 font-display text-2xl font-normal">{statusCopy[result.status]?.title ?? "Done"}</DialogTitle>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{statusCopy[result.status]?.body}</p>
            <p className="mt-5 text-sm">
              Reference <span className="rounded bg-secondary px-2 py-1 font-mono text-sm">{result.reference}</span>
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button asChild>
                <Link href="/dashboard/registrations">View my registrations</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">Register for {props.eventTitle}</DialogTitle>
              <DialogDescription>
                {props.willWaitlist
                  ? "The event is currently full. Submitting adds you to the waitlist."
                  : props.requiresApproval
                    ? "The organisers approve each registration. You'll be notified of their decision."
                    : "Your place is confirmed as soon as you submit."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              {props.mode === "team" ? (
                <fieldset className="space-y-4 rounded-lg border border-border p-4">
                  <legend className="px-1 text-sm font-medium">Your team</legend>
                  <div className="space-y-1.5">
                    <Label htmlFor="team-name">Team name</Label>
                    <Input id="team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={120} required />
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    Teams have {props.teamMin}–{props.teamMax} members including you. Add your teammates below.
                  </p>
                  {members.map((m, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`m-name-${i}`} className="text-[13px]">Member {i + 2} name</Label>
                        <Input id={`m-name-${i}`} value={m.name} onChange={(e) => setMembers((ms) => ms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`m-email-${i}`} className="text-[13px]">Email</Label>
                        <Input id={`m-email-${i}`} type="email" value={m.email} onChange={(e) => setMembers((ms) => ms.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove member ${i + 2}`} disabled={members.length <= minExtra} onClick={() => setMembers((ms) => ms.filter((_, j) => j !== i))}>
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  {members.length < maxExtra ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setMembers((ms) => [...ms, { name: "", email: "" }])}>
                      <Plus /> Add member
                    </Button>
                  ) : null}
                </fieldset>
              ) : null}

              {props.fields.length ? (
                <FormRenderer fields={props.fields} register={form.register} control={form.control} errors={form.formState.errors} idPrefix="reg" />
              ) : props.mode !== "team" ? (
                <p className="text-sm text-muted-foreground">No extra questions — we&rsquo;ll register you with the name and email on your account.</p>
              ) : null}

              {props.termsText ? (
                <div className="space-y-2 rounded-lg bg-secondary/60 p-4">
                  <p className="text-[13px] leading-6 whitespace-pre-line text-foreground/85">{props.termsText}</p>
                  <label className="flex items-center gap-2.5 text-sm font-medium">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                    I accept these terms
                  </label>
                </div>
              ) : null}

              <p className="text-[12px] leading-5 text-muted-foreground">
                The organisers will be able to see your profile (name, email, university, programme and graduation year) and
                your answers above, and use them only to run this event.
              </p>

              {error ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit" disabled={pending} size="lg">
                {pending ? <Loader2 className="animate-spin" /> : null}
                {props.willWaitlist ? "Join waitlist" : "Submit registration"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
