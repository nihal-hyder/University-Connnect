"use client";

import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FormAnswers, FormField } from "@/lib/forms/schema";

type Props = {
  fields: FormField[];
  register: UseFormRegister<FormAnswers>;
  control: Control<FormAnswers>;
  errors: FieldErrors<FormAnswers>;
  idPrefix: string;
};

/** Renders organiser-defined questions. Accessible labels, hints and errors. */
export function FormRenderer({ fields, register, control, errors, idPrefix }: Props) {
  return (
    <div className="space-y-6">
      {fields.map((f) => {
        const id = `${idPrefix}-${f.id}`;
        const error = errors[f.id]?.message as string | undefined;
        const describedBy = [f.help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

        if (f.type === "statement") {
          return (
            <div key={f.id} className="rounded-lg bg-secondary/60 p-4 text-sm leading-6 whitespace-pre-line text-foreground/85">
              {f.label}
            </div>
          );
        }

        const label = (
          <span>
            {f.label}
            {f.required ? <span className="text-destructive" aria-hidden> *</span> : <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
          </span>
        );
        const help = f.help ? (
          <p id={`${id}-help`} className="text-[13px] text-muted-foreground">
            {f.help}
          </p>
        ) : null;
        const err = error ? (
          <p id={`${id}-error`} role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null;

        if (f.type === "single_choice" || f.type === "multiple_choice") {
          const multiple = f.type === "multiple_choice";
          return (
            <fieldset key={f.id} className="space-y-2" aria-describedby={describedBy}>
              <legend className="text-sm font-medium">{label}</legend>
              {help}
              <div className="space-y-2 pt-1">
                {(f.options ?? []).map((opt, i) => (
                  <label key={opt} htmlFor={`${id}-${i}`} className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input
                      id={`${id}-${i}`}
                      type={multiple ? "checkbox" : "radio"}
                      value={opt}
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                      aria-invalid={Boolean(error)}
                      {...register(f.id)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {err}
            </fieldset>
          );
        }

        if (f.type === "consent") {
          return (
            <div key={f.id} className="space-y-1.5">
              <Controller
                control={control}
                name={f.id}
                render={({ field }) => (
                  <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-6">
                    <Checkbox
                      id={id}
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      aria-invalid={Boolean(error)}
                      aria-describedby={describedBy}
                      className="mt-1"
                    />
                    {label}
                  </label>
                )}
              />
              {help}
              {err}
            </div>
          );
        }

        return (
          <div key={f.id} className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-medium">
              {label}
            </Label>
            {help}
            {f.type === "long_text" ? (
              <Textarea id={id} rows={4} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...register(f.id)} />
            ) : f.type === "dropdown" ? (
              <NativeSelect id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} defaultValue="" {...register(f.id)}>
                <option value="" disabled={f.required}>
                  Choose…
                </option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={id}
                type={f.type === "email" ? "email" : f.type === "url" ? "url" : f.type === "number" ? "number" : "text"}
                inputMode={f.type === "number" ? "decimal" : undefined}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                {...register(f.id, f.type === "number" ? { setValueAs: (v) => (v === "" ? undefined : Number(v)) } : undefined)}
              />
            )}
            {err}
          </div>
        );
      })}
    </div>
  );
}

/** Default values so checkbox groups start as arrays and consents as false. */
export function defaultAnswers(fields: FormField[]): FormAnswers {
  const out: FormAnswers = {};
  for (const f of fields) {
    if (f.type === "multiple_choice") out[f.id] = [];
    else if (f.type === "consent") out[f.id] = false;
    else if (f.type !== "statement" && f.type !== "number") out[f.id] = "";
  }
  return out;
}
