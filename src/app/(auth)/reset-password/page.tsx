import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { ResetPasswordForm } from "./form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  return (
    <>
      <h1 className="font-display text-4xl">Choose a new password</h1>
      {user ? (
        <>
          <p className="mt-2 text-muted-foreground">You&rsquo;ll stay signed in on this device after changing it.</p>
          <div className="mt-8">
            <ResetPasswordForm />
          </div>
        </>
      ) : (
        <p className="mt-4 text-muted-foreground">
          This page opens from the link in a password reset email, and that link has expired or was already used.{" "}
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">Request a new link</Link>.
        </p>
      )}
    </>
  );
}
