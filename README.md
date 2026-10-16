# CampusConnect Pakistan

University events, competitions and volunteering across Pakistan — discovery for students, and a real workspace for the societies that run them.

> **New here?** Read [`HOW-TO-USE.md`](HOW-TO-USE.md) for the step-by-step guide for students, societies and admins.

> "CampusConnect Pakistan" is a placeholder name. Branding lives in `src/config/site.ts` (name, emails, locale) and `src/app/globals.css` (design tokens). Rename there; nothing else hard-codes it.

- **Students** discover events, register (individually or as a team), keep QR tickets, apply to volunteer roles, respond to offers and collect verifiable certificates.
- **Societies** get verified, invite their team with explicit roles, publish events through a guided wizard, build custom registration/application forms, manage registrations, waitlists, volunteers, shifts, check-in, collaborations with other societies and analytics.
- **Administrators** review society applications and event submissions, handle reports, suspend societies, curate the university/campus/department directory and read the audit log.

---

## Contents

1. [Stack](#stack)
2. [Local development](#local-development)
3. [Environment variables](#environment-variables)
4. [Demo accounts and seed data](#demo-accounts-and-seed-data)
5. [Bootstrapping the first administrator](#bootstrapping-the-first-administrator)
6. [Architecture decisions](#architecture-decisions)
7. [Data model](#data-model)
8. [Security model](#security-model)
9. [Email and scheduled jobs](#email-and-scheduled-jobs)
10. [Testing](#testing)
11. [Deployment (free-first)](#deployment-free-first)
12. [Production checklist](#production-security-checklist)
13. [Status: what is done and what is not](#status-what-is-done-and-what-is-not)

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript (strict) |
| UI | Tailwind CSS 4, shadcn/ui on Radix primitives, Lucide icons, Geist + Newsreader |
| Forms | React Hook Form + Zod (validated again on the server and in Postgres) |
| Charts | Recharts (palette validated for colour-vision deficiency, see `globals.css`) |
| Dates | date-fns + @date-fns/tz (Asia/Karachi by default) |
| Backend | Supabase: Postgres, Auth, Storage, Row Level Security |
| Email | Resend (optional; explicit development mode without it) |
| Tests | Vitest (unit + database authorisation), Playwright (end-to-end) |

---

## Local development

Requirements: Node 20+, npm, Docker Desktop (for the local Supabase stack).

```bash
npm install
cp .env.example .env.local
npm run db:start            # starts Supabase in Docker and prints its URL and keys
```

Copy from the `db:start` output into `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` → API URL (`http://127.0.0.1:54321`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → publishable key
- `SUPABASE_SECRET_KEY` → secret key
- `JOB_SECRET`, `VIEW_HASH_SALT` → any long random strings (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

Then:

```bash
npm run db:reset            # applies every migration in supabase/migrations and loads supabase/seeds/demo.sql
npm run dev                 # http://localhost:3000
```

Useful local URLs: Supabase Studio `http://127.0.0.1:54323`, Mailpit (all auth emails land here) `http://127.0.0.1:54324`.

After changing SQL, regenerate types with `npm run db:types`.

---

## Environment variables

See `.env.example` for the full annotated list. Only `NEXT_PUBLIC_*` values reach the browser.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | Base URL for links in emails, redirects and social previews. No localhost hard-coding anywhere else. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase project. Safe to expose: every query is subject to RLS. |
| `SUPABASE_SECRET_KEY` | **server only** | Bypasses RLS. Used only by the job worker, account deletion and `scripts/grant-admin.mjs`. Guarded by `server-only`. |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | server only | Email delivery. Empty key = development mode (nothing is sent). |
| `RESEND_WEBHOOK_SECRET` | server only | Optional. Verifies Resend's delivery webhooks so emails can be marked delivered / bounced / complained. |
| `JOB_SECRET` (+ `CRON_SECRET` on Vercel) | server only | Bearer token for `/api/jobs/process`. |
| `VIEW_HASH_SALT` | server only | Salt for anonymous daily page-view hashing. |

If a required public variable is missing the app fails fast with a message pointing here. If Resend or the secret key is missing, the relevant feature degrades explicitly (dev email mode; account deletion and the worker report "not configured").

---

## Demo accounts and seed data

`supabase/seeds/demo.sql` is **development-only**: it runs on `db reset` and is never applied by `supabase db push`. Every seeded society and event has `is_demo = true` and shows a "Sample listing" label and `noindex`. The societies are fictional; they are attached to real universities only so filters can be exercised.

All demo passwords: `DemoPass123`

| Email | Role |
| --- | --- |
| `admin@example.com` | platform administrator |
| `ayesha@example.com`, `bilal@example.com` | students |
| `sara@example.com` | owner, Computing & AI Society (NUST, trusted to publish) |
| `hamza@example.com` | volunteer coordinator, same society |
| `zainab@example.com`, `omar@example.com`, `fatima@example.com`, `hina@example.com` | owners of other societies (Omar's requires event review) |

---

## Bootstrapping the first administrator

There is no sign-up path, request parameter or profile field that grants admin rights. `public.platform_admins` has no client-side write policy; signing up with metadata such as `role: "admin"` is ignored (covered by a test).

1. The person signs up normally and verifies their email.
2. The project owner runs, from a machine with the production `SUPABASE_SECRET_KEY` in `.env.local` or the environment:

   ```bash
   npm run admin:grant -- person@university.edu.pk
   npm run admin:grant -- person@university.edu.pk --revoke   # to remove
   ```

   Equivalent SQL for the Supabase SQL editor (runs as the database owner):

   ```sql
   insert into public.platform_admins (user_id, note)
   select id, 'Initial administrator' from public.profiles where contact_email = 'person@university.edu.pk';
   ```

Administrators cannot review their own society application (enforced in SQL).

---

## Architecture decisions

- **The database is the authority.** Every state change with rules (registration and capacity, waitlist promotion, volunteer state machine, offers, check-in, certificates, invitations, ownership transfer, publishing, moderation) is a `SECURITY DEFINER` Postgres function that re-checks permissions and runs in one transaction. Server actions validate input with Zod for good messages, then call these functions. The UI mirrors a couple of rule tables only to decide what to render; unit tests fail if the mirrors drift (`tests/unit/mirrors.test.ts`).
- **Server Components by default.** Client Components are limited to forms, dialogs, the QR scanner, charts and navigation state. Most management actions are plain Server Components with a small reusable `ActionButton` that calls a bound Server Action and only reports success after the database confirms it.
- **Cache Components are off** (`next.config.ts`): nearly every route depends on the signed-in user and RLS, so routes render per request.
- **Two independent event statuses.** `status` is the publishing lifecycle (draft → pending review → published …); `schedule_status` is what's happening to the event (scheduled, postponed, cancelled). Registration availability is derived from both plus the window and capacity.
- **Versioned forms.** Registration and volunteer forms are JSONB field lists in `form_versions`. Once anyone has answered a version, edits create a new version, so stored answers always keep the questions they answered. Answers are validated in Zod and again in SQL (`private.validate_form_answers`).
- **Explainable recommendations.** Rules over explicit profile interests, university, eligibility and dates, each with its stated reason. No behavioural tracking: "recently viewed" lives only in the browser's localStorage and can be cleared from the dashboard.
- **Analytics are counts of real records**, with on-page definitions. Page views and registration-form openings are anonymous daily-unique hashes (`event_daily_visitors`, `event_registration_starts`), not people, and feed a visitors → started → registered → confirmed → attended funnel.
- **Light and dark themes** from the same semantic tokens (`globals.css`). The theme is applied by a tiny inline script before first paint (no flash); users pick Light / Dark / System. Chart colours are validated for colour-vision deficiency on both surfaces.
- **Motion with restraint.** A CSS-only brand intro on full page loads (first visit / refresh) that never captures clicks; a 3D extruded, pointer-tilting hero headline that remains a single real `<h1>`; page-enter transitions via `template.tsx` on every navigation (shells and sidebars stay still); scroll reveals and card lifts. Everything is disabled under `prefers-reduced-motion`, and reveals stay visible without JavaScript.

---

## Data model

Migrations live in `supabase/migrations` (applied in filename order). Main groups:

| Area | Tables |
| --- | --- |
| Directory | `cities`, `universities`, `campuses`, `departments`, `event_categories` (unique by lower(name) per university to prevent spelling duplicates) |
| People | `profiles`, `profile_interests`, `user_preferences`, `platform_admins` |
| Societies | `society_applications`, `societies`, `society_memberships` (one owner per society), `society_invitations` (expire after 7 days) |
| Events | `events`, `event_target_universities`, `event_collaborations` (per-permission flags), `form_versions`, `saved_events`, `event_daily_visitors` |
| Registration | `registrations` (one active per user/event), `registration_history`, `tickets` (random codes), `attendance_records` (one per registration) |
| Volunteering | `volunteer_roles`, `volunteer_applications` (offer fields live on the application; history in `volunteer_status_history`), `volunteer_application_notes` (private), `volunteer_shifts` (optional capacity, enforced under a row lock), `volunteer_shift_assignments`, `saved_opportunities`, `certificates` (name snapshots) |
| Platform | `notifications`, `email_outbox` (queue with retries, idempotency keys and delivery outcomes), `job_runs`, `reports`, `moderation_actions`, `audit_logs`, `event_registration_starts`, `private.rate_limits` |

Waitlist entries are registrations with status `waitlisted` rather than a separate table; volunteer offers are columns on the application rather than a separate table (an application has at most one live offer). Counters such as `confirmed_count` are maintained by triggers and protected by row locks.

---

## Security model

- **RLS on every table** reachable through the API, with an explicit allow-list of grants. Column-level `INSERT`/`UPDATE` grants prevent mass assignment (clients can't set `events.status`, `registrations.*`, counters, roles, `societies.status`, …). Migration `0015` hides private event columns (`online_url`, review notes) behind `event_private_details()`.
- **Roles are explicit** (`private.role_permissions`): owner, administrator, event manager, volunteer coordinator, analyst. Analysts see aggregates only; volunteer coordinators cannot see registrations. Collaborating societies get only the flags the host grants, and only on roles assigned to them.
- **Admin rights** come only from `platform_admins` (see bootstrap above).
- **Uploads**: images go to the public `media` bucket under a folder the uploader must be allowed to write (`users/<id>/` or `societies/<id>/`); server actions re-check the folder of any submitted path. Verification evidence goes to the private `documents` bucket, readable only by the applicant and admins (5-minute signed links). Bucket-level MIME and size limits apply.
- **QR tickets** encode only a random code; check-in requires the `check_in` permission and is rate-limited in SQL (120/min per user). Duplicate scans are reported, not double-counted.
- **Other protections**: open-redirect-safe `?next=` handling, Origin checks on non-action POST routes, CSV formula-injection escaping, HTML escaping in emails, rate limits on registration/applications, `noindex` on private pages and certificates, strict security headers, constant-time comparison of the job secret.
- **Account deletion** (Settings) removes the profile and everything personal by cascade; society owners must transfer ownership first; issued certificates keep their printed name but lose the account link.

RLS being enabled is not treated as proof of security: `tests/db/authorization.test.ts` exercises the policies with real accounts (see Testing).

---

## Email and scheduled jobs

Business functions never send email directly. `private.notify()` creates an in-app notification and, if the category and the user's preferences allow, a row in `email_outbox` with an idempotency key. Transactional messages (confirmations, status changes, offers, cancellations, security) ignore promotional preferences; reminders and recommendations respect them (recommendations are off by default).

`GET|POST /api/jobs/process` with `Authorization: Bearer $JOB_SECRET`:

1. `job_enqueue_reminders()` — event reminders (~24 h), deadline reminders for saved events (48 h), shift reminders, expiry of invitations and offers. Idempotent per recipient and item.
2. `job_claim_emails()` — locks a batch (`FOR UPDATE SKIP LOCKED`), so overlapping runs never double-send.
3. Delivers via Resend with an idempotency key, then `job_complete_email()` records `sent` (accepted by the provider), `failed` (retried with back-off up to 5 attempts), `skipped`, or `logged_dev`.
4. Records the run in `job_runs`, shown on the admin overview with a stale-scheduler warning.

**Development mode** (no `RESEND_API_KEY`): emails are marked `logged_dev`, only safe metadata is logged (masked address, template, subject), and the admin overview says plainly that nothing is being sent. 

**Delivery tracking**: create a Resend webhook pointing at `https://<domain>/api/webhooks/resend` for `email.delivered`, `email.bounced` and `email.complained`, and set `RESEND_WEBHOOK_SECRET` to its signing secret. Requests are verified (HMAC-SHA256, 5-minute replay window, constant-time compare) before `job_record_email_event()` moves a row from `sent` to `delivered`, `bounced` or `complained`. A spam complaint switches off that person's optional emails. Statuses: `queued` → `sending` → `sent` (accepted by provider) → `delivered` / `bounced` / `complained`, or `failed` / `skipped` / `logged_dev`.

Run the worker locally: `curl -H "Authorization: Bearer $JOB_SECRET" http://localhost:3000/api/jobs/process`

Auth emails (verification, password reset) are sent by Supabase Auth, not this worker. Locally they appear in Mailpit; templates are in `supabase/templates`.

---

## Testing

```bash
npm run lint
npm run typecheck
npm test              # unit tests (no network)
npm run test:db       # authorisation tests against LOCAL Supabase (refuses non-local URLs)
npm run test:e2e      # Playwright; starts `npm run dev` if needed; uses Mailpit for email verification
npm run build
```

- **Unit (51 tests)**: webhook signature verification (valid, rotated, tampered, replayed, wrong version), form answer validation, form builder schema, event wizard rules (dates, deadlines, capacity, paid roles), registration state, open-redirect guard, CSV injection, storage path checks, error message hygiene, email escaping and dev mode, and SQL/TypeScript rule mirrors.
- **Database authorisation (27 tests)**: registration-form openings (public events only, deduplicated, private table, analytics permission); shift capacity under two simultaneous assignments; delivery events (service role only, complaint opts the user out); anonymous access to private tables and draft events; reading another student's registration/ticket; self-promotion to admin (insert, RPC, sign-up metadata); editing protected columns; a society editing another society's event; setting `status` directly; volunteer coordinators reading registrations; **two users racing for the last seat** (exactly one confirmed); waitlist promotion on cancellation; duplicate registrations; duplicate and invalid ticket scans; students calling check-in; registering for a cancelled event; collaborator least privilege, permission changes and revocation; the volunteer state machine (withdrawn → offered refused); private reviewer notes; certificates only after completion and only by organisers; public verification exposing no contact data; private document access; writing into another society's media folder. Fixtures are created with the service role and removed afterwards.
- **End-to-end (17 tests)**: theme toggle persists across reloads without a flash; the intro plays and never captures clicks; reduced motion removes it; the 3D headline is one readable heading; recently viewed appears and clears; the full student flow (sign up → verify via the real email → profile → search → register → ticket with QR → cancel); the full society flow (sign up → society application → admin approval → event wizard with a volunteer role → submit → admin approval → event discoverable); access control (redirect to login, refused open redirect, 404 on admin/other workspaces, CSV export permissions); no horizontal scroll on public pages at desktop and mobile widths.

Note: the database suite registers several times per demo account, and registration is rate-limited (10 per user per minute). Leave a minute between consecutive `npm run test:db` runs.

Offline tickets need the service worker, which registers only in production builds: `npm run build && npx next start -p 3100`, then `PWA_BASE_URL=http://localhost:3100 npx playwright test pwa`.

Last local run: lint clean, typecheck clean, 60/60 unit, 32/32 database, 23/23 end-to-end on the dev server plus the offline-ticket test on a production build, production build succeeded.

---

## Deployment (free-first)

The app runs on any Node host that supports Next.js 16. The steps below use Supabase + Vercel + GitHub; **check each provider's current terms and limits before launch** — the notes below reflect their published free plans at the time of writing (October 2026) and change over time.

**Free-tier constraints to know about**

- **Vercel Hobby** is for personal, **non-commercial** use. A platform run by or for an organisation, or one that ever charges fees, may need a Pro plan or a different host. Hobby cron jobs run at most **once per day**, so this repo also ships a GitHub Actions schedule (below).
- **Supabase Free**: small database and storage quotas, limited egress and monthly active users, **projects pause after about a week without activity**, and **no automatic backups** (see backup notes). The built-in auth email service is heavily rate-limited and intended for testing: configure **custom SMTP** (e.g. Resend's SMTP) before real users sign up.
- **Resend Free**: a modest daily and monthly email allowance and one verified sending domain.
- **GitHub Actions**: scheduled workflows can run late under load and are disabled after 60 days without repository activity on public repos.

**Steps**

1. **Supabase project** — create a project (region close to Pakistan, e.g. Mumbai/Singapore). Then:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push          # applies migrations only; the demo seed is NOT pushed
   ```
   Storage buckets are created by migration `0012`.
2. **Auth settings** (Dashboard → Authentication): Site URL = your production URL; Redirect URLs = `https://<domain>/**`; keep email confirmation on; paste the templates from `supabase/templates` and make sure links use `{{ .SiteURL }}/auth/confirm?token_hash=...`; configure custom SMTP.
3. **Resend** — verify your sending domain, create an API key, set `EMAIL_FROM` to an address on that domain.
4. **Vercel** — import the GitHub repo; set all variables from `.env.example` (production values; `NEXT_PUBLIC_SITE_URL` = your domain) plus `CRON_SECRET` = `JOB_SECRET`. `vercel.json` registers a daily cron as a safety net.
5. **Frequent jobs** — add repository secrets `APP_URL` and `JOB_SECRET`; `.github/workflows/scheduled-jobs.yml` calls the worker every 15 minutes. Any external cron service that can send a bearer header works too.
6. **First admin** — see [Bootstrapping](#bootstrapping-the-first-administrator).
7. **Verify** — sign up with a real address, receive the verification email, create a society application, approve it, publish an event, register, check the worker run appears on `/admin`.

Deployment has **not** been performed from this session; only local builds and tests were run.

**Backups and recovery**: on the free plan, schedule your own logical backups, e.g. a GitHub Action or local cron running `npx supabase db dump --linked -f backup.sql` (store outside the repo, encrypted). Test a restore into a fresh project before relying on it. Migrations in this repo rebuild the schema; data needs the dump.

---

## Production security checklist

- [ ] `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `JOB_SECRET` set only in the host's encrypted env, never with a `NEXT_PUBLIC_` prefix, never committed.
- [ ] `.env.local` never committed (`.gitignore` covers `.env*` except `.env.example`).
- [ ] Demo seed not loaded in production (`supabase db push` doesn't run seeds).
- [ ] Auth: email confirmation on, redirect URLs restricted to your domain, custom SMTP, leaked-password protection and CAPTCHA enabled if available on your plan.
- [ ] First admin granted via the script; nobody else in `platform_admins`.
- [ ] Worker scheduled and visible as recent on `/admin`.
- [ ] `npm run test:db` passes against a local copy of the production schema after any migration.
- [ ] Privacy, terms and guidelines pages reviewed by someone qualified for your organisation (the included text is a plain-language draft describing how the software behaves).
- [ ] Backups scheduled and a restore tested.

---

## Status: what is done and what is not

Done and tested locally:

- [x] Design system, editorial public site (home, explore with URL-shareable filters, event pages, opportunities, society directory and profiles, about, policies, certificate verification)
- [x] Auth: sign-up with verification, login, logout, password reset, safe redirects, session refresh in `proxy.ts`
- [x] Separate student and society onboarding; profile with controlled university/campus/department; interests; notification preferences; account deletion
- [x] Student dashboard: overview with explained recommendations, deadline reminders, registrations with QR tickets and history, applications with offers/withdrawal/shifts, saved items, notifications, certificates, society memberships and invitations
- [x] Society verification workflow (draft → submitted → under review / info requested → approved / rejected) with private evidence
- [x] Society workspace: overview, events, 7-step event wizard (drafts, duplication, scheduled publishing, review), registrations (approve/waitlist/decline, CSV), check-in (camera QR + manual), volunteers (roles, custom forms, applications, state machine, private notes, offers with expiry, shifts, completion, certificates, CSV), collaborations with granular permissions, analytics, members (invite, roles, remove, ownership transfer), public profile
- [x] Admin: overview and service health, society application review, event review, reports, suspension and trust policy, directory management, audit log
- [x] Notification + email queue with retries/idempotency, reminders, dev mode; scheduled worker
- [x] Migrations, RLS, generated types, seed data, admin bootstrap script, automated tests, production build
- [x] Dark mode (Light / Dark / System, no flash), recently viewed (on-device only), registration funnel analytics, per-shift capacity, Resend delivery webhooks
- [x] Motion: brand intro on load/refresh, 3D headline, page transitions, scroll reveals; all respect reduced motion
- [x] Fixed a latent RLS recursion that prevented anyone reading volunteer shifts (migration `0019`)
- [x] 85 universities and 121 campuses across all provinces, with editable email domains (migration `0020`)
- [x] Verified university email badge and optional "university emails only" events, enforced by a trigger (migration `0021`)
- [x] Add to calendar (Google, Outlook, `.ics`) for events, tickets and volunteer shifts
- [x] WhatsApp sharing and generated link-preview cards (`opengraph-image`) for every public event
- [x] Organiser announcements to registrant and volunteer groups (in-app + optional email, rate-limited, audited)
- [x] Installable app (manifest + service worker): tickets open offline; offline copies are removed on sign-out
- [x] Certificate downloads as PDF (A4, pdf-lib), PNG and JPG (sharp); recipient and issuing society only
- [x] Every registration requires organiser approval (DB constraint, migration `0022`); approvers are notified, capacity enforced at confirmation
- [x] Platform administrators hold every society permission and land on `/admin` instead of the student overview (migrations `0022`, `0023`)

Not done / known limitations:

- [ ] Payments: deliberately not built (the brief rules out a gateway in v1). Fees are described and paid externally; no checkout.
- [ ] Production deployment (not performed; needs your Supabase, Vercel and Resend accounts; see Deployment)
