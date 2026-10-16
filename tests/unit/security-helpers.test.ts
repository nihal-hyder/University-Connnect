import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { csvCell, toCsv } from "@/lib/csv";
import { userMessage } from "@/lib/errors";
import { isPathInFolder } from "@/lib/storage";

describe("safeNextPath (open-redirect protection)", () => {
  it.each([
    ["/dashboard/registrations", "/dashboard/registrations"],
    ["/events/x?tab=1#agenda", "/events/x?tab=1#agenda"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example/path",
    "/\\evil.example",
    "%2F%2Fevil.example",
    "javascript:alert(1)",
    "/ok\n//evil",
    "",
    undefined,
  ])("rejects %s", (input) => {
    expect(safeNextPath(input as string | undefined, "/fallback")).toBe("/fallback");
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+92 300")).toBe("'+92 300");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
  it("joins arrays and handles empty values", () => {
    expect(csvCell(["x", "y"])).toBe("x; y");
    expect(csvCell(null)).toBe("");
  });
  it("starts with a UTF-8 BOM and uses CRLF", () => {
    const out = toCsv(["Name"], [["Ayesha"]]);
    expect(out.startsWith("﻿Name\r\nAyesha\r\n")).toBe(true);
  });
});

describe("storage path ownership", () => {
  it("accepts files inside the user's folder", () => {
    expect(isPathInFolder("users/abc/1.webp", "users/abc")).toBe(true);
    expect(isPathInFolder(null, "users/abc")).toBe(true);
  });
  it("rejects other folders and traversal", () => {
    expect(isPathInFolder("users/other/1.webp", "users/abc")).toBe(false);
    expect(isPathInFolder("users/abc/../other/1.webp", "users/abc")).toBe(false);
    expect(isPathInFolder("users/abcdef/1.webp", "users/abc")).toBe(false);
    expect(isPathInFolder("users/abc/<script>.png", "users/abc")).toBe(false);
  });
});

describe("userMessage", () => {
  it("passes curated business messages through", () => {
    expect(userMessage({ code: "P0001", message: "This event has been cancelled." })).toBe("This event has been cancelled.");
  });
  it("hides internal errors", () => {
    expect(userMessage({ code: "XX000", message: "relation secret_table does not exist" })).toBe("Something went wrong. Please try again.");
  });
  it("hides raw RLS wording", () => {
    expect(userMessage({ code: "42501", message: 'new row violates row-level security policy for table "events"' })).toBe("You do not have permission to do that.");
  });
});
