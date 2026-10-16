"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { describedBy, Field } from "@/components/forms/field";
import { FileUpload } from "@/components/forms/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile, type ProfileInput } from "@/lib/actions/profile";
import type { Directory } from "@/lib/data/events";
import { ACADEMIC_LEVEL_LABELS } from "@/lib/events/labels";
import { cn } from "@/lib/utils";

export type ProfileValues = {
  fullName: string;
  universityId: string;
  campusId: string;
  departmentId: string;
  program: string;
  academicLevel: string;
  graduationYear: string;
  cityId: string;
  bio: string;
  avatarPath: string | null;
  interests: number[];
};

export function ProfileForm({
  userId,
  directory,
  defaults,
  mode,
  redirectTo,
}: {
  userId: string;
  directory: Directory;
  defaults: ProfileValues;
  mode: "onboarding" | "settings";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<ProfileValues>({ defaultValues: defaults });
  const { register, control, setValue, setError, formState } = form;
  const errors = formState.errors;
  const universityId = useWatch({ control, name: "universityId" });

  const campuses = directory.campuses.filter((c) => c.university_id === universityId);
  const departments = directory.departments.filter((d) => d.university_id === universityId);
  const thisYear = new Date().getFullYear();

  const onSubmit = form.handleSubmit((values) => {
    start(async () => {
      const res = await saveProfile({
        ...values,
        academicLevel: values.academicLevel as ProfileInput["academicLevel"],
        completeOnboarding: mode === "onboarding",
      });
      if (!res.ok) {
        toast.error(res.error);
        for (const [k, v] of Object.entries(res.fieldErrors ?? {})) {
          if (v?.[0]) setError(k as keyof ProfileValues, { message: v[0] });
        }
        return;
      }
      toast.success(mode === "onboarding" ? "You're all set." : "Profile saved.");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10">
      <fieldset className="space-y-5">
        <legend className="font-display text-xl">About you</legend>
        <Field id="fullName" label="Full name" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={describedBy("fullName", errors.fullName?.message)}
            {...register("fullName", { required: "Enter your name", minLength: { value: 2, message: "Enter your name" } })}
          />
        </Field>
        <Field id="avatar" label="Profile photo" optional hint="JPG, PNG or WebP, up to 5 MB. Shown to organisers of events you join.">
          <Controller
            control={control}
            name="avatarPath"
            render={({ field }) => (
              <FileUpload id="avatar" bucket="media" folder={`users/${userId}`} value={field.value} onChange={field.onChange} label="Upload photo" describedBy="avatar-hint" />
            )}
          />
        </Field>
        {mode === "settings" ? (
          <Field id="bio" label="Short bio" optional error={errors.bio?.message}>
            <Textarea id="bio" rows={3} maxLength={600} {...register("bio")} />
          </Field>
        ) : null}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-xl">Where you study</legend>
        <p className="-mt-2 text-sm text-muted-foreground">
          Used to show events at your university and to check eligibility. You can browse everything without it.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="universityId" label="University" optional error={errors.universityId?.message} className="sm:col-span-2">
            <NativeSelect
              id="universityId"
              {...register("universityId", {
                onChange: () => {
                  setValue("campusId", "");
                  setValue("departmentId", "");
                },
              })}
            >
              <option value="">Not specified</option>
              {directory.universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.short_name ? ` (${u.short_name})` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="campusId" label="Campus" optional error={errors.campusId?.message}>
            <NativeSelect id="campusId" disabled={!universityId || campuses.length === 0} {...register("campusId")}>
              <option value="">{universityId && campuses.length === 0 ? "No campuses listed" : "Not specified"}</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="departmentId" label="Department" optional error={errors.departmentId?.message}>
            <NativeSelect id="departmentId" disabled={!universityId || departments.length === 0} {...register("departmentId")}>
              <option value="">{universityId && departments.length === 0 ? "No departments listed" : "Not specified"}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="program" label="Degree or programme" optional hint="For example BS Computer Science" error={errors.program?.message}>
            <Input id="program" maxLength={120} {...register("program")} />
          </Field>
          <Field id="academicLevel" label="Level" optional error={errors.academicLevel?.message}>
            <NativeSelect id="academicLevel" {...register("academicLevel")}>
              <option value="">Not specified</option>
              {Object.entries(ACADEMIC_LEVEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="graduationYear" label="Graduation year" optional error={errors.graduationYear?.message}>
            <Input id="graduationYear" type="number" inputMode="numeric" min={thisYear - 10} max={thisYear + 8} {...register("graduationYear")} />
          </Field>
          <Field id="cityId" label="City" optional error={errors.cityId?.message}>
            <NativeSelect id="cityId" {...register("cityId")}>
              <option value="">Not specified</option>
              {directory.cities.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-display text-xl">Interests</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          We recommend events in these categories and tell you why. Nothing else about your activity is used.
        </p>
        <Controller
          control={control}
          name="interests"
          render={({ field }) => (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Interests">
              {directory.categories.map((c) => {
                const checked = field.value.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:border-foreground/30",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => field.onChange(checked ? field.value.filter((v) => v !== c.id) : [...field.value, c.id])}
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.interests?.message ? <p className="mt-2 text-[13px] text-destructive">{errors.interests.message}</p> : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {mode === "onboarding" ? "Save and continue" : "Save profile"}
        </Button>
        {mode === "onboarding" ? <p className="text-sm text-muted-foreground">You can change any of this later in Settings.</p> : null}
      </div>
    </form>
  );
}
