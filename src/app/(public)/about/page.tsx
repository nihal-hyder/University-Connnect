import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: `What ${siteConfig.fullName} is, how society verification works and how organisers use it.`,
};

const ORGANISER_STEPS = [
  {
    title: "Register your society",
    body: "Tell us who you are, which university you belong to and how the society is recognised: a faculty advisor, a notification from student affairs or an official page. Supporting documents are visible only to platform reviewers.",
  },
  {
    title: "Get verified",
    body: "A reviewer checks the application. They may ask for more information. Once approved, your society gets a public profile and a workspace for your team.",
  },
  {
    title: "Invite your team",
    body: "Add members by email and give each a role: administrator, event manager, volunteer coordinator or read-only analyst. Each role sees only what it needs.",
  },
  {
    title: "Publish events",
    body: "A guided form covers logistics, eligibility, registration questions, fees and volunteer roles. New societies' first events are reviewed before they go live.",
  },
  {
    title: "Run the day",
    body: "Approve registrations, manage the waitlist, recruit and schedule volunteers, check people in with QR tickets and see what actually happened in your analytics.",
  },
];

export default function AboutPage() {
  return (
    <div className="page-container py-12 md:py-16">
      <header className="max-w-3xl">
        <p className="eyebrow text-signal-ink">About</p>
        <h1 className="mt-2 font-display text-display">One place for campus life across Pakistan.</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Student societies run remarkable hackathons, case competitions, festivals and workshops. They are usually announced
          across a dozen group chats and forms, and students at other universities rarely hear about them in time.{" "}
          {siteConfig.name} brings them together, and gives organisers proper tools to run them.
        </p>
      </header>

      <div className="mt-16 grid gap-12 border-t border-border pt-12 md:grid-cols-3">
        <div>
          <h2 className="font-display text-2xl">For students</h2>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
            Search events at your own and other universities, register in one step, keep your tickets and applications in one
            dashboard, and join organising teams to gain real experience. Free.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl">For societies</h2>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
            Publish events, take registrations with your own questions, recruit volunteers, collaborate with other societies and
            check people in. Free during this first phase; we will say clearly and in advance if that ever changes.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl">Trust</h2>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
            Societies are verified by platform staff before they can publish. Verification means we reviewed their evidence of
            recognition; it is not an endorsement by any university. Anyone can report an event or profile.
          </p>
        </div>
      </div>

      <section id="organisers" className="mt-20 scroll-mt-24 border-t border-border pt-12">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow text-signal-ink">For organisers</p>
            <h2 className="mt-2 font-display text-headline">How organising works</h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              Payments are not processed here. For paid events you describe the fee, refund terms and how to pay, and students pay
              you directly.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/societies/apply">Register your society</Link>
            </Button>
          </div>
          <ol className="space-y-8">
            {ORGANISER_STEPS.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                <span className="font-display text-3xl leading-none text-signal-ink tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-20 border-t border-border pt-12">
        <h2 className="font-display text-2xl">Contact</h2>
        <p className="mt-3 max-w-prose text-[15px] leading-7 text-muted-foreground">
          General questions:{" "}
          <a href={`mailto:${siteConfig.contactEmail}`} className="text-foreground underline underline-offset-4">
            {siteConfig.contactEmail}
          </a>
          . To report fraud, impersonation or misuse of personal data:{" "}
          <a href={`mailto:${siteConfig.safetyEmail}`} className="text-foreground underline underline-offset-4">
            {siteConfig.safetyEmail}
          </a>
          , or use the report link on any event or society page.
        </p>
      </section>
    </div>
  );
}
