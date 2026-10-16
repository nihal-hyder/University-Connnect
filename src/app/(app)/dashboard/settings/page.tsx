import type { Metadata } from "next";
import Link from "next/link";
import { ToneBadge } from "@/components/common/tone-badge";
import { PageHeader, Section } from "@/components/layout/dashboard-shell";
import { DeleteAccountDialog, PreferencesForm } from "@/components/profile/account-settings";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/session";
import { getDirectory } from "@/lib/data/events";
import { getEditableProfile } from "@/lib/data/student";
import { universityForEmail } from "@/lib/university-email";

export const metadata: Metadata = { title: "Profile & settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/dashboard/settings");
  const [directory, profile] = await Promise.all([getDirectory(), getEditableProfile(viewer.user.id)]);
  const emailUniversity = universityForEmail(viewer.user.email, directory.universities);

  return (
    <>
      <PageHeader title="Profile & settings" description="Your details, interests and the emails you receive." />

      <Section title="Profile">
        <div className="max-w-2xl">
          <ProfileForm userId={viewer.user.id} directory={directory} defaults={profile.values} mode="settings" />
        </div>
      </Section>

      <Section title="Email preferences" className="mt-14">
        <div className="max-w-2xl">
          <PreferencesForm initial={profile.preferences} />
        </div>
      </Section>

      <Section title="Account" className="mt-14">
        <div className="max-w-2xl divide-y divide-border rounded-xl border border-border bg-surface">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{viewer.user.email}</p>
            </div>
            {emailUniversity ? (
              <ToneBadge tone="positive" dot>
                Verified {emailUniversity.short_name ?? emailUniversity.name} email
              </ToneBadge>
            ) : (
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                Not a recognised university email. Some events only accept university addresses; sign up with yours to qualify.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-sm text-muted-foreground">Choose a new password for this account.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/reset-password">Change password</Link>
            </Button>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-sm text-muted-foreground">Permanently remove your account and personal data.</p>
            </div>
            {viewer.user.email ? <DeleteAccountDialog email={viewer.user.email} /> : null}
          </div>
        </div>
      </Section>
    </>
  );
}
