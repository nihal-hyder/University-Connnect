"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteAccount, savePreferences } from "@/lib/actions/profile";

type Prefs = { emailReminders: boolean; emailRecommendations: boolean; emailSocietyUpdates: boolean };

const ROWS: { key: keyof Prefs; title: string; body: string }[] = [
  {
    key: "emailReminders",
    title: "Event and deadline reminders",
    body: "A reminder the day before events you registered for, and before registration closes on events you saved.",
  },
  {
    key: "emailSocietyUpdates",
    title: "Society and team updates",
    body: "Invitations to join a society team and collaboration requests for societies you manage.",
  },
  {
    key: "emailRecommendations",
    title: "Recommendations",
    body: "Occasional emails about new events that match your interests. Off by default.",
  },
];

export function PreferencesForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = ROWS.some((r) => prefs[r.key] !== initial[r.key]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePreferences(prefs);
          if (res.ok) toast.success("Preferences saved.");
          else toast.error(res.error);
        });
      }}
    >
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-start justify-between gap-6 px-5 py-4">
            <div>
              <Label htmlFor={`pref-${row.key}`} className="text-sm font-medium">
                {row.title}
              </Label>
              <p id={`pref-${row.key}-desc`} className="mt-1 text-sm leading-6 text-muted-foreground">
                {row.body}
              </p>
            </div>
            <Switch
              id={`pref-${row.key}`}
              aria-describedby={`pref-${row.key}-desc`}
              checked={prefs[row.key]}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))}
              className="mt-1"
            />
          </li>
        ))}
        <li className="px-5 py-4 text-sm leading-6 text-muted-foreground">
          <span className="font-medium text-foreground">Always sent:</span> registration and application confirmations, status
          changes, offers, cancellations and account security emails. These cannot be switched off because they are part of
          the service you asked for.
        </li>
      </ul>
      <Button type="submit" className="mt-4" disabled={!dirty || pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save preferences
      </Button>
    </form>
  );
}

export function DeleteAccountDialog({ email }: { email: string }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive">
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Delete your account?</DialogTitle>
          <DialogDescription className="leading-6">
            This permanently removes your profile, registrations, volunteer applications, saved items and notifications.
            Certificates already issued to you stay verifiable under the name printed on them. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          id="delete-account"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await deleteAccount(value);
              if (res && !res.ok) setError(res.error);
            });
          }}
          className="space-y-2"
        >
          <Label htmlFor="confirm-email">
            Type <span className="font-mono text-foreground">{email}</span> to confirm
          </Label>
          <Input id="confirm-email" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
          {error ? (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Keep my account</Button>
          </DialogClose>
          <Button type="submit" form="delete-account" variant="destructive" disabled={pending || value.trim().toLowerCase() !== email.toLowerCase()}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
