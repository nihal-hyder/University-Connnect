"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { resendVerification, signIn } from "@/app/(auth)/actions";
import { Captcha, captchaEnabled } from "@/components/forms/captcha";
import { describedBy, Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const needsCaptcha = captchaEnabled && !captchaToken;
  // Turnstile tokens are single use: get a fresh one after every attempt.
  const renewCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
  };
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await signIn({ ...values, next }, captchaToken ?? undefined);
      // On success the action redirects; we only get here on failure.
      if (res && !res.ok) {
        renewCaptcha();
        setError(res.error);
        setUnconfirmed(res.fieldErrors?.email?.[0] === "unconfirmed");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email", errors.email?.message)} {...form.register("email")} />
      </Field>
      <Field id="password" label="Password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={describedBy("password", errors.password?.message)} {...form.register("password")} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {error}
            {unconfirmed ? (
              <button
                type="button"
                className="mt-2 block font-medium underline underline-offset-4"
                disabled={pending || needsCaptcha}
                onClick={() =>
                  start(async () => {
                    const res = await resendVerification(form.getValues("email"), captchaToken ?? undefined);
                    renewCaptcha();
                    setNotice(res.ok ? res.message ?? "Sent." : res.error);
                  })
                }
              >
                Resend verification email
              </button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <Captcha key={captchaKey} onToken={setCaptchaToken} />
      <Button type="submit" size="lg" className="w-full" disabled={pending || needsCaptcha}>
        {pending ? <Loader2 className="animate-spin" /> : null} Log in
      </Button>
    </form>
  );
}
