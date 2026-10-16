"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { describedBy, Field } from "@/components/forms/field";
import { FileUpload } from "@/components/forms/file-upload";
import { FormBuilder } from "@/components/forms/form-builder";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveEvent, submitEvent } from "@/lib/actions/events";
import type { Directory } from "@/lib/data/events";
import { emptyRole, eventFormSchema, publishProblems, STEP_FIELDS, type EventFormValues } from "@/lib/events/event-schema";
import { ACADEMIC_LEVEL_LABELS, ELIGIBILITY_LABELS, EVENT_FORMAT_LABELS, EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { cn } from "@/lib/utils";
import { InviteCollaboratorForm, type CollabSocietyOption } from "./invite-collaborator";

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "logistics", label: "Logistics" },
  { key: "registration", label: "Registration" },
  { key: "fees", label: "Fees" },
  { key: "volunteers", label: "Volunteers" },
  { key: "collaboration", label: "Collaboration" },
  { key: "review", label: "Review" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export type WizardProps = {
  society: { id: string; slug: string; name: string; eventsRequireReview: boolean };
  directory: Directory;
  defaults: EventFormValues;
  status: string | null;
  formHasSubmissions: boolean;
  permissions: { publish: boolean; manageVolunteers: boolean; manageCollaborations: boolean; isHost: boolean };
  collabSocieties: CollabSocietyOption[];
};

export function EventWizard({ society, directory, defaults, status, formHasSubmissions, permissions, collabSocieties }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("basics");
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<EventFormValues>({ resolver: zodResolver(eventFormSchema), defaultValues: defaults, mode: "onTouched" });
  const { register, control, setValue, formState, trigger, setError } = form;
  const errors = formState.errors;
  const agenda = useFieldArray({ control, name: "agenda" });
  const speakers = useFieldArray({ control, name: "speakers" });
  const roles = useFieldArray({ control, name: "roles", keyName: "_key" });

  const values = useWatch({ control }) as EventFormValues;
  const eventId = values.id;
  const slugLocked = Boolean(status && status !== "draft");
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const campuses = directory.campuses.filter((c) => c.university_id === values.universityId);
  const err = (name: string) => {
    const parts = name.split(".");
    let node: unknown = errors;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    return (node as { message?: string } | undefined)?.message;
  };

  async function go(to: StepKey) {
    const fields = STEP_FIELDS[step];
    if (fields && STEPS.findIndex((s) => s.key === to) > stepIndex) {
      const valid = await trigger(fields as FieldPath<EventFormValues>[]);
      if (!valid) {
        toast.error("Please fix the highlighted fields first.");
        return;
      }
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function persist(then?: "submit") {
    setServerError(null);
    return form.handleSubmit(
      (v) =>
        start(async () => {
          const res = await saveEvent({ societyId: society.id, societySlug: society.slug, values: v });
          if (!res.ok) {
            setServerError(res.error);
            for (const [k, msgs] of Object.entries(res.fieldErrors ?? {})) {
              if (msgs?.[0]) setError(k as FieldPath<EventFormValues>, { message: msgs[0] });
            }
            toast.error(res.error);
            return;
          }
          if (!v.id) setValue("id", res.data.id);
          setValue("slug", res.data.slug);
          if (then === "submit") {
            const sub = await submitEvent(res.data.id, { societySlug: society.slug, eventSlug: res.data.slug });
            if (!sub.ok) {
              setServerError(sub.error);
              toast.error(sub.error);
              router.replace(`/manage/${society.slug}/events/${res.data.id}/edit`);
              return;
            }
            toast.success(sub.message ?? "Submitted.");
            router.push(`/manage/${society.slug}/events/${res.data.id}`);
            return;
          }
          toast.success(res.message ?? "Saved.");
          if (!v.id) router.replace(`/manage/${society.slug}/events/${res.data.id}/edit`, { scroll: false });
          else router.refresh();
        }),
      () => toast.error("Some fields need attention. Check each step marked in red."),
    )();
  }

  const stepHasError = (key: StepKey) => (STEP_FIELDS[key] ?? []).some((f) => errors[f as keyof typeof errors]);
  const problems = publishProblems(values);
  const canSubmit = permissions.publish && permissions.isHost && (!status || ["draft", "changes_requested", "rejected"].includes(status));

  return (
    <div className="grid gap-8 xl:grid-cols-[11rem_minmax(0,1fr)]">
      <nav aria-label="Event steps" className="xl:sticky xl:top-24 xl:self-start">
        <ol className="flex gap-1 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => (i <= stepIndex ? setStep(s.key) : go(s.key))}
                aria-current={s.key === step ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors hover:bg-secondary",
                  s.key === step ? "bg-surface font-medium shadow-[inset_2px_0_0_var(--signal)]" : "text-foreground/70",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums",
                    stepHasError(s.key) ? "border-destructive text-destructive" : i < stepIndex ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {i < stepIndex && !stepHasError(s.key) ? <Check className="size-3" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={(e) => e.preventDefault()} noValidate className="min-w-0">
        {step === "basics" ? (
          <StepFrame title="Basics" description="What the event is. This is what students see first.">
            <Field id="title" label="Event title" error={err("title")}>
              <Input id="title" maxLength={140} aria-invalid={Boolean(err("title"))} aria-describedby={describedBy("title", err("title"))} {...register("title")} />
            </Field>
            <Field
              id="slug"
              label="Link"
              optional={!slugLocked}
              hint={slugLocked ? "The link can't change after an event is submitted." : "Leave empty to create one from the title."}
              error={err("slug")}
            >
              <div className="flex items-center rounded-lg border border-input bg-surface focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
                <span className="pl-3 text-sm text-muted-foreground">/events/</span>
                <input id="slug" disabled={slugLocked} className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none disabled:opacity-60" {...register("slug")} />
              </div>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="eventType" label="Type" error={err("eventType")}>
                <NativeSelect id="eventType" {...register("eventType")}>
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {k === "other" ? "Other" : l}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="categoryId" label="Category" hint="Required to publish." error={err("categoryId")}>
                <NativeSelect id="categoryId" {...register("categoryId")}>
                  <option value="">Choose a category</option>
                  {directory.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field id="summary" label="One-line summary" optional hint="Shown on event cards and link previews." error={err("summary")}>
              <Input id="summary" maxLength={280} {...register("summary")} />
            </Field>
            <Field id="description" label="Description" hint={`At least 50 characters to publish (${values.description.trim().length}).`} error={err("description")}>
              <Textarea id="description" rows={8} maxLength={12000} {...register("description")} />
            </Field>
            <Field id="cover" label="Cover image" optional hint="Landscape, at least 1600×900. Without one we generate tasteful artwork.">
              <Controller
                control={control}
                name="coverPath"
                render={({ field }) => (
                  <FileUpload id="cover" bucket="media" folder={`societies/${society.id}`} value={field.value} onChange={field.onChange} aspect="wide" label="Upload cover" />
                )}
              />
            </Field>
            <Field id="tags" label="Tags" optional hint="Comma-separated, up to 10. For example: ai, beginners, prizes." error={err("tags")}>
              <Input id="tags" {...register("tags")} />
            </Field>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                Agenda <span className="font-normal text-muted-foreground">(optional)</span>
              </h3>
              {agenda.fields.map((f, i) => (
                <div key={f.id} className="grid gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[7rem_1fr_auto]">
                  <Input aria-label={`Agenda item ${i + 1} time`} placeholder="10:00 am" {...register(`agenda.${i}.time`)} />
                  <div className="space-y-2">
                    <Input aria-label={`Agenda item ${i + 1} title`} placeholder="Opening ceremony" aria-invalid={Boolean(err(`agenda.${i}.title`))} {...register(`agenda.${i}.title`)} />
                    <Input aria-label={`Agenda item ${i + 1} details`} placeholder="Details (optional)" {...register(`agenda.${i}.detail`)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove agenda item ${i + 1}`} onClick={() => agenda.remove(i)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => agenda.append({ time: "", title: "", detail: "" })}>
                <Plus /> Add agenda item
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                Speakers or hosts <span className="font-normal text-muted-foreground">(optional)</span>
              </h3>
              {speakers.fields.map((f, i) => (
                <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                  <Input aria-label={`Speaker ${i + 1} name`} placeholder="Name" {...register(`speakers.${i}.name`)} />
                  <Input aria-label={`Speaker ${i + 1} title`} placeholder="Role or organisation" {...register(`speakers.${i}.title`)} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove speaker ${i + 1}`} onClick={() => speakers.remove(i)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => speakers.append({ name: "", title: "" })}>
                <Plus /> Add speaker
              </Button>
            </div>
          </StepFrame>
        ) : null}

        {step === "logistics" ? (
          <StepFrame title="Logistics" description="When and where. Times are in Pakistan Standard Time (PKT).">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="startsAt" label="Starts" error={err("startsAt")}>
                <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
              </Field>
              <Field id="endsAt" label="Ends" error={err("endsAt")}>
                <Input id="endsAt" type="datetime-local" {...register("endsAt")} />
              </Field>
            </div>
            <Field id="format" label="Format">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Format">
                {(["in_person", "online", "hybrid"] as const).map((f) => (
                  <label
                    key={f}
                    className={cn(
                      "cursor-pointer rounded-full border px-4 py-1.5 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                      values.format === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface",
                    )}
                  >
                    <input type="radio" value={f} className="sr-only" {...register("format")} />
                    {EVENT_FORMAT_LABELS[f]}
                  </label>
                ))}
              </div>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="universityId" label="Host university" optional error={err("universityId")}>
                <NativeSelect id="universityId" {...register("universityId", { onChange: () => setValue("campusId", "") })}>
                  <option value="">Not at a university</option>
                  {directory.universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="campusId" label="Campus" optional>
                <NativeSelect id="campusId" disabled={!campuses.length} {...register("campusId")}>
                  <option value="">Not specified</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {values.format !== "online" ? (
                <>
                  <Field id="venue" label="Venue" hint="Building and room, for example “SEECS, Main Hall”." error={err("venue")}>
                    <Input id="venue" maxLength={200} {...register("venue")} />
                  </Field>
                  <Field id="cityId" label="City" error={err("cityId")}>
                    <NativeSelect id="cityId" {...register("cityId")}>
                      <option value="">Choose a city</option>
                      {directory.cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </>
              ) : null}
            </div>
            {values.format !== "in_person" ? (
              <Field id="onlineUrl" label="Online meeting link" optional hint="Only shown to confirmed participants, never on the public page." error={err("onlineUrl")}>
                <Input id="onlineUrl" type="url" placeholder="https://" {...register("onlineUrl")} />
              </Field>
            ) : null}
            <Field id="accessibilityInfo" label="Accessibility" optional hint="Step-free access, prayer space, women's facilities, how to request support." error={err("accessibilityInfo")}>
              <Textarea id="accessibilityInfo" rows={3} maxLength={1000} {...register("accessibilityInfo")} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="contactEmail" label="Public contact email" optional error={err("contactEmail")}>
                <Input id="contactEmail" type="email" {...register("contactEmail")} />
              </Field>
              <Field id="contactPhone" label="Public contact phone" optional hint="Shown on the event page." error={err("contactPhone")}>
                <Input id="contactPhone" type="tel" {...register("contactPhone")} />
              </Field>
            </div>
          </StepFrame>
        ) : null}

        {step === "registration" ? (
          <StepFrame title="Eligibility and registration" description="Who can take part and how they sign up.">
            <Field id="eligibilityScope" label="Who can register">
              <NativeSelect id="eligibilityScope" {...register("eligibilityScope")}>
                {Object.entries(ELIGIBILITY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {values.eligibilityScope === "selected_universities" ? (
              <Controller
                control={control}
                name="targetUniversityIds"
                render={({ field }) => (
                  <fieldset>
                    <legend className="text-sm font-medium">Eligible universities</legend>
                    <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border border-border bg-surface p-3 sm:grid-cols-2">
                      {directory.universities.map((u) => {
                        const checked = field.value.includes(u.id);
                        return (
                          <label key={u.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={checked} onCheckedChange={(c) => field.onChange(c ? [...field.value, u.id] : field.value.filter((x) => x !== u.id))} />
                            {u.short_name ?? u.name}
                          </label>
                        );
                      })}
                    </div>
                    {err("targetUniversityIds") ? <p className="mt-1 text-[13px] text-destructive">{err("targetUniversityIds")}</p> : null}
                  </fieldset>
                )}
              />
            ) : null}
            <Controller
              control={control}
              name="eligibleLevels"
              render={({ field }) => (
                <fieldset>
                  <legend className="text-sm font-medium">
                    Academic levels <span className="font-normal text-muted-foreground">(leave all unticked for everyone)</span>
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {Object.entries(ACADEMIC_LEVEL_LABELS).map(([k, l]) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(k as never)}
                          onCheckedChange={(c) => field.onChange(c ? [...field.value, k] : field.value.filter((x) => x !== k))}
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            />
            <Field id="eligibilityNotes" label="Other eligibility notes" optional>
              <Textarea id="eligibilityNotes" rows={2} maxLength={1000} {...register("eligibilityNotes")} />
            </Field>

            <div className="border-t border-border pt-6">
              <Field id="registrationMode" label="Registration">
                <NativeSelect id="registrationMode" {...register("registrationMode")}>
                  <option value="individual">Individuals register here</option>
                  <option value="team">Teams register here</option>
                  <option value="external">On an external website</option>
                  <option value="none">No registration needed</option>
                </NativeSelect>
              </Field>
            </div>
            {values.registrationMode === "external" ? (
              <Field id="externalRegistrationUrl" label="Registration link" error={err("externalRegistrationUrl")}>
                <Input id="externalRegistrationUrl" type="url" placeholder="https://" {...register("externalRegistrationUrl")} />
              </Field>
            ) : null}
            {values.registrationMode === "team" ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="teamMin" label="Minimum team size" error={err("teamMin")}>
                  <Input id="teamMin" type="number" min={1} max={20} {...register("teamMin")} />
                </Field>
                <Field id="teamMax" label="Maximum team size" error={err("teamMax")}>
                  <Input id="teamMax" type="number" min={1} max={20} {...register("teamMax")} />
                </Field>
              </div>
            ) : null}
            {values.registrationMode === "individual" || values.registrationMode === "team" ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="registrationOpensAt" label="Registration opens" optional hint="Empty means as soon as it's published." error={err("registrationOpensAt")}>
                    <Input id="registrationOpensAt" type="datetime-local" {...register("registrationOpensAt")} />
                  </Field>
                  <Field id="registrationClosesAt" label="Registration closes" optional hint="Empty means when the event starts." error={err("registrationClosesAt")}>
                    <Input id="registrationClosesAt" type="datetime-local" {...register("registrationClosesAt")} />
                  </Field>
                  <Field id="capacity" label={values.registrationMode === "team" ? "Capacity (teams)" : "Capacity"} optional hint="Empty means unlimited." error={err("capacity")}>
                    <Input id="capacity" type="number" min={1} inputMode="numeric" {...register("capacity")} />
                  </Field>
                </div>
                <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Every registration is reviewed.</span> People who register wait as
                  &ldquo;Awaiting approval&rdquo; until someone in your team confirms them under Registrations. Your team is
                  notified as registrations arrive, and a confirmed person receives their ticket.
                </p>
                <ToggleRow
                  id="requireUniversityEmail"
                  title="Only verified university emails"
                  body="People must have signed up with an email on an eligible university's domain (for example @nu.edu.pk). Reduces fake and duplicate registrations."
                  control={control}
                  name="requireUniversityEmail"
                />
                <ToggleRow
                  id="waitlistEnabled"
                  title="Waitlist when full"
                  body="When capacity is reached, new registrations join a waitlist and are promoted automatically when someone cancels."
                  control={control}
                  name="waitlistEnabled"
                />
                <Field id="termsText" label="Terms people must accept" optional hint="Code of conduct, photo consent, rules." error={err("termsText")}>
                  <Textarea id="termsText" rows={3} maxLength={3000} {...register("termsText")} />
                </Field>
                <div>
                  <h3 className="text-sm font-medium">Registration questions</h3>
                  <p className="mt-1 mb-3 text-sm text-muted-foreground">Ask only what you need to run the event.</p>
                  <Controller
                    control={control}
                    name="formFields"
                    render={({ field }) => (
                      <FormBuilder
                        value={field.value}
                        onChange={field.onChange}
                        hasSubmissions={formHasSubmissions}
                        errors={errors.formFields?.message ? [errors.formFields.message] : undefined}
                      />
                    )}
                  />
                </div>
              </>
            ) : null}
          </StepFrame>
        ) : null}

        {step === "fees" ? (
          <StepFrame title="Fees" description="Payments are handled by your society directly. We never process payments or mark them as received.">
            <Field id="isFree" label="Is there a fee?">
              <Controller
                control={control}
                name="isFree"
                render={({ field }) => (
                  <div className="flex gap-2" role="radiogroup" aria-label="Fee">
                    {[
                      { v: true, l: "Free" },
                      { v: false, l: "Paid" },
                    ].map((o) => (
                      <button
                        key={o.l}
                        type="button"
                        role="radio"
                        aria-checked={field.value === o.v}
                        onClick={() => field.onChange(o.v)}
                        className={cn("rounded-full border px-4 py-1.5 text-sm", field.value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface")}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                )}
              />
            </Field>
            {!values.isFree ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="feeAmount" label="Amount (PKR)" optional error={err("feeAmount")}>
                    <Input id="feeAmount" inputMode="decimal" placeholder="1500" {...register("feeAmount")} />
                  </Field>
                </div>
                <Field id="feeDescription" label="What the fee covers" hint="Per person or per team, what's included, any concessions." error={err("feeDescription")}>
                  <Textarea id="feeDescription" rows={3} maxLength={1000} {...register("feeDescription")} />
                </Field>
                <Field id="paymentInstructions" label="How to pay" optional hint="Bank transfer or wallet details and what reference to use." error={err("paymentInstructions")}>
                  <Textarea id="paymentInstructions" rows={3} maxLength={2000} {...register("paymentInstructions")} />
                </Field>
                <Field id="paymentUrl" label="External payment page" optional error={err("paymentUrl")}>
                  <Input id="paymentUrl" type="url" placeholder="https://" {...register("paymentUrl")} />
                </Field>
              </>
            ) : null}
            <Field id="refundPolicy" label="Cancellation and refund policy" optional error={err("refundPolicy")}>
              <Textarea id="refundPolicy" rows={3} maxLength={2000} {...register("refundPolicy")} />
            </Field>
          </StepFrame>
        ) : null}

        {step === "volunteers" ? (
          <StepFrame title="Volunteers" description="Recruit people to help run the event. Each role gets its own application.">
            {permissions.manageVolunteers && permissions.isHost ? (
              <>
                <ToggleRow
                  id="volunteerRecruitmentOpen"
                  title="Recruit volunteers for this event"
                  body="Open roles are listed on the event page and in Volunteering once the event is published."
                  control={control}
                  name="volunteerRecruitmentOpen"
                />
                {roles.fields.map((r, i) => (
                  <RoleEditor key={r._key} index={i} register={register} control={control} err={err} isPaid={values.roles[i]?.isPaid} onRemove={() => roles.remove(i)} />
                ))}
                <Button type="button" variant="outline" onClick={() => roles.append(emptyRole())}>
                  <Plus /> Add a role
                </Button>
                <p className="text-sm text-muted-foreground">
                  Application questions, shifts and certificates for each role are managed on the Volunteers page after saving.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your role can&rsquo;t manage volunteer recruitment for this event. A volunteer coordinator or administrator can add roles.
              </p>
            )}
          </StepFrame>
        ) : null}

        {step === "collaboration" ? (
          <StepFrame title="Collaboration" description="Co-organise with another verified society. You choose exactly what they can access.">
            {!eventId ? (
              <EmptyNote>Save the draft first, then invite collaborators.</EmptyNote>
            ) : permissions.manageCollaborations && permissions.isHost ? (
              <>
                <InviteCollaboratorForm eventId={eventId} societySlug={society.slug} options={collabSocieties} />
                <Link href={`/manage/${society.slug}/events/${eventId}/collaborators`} className="inline-block text-sm font-medium text-primary hover:underline">
                  See invitations and collaborators
                </Link>
              </>
            ) : (
              <EmptyNote>Your role can&rsquo;t invite collaborators.</EmptyNote>
            )}
          </StepFrame>
        ) : null}

        {step === "review" ? (
          <StepFrame title="Review" description="Check everything, then save or submit.">
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              <ReviewRow label="Title">{values.title || "—"}</ReviewRow>
              <ReviewRow label="Type and category">
                {EVENT_TYPE_LABELS[values.eventType]} · {directory.categories.find((c) => String(c.id) === values.categoryId)?.name ?? "No category"}
              </ReviewRow>
              <ReviewRow label="When">{values.startsAt ? `${values.startsAt.replace("T", " ")} → ${values.endsAt.replace("T", " ")} PKT` : "Not set"}</ReviewRow>
              <ReviewRow label="Where">
                {EVENT_FORMAT_LABELS[values.format]}
                {values.venue ? ` · ${values.venue}` : ""}
              </ReviewRow>
              <ReviewRow label="Registration">
                {values.registrationMode === "none"
                  ? "Not required"
                  : values.registrationMode === "external"
                    ? "External link"
                    : `${values.registrationMode === "team" ? "Teams" : "Individuals"}, ${values.capacity ? `${values.capacity} places` : "unlimited"}${values.requiresApproval ? ", approval required" : ""}, ${values.formFields.length} question(s)`}
              </ReviewRow>
              <ReviewRow label="Fee">{values.isFree ? "Free" : values.feeAmount ? `PKR ${values.feeAmount}` : "Paid"}</ReviewRow>
              <ReviewRow label="Volunteers">
                {values.volunteerRecruitmentOpen ? `${values.roles.length} role(s), recruiting` : values.roles.length ? `${values.roles.length} role(s), not recruiting yet` : "None"}
              </ReviewRow>
            </dl>

            <Field id="publishAt" label="Publish at a later time" optional hint="Leave empty to go live as soon as it's approved or submitted." error={err("publishAt")}>
              <Input id="publishAt" type="datetime-local" className="sm:max-w-xs" {...register("publishAt")} />
            </Field>

            {problems.length ? (
              <Alert className="border-warning/30 bg-warning-soft">
                <AlertTitle>Before you can publish</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : canSubmit ? (
              <p className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
                {society.eventsRequireReview
                  ? "Ready. Submitting sends the event to platform reviewers; it goes live once approved."
                  : "Ready. Publishing makes it visible immediately (or at the time set above)."}
              </p>
            ) : null}
          </StepFrame>
        ) : null}

        {serverError ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          {stepIndex > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(STEPS[stepIndex - 1].key)}>
              <ChevronLeft /> Back
            </Button>
          ) : null}
          <Button type="button" variant="outline" disabled={pending} onClick={() => persist()}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {eventId ? "Save changes" : "Save draft"}
          </Button>
          <div className="ml-auto flex gap-2">
            {step !== "review" ? (
              <Button type="button" onClick={() => go(STEPS[stepIndex + 1].key)}>
                Continue <ChevronRight />
              </Button>
            ) : canSubmit ? (
              <Button type="button" disabled={pending || problems.length > 0} onClick={() => persist("submit")}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {society.eventsRequireReview ? "Submit for review" : "Publish"}
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}

function StepFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="step-title">
      <h2 id="step-title" className="font-display text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">{children}</p>;
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ToggleRow({
  id,
  title,
  body,
  control,
  name,
}: {
  id: string;
  title: string;
  body: string;
  control: ReturnType<typeof useForm<EventFormValues>>["control"];
  name: "requiresApproval" | "waitlistEnabled" | "volunteerRecruitmentOpen" | "requireUniversityEmail";
}) {
  return (
    <div className="flex items-start justify-between gap-6 rounded-lg border border-border bg-surface px-4 py-3">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {title}
        </Label>
        <p id={`${id}-desc`} className="mt-0.5 text-sm leading-6 text-muted-foreground">
          {body}
        </p>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Switch id={id} aria-describedby={`${id}-desc`} checked={field.value} onCheckedChange={field.onChange} className="mt-1" />}
      />
    </div>
  );
}

function RoleEditor({
  index: i,
  register,
  control,
  err,
  isPaid,
  onRemove,
}: {
  index: number;
  register: ReturnType<typeof useForm<EventFormValues>>["register"];
  control: ReturnType<typeof useForm<EventFormValues>>["control"];
  err: (name: string) => string | undefined;
  isPaid: boolean | undefined;
  onRemove: () => void;
}) {
  const p = `roles.${i}` as const;
  return (
    <fieldset className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <legend className="font-medium">Role {i + 1}</legend>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 /> Remove
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field id={`${p}.title`} label="Role title" error={err(`${p}.title`)}>
          <Input id={`${p}.title`} placeholder="Registration desk volunteer" {...register(`${p}.title`)} />
        </Field>
        <Field id={`${p}.positions`} label="Positions" error={err(`${p}.positions`)}>
          <Input id={`${p}.positions`} type="number" min={1} {...register(`${p}.positions`)} />
        </Field>
      </div>
      <Field id={`${p}.description`} label="About the role" optional>
        <Textarea id={`${p}.description`} rows={2} {...register(`${p}.description`)} />
      </Field>
      <Field id={`${p}.responsibilities`} label="Responsibilities" optional>
        <Textarea id={`${p}.responsibilities`} rows={3} {...register(`${p}.responsibilities`)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}.timeCommitment`} label="Time commitment" optional hint="For example: two 4-hour shifts on event day.">
          <Input id={`${p}.timeCommitment`} {...register(`${p}.timeCommitment`)} />
        </Field>
        <Field id={`${p}.applicationDeadline`} label="Apply by" optional error={err(`${p}.applicationDeadline`)}>
          <Input id={`${p}.applicationDeadline`} type="datetime-local" {...register(`${p}.applicationDeadline`)} />
        </Field>
        <Field id={`${p}.experienceLevel`} label="Experience">
          <NativeSelect id={`${p}.experienceLevel`} {...register(`${p}.experienceLevel`)}>
            <option value="none">No experience needed</option>
            <option value="some">Some experience</option>
            <option value="experienced">Experienced</option>
          </NativeSelect>
        </Field>
        <Field id={`${p}.skills`} label="Skills" optional hint="Comma-separated.">
          <Input id={`${p}.skills`} {...register(`${p}.skills`)} />
        </Field>
      </div>
      <Field id={`${p}.eligibility`} label="Who can apply" optional>
        <Input id={`${p}.eligibility`} {...register(`${p}.eligibility`)} />
      </Field>
      <Field id={`${p}.scheduleNotes`} label="Schedule and shifts" optional>
        <Textarea id={`${p}.scheduleNotes`} rows={2} {...register(`${p}.scheduleNotes`)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}.benefits`} label="What volunteers get" optional hint="Only what's genuinely offered.">
          <Textarea id={`${p}.benefits`} rows={2} {...register(`${p}.benefits`)} />
        </Field>
        <Field id={`${p}.selectionProcess`} label="How people are selected" optional>
          <Textarea id={`${p}.selectionProcess`} rows={2} {...register(`${p}.selectionProcess`)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <Controller
          control={control}
          name={`${p}.isPaid`}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /> This role is paid
            </label>
          )}
        />
        <Controller
          control={control}
          name={`${p}.requiresEventRegistration`}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /> Applicants must also register for the event
            </label>
          )}
        />
      </div>
      {isPaid ? (
        <Field id={`${p}.compensationDetails`} label="Payment details" hint="Amount and what it covers. Shown on the listing." error={err(`${p}.compensationDetails`)}>
          <Input id={`${p}.compensationDetails`} {...register(`${p}.compensationDetails`)} />
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">Listed as an unpaid volunteer role.</p>
      )}
    </fieldset>
  );
}
