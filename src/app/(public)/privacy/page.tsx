import type { Metadata } from "next";
import { PolicyPage } from "@/components/common/policy-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Policies"
      title="Privacy"
      updated="October 2026"
      intro={
        <p>
          This page explains, in plain language, what {siteConfig.fullName} collects, who can see it and how to remove it. We
          collect only what is needed to run events and applications, and we do not sell personal data or show advertising.
        </p>
      }
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <ul>
              <li>Your account: email address, name and a securely hashed password (managed by our authentication provider).</li>
              <li>Optional profile details you choose to add: university, campus, department, programme, level, graduation year, city, photo and interests.</li>
              <li>Answers you submit to an event registration or volunteer application. Organisers decide the questions; they should ask only what the event needs.</li>
              <li>Records created when you take part: registration status, ticket, check-in time, volunteer status, shifts and certificates.</li>
              <li>Anonymous page-view counts for event pages. Visitors are counted with a daily one-way hash; we do not store IP addresses with these counts or track you across sites.</li>
            </ul>
          ),
        },
        {
          id: "who",
          title: "Who can see it",
          body: (
            <ul>
              <li>Public pages show only published events, approved society profiles and contact details organisers chose to publish.</li>
              <li>Organisers of an event you register for can see your name, email and answers for that event only. Members with an analyst role see totals, not individuals.</li>
              <li>Collaborating societies see participant data only if the host society explicitly grants that permission.</li>
              <li>Society verification documents are visible only to the applicant and platform reviewers.</li>
              <li>Platform administrators can access records when needed to review reports, prevent fraud or provide support. Their actions are logged.</li>
            </ul>
          ),
        },
        {
          id: "recommendations",
          title: "Recommendations",
          body: (
            <p>
              Suggested events are based only on the interests and university in your profile and on event details such as date
              and eligibility. Each suggestion states its reason. We do not build behavioural profiles.
            </p>
          ),
        },
        {
          id: "emails",
          title: "Emails",
          body: (
            <p>
              We send emails about things you did or asked for: confirmations, status changes, offers, cancellations and account
              security. Reminders and recommendations can be switched off in Profile &amp; settings. Recommendation emails are off
              by default.
            </p>
          ),
        },
        {
          id: "retention",
          title: "Keeping and deleting data",
          body: (
            <p>
              You can delete your account from Profile &amp; settings. This removes your profile, registrations, applications,
              saved items and notifications. Certificates already issued keep the name printed on them so that they remain
              verifiable, but are no longer linked to an account. Society owners must transfer ownership before deleting their
              account. Backups are kept for a limited period for recovery and then expire.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              Questions or requests about your data: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
