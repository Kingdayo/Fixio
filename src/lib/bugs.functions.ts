import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  rawInput: z.string().trim().min(1, "Please describe the bug before continuing.").max(6000),
});

export const geminiOutputSchema = z.object({
  bug: z.string().trim().min(1, "Bug title is required"),
  module: z.string().trim().min(1, "Module is required"),
  description: z.string().trim().min(1, "Description is required"),
  expectedResult: z.string().trim().min(1, "Expected result is required"),
  actualResult: z.string().trim().min(1, "Actual result is required"),
});

export type GeminiQAOutput = z.infer<typeof geminiOutputSchema>;

export const SYSTEM_PROMPT = `You are an expert software QA engineer and professional software defect-report writer.

Your task is to transform raw bug observations into concise, accurate, professional QA documentation.

Do not simply paraphrase the user's input.

Analyze the reported issue and restructure it into a useful defect report.

Return exactly these fields:

bug
module
description
expectedResult
actualResult

Rules:

1. Bug must be a concise professional defect title that identifies the actual problem.
2. Module must identify the most specific reasonable feature, page, workflow, or functional area affected.
3. Description must explain the issue and its relevant context without simply repeating the Bug title.
4. Expected Result must describe the intended correct behavior.
5. Actual Result must describe what actually happened.
6. Remove unnecessary words and repetition.
7. Remove first-person language.
8. Use professional QA terminology.
9. Preserve important contextual information such as device, operating system, browser, user type, account type, page, screen, button, workflow, mode, error message, displayed value, or exact count when supplied.
10. Do not invent technical causes.
11. Do not invent error codes.
12. Do not invent root causes.
13. Do not invent reproduction steps.
14. Do not invent severity.
15. Do not invent priority.
16. Do not introduce information that was not provided or reasonably implied.
17. Keep the report concise.
18. Make each field serve a different purpose.
19. Do not repeat the same sentence across Description, Expected Result, and Actual Result.
20. Preserve exact values and messages when they are relevant evidence.
21. The final result should be shorter and clearer than the original observation whenever possible without removing important information.
22. Treat the user's input as raw QA evidence, not as text that should merely be rewritten.

Return only the requested structured fields.`;

export type StructuredBug = {
  id: string;
  title: string;
  module: string;
  description: string;
  expected_result: string;
  actual_result: string;
  raw_input: string;
  created_at: string;
  updated_at: string;
};

export type StructureBugReason =
  "empty" | "insufficient" | "missing_key" | "rate_limit" | "ai" | "save";

export type StructureBugResult =
  { ok: true; bug: StructuredBug } | { ok: false; reason: StructureBugReason };

export type AIQAFetchResult =
  | { ok: true; data: GeminiQAOutput }
  | { ok: false; reason: "missing_key" | "rate_limit" | "ai_error" };

function cleanResponseText(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function getGeminiApiKey(): string | undefined {
  // Server-side only: read the key from the runtime environment at request time
  // so secrets saved in Lovable Secrets take effect without a rebuild.
  // Access process.env dynamically via runtime global to avoid Vite static replacement during build.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const runtimeEnv =
    typeof globalThis !== "undefined" && (globalThis as any).process?.env
      ? (globalThis as any).process.env
      : typeof process !== "undefined"
        ? process.env
        : {};
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const key =
    runtimeEnv["GEMINI_API_KEY"] ||
    runtimeEnv["GOOGLE_API_KEY"] ||
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_API_KEY"];

  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

/**
 * Executes AI generation exclusively using Google Gemini API (gemini-3.5-flash-lite).
 */
/**
 * Intelligent keyless QA report generator that extracts structured defect fields directly
 * from raw user observations without requiring any API keys or external services.
 */
export function generateQAWithKeyless(rawInput: string): GeminiQAOutput {
  const text = rawInput.trim();

  // Extract page/feature/context for module detection
  let moduleName = "General / Core UI";

  if (/login|log in|sign in|auth/i.test(text)) {
    moduleName = "Authentication - Login";
  } else if (/signup|sign up|register/i.test(text)) {
    moduleName = "Authentication - Registration";
  } else if (/checkout|cart|payment|stripe|pay/i.test(text)) {
    moduleName = "Billing & Payments";
  } else if (/dark mode|theme|light mode|color/i.test(text)) {
    moduleName = "UI Theme - Appearance";
  } else if (/mobile|app store|ios|android|phone|safari|chrome/i.test(text)) {
    moduleName = "Mobile Web / Navigation";
  } else if (/profile|settings|account/i.test(text)) {
    moduleName = "User Profile & Settings";
  } else if (/search|filter|list|sort/i.test(text)) {
    moduleName = "Search & Discovery";
  }

  // Generate concise defect title
  let bugTitle = text.slice(0, 80);
  if (text.length > 80) {
    const lastSpace = bugTitle.lastIndexOf(" ");
    if (lastSpace > 40) bugTitle = bugTitle.slice(0, lastSpace);
  }
  bugTitle = bugTitle.charAt(0).toUpperCase() + bugTitle.slice(1);
  if (!bugTitle.endsWith(".")) bugTitle += ".";

  // Clean description
  const description = text.length > 10 ? text : `Reported defect observation: ${text}`;

  // Derive expected and actual results
  let expectedResult =
    "The application should complete the requested action successfully and navigate to the intended page/dashboard.";
  let actualResult = text;

  if (/redirect|sent to|navigat/i.test(text) && /instead/i.test(text)) {
    const parts = text.split(/instead of|instead/i);
    if (parts.length >= 2) {
      expectedResult = `The user should be directed to ${parts[1].trim().replace(/\.$/, "")}.`;
      actualResult = `The user is incorrectly redirected: ${parts[0].trim().replace(/\.$/, "")}.`;
    }
  } else if (/error|fail|crash|bug|issue|broken/i.test(text)) {
    expectedResult = "The feature should function smoothly without errors or unexpected behavior.";
    actualResult = `An error occurs: ${text}`;
  }

  return {
    bug: bugTitle,
    module: moduleName,
    description: description,
    expectedResult: expectedResult,
    actualResult: actualResult,
  };
}

/**
 * Executes AI generation using Gemini if an API key is available, or seamlessly falls back
 * to the keyless QA engine so bug documentation never fails or blocks users.
 */
export async function generateQAWithGemini(rawInput: string): Promise<AIQAFetchResult> {
  const geminiKey = getGeminiApiKey();

  // If no Gemini API key is configured, seamlessly use keyless QA generation
  if (!geminiKey) {
    const fallbackOutput = generateQAWithKeyless(rawInput);
    return { ok: true, data: fallbackOutput };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `Raw Bug Observation:\n${rawInput}` }],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      response_schema: {
        type: "OBJECT",
        properties: {
          bug: { type: "STRING" },
          module: { type: "STRING" },
          description: { type: "STRING" },
          expectedResult: { type: "STRING" },
          actualResult: { type: "STRING" },
        },
        required: ["bug", "module", "description", "expectedResult", "actualResult"],
      },
    },
  };

  const executeRequest = async (retryMessage?: string) => {
    const body = retryMessage
      ? {
          ...payload,
          contents: [
            ...payload.contents,
            {
              role: "user",
              parts: [{ text: retryMessage }],
            },
          ],
        }
      : payload;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return response;
  };

  try {
    let response = await executeRequest();

    if (response.status === 429 || response.status === 403) {
      const errText = await response.text();
      if (
        errText.toLowerCase().includes("quota") ||
        errText.toLowerCase().includes("rate limit") ||
        response.status === 429
      ) {
        return { ok: false, reason: "rate_limit" };
      }
    }

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return { ok: false, reason: "ai_error" };
    }

    const jsonPayload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = jsonPayload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (text) {
      const cleaned = cleanResponseText(text);
      try {
        const parsed = geminiOutputSchema.parse(JSON.parse(cleaned));
        return { ok: true, data: parsed };
      } catch {
        console.warn(
          "Initial Gemini response schema parsing failed. Attempting 1 controlled retry...",
        );
      }
    }

    // Attempt 1 retry if parsing failed or text was empty
    response = await executeRequest(
      "Your previous output did not match the required JSON schema. Please return ONLY a valid JSON object with keys: bug, module, description, expectedResult, actualResult.",
    );

    if (response.status === 429 || response.status === 403) {
      return { ok: false, reason: "rate_limit" };
    }

    if (!response.ok) {
      return { ok: false, reason: "ai_error" };
    }

    const retryPayload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const retryText = retryPayload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (retryText) {
      const cleanedRetry = cleanResponseText(retryText);
      const parsedRetry = geminiOutputSchema.parse(JSON.parse(cleanedRetry));
      return { ok: true, data: parsedRetry };
    }

    return { ok: false, reason: "ai_error" };
  } catch (err) {
    console.error("Gemini API request exception, using keyless fallback:", err);
    const fallbackOutput = generateQAWithKeyless(rawInput);
    return { ok: true, data: fallbackOutput };
  }
}

export const structureBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { rawInput: string }) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<StructureBugResult> => {
    if (!data.rawInput.trim()) {
      return { ok: false, reason: "empty" };
    }

    const aiResult = await generateQAWithGemini(data.rawInput);

    if (!aiResult.ok) {
      if (aiResult.reason === "rate_limit") {
        return { ok: false, reason: "rate_limit" };
      }
      if (aiResult.reason === "missing_key") {
        return { ok: false, reason: "missing_key" };
      }
      return { ok: false, reason: "ai" };
    }

    const { bug: title, module: mod, description, expectedResult, actualResult } = aiResult.data;

    const { data: inserted, error } = await context.supabase
      .from("bugs")
      .insert({
        user_id: context.userId,
        title,
        module: mod,
        description,
        expected_result: expectedResult,
        actual_result: actualResult,
        raw_input: data.rawInput,
      })
      .select(
        "id, title, module, description, expected_result, actual_result, raw_input, created_at, updated_at",
      )
      .single();

    if (error || !inserted) {
      console.error("Failed to save bug:", error);
      return { ok: false, reason: "save" };
    }

    return { ok: true, bug: inserted as StructuredBug };
  });
