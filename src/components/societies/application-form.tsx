"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { describedBy, Field } from "@/components/forms/field";
import { FileUpload } from "@/components/forms/file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveSocietyApplication } from "@/lib/actions/society";
import type { Directory } from "@/lib/data/events";

export type ApplicationValues = {
  id?: string;
  name: string;
  universityId: string;
  campusId: string;
  departmentId: string;
  scopeLabel: string;
  categoryId: string;
  description: string;
  logoPath: string | null;
  websiteUrl: string;
  socialLinks: { url: string }[];
  facultyAdvisorName: string;
  facultyAdvisorTitle: string;
  facultyAdvisorEmail: string;
  presidentName: string;
  presidentEmail: string;
  contactEmail: string;
  contactPhone: string;
  publicContactEmail: string;
  teamSize: string;
  recognitionDetails: string;
  evidencePath: string | null;
  applicantRole: string;
};

const SECTIONS = [
  { id: "society", title: "The society" },
  { id: "people", title: "People and contacts" },
  { id: "recognition", title: "Recognition" },
] as const;

export function SocietyApplicationForm({
  userId,
  directory,
  defaults,
}: {
  userId: string;
  directory: Directory;
  defaults: ApplicationValues;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ApplicationValues>({ defaultValues: defaults });
  const { register, control, setValue, setError, formState } = form;
  const errors = formState.errors;
  const links = useFieldArray({ control, name: "socialLinks" });
  const universityId = useWatch({ control, name: "universityId" });
  const descriptionLength = useWatch({ control, name: "description" })?.trim().length ?? 0;
  const campuses = directory.campuses.filter((c) => c.university_id === universityId);
  const departments = directory.departments.filter((d) => d.university_id === universityId);

  const save = (submit: boolean) =>
    form.handleSubmit((v) => {
      setFormError(null);
      start(async () => {
        const res = await saveSocietyApplication(
          { ...v, socialLinks: v.socialLinks.map((l) => l.url.trim()).filter(Boolean) },
          submit,
        );
        if (!res.ok) {
          setFormError(res.error);
          for (const [k, msgs] of Object.entries(res.fieldErrors ?? {})) {
            if (msgs?.[0]) setError(k as keyof ApplicationValues, { message: msgs[0] });
          }
          return;
        }
        if (!v.id) setValue("id", res.data.id);
        toast.success(res.message ?? "Saved.");
        if (submit) router.push("/dashboard/societies");
        else router.replace(`/societies/apply?id=${res.data.id}`, { scroll: false });
      });
    });

  const text = (name: keyof ApplicationValues, opts?: { required?: string }) =>
    register(name, opts?.required ? { required: opts.required } : undefined);

  return (
    <form onSubmit={save(true)} noValidate className="grid gap-12 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="Sections" className="hidden lg:block">
        <ol className="sticky top-24 space-y-2 text-sm">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="flex gap-2 text-foreground/70 hover:text-foreground">
                <span className="text-signal-ink tabular-nums">{i + 1}.</span> {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-14">
        <fieldset id="society" className="scroll-mt-24 space-y-5">
          <legend className="font-display text-2xl">1. The society</legend>
          <Field id="name" label="Official society name" hint="Exactly as recognised by your university." error={errors.name?.message}>
            <Input id="name" aria-invalid={Boolean(errors.name)} aria-describedby={describedBy("name", errors.name?.message, true)} {...text("name", { required: "Enter the society's name" })} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="universityId" label="University" error={errors.universityId?.message} className="sm:col-span-2">
              <NativeSelect
                id="universityId"
                aria-invalid={Boolean(errors.universityId)}
                {...register("universityId", {
                  required: "Choose the university",
                  onChange: () => {
                    setValue("campusId", "");
                    setValue("departmentId", "");
                  },
                })}
              >
                <option value="">Choose a university</option>
                {directory.universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="campusId" label="Campus" optional>
              <NativeSelect id="campusId" disabled={!campuses.length} {...register("campusId")}>
                <option value="">All campuses / not specific</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="departmentId" label="Department" optional hint="Leave empty for university-wide societies.">
              <NativeSelect id="departmentId" disabled={!departments.length} {...register("departmentId")}>
                <option value="">University-wide</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="categoryId" label="Main focus" optional>
              <NativeSelect id="categoryId" {...register("categoryId")}>
                <option value="">Choose a focus</option>
                {directory.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="scopeLabel" label="Scope" optional hint="For example “University-wide” or “School of Business”.">
              <Input id="scopeLabel" maxLength={120} {...text("scopeLabel")} />
            </Field>
          </div>
          <Field
            id="description"
            label="Description"
            hint={`What the society does and who it is for. At least 80 characters to submit (${descriptionLength}/3000).`}
            error={errors.description?.message}
          >
            <Textarea id="description" rows={6} maxLength={3000} aria-describedby={describedBy("description", errors.description?.message, true)} {...text("description")} />
          </Field>
          <Field id="logo" label="Logo" optional hint="Square JPG, PNG or WebP up to 5 MB.">
            <Controller
              control={control}
              name="logoPath"
              render={({ field }) => <FileUpload id="logo" bucket="media" folder={`users/${userId}`} value={field.value} onChange={field.onChange} label="Upload logo" />}
            />
          </Field>
          <Field id="websiteUrl" label="Website" optional error={errors.websiteUrl?.message}>
            <Input id="websiteUrl" type="url" inputMode="url" placeholder="https://" {...text("websiteUrl")} />
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Social links <span className="font-normal text-muted-foreground">(optional, up to 6)</span>
            </p>
            {links.fields.map((f, i) => (
              <div key={f.id} className="flex gap-2">
                <label htmlFor={`link-${i}`} className="sr-only">
                  Social link {i + 1}
                </label>
                <Input id={`link-${i}`} type="url" placeholder="https://instagram.com/…" {...register(`socialLinks.${i}.url` as const)} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => links.remove(i)}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors.socialLinks?.message ? <p className="text-[13px] text-destructive">{errors.socialLinks.message}</p> : null}
            {links.fields.length < 6 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => links.append({ url: "" })}>
                <Plus /> Add link
              </Button>
            ) : null}
          </div>
        </fieldset>

        <fieldset id="people" className="scroll-mt-24 space-y-5">
          <legend className="font-display text-2xl">2. People and contacts</legend>
          <p className="-mt-2 text-sm leading-6 text-muted-foreground">
            Only platform reviewers see these details. Nothing here is published unless you add a public contact email.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="applicantRole" label="Your role in the society" hint="For example General Secretary." error={errors.applicantRole?.message}>
              <Input id="applicantRole" maxLength={120} {...text("applicantRole")} />
            </Field>
            <Field id="teamSize" label="Current team size" optional error={errors.teamSize?.message}>
              <Input id="teamSize" type="number" min={1} max={5000} inputMode="numeric" {...text("teamSize")} />
            </Field>
            <Field id="presidentName" label="President or chairperson" error={errors.presidentName?.message}>
              <Input id="presidentName" maxLength={120} {...text("presidentName")} />
            </Field>
            <Field id="presidentEmail" label="President's email" optional error={errors.presidentEmail?.message}>
              <Input id="presidentEmail" type="email" {...text("presidentEmail")} />
            </Field>
            <Field id="facultyAdvisorName" label="Faculty advisor" optional>
              <Input id="facultyAdvisorName" maxLength={120} {...text("facultyAdvisorName")} />
            </Field>
            <Field id="facultyAdvisorTitle" label="Advisor's title" optional hint="For example Assistant Professor, SEECS.">
              <Input id="facultyAdvisorTitle" maxLength={120} {...text("facultyAdvisorTitle")} />
            </Field>
            <Field id="facultyAdvisorEmail" label="Advisor's university email" optional error={errors.facultyAdvisorEmail?.message} className="sm:col-span-2">
              <Input id="facultyAdvisorEmail" type="email" {...text("facultyAdvisorEmail")} />
            </Field>
            <Field id="contactEmail" label="Society contact email" hint="Where reviewers can reach the society." error={errors.contactEmail?.message}>
              <Input id="contactEmail" type="email" {...text("contactEmail")} />
            </Field>
            <Field id="contactPhone" label="Contact phone" optional error={errors.contactPhone?.message}>
              <Input id="contactPhone" type="tel" inputMode="tel" placeholder="+92 …" {...text("contactPhone")} />
            </Field>
            <Field
              id="publicContactEmail"
              label="Public contact email"
              optional
              hint="Shown on your public profile. Leave empty to show none."
              error={errors.publicContactEmail?.message}
              className="sm:col-span-2"
            >
              <Input id="publicContactEmail" type="email" {...text("publicContactEmail")} />
            </Field>
          </div>
        </fieldset>

        <fieldset id="recognition" className="scroll-mt-24 space-y-5">
          <legend className="font-display text-2xl">3. Recognition</legend>
          <p className="-mt-2 text-sm leading-6 text-muted-foreground">
            Help reviewers confirm the society is genuine. Explain how the university recognises it, attach evidence, or both.
          </p>
          <Field
            id="recognitionDetails"
            label="How is the society recognised?"
            hint="For example: registered with the Office of Student Affairs in 2021; advisor Dr. … can confirm."
            error={errors.recognitionDetails?.message}
          >
            <Textarea id="recognitionDetails" rows={4} maxLength={2000} {...text("recognitionDetails")} />
          </Field>
          <Field id="evidence" label="Supporting document" optional hint="PDF, JPG or PNG up to 10 MB, such as a notification or letter. Visible only to reviewers.">
            <Controller
              control={control}
              name="evidencePath"
              render={({ field }) => (
                <FileUpload id="evidence" bucket="documents" folder={`applications/${userId}`} value={field.value} onChange={field.onChange} label="Attach document" />
              )}
            />
          </Field>
        </fieldset>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Submit for review
          </Button>
          <Button type="button" variant="outline" size="lg" disabled={pending} onClick={save(false)}>
            Save draft
          </Button>
          <p className="text-sm text-muted-foreground sm:ml-2">Drafts are private. You can come back any time.</p>
        </div>
      </div>
    </form>
  );
}
