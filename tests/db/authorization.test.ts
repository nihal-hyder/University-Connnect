import { afterAll, describe, expect, it } from "vitest";
import { anon, as, cleanup, days, makeEvent, service, SOCIETY, tag, USER } from "../support/db";

/**
 * Authorisation tests against the real policies and functions. Each test uses
 * the seeded demo accounts and isolated fixtures created with the service role.
 */

afterAll(cleanup);

describe("public visitors", () => {
  it("cannot read private tables", async () => {
    const db = anon();
    for (const table of ["registrations", "profiles", "society_applications", "volunteer_applications", "tickets", "notifications"] as const) {
      const { data, error } = await db.from(table).select("id").limit(1);
      // Either refused outright or no rows: never data.
      expect(error !== null || (data ?? []).length === 0, table).toBe(true);
    }
  });

  it("sees published events but not drafts", async () => {
    const draft = await makeEvent({ status: "draft", published_at: null });
    const live = await makeEvent();
    const db = anon();
    const { data } = await db.from("events").select("id").in("id", [draft.id, live.id]);
    expect((data ?? []).map((r) => r.id)).toEqual([live.id]);
  });

  it("cannot read the private online meeting link", async () => {
    const e = await makeEvent({ format: "online", venue: null, online_url: "https://meet.example/secret" });
    const { error } = await anon().from("events").select("online_url").eq("id", e.id);
    expect(error).not.toBeNull();
  });

  it("cannot perform a private operation", async () => {
    const e = await makeEvent();
    const { error } = await anon().rpc("register_for_event", { p_event: e.id });
    expect(error).not.toBeNull();
  });
});

describe("students", () => {
  it("cannot read another student's registration", async () => {
    const e = await makeEvent();
    const bilal = await as("bilal");
    const { data: reg, error } = await bilal.rpc("register_for_event", { p_event: e.id });
    expect(error).toBeNull();
    const ayesha = await as("ayesha");
    const { data } = await ayesha.from("registrations").select("id, answers").eq("id", reg![0].registration_id);
    expect(data).toEqual([]);
    const { data: ticket } = await ayesha.from("tickets").select("code").eq("registration_id", reg![0].registration_id);
    expect(ticket).toEqual([]);
  });

  it("cannot promote themselves to administrator", async () => {
    const ayesha = await as("ayesha");
    const { error } = await ayesha.from("platform_admins").insert({ user_id: USER.ayesha });
    expect(error).not.toBeNull();
    const { error: rpcError } = await ayesha.rpc("admin_platform_metrics");
    expect(rpcError?.code).toBe("42501");
  });

  it("cannot edit protected profile columns or other profiles", async () => {
    const ayesha = await as("ayesha");
    const { error } = await ayesha.from("profiles").update({ contact_email: "evil@example.com" } as never).eq("id", USER.ayesha);
    expect(error).not.toBeNull();
    const { data } = await ayesha.from("profiles").update({ full_name: "Hacked" }).eq("id", USER.bilal).select("id");
    expect(data ?? []).toEqual([]);
  });

  it("cannot become an admin through sign-up metadata", async () => {
    const email = `${tag}-signup@example.com`;
    const { data } = await anon().auth.signUp({ email, password: "A-long-test-passw0rd", options: { data: { full_name: "X", role: "admin", is_admin: true } } });
    const id = data.user?.id;
    expect(id).toBeTruthy();
    const svc = service();
    const { data: admins } = await svc.from("platform_admins").select("user_id").eq("user_id", id!);
    expect(admins).toEqual([]);
    await svc.auth.admin.deleteUser(id!);
  });

  it("cannot register for a cancelled event", async () => {
    const e = await makeEvent({ schedule_status: "cancelled", schedule_note: "Cancelled for the test." });
    const { error } = await (await as("ayesha")).rpc("register_for_event", { p_event: e.id });
    expect(error?.message).toMatch(/cancelled/i);
  });

  it("cannot approve their own registration", async () => {
    const e = await makeEvent({ requires_approval: true });
    const ayesha = await as("ayesha");
    const { data } = await ayesha.rpc("register_for_event", { p_event: e.id });
    expect(data![0].registration_status).toBe("pending");
    const { error } = await ayesha.rpc("organizer_set_registration_status", { p_registration: data![0].registration_id, p_status: "confirmed" });
    expect(error?.code).toBe("42501");
  });
});

describe("capacity", () => {
  it("gives the last seat to exactly one of two simultaneous registrations", async () => {
    const e = await makeEvent({ capacity: 1, waitlist_enabled: false });
    const [ayesha, bilal] = await Promise.all([as("ayesha"), as("bilal")]);
    const results = await Promise.all([ayesha.rpc("register_for_event", { p_event: e.id }), bilal.rpc("register_for_event", { p_event: e.id })]);
    const confirmed = results.filter((r) => r.data?.[0]?.registration_status === "confirmed");
    const refused = results.filter((r) => r.error);
    expect(confirmed).toHaveLength(1);
    expect(refused).toHaveLength(1);
    const { data } = await service().from("events").select("confirmed_count").eq("id", e.id).single();
    expect(data!.confirmed_count).toBe(1);
  });

  it("puts the overflow on the waitlist and promotes it when a place frees up", async () => {
    const e = await makeEvent({ capacity: 1, waitlist_enabled: true });
    const ayesha = await as("ayesha");
    const bilal = await as("bilal");
    const first = await ayesha.rpc("register_for_event", { p_event: e.id });
    const second = await bilal.rpc("register_for_event", { p_event: e.id });
    expect(first.data![0].registration_status).toBe("confirmed");
    expect(second.data![0].registration_status).toBe("waitlisted");
    const { error } = await ayesha.rpc("cancel_registration", { p_registration: first.data![0].registration_id });
    expect(error).toBeNull();
    const { data } = await service().from("registrations").select("status").eq("id", second.data![0].registration_id).single();
    expect(data!.status).toBe("confirmed");
  });

  it("refuses duplicate registrations", async () => {
    const e = await makeEvent();
    const ayesha = await as("ayesha");
    await ayesha.rpc("register_for_event", { p_event: e.id });
    const { error } = await ayesha.rpc("register_for_event", { p_event: e.id });
    expect(error).not.toBeNull();
  });
});

describe("society members", () => {
  it("cannot modify an event owned by another society", async () => {
    const lumsEvent = await makeEvent({ society_id: SOCIETY.entrepreneurship });
    const sara = await as("sara");
    const { data } = await sara.from("events").update({ title: "Hijacked event" }).eq("id", lumsEvent.id).select("id");
    expect(data ?? []).toEqual([]);
    const { data: check } = await service().from("events").select("title").eq("id", lumsEvent.id).single();
    expect(check!.title).not.toBe("Hijacked event");
  });

  it("cannot set privileged columns such as status directly", async () => {
    const e = await makeEvent({ status: "draft", published_at: null });
    const { error } = await (await as("sara")).from("events").update({ status: "published" } as never).eq("id", e.id);
    expect(error).not.toBeNull();
  });

  it("volunteer coordinators cannot see registrations or personal registration data", async () => {
    const e = await makeEvent();
    await (await as("bilal")).rpc("register_for_event", { p_event: e.id });
    const hamza = await as("hamza");
    const { data } = await hamza.from("registrations").select("id").eq("event_id", e.id);
    expect(data).toEqual([]);
    const { data: sara } = await (await as("sara")).from("registrations").select("id").eq("event_id", e.id);
    expect(sara).toHaveLength(1);
  });

  it("a duplicate ticket scan is reported, not double-counted", async () => {
    const e = await makeEvent();
    const { data: reg } = await (await as("ayesha")).rpc("register_for_event", { p_event: e.id });
    const { data: ticket } = await service().from("tickets").select("code").eq("registration_id", reg![0].registration_id).single();
    const sara = await as("sara");
    const first = await sara.rpc("check_in_ticket", { p_event: e.id, p_code: ticket!.code });
    const second = await sara.rpc("check_in_ticket", { p_event: e.id, p_code: ticket!.code });
    expect((first.data as { result: string }).result).toBe("checked_in");
    expect((second.data as { result: string }).result).toBe("already_checked_in");
    const { count } = await service().from("attendance_records").select("id", { count: "exact", head: true }).eq("event_id", e.id);
    expect(count).toBe(1);
    const invalid = await sara.rpc("check_in_ticket", { p_event: e.id, p_code: "not-a-real-ticket-code-123" });
    expect((invalid.data as { result: string }).result).toBe("invalid");
  });

  it("students cannot use the check-in endpoint", async () => {
    const e = await makeEvent();
    const { error } = await (await as("bilal")).rpc("check_in_ticket", { p_event: e.id, p_code: "whatever-code-123456789" });
    expect(error?.code).toBe("42501");
  });
});

describe("collaboration", () => {
  it("grants only the access the host chose, and revocation removes it", async () => {
    const e = await makeEvent();
    await (await as("ayesha")).rpc("register_for_event", { p_event: e.id });
    const sara = await as("sara");
    const zainab = await as("zainab");

    const { data: collabId, error } = await sara.rpc("invite_collaborator", { p_event: e.id, p_society: SOCIETY.entrepreneurship });
    expect(error).toBeNull();

    // Pending: no access yet.
    expect((await zainab.from("registrations").select("id").eq("event_id", e.id)).data).toEqual([]);

    // Zainab cannot accept on behalf of another society, or change permissions.
    const { error: permError } = await zainab.rpc("update_collaboration_permissions", {
      p_collaboration: collabId!,
      p_can_edit_details: true,
      p_can_manage_volunteers: true,
      p_can_view_registrations: true,
      p_can_check_in: true,
      p_can_view_analytics: true,
    });
    expect(permError).not.toBeNull();

    expect((await zainab.rpc("respond_collaboration", { p_collaboration: collabId!, p_accept: true })).error).toBeNull();
    // Accepted with least privilege: still no registrations, no editing.
    expect((await zainab.from("registrations").select("id").eq("event_id", e.id)).data).toEqual([]);
    expect((await zainab.from("events").update({ title: "Changed by collaborator" }).eq("id", e.id).select("id")).data ?? []).toEqual([]);

    // Host grants registration access.
    await sara.rpc("update_collaboration_permissions", {
      p_collaboration: collabId!,
      p_can_edit_details: false,
      p_can_manage_volunteers: false,
      p_can_view_registrations: true,
      p_can_check_in: false,
      p_can_view_analytics: false,
    });
    expect((await zainab.from("registrations").select("id").eq("event_id", e.id)).data).toHaveLength(1);

    await sara.rpc("revoke_collaboration", { p_collaboration: collabId! });
    expect((await zainab.from("registrations").select("id").eq("event_id", e.id)).data).toEqual([]);
  });
});

describe("volunteering", () => {
  async function roleOn(eventId: string) {
    const { data, error } = await service().from("volunteer_roles").insert({ event_id: eventId, title: "Test role", positions: 2 }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  it("enforces the application state machine", async () => {
    const e = await makeEvent({ volunteer_recruitment_open: true });
    const role = await roleOn(e.id);
    const ayesha = await as("ayesha");
    const { data: app } = await ayesha.rpc("apply_for_volunteer_role", { p_role: role });
    const id = app![0].application_id;
    expect((await ayesha.rpc("withdraw_volunteer_application", { p_application: id })).error).toBeNull();
    const { error } = await (await as("sara")).rpc("organizer_update_volunteer_application", { p_application: id, p_status: "offered" });
    expect(error?.message).toMatch(/cannot be moved/i);
  });

  it("applicants cannot read reviewer notes; other students cannot read applications", async () => {
    const e = await makeEvent({ volunteer_recruitment_open: true });
    const role = await roleOn(e.id);
    const { data: app } = await (await as("ayesha")).rpc("apply_for_volunteer_role", { p_role: role });
    const id = app![0].application_id;
    const sara = await as("sara");
    expect((await sara.from("volunteer_application_notes").insert({ application_id: id, body: "Private note" })).error).toBeNull();
    expect((await (await as("ayesha")).from("volunteer_application_notes").select("body").eq("application_id", id)).data).toEqual([]);
    expect((await (await as("bilal")).from("volunteer_applications").select("id").eq("id", id)).data).toEqual([]);
  });

  it("issues certificates only for completed participation, by authorised organisers", async () => {
    const e = await makeEvent({ starts_at: days(-1), ends_at: days(1), volunteer_recruitment_open: true });
    const role = await roleOn(e.id);
    const bilal = await as("bilal");
    const sara = await as("sara");
    const { data: app } = await bilal.rpc("apply_for_volunteer_role", { p_role: role });
    const id = app![0].application_id;

    expect((await sara.rpc("issue_volunteer_certificate", { p_application: id })).error).not.toBeNull();
    await sara.rpc("organizer_update_volunteer_application", { p_application: id, p_status: "offered" });
    expect((await bilal.rpc("respond_volunteer_offer", { p_application: id, p_accept: true })).error).toBeNull();
    expect((await sara.rpc("organizer_update_volunteer_application", { p_application: id, p_status: "completed" })).error).toBeNull();

    // The volunteer cannot issue their own certificate.
    expect((await bilal.rpc("issue_volunteer_certificate", { p_application: id })).error).not.toBeNull();
    const { data: code, error } = await sara.rpc("issue_volunteer_certificate", { p_application: id });
    expect(error).toBeNull();

    const { data: verified } = await anon().rpc("verify_certificate", { p_code: code! });
    expect(verified![0]).toMatchObject({ recipient_name: "Bilal Ahmed", revoked: false });
    // Verification exposes no contact details.
    expect(Object.keys(verified![0])).not.toContain("email");
  });
});

describe("private uploads", () => {
  it("verification documents are visible only to the applicant and administrators", async () => {
    const path = `applications/${USER.ayesha}/${tag}.pdf`;
    const pdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    const ayesha = await as("ayesha");
    expect((await ayesha.storage.from("documents").upload(path, pdf, { contentType: "application/pdf" })).error).toBeNull();

    const bilal = await as("bilal");
    expect((await bilal.storage.from("documents").download(path)).error).not.toBeNull();
    expect((await anon().storage.from("documents").download(path)).error).not.toBeNull();
    expect((await bilal.storage.from("documents").upload(`applications/${USER.ayesha}/${tag}-x.pdf`, pdf, { contentType: "application/pdf" })).error).not.toBeNull();

    expect((await (await as("admin")).storage.from("documents").download(path)).error).toBeNull();
    await service().storage.from("documents").remove([path]);
  });

  it("students cannot write into a society's media folder", async () => {
    const img = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    const { error } = await (await as("ayesha")).storage.from("media").upload(`societies/${SOCIETY.computing}/${tag}.png`, img, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });
});

describe("additions: funnel, shift capacity, delivery events", () => {
  it("counts registration-form openings only for public events and keeps them private", async () => {
    const live = await makeEvent();
    const draft = await makeEvent({ status: "draft", published_at: null });
    const visitor = anon();
    await visitor.rpc("record_registration_start", { p_event: live.id, p_visitor_hash: "h".repeat(32) });
    await visitor.rpc("record_registration_start", { p_event: live.id, p_visitor_hash: "h".repeat(32) }); // same visitor, same day
    await visitor.rpc("record_registration_start", { p_event: draft.id, p_visitor_hash: "h".repeat(32) });
    expect((await visitor.from("event_registration_starts").select("event_id")).error).not.toBeNull();
    const { data } = await (await as("sara")).rpc("event_funnel", { p_event: live.id });
    expect((data as { starts: number }).starts).toBe(1);
    const { count } = await service().from("event_registration_starts").select("event_id", { count: "exact", head: true }).eq("event_id", draft.id);
    expect(count).toBe(0);
    expect((await (await as("ayesha")).rpc("event_funnel", { p_event: live.id })).error?.code).toBe("42501");
  });

  it("never assigns more volunteers to a shift than its capacity", async () => {
    const e = await makeEvent({ starts_at: days(5), volunteer_recruitment_open: true });
    const svc = service();
    const { data: role } = await svc.from("volunteer_roles").insert({ event_id: e.id, title: "Desk", positions: 5 }).select("id").single();
    const sara = await as("sara");
    const apps: string[] = [];
    for (const who of ["ayesha", "bilal"] as const) {
      const c = await as(who);
      const { data } = await c.rpc("apply_for_volunteer_role", { p_role: role!.id });
      const id = data![0].application_id;
      await sara.rpc("organizer_update_volunteer_application", { p_application: id, p_status: "offered" });
      await c.rpc("respond_volunteer_offer", { p_application: id, p_accept: true });
      apps.push(id);
    }
    const { data: shift, error: shiftError } = await sara
      .from("volunteer_shifts")
      .insert({ role_id: role!.id, title: "Morning", starts_at: days(5), ends_at: days(5.1), capacity: 1 } as never)
      .select("id")
      .single();
    expect(shiftError).toBeNull();
    const results = await Promise.all(apps.map((a) => sara.from("volunteer_shift_assignments").insert({ shift_id: shift!.id, application_id: a })));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.message).toMatch(/shift is full/i);
  });

  it("only the server can record delivery events, and a complaint switches off optional email", async () => {
    expect((await (await as("ayesha")).rpc("job_record_email_event", { p_provider_id: "x", p_event: "delivered" })).error).not.toBeNull();
    const svc = service();
    const { data: row } = await svc
      .from("email_outbox")
      .insert({ user_id: USER.bilal, category: "reminder", template: "generic", subject: "Test", idempotency_key: `${tag}-mail`, status: "sent", provider_message_id: `${tag}-pid` })
      .select("id")
      .single();
    expect((await svc.rpc("job_record_email_event", { p_provider_id: `${tag}-pid`, p_event: "delivered" })).data).toBe(true);
    expect((await svc.from("email_outbox").select("status").eq("id", row!.id).single()).data!.status).toBe("delivered");
    await svc.rpc("job_record_email_event", { p_provider_id: `${tag}-pid`, p_event: "complained" });
    expect((await svc.from("email_outbox").select("status").eq("id", row!.id).single()).data!.status).toBe("complained");
    const { data: prefs } = await svc.from("user_preferences").select("email_reminders, email_recommendations").eq("user_id", USER.bilal).single();
    expect(prefs).toEqual({ email_reminders: false, email_recommendations: false });
    // Restore the demo account's defaults and remove the test row.
    await svc.from("user_preferences").update({ email_reminders: true, email_recommendations: false, email_society_updates: true }).eq("user_id", USER.bilal);
    await svc.from("email_outbox").delete().eq("id", row!.id);
  });
});
