"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { NativeSelect } from "@/components/ui/native-select";
import { inviteMember, transferOwnership, updateMemberRole } from "@/lib/actions/society";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type SocietyRole } from "@/lib/permissions";

type Assignable = Exclude<SocietyRole, "owner">;

export function InviteMemberForm({ societyId, slug, roles }: { societyId: string; slug: string; roles: Assignable[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Assignable>(roles.includes("event_manager") ? "event_manager" : roles[0]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await inviteMember({ societyId, slug, email, role });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          toast.success(res.message ?? "Invitation sent.");
          setEmail("");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">Email address</Label>
        <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@university.edu.pk" />
        <p className="text-[13px] text-muted-foreground">They accept from their dashboard after signing in with this email.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <NativeSelect id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Assignable)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
        <p className="text-[13px] text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !email}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Send invitation
      </Button>
    </form>
  );
}

export function MemberRoleSelect({ membershipId, slug, current, roles, label }: { membershipId: string; slug: string; current: Assignable; roles: Assignable[]; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`role-${membershipId}`} className="sr-only">
        Role for {label}
      </label>
      <NativeSelect
        id={`role-${membershipId}`}
        className="w-52"
        defaultValue={current}
        disabled={pending}
        onChange={(e) => {
          const role = e.target.value as Assignable;
          start(async () => {
            const res = await updateMemberRole({ membershipId, slug, role });
            if (!res.ok) {
              toast.error(res.error);
              e.target.value = current;
            } else {
              toast.success(res.message ?? "Role updated.");
              router.refresh();
            }
          });
        }}
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </NativeSelect>
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Saving" /> : null}
    </div>
  );
}

export function TransferOwnershipDialog({ societyId, slug, members }: { societyId: string; slug: string; members: { userId: string; name: string }[] }) {
  const router = useRouter();
  const [to, setTo] = useState(members[0]?.userId ?? "");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!members.length}>
          Transfer ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Transfer ownership</DialogTitle>
          <DialogDescription className="leading-6">
            The new owner gets full control, including managing administrators. You become an administrator. Only they can transfer it back.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-owner">New owner</Label>
            <NativeSelect id="new-owner" value={to} onChange={(e) => setTo(e.target.value)}>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-confirm">
              Type <span className="font-mono">transfer</span> to confirm
            </Label>
            <Input id="transfer-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          {error ? (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending || confirm.trim().toLowerCase() !== "transfer" || !to}
            onClick={() =>
              start(async () => {
                const res = await transferOwnership({ societyId, slug, newOwnerId: to, confirm });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                toast.success(res.message ?? "Ownership transferred.");
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
