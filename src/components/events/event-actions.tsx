"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Flag, Link as LinkIcon, Share2 } from "lucide-react";
import { toast } from "sonner";
import { submitReport, toggleSavedEvent } from "@/app/(public)/events/[slug]/actions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function SaveEventButton({ eventId, initialSaved, signedIn }: { eventId: string; initialSaved: boolean; signedIn: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Button
      variant="outline"
      aria-pressed={saved}
      disabled={pending}
      onClick={() => {
        if (!signedIn) return router.push(`/login?next=${encodeURIComponent(pathname)}`);
        start(async () => {
          const res = await toggleSavedEvent(eventId, !saved);
          if (res.ok) {
            setSaved(res.data.saved);
            toast.success(res.data.saved ? "Saved. We'll remind you before registration closes." : "Removed from saved");
          } else toast.error(res.error);
        });
      }}
    >
      {saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

const noop = () => () => {};

/** Share menu: WhatsApp first (how most campus news travels), then copy / native share. */
export function ShareButton({ title, url, summary }: { title: string; url: string; summary?: string }) {
  const message = [title, summary, url].filter(Boolean).join("\n");
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Share2 />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            } catch {
              toast.error("Could not copy the link. You can copy it from the address bar.");
            }
          }}
        >
          <LinkIcon /> Copy link
        </DropdownMenuItem>
        {canShare ? (
          <DropdownMenuItem
            onSelect={() => {
              navigator.share({ title, text: summary, url }).catch(() => undefined);
            }}
          >
            <Share2 /> More options…
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.96L2 22l5.2-1.5A9.94 9.94 0 1 0 12.04 2Zm0 18.13a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.08.9.9-3-.2-.31a8.21 8.21 0 1 1 6.86 3.74Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.74 6.74 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.43l-.75-1.8c-.2-.47-.4-.4-.55-.41h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.69c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

const REASONS = [
  ["fraudulent_event", "Fraudulent or fake event"],
  ["impersonation", "Impersonating a society or university"],
  ["misleading_fees", "Misleading fees or payment details"],
  ["spam", "Spam"],
  ["inappropriate_content", "Inappropriate content"],
  ["misuse_of_data", "Misuse of participant information"],
  ["other", "Something else"],
] as const;

export function ReportDialog({ target, targetId, signedIn }: { target: "event" | "society"; targetId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number][0] | "">("");
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  if (!signedIn) {
    return (
      <Button variant="link" size="sm" className="px-0 text-muted-foreground" onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>
        <Flag /> Report this {target}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="px-0 text-muted-foreground">
          <Flag /> Report this {target}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">Report this {target}</DialogTitle>
          <DialogDescription>Reports go to the platform team, not to the organisers. Your identity is not shared with them.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">Reason</Label>
            <NativeSelect id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              <option value="" disabled>Choose a reason</option>
              {REASONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea id="report-details" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!reason || pending}
            onClick={() =>
              start(async () => {
                if (!reason) return;
                const res = await submitReport({ target, targetId, reason, details });
                if (res.ok) {
                  toast.success(res.message ?? "Report submitted");
                  setOpen(false);
                } else toast.error(res.error);
              })
            }
          >
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
