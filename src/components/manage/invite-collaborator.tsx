"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inviteCollaborator, updateCollaborationPermissions } from "@/lib/actions/events";
import { PERMISSION_COPY, type CollabPerms } from "@/lib/events/collaboration";
import { cn } from "@/lib/utils";

export type CollabSocietyOption = { id: string; name: string; university: string | null };

const NONE: CollabPerms = { canEditDetails: false, canManageVolunteers: false, canViewRegistrations: false, canCheckIn: false, canViewAnalytics: false };

function PermissionChecklist({ value, onChange, idPrefix }: { value: CollabPerms; onChange: (v: CollabPerms) => void; idPrefix: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">What they can do</legend>
      <p className="mt-0.5 text-sm text-muted-foreground">Nothing is shared by default. Accepted collaborators always appear on the event page.</p>
      <ul className="mt-3 space-y-2.5">
        {PERMISSION_COPY.map((p) => (
          <li key={p.key} className="flex items-start gap-3">
            <Checkbox id={`${idPrefix}-${p.key}`} checked={value[p.key]} onCheckedChange={(c) => onChange({ ...value, [p.key]: c === true })} className="mt-0.5" />
            <Label htmlFor={`${idPrefix}-${p.key}`} className="block text-sm font-normal leading-5">
              <span className="font-medium">{p.label}</span>
              <span className="block text-muted-foreground">{p.body}</span>
            </Label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function InviteCollaboratorForm({ eventId, societySlug, options }: { eventId: string; societySlug: string; options: CollabSocietyOption[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CollabSocietyOption | null>(null);
  const [perms, setPerms] = useState<CollabPerms>(NONE);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.name.toLowerCase().includes(q) || (o.university ?? "").toLowerCase().includes(q)).slice(0, 8);
  }, [query, options]);

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
      <div className="space-y-1.5">
        <Label htmlFor="collab-search">Find a verified society</Label>
        <Input id="collab-search" type="search" placeholder="Search by name or university" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border" role="listbox" aria-label="Societies">
          {matches.length ? (
            matches.map((o) => (
              <li key={o.id} role="option" aria-selected={selected?.id === o.id}>
                <button
                  type="button"
                  onClick={() => setSelected(o)}
                  className={cn("flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-secondary", selected?.id === o.id && "bg-primary-soft")}
                >
                  <span className="truncate font-medium">{o.name}</span>
                  <span className="shrink-0 text-muted-foreground">{o.university}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground">No verified societies match.</li>
          )}
        </ul>
      </div>
      <PermissionChecklist value={perms} onChange={setPerms} idPrefix="invite" />
      <div className="space-y-1.5">
        <Label htmlFor="collab-message">
          Message <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="collab-message" rows={2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <Button
        type="button"
        disabled={!selected || pending}
        onClick={() =>
          start(async () => {
            if (!selected) return;
            const res = await inviteCollaborator({ eventId, societyId: selected.id, message, perms, ctx: { societySlug } });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success(res.message ?? "Invitation sent.");
            setSelected(null);
            setPerms(NONE);
            setMessage("");
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {selected ? `Invite ${selected.name}` : "Choose a society to invite"}
      </Button>
    </div>
  );
}

export function EditCollaborationPermissions({ collaborationId, societySlug, initial }: { collaborationId: string; societySlug: string; initial: CollabPerms }) {
  const router = useRouter();
  const [perms, setPerms] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = (Object.keys(initial) as (keyof CollabPerms)[]).some((k) => initial[k] !== perms[k]);
  return (
    <div className="space-y-3">
      <PermissionChecklist value={perms} onChange={setPerms} idPrefix={collaborationId} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            const res = await updateCollaborationPermissions(collaborationId, perms, { societySlug });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success(res.message ?? "Saved.");
              router.refresh();
            }
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save permissions
      </Button>
    </div>
  );
}
