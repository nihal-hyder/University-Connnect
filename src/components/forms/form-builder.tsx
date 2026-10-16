"use client";

import { useId } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CHOICE_TYPES, FIELD_TYPE_LABELS, FIELD_TYPES, newFieldId, type FieldType, type FormField } from "@/lib/forms/schema";

/**
 * Editor for organiser-defined questions. Produces the JSON stored in
 * form_versions.fields. When submissions already exist the database saves a
 * new version, so existing answers always keep the questions they answered.
 */
export function FormBuilder({
  value,
  onChange,
  hasSubmissions = false,
  errors,
}: {
  value: FormField[];
  onChange: (fields: FormField[]) => void;
  hasSubmissions?: boolean;
  errors?: string[];
}) {
  const baseId = useId();

  function update(index: number, patch: Partial<FormField>) {
    onChange(value.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function move(index: number, by: -1 | 1) {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  }
  function add(type: FieldType) {
    const label = type === "consent" ? "I agree to the event terms and code of conduct." : type === "statement" ? "Add information for applicants here." : "";
    const field: FormField = {
      id: newFieldId(label || FIELD_TYPE_LABELS[type], value.map((f) => f.id)),
      type,
      label,
      required: type === "consent",
      ...(CHOICE_TYPES.includes(type) ? { options: ["Option 1", "Option 2"] } : {}),
    };
    onChange([...value, field]);
  }

  return (
    <div className="space-y-4">
      {hasSubmissions ? (
        <p className="rounded-lg bg-info-soft px-4 py-3 text-sm leading-6 text-info">
          People have already answered this form. Saving changes creates a new version for future submissions; earlier answers
          stay linked to the questions they were given.
        </p>
      ) : null}
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No extra questions. We already collect each person&rsquo;s name and email from their account, so only add what you need.
        </p>
      ) : null}

      <ol className="space-y-3">
        {value.map((f, i) => {
          const id = `${baseId}-${i}`;
          const isChoice = CHOICE_TYPES.includes(f.type);
          return (
            <li key={f.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">Q{i + 1}</span>
                <label htmlFor={`${id}-type`} className="sr-only">
                  Question type
                </label>
                <NativeSelect
                  id={`${id}-type`}
                  value={f.type}
                  className="w-44"
                  onChange={(e) => {
                    const type = e.target.value as FieldType;
                    update(i, {
                      type,
                      options: CHOICE_TYPES.includes(type) ? (f.options?.length ? f.options : ["Option 1", "Option 2"]) : undefined,
                      min: type === "number" ? f.min : undefined,
                      max: type === "number" ? f.max : undefined,
                    });
                  }}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
                {f.type !== "statement" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox id={`${id}-req`} checked={f.required} onCheckedChange={(c) => update(i, { required: c === true })} />
                    <Label htmlFor={`${id}-req`} className="text-sm font-normal">
                      Required
                    </Label>
                  </div>
                ) : null}
                <div className="ml-auto flex items-center">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move question ${i + 1} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete question ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-label`} className="text-sm">
                    {f.type === "statement" ? "Text to show" : f.type === "consent" ? "Statement people must agree to" : "Question"}
                  </Label>
                  {f.type === "statement" || f.type === "consent" ? (
                    <Textarea id={`${id}-label`} rows={2} maxLength={500} value={f.label} onChange={(e) => update(i, { label: e.target.value })} />
                  ) : (
                    <Input id={`${id}-label`} maxLength={500} value={f.label} placeholder="e.g. Which track are you interested in?" onChange={(e) => update(i, { label: e.target.value })} />
                  )}
                </div>
                {f.type !== "statement" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-help`} className="text-sm">
                      Help text <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input id={`${id}-help`} maxLength={500} value={f.help ?? ""} onChange={(e) => update(i, { help: e.target.value || undefined })} />
                  </div>
                ) : null}
                {isChoice ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-options`} className="text-sm">
                      Options, one per line
                    </Label>
                    <Textarea
                      id={`${id}-options`}
                      rows={Math.min(8, Math.max(3, f.options?.length ?? 2))}
                      value={(f.options ?? []).join("\n")}
                      onChange={(e) => update(i, { options: e.target.value.split("\n").map((o) => o.trimStart()).slice(0, 30) })}
                      onBlur={(e) => update(i, { options: Array.from(new Set(e.target.value.split("\n").map((o) => o.trim()).filter(Boolean))).slice(0, 30) })}
                    />
                  </div>
                ) : null}
                {f.type === "number" ? (
                  <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${id}-min`} className="text-sm">
                        Minimum
                      </Label>
                      <Input id={`${id}-min`} type="number" value={f.min ?? ""} onChange={(e) => update(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${id}-max`} className="text-sm">
                        Maximum
                      </Label>
                      <Input id={`${id}-max`} type="number" value={f.max ?? ""} onChange={(e) => update(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {errors?.length ? (
        <ul role="alert" className="space-y-1 text-[13px] text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      {value.length < 40 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Add:</span>
          {(["short_text", "long_text", "single_choice", "multiple_choice", "dropdown", "email", "number", "url", "consent", "statement"] as FieldType[]).map((t) => (
            <Button key={t} type="button" size="sm" variant="outline" onClick={() => add(t)}>
              <Plus /> {FIELD_TYPE_LABELS[t]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
