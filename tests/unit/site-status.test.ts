import { describe, expect, it } from "vitest";
import { isOpenDuringMaintenance, parseSiteStatus } from "@/lib/site-status";

describe("maintenance mode", () => {
  it("keeps sign-in and the maintenance page reachable", () => {
    for (const path of ["/maintenance", "/login", "/auth/confirm", "/auth/signout", "/forgot-password", "/reset-password", "/sw.js", "/manifest.webmanifest"]) {
      expect(isOpenDuringMaintenance(path), path).toBe(true);
    }
  });

  it("blocks everything else, including look-alike paths", () => {
    for (const path of ["/", "/explore", "/events/x", "/admin", "/dashboard", "/signup", "/api/views", "/loginx", "/authors", "/maintenance-tips"]) {
      expect(isOpenDuringMaintenance(path), path).toBe(false);
    }
  });

  it("treats anything unexpected from the database as online", () => {
    expect(parseSiteStatus(null).maintenance).toBe(false);
    expect(parseSiteStatus({ maintenance: "true" }).maintenance).toBe(false);
    expect(parseSiteStatus({ maintenance: true, message: "  " })).toEqual({ maintenance: true, message: null, updatedAt: null });
    expect(parseSiteStatus({ maintenance: true, message: " Back at 6pm ", updated_at: "2026-10-17T00:00:00Z" })).toEqual({
      maintenance: true,
      message: "Back at 6pm",
      updatedAt: "2026-10-17T00:00:00Z",
    });
  });
});
