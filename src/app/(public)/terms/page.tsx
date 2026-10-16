import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/common/policy-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Policies"
      title="Terms of use"
      updated="October 2026"
      intro={
        <p>
          {siteConfig.fullName} is a free listing and event-management service for university students and student societies in
          Pakistan. By creating an account you agree to these terms and to the{" "}
          <Link href="/guidelines">community guidelines</Link>.
        </p>
      }
      sections={[
        {
          id: "accounts",
          title: "Your account",
          body: (
            <p>
              Use your real name and an email address you control. Keep your password private. You are responsible for activity on
              your account. One person, one account.
            </p>
          ),
        },
        {
          id: "organisers",
          title: "Societies and organisers",
          body: (
            <ul>
              <li>Only people authorised by a society may apply to register it. Information in a verification application must be accurate.</li>
              <li>Organisers are responsible for their events: accuracy of details, safety, fees, refunds and the conduct of the event itself.</li>
              <li>Collect only the personal data an event needs, use it only for that event, and do not share participant data outside your organising team.</li>
              <li>Volunteer listings must state honestly whether a role is paid, the expected time commitment and how people are selected. Certificates must reflect actual participation.</li>
            </ul>
          ),
        },
        {
          id: "payments",
          title: "Fees and payments",
          body: (
            <p>
              This service does not process payments. When an event has a fee, payment is made directly to the organisers using the
              instructions they provide, and any refund is between you and them. A confirmed registration on this platform does not
              confirm that a payment was received.
            </p>
          ),
        },
        {
          id: "verification",
          title: "What verification means",
          body: (
            <p>
              A verified badge means platform staff reviewed the society&rsquo;s application and evidence of recognition. It is not an
              endorsement by any university and does not guarantee any event.
            </p>
          ),
        },
        {
          id: "moderation",
          title: "Moderation",
          body: (
            <p>
              We may remove content, reject or unpublish events, and suspend societies or accounts that break these terms or the
              guidelines, mislead students or misuse personal data. Report problems from any event or society page.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes and availability",
          body: (
            <p>
              The service is provided as is and may change. If we change these terms in a meaningful way we will tell registered
              users in advance. Questions: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
