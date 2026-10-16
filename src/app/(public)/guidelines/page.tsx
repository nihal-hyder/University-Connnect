import type { Metadata } from "next";
import { PolicyPage } from "@/components/common/policy-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Community guidelines" };

export default function GuidelinesPage() {
  return (
    <PolicyPage
      eyebrow="Policies"
      title="Community guidelines"
      updated="October 2026"
      intro={<p>Students trust what they find here. These guidelines keep it that way. They apply to every society, organiser and student.</p>}
      sections={[
        {
          id: "honest",
          title: "Be honest about your event",
          body: (
            <ul>
              <li>Dates, venues, eligibility and prizes must be accurate. Update the event or mark it postponed or cancelled when plans change.</li>
              <li>State every fee clearly before registration, including what it covers and the refund terms.</li>
              <li>Do not claim partnerships, sponsorships or university endorsements you do not have.</li>
            </ul>
          ),
        },
        {
          id: "volunteers",
          title: "Treat volunteers fairly",
          body: (
            <ul>
              <li>Describe responsibilities and the real time commitment. Never present an unpaid role as paid.</li>
              <li>Respond to applicants. Use the status tools so people know where they stand.</li>
              <li>Issue certificates only for actual participation.</li>
            </ul>
          ),
        },
        {
          id: "data",
          title: "Respect personal data",
          body: (
            <ul>
              <li>Ask only the questions you need. Do not ask for CNIC numbers, passwords or financial details through registration forms.</li>
              <li>Use participant data only to run the event. Do not add people to unrelated mailing lists or share exports outside your team.</li>
            </ul>
          ),
        },
        {
          id: "not-allowed",
          title: "Not allowed",
          body: (
            <ul>
              <li>Impersonating a society, university or person.</li>
              <li>Spam, scams, pyramid schemes and misleading &ldquo;opportunities&rdquo;.</li>
              <li>Harassment, hate speech or content that endangers anyone.</li>
            </ul>
          ),
        },
        {
          id: "report",
          title: "Reporting",
          body: (
            <p>
              Use &ldquo;Report&rdquo; on any event or society page, or email{" "}
              <a href={`mailto:${siteConfig.safetyEmail}`}>{siteConfig.safetyEmail}</a>. Reports are reviewed by platform staff, and
              serious or repeated problems lead to suspension.
            </p>
          ),
        },
      ]}
    />
  );
}
