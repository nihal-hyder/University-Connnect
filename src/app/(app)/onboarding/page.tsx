import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireViewer } from "@/lib/auth/session";
import { getDirectory } from "@/lib/data/events";
import { getEditableProfile } from "@/lib/data/student";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const viewer = await requireViewer("/onboarding");
  const { as } = await searchParams;
  const path = as === "student" || as === "society" ? as : null;
  const [directory, profile] = await Promise.all([getDirectory(), getEditableProfile(viewer.user.id)]);
  const firstName = profile.values.fullName.split(" ")[0];

  if (!path) {
    return (
      <div className="page-container max-w-3xl py-12 md:py-20">
        <p className="eyebrow text-signal-ink">Welcome{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="mt-2 font-display text-headline">How will you use {siteConfig.name}?</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">
          Pick the one that fits best. You can do both later: every society organiser also has a student profile.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <PathLink
            href="/onboarding?as=student"
            icon={<GraduationCap />}
            title="I'm a student"
            body="Find events and competitions, register, volunteer and keep everything in one place."
          />
          <PathLink
            href="/onboarding?as=society"
            icon={<Users />}
            title="I run a society"
            body="Get your society verified, publish events, take registrations and recruit volunteers."
          />
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Just looking?{" "}
          <Link href="/explore" className="font-medium text-primary hover:underline">
            Browse events first
          </Link>
          . Nothing here is required to explore.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl py-12 md:py-16">
      <Link href="/onboarding" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <p className="eyebrow mt-6 text-signal-ink">{path === "society" ? "Step 1 of 2 · Your profile" : "Your profile"}</p>
      <h1 className="mt-2 font-display text-headline">
        {path === "society" ? "First, a little about you" : "Tell us what you're into"}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">
        {path === "society"
          ? "Society applications are made by a person. Your name and university help our reviewers. Next you'll describe your society."
          : "Everything except your name is optional. Your university and interests let us point out relevant events and explain why."}
      </p>
      <div className="mt-10">
        <ProfileForm
          userId={viewer.user.id}
          directory={directory}
          defaults={profile.values}
          mode="onboarding"
          redirectTo={path === "society" ? "/societies/apply" : "/dashboard"}
        />
      </div>
    </div>
  );
}

function PathLink({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-foreground/25 focus-visible:border-ring"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary [&_svg]:size-5">{icon}</span>
      <span className="mt-5 font-display text-2xl">{title}</span>
      <span className="mt-2 text-sm leading-6 text-muted-foreground">{body}</span>
      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        Continue <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
