"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { applyForRole } from "@/app/(public)/events/[slug]/actions";
import { defaultAnswers, FormRenderer } from "@/components/forms/form-renderer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { answersSchema, type FormAnswers, type FormField } from "@/lib/forms/schema";

export function ApplyDialog({
  roleId,
  roleTitle,
  eventTitle,
  fields,
  isPaid,
  compensation,
  timeCommitment,
}: {
  roleId: string;
  roleTitle: string;
  eventTitle: string;
  fields: FormField[];
  isPaid: boolean;
  compensation: string | null;
  timeCommitment: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState("");
  const form = useForm<FormAnswers>({ resolver: zodResolver(answersSchema(fields)), defaultValues: defaultAnswers(fields) });

  const onSubmit = form.handleSubmit((answers) => {
    setError(null);
    start(async () => {
      const res = await applyForRole({ roleId, answers, portfolioUrl: portfolio });
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) form.setError(k, { message: v[0] });
        return;
      }
      setReference(res.data.reference);
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && reference) window.location.reload();
      }}
    >
      <DialogTrigger asChild>
        <Button>Apply for this role</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-background sm:max-w-xl">
        {reference ? (
          <div className="py-4 text-center" role="status">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
            <DialogTitle className="mt-4 font-display text-2xl font-normal">Application submitted</DialogTitle>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              The organisers will review it. You can track its status and respond to any offer from your dashboard.
            </p>
            <p className="mt-5 text-sm">
              Reference <span className="rounded bg-secondary px-2 py-1 font-mono">{reference}</span>
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/applications">Track my applications</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">{roleTitle}</DialogTitle>
              <DialogDescription>
                Volunteer application for {eventTitle}.{" "}
                {isPaid ? `This role is paid: ${compensation}.` : "This is an unpaid volunteer role."}
                {timeCommitment ? ` Expected commitment: ${timeCommitment}.` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <FormRenderer fields={fields} register={form.register} control={form.control} errors={form.formState.errors} idPrefix={`apply-${roleId.slice(0, 6)}`} />
              <div className="space-y-1.5">
                <Label htmlFor={`portfolio-${roleId}`}>
                  Portfolio or LinkedIn link <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id={`portfolio-${roleId}`} type="url" placeholder="https://" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
              </div>
              {error ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Submit application
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
