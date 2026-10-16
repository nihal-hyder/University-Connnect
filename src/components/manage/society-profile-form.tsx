"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { FileUpload } from "@/components/forms/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { updateSocietyProfile } from "@/lib/actions/society";

type Values = {
  scopeLabel: string;
  categoryId: string;
  description: string;
  logoPath: string | null;
  websiteUrl: string;
  socialLinks: { url: string }[];
  publicContactEmail: string;
  campusId: string;
  departmentId: string;
};

export function SocietyProfileForm({
  societyId,
  defaults,
  categories,
  campuses,
  departments,
}: {
  societyId: string;
  defaults: Values;
  categories: { id: number; name: string }[];
  campuses: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<Values>({ defaultValues: defaults });
  const { register, control, setError, formState } = form;
  const links = useFieldArray({ control, name: "socialLinks" });
  const e = formState.errors;

  return (
    <form
      noValidate
      className="max-w-2xl space-y-6"
      onSubmit={form.handleSubmit((v) =>
        start(async () => {
          const res = await updateSocietyProfile({ societyId, ...v, socialLinks: v.socialLinks.map((l) => l.url.trim()).filter(Boolean) });
          if (!res.ok) {
            toast.error(res.error);
            for (const [k, m] of Object.entries(res.fieldErrors ?? {})) if (m?.[0]) setError(k as keyof Values, { message: m[0] });
            return;
          }
          toast.success(res.message ?? "Saved.");
          router.refresh();
        }),
      )}
    >
      <Field id="logo" label="Logo" optional>
        <Controller
          control={control}
          name="logoPath"
          render={({ field }) => <FileUpload id="logo" bucket="media" folder={`societies/${societyId}`} value={field.value} onChange={field.onChange} label="Upload logo" />}
        />
      </Field>
      <Field id="description" label="About the society" error={e.description?.message}>
        <Textarea id="description" rows={7} maxLength={3000} {...register("description")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="categoryId" label="Main focus" optional>
          <NativeSelect id="categoryId" {...register("categoryId")}>
            <option value="">Not specified</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="scopeLabel" label="Scope" optional>
          <Input id="scopeLabel" maxLength={120} {...register("scopeLabel")} />
        </Field>
        <Field id="campusId" label="Campus" optional>
          <NativeSelect id="campusId" disabled={!campuses.length} {...register("campusId")}>
            <option value="">All campuses</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="departmentId" label="Department" optional>
          <NativeSelect id="departmentId" disabled={!departments.length} {...register("departmentId")}>
            <option value="">University-wide</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id="websiteUrl" label="Website" optional error={e.websiteUrl?.message}>
        <Input id="websiteUrl" type="url" placeholder="https://" {...register("websiteUrl")} />
      </Field>
      <Field id="publicContactEmail" label="Public contact email" optional hint="Shown on your public profile." error={e.publicContactEmail?.message}>
        <Input id="publicContactEmail" type="email" {...register("publicContactEmail")} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Social links <span className="font-normal text-muted-foreground">(up to 6)</span>
        </p>
        {links.fields.map((f, i) => (
          <div key={f.id} className="flex gap-2">
            <label htmlFor={`sl-${i}`} className="sr-only">
              Link {i + 1}
            </label>
            <Input id={`sl-${i}`} type="url" {...register(`socialLinks.${i}.url` as const)} />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => links.remove(i)}>
              <Trash2 />
            </Button>
          </div>
        ))}
        {e.socialLinks?.message ? <p className="text-[13px] text-destructive">{e.socialLinks.message}</p> : null}
        {links.fields.length < 6 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => links.append({ url: "" })}>
            <Plus /> Add link
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">The society&rsquo;s name and university are part of its verification. Contact support to change them.</p>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  );
}
