import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <>
      <h1 className="font-display text-4xl">Create your account</h1>
      <p className="mt-2 text-muted-foreground">
        Free for students. You can browse events without an account; you need one to register, apply or run a society.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
