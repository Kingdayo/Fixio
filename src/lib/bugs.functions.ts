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

export const SYSTEM_PROMPT = `You are an expert software QA engineer and professional defect-report writer.

Your task is to transform raw bug observations into concise, accurate, professional QA documentation.

Do not simply paraphrase or rewrite the input as narrative text.

Analyze the reported defect and extract structured fields:

bug: A concise, professional defect title identifying the exact problem (e.g. "Server Error 500 During Google Sign-Up").
module: The specific feature, page, workflow, or component affected (e.g. "Authentication - Google Sign-Up").
description: Explains the defect context and impact clearly without repeating the Bug title or using first-person pronouns.
expectedResult: Describes the intended correct system behavior clearly.
actualResult: Describes the observed behavior preserving exact error codes, error messages, values, devices, and numerical evidence.

Rules:
1. Output MUST be a valid JSON object with keys: "bug", "module", "description", "expectedResult", "actualResult".
2. Remove first-person language ("I", "my", "we").
3. Do not invent technical root causes, reproduction steps, or priorities not provided in the input.
4. Keep the report concise, professional, and clear.`;

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

function getRuntimeEnvVar(key: string): string | undefined {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const runtimeEnv =
    typeof globalThis !== "undefined" && (globalThis as any).process?.env
      ? (globalThis as any).process.env
      : typeof process !== "undefined"
        ? process.env
        : {};
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const val = runtimeEnv[key] || (typeof process !== "undefined" ? process[key] : undefined);
  return typeof val === "string" && val.trim() ? val.trim() : undefined;
}

function getGeminiApiKey(): string | undefined {
  return getRuntimeEnvVar("GEMINI_API_KEY") || getRuntimeEnvVar("GOOGLE_API_KEY");
}

function getProxyApiUrl(): string {
  return (
    getRuntimeEnvVar("AI_PROXY_URL") ||
    getRuntimeEnvVar("FREE_AI_PROXY_URL") ||
    "https://text.pollinations.ai/v1/chat/completions"
  );
}

/**
 * Keyless QA report generator that extracts structured defect fields directly
 * from raw user observations without requiring any API keys or external services.
 */
export function generateQAWithKeyless(rawInput: string): GeminiQAOutput {
  const text = rawInput.trim();

  // Extract page/feature/context for module detection
  let moduleName = "General / Core UI";

  if (/login|logging|log in|sign in|auth/i.test(text)) {
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
 * Executes AI generation using a free public AI API proxy as the primary model handler.
 */
export async function generateQAWithPublicProxy(rawInput: string): Promise<AIQAFetchResult> {
  const proxyEndpoint = getProxyApiUrl();

  const payload = {
    model: "openai-fast",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Raw Bug Observation:\n${rawInput}` },
    ],
    temperature: 0.2,
  };

  try {
    const response = await fetch(proxyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Fixio-QA-App/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429 || response.status === 403) {
      return { ok: false, reason: "rate_limit" };
    }

    if (!response.ok) {
      console.error("Public AI API proxy returned error status:", response.status);
      return { ok: false, reason: "ai_error" };
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = json.choices?.[0]?.message?.content ?? "";
    if (content) {
      const cleaned = cleanResponseText(content);
      const parsed = geminiOutputSchema.parse(JSON.parse(cleaned));
      return { ok: true, data: parsed };
    }

    return { ok: false, reason: "ai_error" };
  } catch (err) {
    console.error("Public AI API proxy exception:", err);
    return { ok: false, reason: "ai_error" };
  }
}

/**
 * Process raw bug inputs into structured QA documentation using free public AI API proxy as primary,
 * falling back to Gemini or keyless generator engine if the proxy fails or is unavailable.
 */
export async function generateQAWithGemini(rawInput: string): Promise<AIQAFetchResult> {
  // Primary processor: Free public AI API proxy
  const proxyResult = await generateQAWithPublicProxy(rawInput);
  if (proxyResult.ok) {
    return proxyResult;
  }

  // Fallback 1: Gemini API if key is set
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
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

      return await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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

      if (response.ok) {
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
            console.warn("Initial Gemini response parsing failed, attempting retry...");
          }
        }

        response = await executeRequest(
          "Your previous output did not match the required JSON schema. Please return ONLY a valid JSON object with keys: bug, module, description, expectedResult, actualResult.",
        );

        if (response.ok) {
          const retryPayload = (await response.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const retryText = retryPayload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          if (retryText) {
            const cleanedRetry = cleanResponseText(retryText);
            const parsedRetry = geminiOutputSchema.parse(JSON.parse(cleanedRetry));
            return { ok: true, data: parsedRetry };
          }
        }
      }
    } catch (err) {
      console.error("Gemini API request exception:", err);
    }
  }

  // Fallback 2: Keyless QA generator engine
  const fallbackOutput = generateQAWithKeyless(rawInput);
  return { ok: true, data: fallbackOutput };
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
