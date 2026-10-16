"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormBuilder } from "@/components/forms/form-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createShift, saveRoleForm } from "@/lib/actions/volunteers";
import type { FormField } from "@/lib/forms/schema";

export function RoleFormEditor({ roleId, societySlug, initial, hasSubmissions }: { roleId: string; societySlug: string; initial: FormField[]; hasSubmissions: boolean }) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial);
  return (
    <div className="space-y-4">
      <FormBuilder value={fields} onChange={setFields} hasSubmissions={hasSubmissions} />
      <Button
        type="button"
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            const res = await saveRoleForm(roleId, fields, { societySlug });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success(res.message ?? "Saved.");
              router.refresh();
            }
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save application form
      </Button>
    </div>
  );
}

export function NewShiftForm({ roleId, societySlug }: { roleId: string; societySlug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setError(null);
        start(async () => {
          const res = await createShift(
            {
              roleId,
              title: String(fd.get("title") ?? ""),
              startsAt: String(fd.get("startsAt") ?? ""),
              endsAt: String(fd.get("endsAt") ?? ""),
              location: String(fd.get("location") ?? ""),
              instructions: String(fd.get("instructions") ?? ""),
              capacity: String(fd.get("capacity") ?? ""),
            },
            { societySlug },
          );
          if (!res.ok) {
            setError(res.error);
            return;
          }
          toast.success(res.message ?? "Shift added.");
          form.reset();
          router.refresh();
        });
      }}
    >
      <h3 className="text-sm font-medium">New shift</h3>
      <div className="space-y-1.5">
        <Label htmlFor="shift-title">Name</Label>
        <Input id="shift-title" name="title" required maxLength={120} placeholder="Morning registration desk" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="shift-start">Starts</Label>
          <Input id="shift-start" name="startsAt" type="datetime-local" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shift-end">Ends</Label>
          <Input id="shift-end" name="endsAt" type="datetime-local" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shift-capacity">
          Places <span className="font-normal text-muted-foreground">(optional, empty = no limit)</span>
        </Label>
        <Input id="shift-capacity" name="capacity" type="number" min={1} max={1000} inputMode="numeric" className="sm:max-w-32" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shift-location">
          Location <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="shift-location" name="location" maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shift-instructions">
          Instructions <span className="font-normal text-muted-foreground">(optional, shown to assigned volunteers)</span>
        </Label>
        <Textarea id="shift-instructions" name="instructions" rows={2} maxLength={2000} />
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Add shift
      </Button>
    </form>
  );
}
