"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { addDirectoryEntry } from "@/lib/actions/admin";

type Kind = "university" | "campus" | "department" | "category";

export function DirectoryForm({ universities, cities }: { universities: { id: string; name: string }[]; cities: { id: number; name: string }[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("department");
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;
        const cityId = fd.cityId ? Number(fd.cityId) : undefined;
        const input =
          kind === "university"
            ? { kind, name: fd.name, shortName: fd.shortName, cityId, websiteUrl: fd.websiteUrl }
            : kind === "campus"
              ? { kind, universityId: fd.universityId, name: fd.name, cityId }
              : kind === "department"
                ? { kind, universityId: fd.universityId, name: fd.name }
                : { kind, name: fd.name, description: fd.description };
        start(async () => {
          const res = await addDirectoryEntry(input);
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Added.");
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="dir-kind">Add a</Label>
        <NativeSelect id="dir-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="university">University</option>
          <option value="campus">Campus</option>
          <option value="department">Department</option>
          <option value="category">Event category</option>
        </NativeSelect>
      </div>
      {kind === "campus" || kind === "department" ? (
        <div className="space-y-1.5">
          <Label htmlFor="dir-uni">University</Label>
          <NativeSelect id="dir-uni" name="universityId" required>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="dir-name">Official name</Label>
        <Input id="dir-name" name="name" required maxLength={160} />
        <p className="text-[13px] text-muted-foreground">Use the official spelling. Duplicates (ignoring case) are rejected so filters stay clean.</p>
      </div>
      {kind === "university" ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="dir-short">Short name</Label>
            <Input id="dir-short" name="shortName" maxLength={30} placeholder="e.g. NUST" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dir-web">Website</Label>
            <Input id="dir-web" name="websiteUrl" type="url" placeholder="https://" />
          </div>
        </>
      ) : null}
      {kind === "university" || kind === "campus" ? (
        <div className="space-y-1.5">
          <Label htmlFor="dir-city">City</Label>
          <NativeSelect id="dir-city" name="cityId">
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      {kind === "category" ? (
        <div className="space-y-1.5">
          <Label htmlFor="dir-desc">Description</Label>
          <Input id="dir-desc" name="description" maxLength={240} />
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Add
      </Button>
    </form>
  );
}
