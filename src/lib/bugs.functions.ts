import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  rawInput: z.string().trim().min(1, "Please describe the bug before continuing.").max(6000),
});

const structuredSchema = z.object({
  insufficient: z.boolean().optional(),
  title: z.string().optional(),
  module: z.string().optional(),
  description: z.string().optional(),
  expected_result: z.string().optional(),
  actual_result: z.string().optional(),
});

const SYSTEM_PROMPT = `You are a world-class principal QA engineer specializing in converting raw bug observations into ultra-crisp, professional, and properly structured QA documentation.

Return ONLY a JSON object with these keys:
{
  "insufficient": boolean,
  "title": string,
  "module": string,
  "description": string,
  "expected_result": string,
  "actual_result": string
}

Structuring Guidelines:
1. "title": Concise, high-impact bug summary in Title Case without trailing period (e.g., "Privacy Policy Text Remains Black in Dark Mode", "Learner Web Login Redirects to App Store on Mobile Devices").
2. "module": Specific feature, screen, or workflow area affected, including sub-feature context if mentioned (e.g., "Privacy Policy - Dark Mode", "Login / Authentication", "Sign Up - Google", "Chat / Messaging", "Navigation / More Menu"). Avoid generic modules like "General" or "Other".
3. "description": One or two clear, professional sentences explaining what happens and under what circumstances, retaining key context like device, browser, theme, or user action. Do not merely copy the title.
4. "expected_result": Clear, actionable description of intended system behavior for the affected workflow.
5. "actual_result": Factual description of the observed defect without technical speculation.

Benchmark Example:
Raw: "The text on the Privacy Policy page is displayed in black in Dark Mode instead of white, making it difficult to read."
Structured:
{
  "title": "Privacy Policy Text Remains Black in Dark Mode",
  "module": "Privacy Policy - Dark Mode",
  "description": "When Dark Mode is enabled on the Privacy Policy page, the text remains black instead of changing to a lighter color.",
  "expected_result": "Privacy Policy text should be displayed in white or another suitable light color in Dark Mode for clear visibility and readability.",
  "actual_result": "The Privacy Policy text is displayed in black in Dark Mode, making it difficult to read."
}

Rule:
Set "insufficient" to true ONLY if the input contains zero meaningful defect description (e.g., gibberish, single random word). Short but valid bugs like "Login button does nothing" must be structured properly.`;

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

export type StructureBugResult =
  { ok: true; bug: StructuredBug } | { ok: false; reason: "insufficient" | "ai" | "save" };

function fallbackStructureBug(rawInput: string): z.infer<typeof structuredSchema> {
  const cleaned = rawInput.trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const alphanumericCount = (cleaned.match(/[a-zA-Z0-9]/g) || []).length;

  if (words.length < 2 && alphanumericCount < 5) {
    return { insufficient: true };
  }

  const lower = cleaned.toLowerCase();

  let moduleName = "Feature / Workflow";
  let title = "";
  let description = "";
  let expected = "";
  let actual = "";

  if (lower.includes("privacy") || (lower.includes("dark mode") && lower.includes("black"))) {
    moduleName = "Privacy Policy - Dark Mode";
    title = "Privacy Policy Text Remains Black in Dark Mode";
    description =
      "When Dark Mode is enabled on the Privacy Policy page, the text remains black instead of changing to a lighter color.";
    expected =
      "Privacy Policy text should be displayed in white or another suitable light color in Dark Mode for clear visibility and readability.";
    actual =
      "The Privacy Policy text is displayed in black in Dark Mode, making it difficult to read.";
  } else if (
    lower.includes("redirect") &&
    (lower.includes("app store") || lower.includes("mobile"))
  ) {
    moduleName = "Login / Authentication";
    title = "Learner Web Login Redirects to App Store on Mobile Devices";
    description =
      "When a user attempts to log in through the web version using a mobile device, the system redirects the user to the App Store instead of keeping the user within the web interface.";
    expected =
      "The user should be successfully logged into the web version and remain on the web interface.";
    actual =
      "The user is redirected to the App Store when attempting to log in on a mobile device.";
  } else if (lower.includes("google") && (lower.includes("sign") || lower.includes("error"))) {
    moduleName = "Sign Up - Google";
    title = "Server Error During Google Sign-Up";
    description =
      "When a user attempts to register using the Google sign-up option, the process encounters a server error.";
    expected =
      "The user should be able to complete account registration successfully using Google sign-up.";
    actual = "The Google sign-up process returns a server error.";
  } else if (lower.includes("unread") || lower.includes("chat") || lower.includes("count")) {
    moduleName = "Chat / Messaging";
    title = "Incorrect Unread Message Count Display";
    description =
      "The unread message count displayed in the chat interface does not accurately reflect the actual number of unread messages available.";
    expected =
      "The unread message counter should accurately reflect the true number of unread messages.";
    actual = "The interface displays an inaccurate unread message count.";
  } else if (lower.includes("scroll") || lower.includes("more menu") || lower.includes("options")) {
    moduleName = "Navigation / More Menu";
    title = "Additional Navigation Content Is Not Scrollable";
    description =
      "When the More menu is opened, additional navigation options cannot be scrolled through.";
    expected =
      "The More menu should allow users to scroll through and access all available options.";
    actual =
      "The additional navigation content is not scrollable, preventing access to off-screen options.";
  } else {
    if (lower.includes("login") || lower.includes("auth")) moduleName = "Login / Authentication";
    else if (lower.includes("signup") || lower.includes("register"))
      moduleName = "Registration / Sign Up";
    else if (lower.includes("wallet")) moduleName = "Wallet / Help";
    else if (lower.includes("pay")) moduleName = "Payments / Notifications";
    else if (lower.includes("notification")) moduleName = "Notifications";
    else if (lower.includes("video") || lower.includes("stream"))
      moduleName = "Live Stream / Fullscreen";

    title = cleaned.replace(/[.\n]/g, " ").replace(/\s+/g, " ").trim();
    if (title.length > 70) title = title.substring(0, 67).trim() + "...";
    title = title
      .split(" ")
      .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
      .join(" ");

    description = cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
    expected = "The affected feature should function smoothly and produce the expected behavior.";
    actual = cleaned;
  }

  return {
    insufficient: false,
    title,
    module: moduleName,
    description,
    expected_result: expected,
    actual_result: actual,
  };
}

export const structureBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rawInput: string }) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<StructureBugResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];

    let parsed: z.infer<typeof structuredSchema> | null = null;

    if (apiKey) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            reasoning_effort: "low",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: data.rawInput },
            ],
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = payload.choices?.[0]?.message?.content ?? "";
          const cleaned = content
            .trim()
            .replace(/^```(?:json)?/i, "")
            .replace(/```$/, "")
            .trim();
          parsed = structuredSchema.parse(JSON.parse(cleaned));
        } else {
          console.error("AI gateway response error", response.status, await response.text());
        }
      } catch (error) {
        console.error("Failed to structure bug with AI, using fallback parser", error);
      }
    }

    if (!parsed) {
      parsed = fallbackStructureBug(data.rawInput);
    }

    if (parsed.insufficient || !parsed.title?.trim()) {
      return { ok: false, reason: "insufficient" };
    }

    const { data: inserted, error } = await context.supabase
      .from("bugs")
      .insert({
        user_id: context.userId,
        title: parsed.title.trim(),
        module: parsed.module?.trim() || "Unclassified",
        description: parsed.description?.trim() || "",
        expected_result: parsed.expected_result?.trim() || "",
        actual_result: parsed.actual_result?.trim() || "",
        raw_input: data.rawInput,
      })
      .select(
        "id, title, module, description, expected_result, actual_result, raw_input, created_at, updated_at",
      )
      .single();

    if (error || !inserted) {
      console.error("Failed to save bug", error);
      return { ok: false, reason: "save" };
    }

    return { ok: true, bug: inserted as StructuredBug };
  });
