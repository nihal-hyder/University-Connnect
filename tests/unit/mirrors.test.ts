import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { ORGANISER_TRANSITIONS } from "@/lib/volunteers/transitions";

/**
 * The UI mirrors two pieces of SQL to decide what to render. The database is
 * authoritative; these tests fail if the mirrors drift from the migrations.
 */
const societies = readFileSync("supabase/migrations/20261015000003_societies.sql", "utf8");
const volunteers = readFileSync("supabase/migrations/20261015000009_api_volunteers.sql", "utf8");

function parseCaseArrays(sql: string, fn: string) {
  const body = sql.slice(sql.indexOf(fn), sql.indexOf("$$;", sql.indexOf(fn)));
  const out: Record<string, string[]> = {};
  for (const m of body.matchAll(/when '([a-z_]+)' then (?:array\[|p_to in \()([^\])]*)[\])]/g)) {
    out[m[1]] = [...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
  }
  return out;
}

describe("UI mirrors of database rules", () => {
  it("ROLE_PERMISSIONS matches private.role_permissions()", () => {
    const sql = parseCaseArrays(societies, "private.role_permissions");
    expect(Object.keys(sql).sort()).toEqual(Object.keys(ROLE_PERMISSIONS).sort());
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      expect([...perms].sort(), role).toEqual(sql[role]);
    }
  });

  it("ORGANISER_TRANSITIONS matches private.volunteer_transition_allowed()", () => {
    const sql = parseCaseArrays(volunteers, "private.volunteer_transition_allowed");
    for (const [from, tos] of Object.entries(ORGANISER_TRANSITIONS)) {
      expect([...tos].sort(), from).toEqual(sql[from] ?? []);
    }
  });

  it("an analyst cannot see personal data", () => {
    expect(ROLE_PERMISSIONS.analyst).not.toContain("view_registrations");
    expect(ROLE_PERMISSIONS.analyst).not.toContain("view_volunteer_applicants");
    expect(ROLE_PERMISSIONS.analyst).not.toContain("export_data");
  });

  it("a withdrawn application cannot be moved by organisers", () => {
    expect(ORGANISER_TRANSITIONS.withdrawn).toEqual([]);
  });
});
