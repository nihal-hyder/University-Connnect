import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./form";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-4xl">Reset your password</h1>
      <p className="mt-2 text-muted-foreground">Enter your account email and we&rsquo;ll send you a link to choose a new password.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">Back to log in</Link>
      </p>
    </>
  );
}
