import { z } from "zod";

/**
 * Custom form schema shared by event registration and volunteer applications.
 * Stored as JSONB in form_versions.fields and validated in three places:
 *   1. this Zod schema (builder + server actions),
 *   2. private.validate_form_fields / validate_form_answers in Postgres,
 *   3. the client renderer for instant feedback.
 */

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "email",
  "number",
  "url",
  "statement",
  "consent",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short answer",
  long_text: "Paragraph",
  single_choice: "Single choice",
  multiple_choice: "Checkboxes",
  dropdown: "Dropdown",
  email: "Email",
  number: "Number",
  url: "Link (URL)",
  statement: "Description text",
  consent: "Consent statement",
};

export const CHOICE_TYPES: FieldType[] = ["single_choice", "multiple_choice", "dropdown"];

export const formFieldSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]{1,40}$/),
    type: z.enum(FIELD_TYPES),
    label: z.string().trim().min(1, "Every question needs a label").max(500),
    help: z.string().trim().max(500).optional(),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .superRefine((f, ctx) => {
    if (CHOICE_TYPES.includes(f.type) && (!f.options || f.options.length === 0)) {
      ctx.addIssue({ code: "custom", message: `"${f.label}" needs at least one option`, path: ["options"] });
    }
    if (f.options && new Set(f.options).size !== f.options.length) {
      ctx.addIssue({ code: "custom", message: `"${f.label}" has duplicate options`, path: ["options"] });
    }
  });

export type FormField = z.infer<typeof formFieldSchema>;

export const formFieldsSchema = z
  .array(formFieldSchema)
  .max(40, "Forms can have at most 40 questions")
  .superRefine((fields, ctx) => {
    const ids = new Set<string>();
    for (const f of fields) {
      if (ids.has(f.id)) ctx.addIssue({ code: "custom", message: `Duplicate question id ${f.id}` });
      ids.add(f.id);
    }
  });

export type AnswerValue = string | number | boolean | string[] | undefined;
export type FormAnswers = Record<string, AnswerValue>;

/** Parses stored JSONB defensively (older/invalid rows become an empty form). */
export function parseStoredFields(value: unknown): FormField[] {
  const parsed = formFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function requiredText(schema: z.ZodString, required: boolean): z.ZodType<AnswerValue, AnswerValue> {
  return required ? schema.min(1, "This question is required") : z.union([schema, z.literal("")]).optional();
}

/** Build a Zod schema that mirrors private.validate_form_answers(). */
export function answersSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodType<AnswerValue, AnswerValue>> = {};
  for (const f of fields) {
    if (f.type === "statement") continue;
    let s: z.ZodType<AnswerValue, AnswerValue>;
    switch (f.type) {
      case "short_text":
        s = requiredText(z.string().trim().max(300, "Keep this under 300 characters"), f.required);
        break;
      case "long_text":
        s = requiredText(z.string().trim().max(5000, "Keep this under 5,000 characters"), f.required);
        break;
      case "email":
        s = requiredText(z.string().trim().max(200).email("Enter a valid email address"), f.required);
        break;
      case "url":
        s = requiredText(z.string().trim().max(500).regex(/^https?:\/\/\S+$/i, "Enter a link starting with https://"), f.required);
        break;
      case "number": {
        let n = z.number({ message: "Enter a number" });
        if (f.min !== undefined) n = n.min(f.min, `Must be at least ${f.min}`);
        if (f.max !== undefined) n = n.max(f.max, `Must be at most ${f.max}`);
        s = f.required ? n : n.optional();
        break;
      }
      case "single_choice":
      case "dropdown": {
        const choice = z.enum((f.options ?? [""]) as [string, ...string[]], { message: "Choose one of the options" });
        s = f.required ? choice : z.union([choice, z.literal("")]).optional();
        break;
      }
      case "multiple_choice":
        {
          const arr = z.array(z.enum((f.options ?? [""]) as [string, ...string[]]));
          s = f.required ? arr.min(1, "Choose at least one option") : arr;
        }
        break;
      case "consent":
        s = f.required ? z.literal(true, { message: "Please confirm to continue" }) : z.boolean();
        break;
    }
    if ((f.type === "multiple_choice" || f.type === "consent") && !f.required) s = s.optional();
    shape[f.id] = s;
  }
  return z.object(shape);
}

/** Drop empty optional answers before sending to the database. */
export function cleanAnswers(fields: FormField[], answers: FormAnswers): FormAnswers {
  const out: FormAnswers = {};
  for (const f of fields) {
    if (f.type === "statement") continue;
    const v = answers[f.id];
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (f.type === "consent" && v !== true)) continue;
    out[f.id] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

export function newFieldId(label: string, existing: string[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "question";
  let id = base;
  let i = 2;
  while (existing.includes(id)) id = `${base}_${i++}`.slice(0, 40);
  return id;
}

/** Human-readable rendering of an answer for organiser views and CSV export. */
export function formatAnswer(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join("; ");
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value);
}
