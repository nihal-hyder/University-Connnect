"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/errors";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Runs a (bound) Server Action, shows the server's message and refreshes the
 * route. Success is only reported after the action resolves with ok: true.
 * With `confirm`, asks first; with `confirm.note`, collects an optional or
 * required note that is passed to the action.
 */
export function ActionButton({
  action,
  children,
  confirm,
  successMessage,
  onDone,
  hrefOnSuccess,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "action"> & {
  action: (note?: string) => Promise<ActionResult<unknown>>;
  confirm?: {
    title: string;
    body?: React.ReactNode;
    confirmLabel?: string;
    destructive?: boolean;
    note?: { label: string; required?: boolean; placeholder?: string };
  };
  successMessage?: string;
  onDone?: () => void;
  /** Navigate after success; ":id" is replaced with the returned data.id. */
  hrefOnSuccess?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  function run() {
    start(async () => {
      const res = await action(confirm?.note ? note.trim() : undefined);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? successMessage ?? "Done.");
      setOpen(false);
      setNote("");
      onDone?.();
      const id = (res.data as { id?: string } | null)?.id;
      if (hrefOnSuccess) router.push(id ? hrefOnSuccess.replace(":id", id) : hrefOnSuccess);
      else router.refresh();
    });
  }

  if (!confirm) {
    return (
      <Button {...buttonProps} disabled={pending || buttonProps.disabled} onClick={run}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {children}
      </Button>
    );
  }

  const noteMissing = Boolean(confirm.note?.required && !note.trim());
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button {...buttonProps} disabled={pending || buttonProps.disabled}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-normal">{confirm.title}</AlertDialogTitle>
          {confirm.body ? <AlertDialogDescription className="leading-6">{confirm.body}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {confirm.note ? (
          <div className="space-y-1.5">
            <Label htmlFor="action-note">
              {confirm.note.label}
              {confirm.note.required ? null : <span className="font-normal text-muted-foreground"> (optional)</span>}
            </Label>
            <Textarea id="action-note" rows={3} maxLength={2000} value={note} placeholder={confirm.note.placeholder} onChange={(e) => setNote(e.target.value)} />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={confirm.destructive ? "destructive" : "default"}
            disabled={pending || noteMissing}
            onClick={(e) => {
              e.preventDefault();
              run();
            }}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {confirm.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
