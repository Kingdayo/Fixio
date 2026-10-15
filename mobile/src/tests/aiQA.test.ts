import { describe, expect, test } from "bun:test";

import {
  generateQAWithKeyless,
  geminiOutputSchema,
  generateQAWithPublicProxy,
} from "../services/aiQA";

describe("Mobile AI QA Structuring tests", () => {
  test("generateQAWithKeyless creates valid structured defect fields", () => {
    const raw = "Google sign up gives server error 500 when clicking continue.";
    const result = generateQAWithKeyless(raw);

    expect(result.bug).toBeTruthy();
    expect(result.module).toBe("Authentication - Registration");
    expect(result.description).toContain(raw);
    expect(result.expectedResult).toBeTruthy();
    expect(result.actualResult).toBeTruthy();

    const validated = geminiOutputSchema.parse(result);
    expect(validated).toEqual(result);
  });

  test("geminiOutputSchema fails if any field is missing or empty", () => {
    const invalid = {
      bug: "Title",
      module: "",
      description: "Desc",
      expectedResult: "Exp",
      actualResult: "Act",
    };

    expect(() => geminiOutputSchema.parse(invalid)).toThrow();
  });

  test("generateQAWithPublicProxy or fallback generates valid report", async () => {
    const raw = "Dark mode toggle does not save when restarting the app.";

    const fallback = generateQAWithKeyless(raw);
    expect(fallback.bug).toBeTruthy();
    expect(fallback.module).toBe("UI Theme - Appearance");
    expect(geminiOutputSchema.parse(fallback)).toBeTruthy();
  });
});
