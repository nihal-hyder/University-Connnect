"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { resendVerification, signUp } from "@/app/(auth)/actions";
import { describedBy, Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DevMailboxNote } from "@/components/forms/dev-mailbox-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passwordSchema } from "@/lib/auth/password";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  password: passwordSchema,
});

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { fullName: "", email: "", password: "" } });
  const errors = form.formState.errors;

  if (sentTo) {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-6">
        <MailCheck className="size-8 text-primary" aria-hidden />
        <h2 className="mt-4 font-display text-2xl">Check your email</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          If <span className="font-medium text-foreground">{sentTo}</span> can be used for a new account, we have sent a
          verification link to it. Open the link to finish setting up. If you already have an account, log in instead.
        </p>
        <DevMailboxNote />
        <Button
          variant="outline"
          className="mt-5"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await resendVerification(sentTo);
              setNotice(res.ok ? res.message ?? "Sent." : res.error);
            })
          }
        >
          Resend the link
        </Button>
        {notice ? <p className="mt-3 text-sm text-muted-foreground">{notice}</p> : null}
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await signUp(values);
      if (!res.ok) {
        setError(res.error);
        for (const [k, v] of Object.entries(res.fieldErrors ?? {})) {
          if (v?.[0] && (k === "fullName" || k === "email" || k === "password")) form.setError(k, { message: v[0] });
        }
        return;
      }
      setSentTo(res.data.email);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="fullName" label="Full name" error={errors.fullName?.message} hint="Shown to organisers when you register or apply.">
        <Input id="fullName" autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={describedBy("fullName", errors.fullName?.message, true)} {...form.register("fullName")} />
      </Field>
      <Field id="email" label="Email" error={errors.email?.message} hint="Your university email works well, but any address is fine.">
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email", errors.email?.message, true)} {...form.register("email")} />
      </Field>
      <Field id="password" label="Password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={describedBy("password", errors.password?.message, true)} {...form.register("password")} />
      </Field>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null} Create account
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        By creating an account you agree to the <a href="/terms" className="underline">Terms</a> and{" "}
        <a href="/privacy" className="underline">Privacy notice</a>.
      </p>
    </form>
  );
}
