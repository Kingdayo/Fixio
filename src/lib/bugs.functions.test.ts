import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import { generateQAWithGemini, geminiOutputSchema, SYSTEM_PROMPT } from "./bugs.functions";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = process.env["GEMINI_API_KEY"];
const ORIGINAL_VITE_ENV = process.env["VITE_GEMINI_API_KEY"];

type GeminiRequestBody = {
  system_instruction?: {
    parts?: { text?: string }[];
  };
  generationConfig?: {
    response_mime_type?: string;
  };
};

function geminiResponse(fields: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(fields) }],
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("generateQAWithGemini & Gemini AI processing", () => {
  beforeEach(() => {
    process.env["GEMINI_API_KEY"] = "test-gemini-key";
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    process.env["GEMINI_API_KEY"] = ORIGINAL_ENV;
    process.env["VITE_GEMINI_API_KEY"] = ORIGINAL_VITE_ENV;
  });

  it("validates structured Gemini output against geminiOutputSchema", () => {
    const validOutput = {
      bug: "Privacy Policy Text Remains Black in Dark Mode",
      module: "Privacy Policy - Dark Mode",
      description:
        "When Dark Mode is enabled on the Privacy Policy page, the text does not adopt an appropriate dark-mode color.",
      expectedResult:
        "Privacy Policy text should use a suitable light color in Dark Mode to maintain clear visibility and readability.",
      actualResult:
        "The text remains black, resulting in poor contrast against the dark background.",
    };

    const parsed = geminiOutputSchema.parse(validOutput);
    expect(parsed).toEqual(validOutput);
  });

  it("fails schema validation if any required field is missing", () => {
    const invalidOutput = {
      bug: "Title",
      module: "Module",
      description: "Desc",
      // missing expectedResult & actualResult
    };

    expect(() => geminiOutputSchema.parse(invalidOutput)).toThrow();
  });

  it("uses model gemini-3.5-flash-lite and sends exact system instructions", async () => {
    const captured: { url: string; body: GeminiRequestBody | null } = { url: "", body: null };

    globalThis.fetch = mock(async (url: URL | RequestInfo, options?: RequestInit) => {
      captured.url = url.toString();
      captured.body = JSON.parse(String(options?.body)) as GeminiRequestBody;

      return geminiResponse({
        bug: "Server Error During Google Sign-Up",
        module: "Sign Up - Google",
        description: "The Google sign-up process fails when a user attempts to create an account.",
        expectedResult:
          "Users should be able to complete registration successfully through the Google sign-up option.",
        actualResult: "A server error is displayed during Google sign-up.",
      });
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini(
      "Google sign up gives a server error when I try to create an account.",
    );

    expect(captured.url).toContain("gemini-3.5-flash-lite:generateContent");
    expect(captured.url).toContain("key=test-gemini-key");
    expect(captured.body?.system_instruction?.parts?.[0]?.text).toBe(SYSTEM_PROMPT);
    expect(captured.body?.generationConfig?.response_mime_type).toBe("application/json");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bug).toBe("Server Error During Google Sign-Up");
      expect(result.data.module).toBe("Sign Up - Google");
      expect(result.data.expectedResult).toContain("complete registration");
      expect(result.data.actualResult).toContain("server error");
    }
  });

  it("performs 1 controlled retry if initial Gemini response is malformed JSON", async () => {
    let callCount = 0;

    globalThis.fetch = mock(async () => {
      callCount++;
      if (callCount === 1) {
        // Malformed / non-schema response on first try
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "This is not valid JSON string" }],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // Valid response on retry
      return geminiResponse({
        bug: "Additional Navigation Content Is Not Scrollable",
        module: "Navigation - More Menu",
        description:
          "Opening the More menu displays additional navigation options, but the content cannot be scrolled.",
        expectedResult: "The More menu should allow users to scroll through all available options.",
        actualResult: "The additional navigation content is not scrollable.",
      });
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini(
      "The More button opens extra navigation options but I can't scroll down.",
    );

    expect(callCount).toBe(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bug).toBe("Additional Navigation Content Is Not Scrollable");
    }
  });

  it("handles rate limits / quota exceeded status 429 gracefully", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({ error: { message: "Resource has been exhausted (e.g. check quota)." } }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini("Test bug description");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("rate_limit");
    }
  });

  it("uses GOOGLE_API_KEY when GEMINI_API_KEY is missing", async () => {
    delete process.env["GEMINI_API_KEY"];
    process.env["GOOGLE_API_KEY"] = "google-test-key";

    const captured: { url: string } = { url: "" };
    globalThis.fetch = mock(async (url: URL | RequestInfo) => {
      captured.url = url.toString();
      return geminiResponse({
        bug: "Google Key Test Bug",
        module: "Module Test",
        description: "Description test",
        expectedResult: "Expected test",
        actualResult: "Actual test",
      });
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini("Test input using google key");
    expect(captured.url).toContain("key=google-test-key");
    expect(result.ok).toBe(true);
    delete process.env["GOOGLE_API_KEY"];
  });

  it("uses keyless QA generation when no API key is configured", async () => {
    delete process.env["GEMINI_API_KEY"];
    delete process.env["GOOGLE_API_KEY"];

    const result = await generateQAWithGemini(
      "When a learner tries to log in on mobile, they are redirected to App Store instead of dashboard.",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bug).toBeDefined();
      expect(result.data.module).toBe("Authentication - Login");
      expect(result.data.expectedResult).toBeDefined();
      expect(result.data.actualResult).toBeDefined();
    }
  });

  it("never exposes the API key in the result payload or error objects", async () => {
    process.env["GEMINI_API_KEY"] = "SECRET_GEMINI_KEY_12345";

    globalThis.fetch = mock(async () => {
      return new Response("Internal Server Error", { status: 500 });
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini("Test input");

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SECRET_GEMINI_KEY_12345");
  });
});
