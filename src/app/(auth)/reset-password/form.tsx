"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { updatePassword } from "@/app/(auth)/actions";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <Alert role="status">
        <AlertDescription>
          Your password has been changed. <Link href="/dashboard" className="font-medium underline">Go to your dashboard</Link>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) return setError("The passwords do not match.");
        start(async () => {
          const res = await updatePassword(password);
          if (res.ok) setDone(true);
          else setError(res.error);
        });
      }}
    >
      <Field id="password" label="New password" hint="At least 8 characters, with a letter and a number.">
        <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field id="confirm" label="Confirm new password">
        <Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null} Update password
      </Button>
    </form>
  );
}
