import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import {
  generateQAWithGemini,
  generateQAWithPublicProxy,
  geminiOutputSchema,
  SYSTEM_PROMPT,
} from "./bugs.functions";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = process.env["GEMINI_API_KEY"];
const ORIGINAL_VITE_ENV = process.env["VITE_GEMINI_API_KEY"];
const ORIGINAL_PROXY_ENV = process.env["AI_PROXY_URL"];

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

function publicProxyResponse(fields: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(fields),
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("generateQAWithGemini & Public AI Proxy processing", () => {
  beforeEach(() => {
    process.env["GEMINI_API_KEY"] = "test-gemini-key";
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    process.env["GEMINI_API_KEY"] = ORIGINAL_ENV;
    process.env["VITE_GEMINI_API_KEY"] = ORIGINAL_VITE_ENV;
    process.env["AI_PROXY_URL"] = ORIGINAL_PROXY_ENV;
  });

  it("validates structured Gemini/Proxy output against geminiOutputSchema", () => {
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

  it("uses free public AI API proxy as primary processor", async () => {
    const captured: { url: string; body: unknown } = { url: "", body: null };

    globalThis.fetch = mock(async (url: URL | RequestInfo, options?: RequestInit) => {
      captured.url = url.toString();
      captured.body = JSON.parse(String(options?.body));

      return publicProxyResponse({
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

    expect(captured.url).toContain("text.pollinations.ai");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bug).toBe("Server Error During Google Sign-Up");
      expect(result.data.module).toBe("Sign Up - Google");
      expect(result.data.expectedResult).toContain("complete registration");
      expect(result.data.actualResult).toContain("server error");
    }
  });

  it("falls back to Gemini if public AI API proxy fails", async () => {
    let callCount = 0;

    globalThis.fetch = mock(async (url: URL | RequestInfo) => {
      callCount++;
      if (callCount === 1) {
        // Proxy fails
        return new Response("Internal Server Error", { status: 500 });
      }
      // Gemini succeeds
      return geminiResponse({
        bug: "Checkout Submit Fails With 500 Status",
        module: "Billing & Payments",
        description: "Clicking submit payment returns 500 error on checkout.",
        expectedResult: "Payment completes and user is redirected to order confirmation.",
        actualResult: "500 Internal Server Error displayed.",
      });
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini("Clicking submit payment returns 500 on checkout.");

    expect(callCount).toBe(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bug).toBe("Checkout Submit Fails With 500 Status");
      expect(result.data.module).toBe("Billing & Payments");
    }
  });

  it("handles free public AI API proxy error by falling back to keyless engine", async () => {
    delete process.env["GEMINI_API_KEY"];
    delete process.env["GOOGLE_API_KEY"];

    globalThis.fetch = mock(async () => {
      return new Response("Internal Server Error", { status: 500 });
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini(
      "When logging in, redirected to App Store instead of dashboard.",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bug).toBeDefined();
      expect(result.data.module).toBe("Authentication - Login");
    }
  });

  it("generateQAWithPublicProxy returns parsed output on valid proxy response", async () => {
    globalThis.fetch = mock(async () => {
      return publicProxyResponse({
        bug: "Dark Mode Theme Override Issue",
        module: "UI Theme - Appearance",
        description: "Dark mode does not persist across page navigation.",
        expectedResult: "Theme preference remains dark mode on navigation.",
        actualResult: "Theme reverts to light mode upon page refresh.",
      });
    }) as unknown as typeof fetch;

    const result = await generateQAWithPublicProxy("Dark mode resets on refresh");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bug).toBe("Dark Mode Theme Override Issue");
      expect(result.data.module).toBe("UI Theme - Appearance");
    }
  });

  it("handles rate limit 429 status from public proxy correctly", async () => {
    globalThis.fetch = mock(async () => {
      return new Response("Rate Limit Exceeded", { status: 429 });
    }) as unknown as typeof fetch;

    const result = await generateQAWithPublicProxy("Test input");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("rate_limit");
    }
  });

  it("never exposes sensitive environment variables or keys in result payload", async () => {
    process.env["GEMINI_API_KEY"] = "SECRET_GEMINI_KEY_12345";

    globalThis.fetch = mock(async () => {
      return new Response("Internal Server Error", { status: 500 });
    }) as unknown as typeof fetch;

    const result = await generateQAWithGemini("Test input");

    expect(JSON.stringify(result)).not.toContain("SECRET_GEMINI_KEY_12345");
  });
});
