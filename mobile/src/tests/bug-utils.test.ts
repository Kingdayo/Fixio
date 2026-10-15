import { describe, expect, test } from "bun:test";
import {
  formatBugDate,
  isToday,
  isSameMonth,
  groupBugsByDay,
  initialsFrom,
  bugReportText,
  type Bug,
} from "../utils/bug-utils";

describe("Mobile bug-utils tests", () => {
  test("initialsFrom generates correct two-letter initials", () => {
    expect(initialsFrom("Ada Lovelace", "ada@example.com")).toBe("AL");
    expect(initialsFrom("Grace", "grace@example.com")).toBe("GR");
    expect(initialsFrom("", "developer@company.com")).toBe("DE");
    expect(initialsFrom("", "")).toBe("FX");
  });

  test("formatBugDate formats ISO date strings accurately", () => {
    const iso = "2025-05-15T14:30:00.000Z";
    const formatted = formatBugDate(iso);
    expect(formatted).toContain("May 15, 2025");
  });

  test("isToday and isSameMonth correctly evaluate current dates", () => {
    const nowIso = new Date().toISOString();
    expect(isToday(nowIso)).toBe(true);
    expect(isSameMonth(nowIso)).toBe(true);

    const oldIso = "2020-01-01T00:00:00.000Z";
    expect(isToday(oldIso)).toBe(false);
    expect(isSameMonth(oldIso)).toBe(false);
  });

  test("groupBugsByDay chronologically groups bugs by day", () => {
    const bugs: Bug[] = [
      {
        id: "1",
        title: "Bug 1",
        module: "Auth",
        description: "Desc 1",
        expected_result: "Exp 1",
        actual_result: "Act 1",
        raw_input: "Raw 1",
        created_at: "2025-05-15T10:00:00.000Z",
        updated_at: "2025-05-15T10:00:00.000Z",
      },
      {
        id: "2",
        title: "Bug 2",
        module: "Billing",
        description: "Desc 2",
        expected_result: "Exp 2",
        actual_result: "Act 2",
        raw_input: "Raw 2",
        created_at: "2025-05-15T12:00:00.000Z",
        updated_at: "2025-05-15T12:00:00.000Z",
      },
      {
        id: "3",
        title: "Bug 3",
        module: "UI",
        description: "Desc 3",
        expected_result: "Exp 3",
        actual_result: "Act 3",
        raw_input: "Raw 3",
        created_at: "2025-05-10T08:00:00.000Z",
        updated_at: "2025-05-10T08:00:00.000Z",
      },
    ];

    const groups = groupBugsByDay(bugs);
    expect(groups.length).toBe(2);
    expect(groups[0].bugs.length).toBe(2);
    expect(groups[1].bugs.length).toBe(1);
  });

  test("bugReportText produces complete report string for copying/sharing", () => {
    const bug: Bug = {
      id: "b1",
      title: "Google Sign-In Error 500",
      module: "Authentication - Google",
      description: "Clicking sign in returns 500 server error.",
      expected_result: "User completes login.",
      actual_result: "Server error 500 displayed.",
      raw_input: "Google login gives server error",
      created_at: "2025-05-15T10:00:00.000Z",
      updated_at: "2025-05-15T10:00:00.000Z",
    };

    const text = bugReportText(bug);
    expect(text).toContain("Google Sign-In Error 500");
    expect(text).toContain("Module: Authentication - Google");
    expect(text).toContain("DESCRIPTION:\nClicking sign in returns 500 server error.");
  });
});
