import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  link_invalid: "That link is invalid or has expired. Log in, or request a new link.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNextPath(sp.next) : undefined;
  if (await getSessionUser()) redirect(next ?? "/dashboard");
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <>
      <h1 className="font-display text-4xl">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">Log in to see your registrations, applications and societies.</p>
      <div className="mt-8">
        <LoginForm next={next} initialError={error} />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        New here?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
