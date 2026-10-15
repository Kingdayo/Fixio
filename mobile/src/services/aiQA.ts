import { z } from "zod";
import { supabase } from "./supabase";
import type { Bug } from "../utils/bug-utils";

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

function cleanResponseText(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

export function generateQAWithKeyless(rawInput: string): GeminiQAOutput {
  const text = rawInput.trim();

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

  let bugTitle = text.slice(0, 80);
  if (text.length > 80) {
    const lastSpace = bugTitle.lastIndexOf(" ");
    if (lastSpace > 40) bugTitle = bugTitle.slice(0, lastSpace);
  }
  bugTitle = bugTitle.charAt(0).toUpperCase() + bugTitle.slice(1);
  if (!bugTitle.endsWith(".")) bugTitle += ".";

  const description = text.length > 10 ? text : `Reported defect observation: ${text}`;

  let expectedResult =
    "The application should complete the requested action successfully and navigate to the intended page/dashboard.";
  let actualResult = text;

  if (/redirect|sent to|navigat/i.test(text) && /instead/i.test(text)) {
    const parts = text.split(/instead of|instead/i);
    const [observed, intended] = parts;
    if (observed !== undefined && intended !== undefined) {
      expectedResult = `The user should be directed to ${intended.trim().replace(/\.$/, "")}.`;
      actualResult = `The user is incorrectly redirected: ${observed.trim().replace(/\.$/, "")}.`;
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

export async function generateQAWithPublicProxy(rawInput: string): Promise<GeminiQAOutput | null> {
  const proxyEndpoint = "https://text.pollinations.ai/v1/chat/completions";

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
        "User-Agent": "Fixio-Mobile-App/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = json.choices?.[0]?.message?.content ?? "";
    if (content) {
      const cleaned = cleanResponseText(content);
      const parsed = geminiOutputSchema.parse(JSON.parse(cleaned));
      return parsed;
    }
  } catch (err) {
    console.error("Public AI API proxy exception:", err);
  }
  return null;
}

export async function structureAndSaveBug(
  rawInput: string,
  userId: string
): Promise<{ ok: true; bug: Bug } | { ok: false; error: string }> {
  if (!rawInput.trim()) {
    return { ok: false, error: "Please describe the bug before continuing." };
  }

  let structured = await generateQAWithPublicProxy(rawInput);
  if (!structured) {
    structured = generateQAWithKeyless(rawInput);
  }

  const { bug: title, module: mod, description, expectedResult, actualResult } = structured;

  const { data: inserted, error } = await supabase
    .from("bugs")
    .insert({
      user_id: userId,
      title,
      module: mod,
      description,
      expected_result: expectedResult,
      actual_result: actualResult,
      raw_input: rawInput.trim(),
    })
    .select(
      "id, title, module, description, expected_result, actual_result, raw_input, created_at, updated_at"
    )
    .single();

  if (error || !inserted) {
    console.error("Failed to save bug in Supabase:", error);
    return { ok: false, error: "Bug processing succeeded, but saving failed. Please try again." };
  }

  return { ok: true, bug: inserted as Bug };
}
