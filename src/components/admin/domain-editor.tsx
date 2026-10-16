"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setUniversityDomains } from "@/lib/actions/admin";

/** Edit the email domains that count as a verified university email. */
export function DomainEditor({ universityId, name, initial }: { universityId: string; name: string; initial: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState(initial.join(", "));
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await setUniversityDomains(universityId, value);
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Saved.");
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor={`dom-${universityId}`} className="text-xs text-muted-foreground">
        Email domains
      </label>
      <Input
        id={`dom-${universityId}`}
        aria-label={`Email domains for ${name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="nust.edu.pk, seecs.edu.pk"
        className="h-8 max-w-sm font-mono text-xs"
      />
      <Button type="submit" size="xs" variant="outline" disabled={pending || value === initial.join(", ")}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save
      </Button>
    </form>
  );
}
