# How to use CampusConnect

A practical guide for everyone who uses the platform: **students**, **society teams** and **platform administrators**.
(For installing, configuring and deploying the software, see `README.md`.)

---

## Contents

1. [Start in 2 minutes (local demo)](#1-start-in-2-minutes-local-demo)
2. [Getting around](#2-getting-around)
3. [For students](#3-for-students)
4. [For societies and organisers](#4-for-societies-and-organisers)
5. [For platform administrators](#5-for-platform-administrators)
6. [Your account, privacy and emails](#6-your-account-privacy-and-emails)
7. [Questions and troubleshooting](#7-questions-and-troubleshooting)

---

## 1. Start in 2 minutes (local demo)

If someone has already set the project up on your computer:

```bash
npm run db:start      # starts the database (Docker Desktop must be running)
npm run dev           # starts the website
```

Open **http://localhost:3000**. Log in with any demo account below. The password for all of them is **`DemoPass123`**.

| Log in as | To try |
| --- | --- |
| `ayesha@example.com` | a student (NUST) with registrations and a volunteer application |
| `bilal@example.com` | a student with a volunteer offer and a certificate |
| `sara@example.com` | owner of the Computing & AI Society: full organiser tools |
| `hamza@example.com` | volunteer coordinator: sees volunteers, not registrations |
| `admin@example.com` | platform administrator |

Everything in the demo is labelled **"Sample listing"**. None of it is a real event.

Emails sent locally (sign-up confirmations, password resets) appear at **http://127.0.0.1:54324** instead of a real inbox.

---

## 2. Getting around

- **Top bar:** Explore, Opportunities (volunteering), Societies, About. Once you're logged in, **Dashboard** and your **account menu** (the circle with your initials) appear on the right.
- **Theme button** (sun / moon / screen icon in the top bar): switches between Light, Dark and System (follows your device). Your choice is remembered on that device.
- **Account menu:** Dashboard, Notifications (a dot means unread), Profile & settings, your societies, Platform admin (admins only), Sign out.
- **On phones:** the ☰ button opens the menu. Inside dashboards, the section links scroll sideways under the page title.
- **Animations:** the site plays a short brand intro when you first open it or refresh, and pages ease in as you move around. If your device has **Reduce motion** turned on, all of this is switched off automatically.

---

## 3. For students

### 3.1 Create your account

1. Click **Sign up**. Enter your name, email and a password (at least 8 characters, with a letter and a number).
2. Open the email we send and click the link to **verify your address**. You can't log in until you do. No email? Use **Resend** on the login page, and check spam.
3. Choose **"I'm a student"**. Add your university, campus, department and interests. **Everything except your name is optional.** You can browse events without completing any of it.

**Verified university email.** If you sign up with your university address (for example `@nu.edu.pk` or `@nust.edu.pk`), Settings shows a **Verified university email** badge. Some events only accept university emails; they say so under **Eligibility**.

Why add your university and interests? You get suggestions marked with a reason, such as *"Because you selected Cybersecurity"* or *"At your university"*, and the **"I'm eligible"** filter works for you.

### 3.2 Find events

- **Home page:** search box, quick links (Hackathons, Competitions, Workshops…), and what's coming up.
- **Explore:** search by title, society, university or topic, then filter by category, type, university, campus, city, format (in person / online / hybrid), dates, free or paid, "registration open", eligibility and organiser. On phones, tap **Filters**.
- **The address bar keeps your filters**, so you can copy the link and send the same search to a friend.
- Each **event page** shows the date (Pakistan time), venue, eligibility, fee and payment details, registration deadline, places left, agenda, speakers, co-organising societies and volunteer roles.

**Statuses you might see on an event:**

| Label | Meaning |
| --- | --- |
| Registration open | You can register now |
| Full · waitlist open | Join the waitlist; you're moved up automatically if someone cancels |
| Registration opens soon / closed | Outside the registration window |
| Postponed / Cancelled | The organisers changed the event; you'll have been notified |
| Register on organiser's site | Registration happens on an external link |

### 3.2a Share and plan

- **Share → WhatsApp** sends the event name, date, place and link straight into a chat or group. Links show a preview card with the date, venue and whether registration is open.
- **Add to calendar** puts the event into Google Calendar, Outlook or Apple Calendar (the `.ics` option), with a 1-hour reminder.

### 3.3 Register

1. On the event page click **Register** (or **Register your team** / **Join the waitlist**).
2. Answer the organiser's questions. Required questions have a red `*`. Team events also ask for your team name and members.
3. Submit. You'll see **Registration received** (status **Awaiting approval**). **Every registration, for every hackathon, webinar or event, is reviewed by the organising society** before it's confirmed. If the event is full you'll see **You're on the waitlist** instead.
4. A society member reviews it. When they **confirm** you, you get a notification (and an email), and your **QR ticket** appears. If they decline, you're told why.
5. Find everything under **Dashboard → My registrations**. When a place frees up on a full event, the next person on the waitlist moves to **Awaiting approval** for the organisers to confirm.

**Paid events:** fees are paid **directly to the organisers** using the instructions or link on the event page. CampusConnect doesn't take payments, and a confirmed registration does **not** mean your payment was received.

### 3.4 Your ticket and check-in

- Open **My registrations → View ticket**. Show the QR code at the entrance. If scanning fails, read out the code printed under it.
- **Online events:** the meeting link appears on your ticket page once your place is confirmed. It's never shown publicly.
- **Add to calendar** is on the ticket page too.
- **No signal at the gate?** Install the app (**Install app** on the ticket page or in the footer, or your browser's "Add to Home screen"). Any ticket you've opened once then also opens **offline**. Signing out removes these offline copies from the device.
- **Can't attend?** On the ticket page click **Cancel registration** (possible until the event starts). This frees your place for someone on the waitlist.

### 3.5 Volunteer

1. Go to **Opportunities** (or the **Volunteer** section of an event page). Each role shows what you'd do, the time commitment, places left, the deadline, and whether it's **paid or unpaid**.
2. Click **Apply for this role**, answer the questions, and add a portfolio link if you have one. You'll get a reference number like `V-AB12CD3`.
3. Track it under **Dashboard → My applications**. Possible statuses: Submitted → Under review → Shortlisted → Interview requested → **Offer received** → Accepted (or Not selected / Waitlisted).
4. When you get an **offer**, open the application and choose **Accept** or **Decline**, before the deadline if one is shown.
5. Once accepted, your **shifts** (times, place, instructions) appear on the same page, each with **Add shift to calendar**. You get a reminder the day before.
6. After the event, organisers can mark your participation complete and issue a **certificate**. It appears under **Dashboard → Certificates**, where you can **Download PDF** (best for printing and email) or **PNG / JPG** (for LinkedIn, WhatsApp or a portfolio). Each file shows its verification code and link, and anyone can check it at **/verify**. Only you and the issuing society can download it.
7. Plans changed? **Withdraw application** frees the place for someone else.

Some roles ask you to register for the event as well; the role description says so.

### 3.6 Save things and stay updated

- Click the **bookmark** on an event or role to keep it under **Dashboard → Saved**. You get a reminder before registration closes.
- **Recently viewed** on your dashboard lists events you opened. It's stored **only on your device**, never on our servers, and **Clear history on this device** removes it.
- **Notifications** shows every status change. **Mark all as read** clears the dot.

### 3.7 Report a problem

On any event or society page, click **Report** and choose a reason (fraud, impersonation, misleading fees, spam, inappropriate content, misuse of personal data). Platform staff review every report.

---

## 4. For societies and organisers

### 4.1 Get your society verified

1. Sign up and verify your email, then choose **"I run a society"** (or go to **Societies → Register your society**).
2. Fill in the three sections:
   - **The society:** official name (as the university recognises it), university, campus, department, focus, a description of at least 80 characters, logo and links.
   - **People and contacts:** your role, the president, the faculty advisor (optional) and contact details. These are **seen only by reviewers**. Add a *public* contact email if you want one on your profile.
   - **Recognition:** explain how the university recognises the society, and/or attach a document (a notification or letter). Documents are private to reviewers.
3. Click **Save draft** any time, or **Submit for review**.
4. Track progress under **Dashboard → My societies**. If a reviewer asks for **more information**, update the application there and submit again.
5. Once **approved**, your society gets a public profile and a **workspace**, and you become its **owner**.

### 4.2 Your workspace

Open it from **Dashboard → My societies → Open**, or from the account menu. The left menu has:

| Section | What it's for |
| --- | --- |
| **Overview** | Upcoming events, registrations awaiting approval, new volunteer applications, collaboration invites |
| **Events** | Every event (filter: upcoming, drafts & review, past, co-organising) |
| **Create event** | The event wizard |
| **Volunteers** | Recruitment across all upcoming events |
| **Collaborations** | Invitations from and to other societies |
| **Analytics** | Real numbers for a date range |
| **Members & roles** | Your team |
| **Public profile** | What students see about your society |

### 4.3 Build your team

Go to **Members & roles → Invite a member**, enter their email and pick a role. They accept from their dashboard after signing in with that email. Invitations expire after 7 days.

| Role | Can do |
| --- | --- |
| **Owner** | Everything, including managing administrators and transferring ownership |
| **Administrator** | Profile, members (except administrators), events, registrations, volunteers |
| **Event manager** | Create, publish and run events, registrations, check-in |
| **Volunteer coordinator** | Volunteer recruitment, shifts, certificates, check-in. **Cannot see registrations** |
| **Analyst** | Aggregate analytics only. **No personal data** |

You can change a member's role or remove them from the same page. **Handing over to next year's team?** The owner can use **Transfer ownership** (type `transfer` to confirm); you become an administrator.

### 4.4 Create an event (the wizard)

**Create event** walks you through 7 steps. You can jump between steps, and **Save draft** keeps your work private.

1. **Basics:** title, type, category, description (at least 50 characters to publish), cover image (optional; we generate artwork otherwise), tags, agenda and speakers. The **link** (`/events/your-link`) is created from the title and locked once you submit.
2. **Logistics:** start and end in **Pakistan time**, format, university, campus, venue and city (needed for in-person events), the online meeting link (shown only to confirmed participants), accessibility notes, public contact.
3. **Registration:**
   - Every registration is reviewed by your team before it's confirmed (this can't be switched off).
   - **Who can register:** everyone, your university only, or chosen universities, plus academic levels. Switch on **Only verified university emails** to accept only people whose sign-up email is on an eligible university's domain.
   - **How:** individuals, teams (set the minimum and maximum size), an external link, or no registration.
   - **Opening and closing time**, **capacity**, **approve each registration** (on or off), **waitlist when full**, and terms people must accept.
   - **Registration questions:** add short or long answers, single choice, checkboxes, dropdowns, email, number, links, consent statements and information text. Reorder with the arrows. **Ask only what you need.** Names and emails already come from accounts.
4. **Fees:** free or paid, with an amount, what it covers, how to pay (bank or wallet details, or an external payment page) and the refund policy. Payments are between you and the students.
5. **Volunteers:** switch recruitment on and add roles (title, positions, responsibilities, time commitment, deadline, experience, skills, benefits, selection process, and **paid or unpaid** with details).
6. **Collaboration:** after saving, invite another verified society (see 4.8).
7. **Review:** check everything, optionally set **Publish at a later time**, then click **Submit for review** or **Publish**.

**Review vs. publish:** new societies' events are checked by platform staff first ("Waiting for review"). Established societies can be trusted to publish directly. If reviewers ask for changes, you'll see their note on the event's Overview. Edit, then submit again.

**After publishing**, open the event from **Events** to see its tabs: **Overview, Edit, Registrations, Check-in, Volunteers, Collaborators, Analytics**. On Overview you can also:

- **Duplicate as new draft:** great for recurring events.
- **Postpone** or **Cancel** (write a message; everyone registered or volunteering is notified). Cancelling can't be undone.
- **Delete draft:** only for drafts with no registrations.

Changing the time or venue of a published event notifies participants automatically.

### 4.5 Manage registrations

**Every registration needs your approval.** Nobody is confirmed automatically, whatever the event type. When people register, everyone in your team who can manage registrations (owner, administrators, event managers) gets a notification linking straight to the waiting list. Capacity is checked at the moment you confirm, so two team members confirming at once can never overfill the event.

**Event → Registrations**

- Search by name, email or reference (`R-…`), and filter by status.
- **Confirm**, **Waitlist** or **Decline** each registration. Declining a confirmed person requires a message, and their ticket stops working.
- Open **Answers** to read someone's responses and team members.
- **Registrations CSV** / **Attendance CSV** download spreadsheets (needs the export permission). Formulas typed by registrants are neutralised so the file is safe to open.

### 4.5a Send announcements

**Event → Announcements** messages a group of this event's participants: everyone registered, confirmed only, the waitlist, people awaiting approval, confirmed volunteers, all volunteer applicants, or the volunteers on one shift.

- Everyone gets an in-app notification. Tick **Also send by email** to email them too (people who turned off reminders won't get the email).
- Use it for things people need: venue or time changes, what to bring, check-in instructions. The **Sent** list keeps a record with recipient counts.
- Limits: 10 announcements per hour per organiser. Only the host society can send them.

### 4.6 Check people in on the day

**Event → Check-in**

1. On a phone or laptop with a camera (Chrome or Edge recommended), click **Start camera** and point it at a ticket's QR code. The result shows in large text: **Checked in**, **Already checked in**, **Not eligible**, **Ticket not recognised** or **Different event**.
2. No camera support? Type or paste the ticket code.
3. Someone without their phone? Use **Find by name** (confirmed participants only) and click **Check in**. **Undo** reverses a mistake.

The counters at the top show checked in, confirmed and the attendance rate.

### 4.7 Run volunteer recruitment

**Event → Volunteers** shows positions, applications, confirmed volunteers and upcoming shifts. From there:

- **Roles:** **Pause**, **Close** or **Reopen** applications. **Form & shifts** opens the role page, where you:
  - edit the role's **application questions** (earlier answers keep their original questions);
  - create **shifts** with a time, place, instructions and optional **number of places**. A full shift can't take more volunteers.
  - the **Registrations** list marks people who signed up with a university email (for example "NUST email").
- **Applications:** filter by role and status, then click a name to review. On the review page:
  - read their answers and profile;
  - add **internal notes** (your team sees them, the applicant never does);
  - make a **Decision:** Mark under review, Shortlist, Request interview, **Send offer** (with a message and an optional "respond by" time), Waitlist, or Decline. Only valid next steps are offered;
  - once they **accept**, **Assign** them to shifts (they're notified);
  - after the event starts, **Mark completed**, then **Issue certificate** if they met your criteria. Certificates are never automatic, and you can **Revoke** one with a reason.
- **CSV** downloads authorised applicant data.

The society-level **Volunteers** page summarises recruitment across all upcoming events.

### 4.8 Collaborate with another society

1. **Event → Collaborators → Invite a society:** search verified societies and tick only what they need:
   - edit event details;
   - run the volunteer roles you assign to them;
   - view registrations (includes export);
   - check people in;
   - see analytics.

   **Nothing is shared by default.** Accepted collaborators are always listed on the public event page.
2. They accept or decline under **Collaborations**.
3. You can change their permissions or **End collaboration** at any time; their access stops immediately.

### 4.9 Read your analytics

**Analytics** (society) and **Event → Analytics** show counts from real records. Nothing is estimated.

| Number | Means |
| --- | --- |
| **Unique visitors** | Browsers that opened the event page, counted anonymously once per day. Not people |
| **Opened the registration form** | Visitors who started registering (also anonymous, once a day) |
| **Registrations** | Completed submissions, including ones later cancelled |
| **Confirmed** | Registrations currently holding a place |
| **Attended** | People checked in |

The **funnel** shows each step as a percentage of the one before, so you can see where people drop off. Volunteer numbers show selection and offer-acceptance rates. Use **Show as table** under any chart for exact figures.

### 4.10 Your public profile

**Public profile** lets you change the logo, description, focus, campus or department, website, social links and public email. The society's name and university are part of its verification; contact support to change them.

---

## 5. For platform administrators

Administrators are added by the project owner (see `README.md → Bootstrapping the first administrator`). After logging in, administrators go straight to **Platform admin** instead of the student dashboard.

**Full powers.** A platform administrator can open **any society's workspace** with owner-level access: edit or cancel events, confirm or decline registrations, run volunteers, manage members and even transfer ownership (for example when a society's owner has graduated). Use **Societies → Open workspace**, or **Manage** on an event in **Event reviews**. The workspace header shows "Platform admin (full access)", and every action is recorded in the audit log under the admin's name.

| Page | What you do there |
| --- | --- |
| **Overview** | Waiting queues, usage, and **service health**: email mode, delivery results, whether the scheduler is running |
| **Society applications** | Open an application, read the details and the private evidence (a link valid for 5 minutes), then **Start review**, **Approve**, **Request more information** or **Reject**. You can't review your own application. Duplicate names at the same university are flagged |
| **Event reviews** | **Preview** each submitted event, then **Approve**, **Request changes** or **Reject**, with a note to the organisers |
| **Reports** | Start review, **Resolve** (say what was done), **Dismiss**, or **Suspend** the society behind a report |
| **Societies** | **Trust to publish** (skip event review) or **Require review**; **Suspend** (hides the society and its events and freezes changes; the team can still view and export) or **Reinstate** |
| **Directory** | 85+ universities and their campuses are preloaded. Add universities, campuses, departments and categories with official spellings (duplicates are refused). Edit each university's **email domains** (what counts as a verified university email). **Hide** keeps old records intact |
| **Audit log** | Every important change (roles, ownership, publishing, decisions), filterable by action |

---

## 6. Your account, privacy and emails

- **Profile & settings:** edit your details, photo and interests.
- **Email preferences:** turn **reminders**, **society updates** and **recommendations** (off by default) on or off. Confirmations, status changes, offers, cancellations and security emails are always sent, because they're part of what you asked for.
- **Change password:** from Settings, or **Forgot password** on the login page.
- **Delete account:** at the bottom of Settings; type your email to confirm. This removes your profile, registrations, applications and saved items. Certificates already issued stay verifiable under the printed name. Society owners must transfer ownership first.
- **What organisers see:** only your name, email and answers for events you registered for. Analysts see totals only. Collaborating societies see registrations only if the host allows it.
- **Certificates** can be checked by anyone at **/verify** with the code `CC-XXXX-XXXX-XXXX`. The check shows no email or contact details.

---

## 7. Questions and troubleshooting

**I didn't get the verification email.**
- **Running locally?** Emails are *never* delivered to Gmail or other real inboxes. The local database catches every email in a test inbox at **http://127.0.0.1:54324**; open it and click the link there. The "Check your email" screen links to it in development.
- **Want real emails while developing?** Uncomment the `[auth.email.smtp]` block in `supabase/config.toml`, set `RESEND_API_KEY` in your environment, and run `npm run db:stop && npm run db:start`. With Resend's shared test sender you can only email your own Resend account address; verify a domain in Resend to email anyone.
- **On the live site:** check spam, then use **Resend** on the login page. If nobody receives emails, the admin must configure custom SMTP in the Supabase dashboard (see README → Deployment).

**"Please log in to continue" after clicking a link.** Log in; you'll be taken back to the page you wanted.

**I can't see the Register button.** Read the status label: registration may not be open yet, may be closed, full without a waitlist, external, or not needed. If eligibility is limited, check that your profile has the right university.

**The camera scanner doesn't start.** Allow camera access in your browser, use HTTPS (or localhost), or type the ticket code instead. Safari may not support in-browser QR scanning; Chrome and Edge do.

**A society member can't see registrations.** Check their role under **Members & roles**. Volunteer coordinators and analysts deliberately can't see registrations.

**"You do not have permission to do that."** Your role doesn't include that action, or the society is suspended. Ask your society owner.

**Emails aren't arriving in production.** On **Platform admin → Overview**, check **Email delivery mode** (development mode sends nothing) and that the **Scheduled job** ran recently.

**Animations feel too much.** Turn on **Reduce motion** in your device's accessibility settings; the site respects it everywhere.

**Something looks broken.** Use **Report** on the page, or email the contact address in the site footer, with the reference shown on the error page if there is one.
