"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { Captcha, captchaEnabled } from "@/components/forms/captcha";
import { Field } from "@/components/forms/field";
import { DevMailboxNote } from "@/components/forms/dev-mailbox-note";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  if (sent) {
    return (
      <>
        <Alert role="status">
          <AlertDescription>
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way. The link expires in one hour.
          </AlertDescription>
        </Alert>
        <DevMailboxNote />
      </>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await requestPasswordReset(email, captchaToken ?? undefined);
          if (res.ok) setSent(true);
          else {
            setError(res.error);
            setCaptchaToken(null);
            setCaptchaKey((k) => k + 1);
          }
        });
      }}
    >
      <Field id="email" label="Email" error={error ?? undefined}>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} />
      </Field>
      <Captcha key={captchaKey} onToken={setCaptchaToken} />
      <Button type="submit" size="lg" className="w-full" disabled={pending || !email || (captchaEnabled && !captchaToken)}>
        {pending ? <Loader2 className="animate-spin" /> : null} Send reset link
      </Button>
    </form>
  );
}
