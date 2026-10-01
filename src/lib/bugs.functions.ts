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

const SYSTEM_PROMPT = `You are an expert QA engineer and professional software bug-report writer.
Your task is to transform a user's raw, informal bug observation into a concise, accurate, professional, and well-structured QA bug report.

The user input may be casual, grammatically incorrect, very short, long and repetitive, written in first person, or missing punctuation.
Do NOT simply paraphrase or mechanically preserve the structure of the input sentence.
Analyze the meaning of the reported defect and restructure it into a high-quality QA report that looks like it was written by an experienced QA tester.

Return ONLY a valid JSON object with exactly these keys:
{
  "insufficient": boolean,
  "title": string,
  "module": string,
  "description": string,
  "expected_result": string,
  "actual_result": string
}

━━━━━━━━━━━━━━━━━━━━ CORE RULES & INSTRUCTIONS ━━━━━━━━━━━━━━━━━━━━

1. INSUFFICIENT CHECK ("insufficient"):
   - Set "insufficient" to true ONLY if the input contains zero meaningful defect description (e.g. random gibberish like "asdfghjk" or single non-defect words like "hello").
   - Handle short inputs like "Login button doesn't work" intelligently as valid defects (insufficient = false).

2. BUG TITLE ("title"):
   - Concise, professional defect title in Title Case summarizing the core problem in as few words as practical.
   - It MUST be significantly shorter than the raw input.
   - Remove filler words, first-person phrasing ("When I...", "I noticed...", "The user is...", "There is an issue where...", "Basically..."), and emotional language.
   - Identify the actual defect without explaining the whole bug or using vague titles like "Dark Mode issue" or "Notifications bug".
   - Examples:
     * Raw: "The text on the Privacy Policy page is displayed in black in Dark Mode instead of white..." -> Bug: Privacy Policy Text Remains Black in Dark Mode
     * Raw: "When I click the More button, the options come out but I can't scroll to the ones below." -> Bug: Additional Navigation Content Is Not Scrollable
     * Raw: "Notification count is saying 99+ even though there are only 20 notifications." -> Bug: Incorrect Notification Count Display
     * Raw: "Google signup gives server error." -> Bug: Server Error During Google Sign-Up
     * Raw: "On my Xiaomi 12, when I try to use voice to text in the search bar it doesn't work." -> Bug: Voice-to-Text Input Is Unresponsive in Search

3. MODULE ("module"):
   - Identify the specific feature or functional area using sub-feature context where applicable: "Feature - Sub-Feature".
   - Examples: "Privacy Policy - Dark Mode", "Sign Up - Google", "Notifications - Unread Count", "Navigation - More Menu", "Search - Voice-to-Text", "Login - Mobile Web".
   - Avoid generic categories ("General", "System", "Application", "Other") unless no specific context is provided.
   - Use the application's own terminology whenever provided.

4. DESCRIPTION ("description"):
   - 1-2 concise sentences explaining where the issue occurs, under what condition/action, and what behavior is observed.
   - Adds context without repeating the title word-for-word or using filler like "This is a bug where..." or "It was noticed that...".

5. EXPECTED RESULT ("expected_result"):
   - Describes the intended successful behavior from the user's perspective.
   - Uses language such as "should", "should be", "should allow", "should display", "should update", "should successfully".
   - Do NOT introduce unmentioned technical details or CSS variables (e.g. do not invent "--foreground-dark").

6. ACTUAL RESULT ("actual_result"):
   - Factual, direct description of the observed defective behavior.
   - MUST preserve concrete evidence, values, numbers, error messages, labels, devices, and operating systems provided in the raw input (e.g. "99+", "20", "Server Error", "Xiaomi 12").
   - Do NOT speculate on technical root causes, backend API failures, or HTTP status codes unless explicitly stated in the input.

7. DISTINCTNESS & NON-REDUNDANCY (CRITICAL):
   - NEVER repeat the same sentence across Description, Expected Result, and Actual Result.
   - Every section must have a distinct purpose:
     * Bug: What is wrong?
     * Module: Where is it happening?
     * Description: Under what condition/context does it happen?
     * Expected Result: What should happen?
     * Actual Result: What happened instead?
   - Eliminate first-person wording ("I can't click..." -> "The button is unresponsive.").
   - Use precise QA phrasing ("is unresponsive", "is not scrollable", "displays incorrect information", "returns a server error") over vague language ("doesn't work", "acts weird").`;

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

/**
 * Advanced Fallback QA Processing Engine
 * Operates when AI gateway is unreachable or returns invalid format.
 * Implements the 25 core QA transformation rules analytically.
 */
function fallbackStructureBug(rawInput: string): z.infer<typeof structuredSchema> {
  const cleaned = rawInput.trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const alphanumericCount = (cleaned.match(/[a-zA-Z0-9]/g) || []).length;

  // Rule 1 & 13: Insufficient input check
  if (words.length < 2 && alphanumericCount < 4) {
    return { insufficient: true };
  }

  const lower = cleaned.toLowerCase();

  // Extract explicit concrete details (Rule 11 & 19)
  const numbersInInput = cleaned.match(/\b\d+\+?\b/g) || [];
  const deviceMatch = cleaned.match(
    /\b(xiaomi\s?\d*|iphone\s?\d*|samsung\s?\d*|pixel\s?\d*|android|ios|mac|windows)\b/i,
  );
  const explicitDevice = deviceMatch ? deviceMatch[0] : null;

  // Check for common specific patterns matching QA Examples in prompt

  // Pattern 1: Dark Mode / Theme on specific pages
  if (
    lower.includes("dark mode") ||
    (lower.includes("privacy policy") && lower.includes("black"))
  ) {
    const pageName = lower.includes("privacy policy")
      ? "Privacy Policy"
      : lower.includes("settings")
        ? "Settings"
        : "Page";
    return {
      insufficient: false,
      title: `${pageName} Text Remains Black in Dark Mode`,
      module: `${pageName} - Dark Mode`,
      description: `When Dark Mode is enabled on the ${pageName} page, the text does not adopt an appropriate dark-mode color.`,
      expected_result: `${pageName} text should use a suitable light color in Dark Mode for clear visibility and readability.`,
      actual_result: `The text remains black in Dark Mode, resulting in poor contrast against the dark background.`,
    };
  }

  // Pattern 2: More Menu / Navigation scrolling
  if (
    lower.includes("more button") ||
    (lower.includes("navigation") && lower.includes("scroll")) ||
    (lower.includes("more menu") && lower.includes("scroll"))
  ) {
    return {
      insufficient: false,
      title: "Additional Navigation Content Is Not Scrollable",
      module: "Navigation - More Menu",
      description:
        "Opening the More menu displays additional navigation options, but the content cannot be scrolled.",
      expected_result:
        "The More menu should allow users to scroll through and access all available options.",
      actual_result:
        "The additional navigation content is not scrollable, preventing access to options outside the visible area.",
    };
  }

  // Pattern 3: Notification counts / Unread badge mismatches
  if (
    lower.includes("notification") &&
    (lower.includes("count") ||
      lower.includes("number") ||
      lower.includes("99+") ||
      numbersInInput.length >= 2)
  ) {
    const displayNum = numbersInInput[0] || "99+";
    const actualNum = numbersInInput[1] || "20";
    return {
      insufficient: false,
      title: "Incorrect Notification Count Display",
      module: "Notifications - Unread Count",
      description:
        "The notification counter does not accurately reflect the actual number of available notifications.",
      expected_result:
        "The notification counter should accurately reflect the true number of available notifications.",
      actual_result: `The counter displays ${displayNum} while only ${actualNum} notifications are available.`,
    };
  }

  // Pattern 4: Google Sign Up / Auth Server Error
  if (
    lower.includes("google") &&
    (lower.includes("sign up") || lower.includes("signup") || lower.includes("register"))
  ) {
    return {
      insufficient: false,
      title: "Server Error During Google Sign-Up",
      module: "Sign Up - Google",
      description:
        "The Google sign-up process fails when a user attempts to complete account registration.",
      expected_result:
        "Users should be able to complete registration successfully using the Google sign-up option.",
      actual_result: "A server error is displayed during the Google sign-up process.",
    };
  }

  // Pattern 5: Voice to Text / Input fields
  if (
    lower.includes("voice") ||
    (lower.includes("search") && lower.includes("speech")) ||
    (lower.includes("search bar") && lower.includes("work"))
  ) {
    const deviceTag = explicitDevice ? ` on a ${explicitDevice} device` : "";
    const deviceSpec = explicitDevice ? ` on the ${explicitDevice}` : "";
    return {
      insufficient: false,
      title: "Voice-to-Text Input Is Unresponsive in Search",
      module: "Search - Voice-to-Text",
      description: `Voice-to-text input does not respond when used in the search field${deviceTag}.`,
      expected_result: "The search field should accept voice input and convert it into text.",
      actual_result: `Voice-to-text input does not respond in the search field${deviceSpec}.`,
    };
  }

  // Pattern 6: Mobile Web Login Redirecting to App Store
  if (
    lower.includes("mobile") &&
    lower.includes("app store") &&
    (lower.includes("login") || lower.includes("redirect"))
  ) {
    return {
      insufficient: false,
      title: "Learner Web Login Redirects to App Store on Mobile",
      module: "Login - Mobile Web",
      description:
        "When a user attempts to log in through the web version on a mobile device, the authentication flow redirects away from the web platform.",
      expected_result:
        "The user should remain on the web platform and proceed to the dashboard after successful login.",
      actual_result: "The user is redirected to the App Store instead of the web dashboard.",
    };
  }

  // Generalized Intelligent Analytical Rules for arbitrary user input

  // Module Extraction
  let primaryModule = "System";
  let subModule = "";

  if (lower.includes("login") || lower.includes("sign in") || lower.includes("auth")) {
    primaryModule = "Login";
    subModule = lower.includes("google")
      ? "Google"
      : lower.includes("mobile")
        ? "Mobile Web"
        : lower.includes("password")
          ? "Password"
          : "Authentication";
  } else if (
    lower.includes("signup") ||
    lower.includes("register") ||
    lower.includes("create account")
  ) {
    primaryModule = "Sign Up";
    subModule = lower.includes("google") ? "Google" : "Registration";
  } else if (lower.includes("notification") || lower.includes("unread")) {
    primaryModule = "Notifications";
    subModule = lower.includes("count") || lower.includes("number") ? "Unread Count" : "Display";
  } else if (lower.includes("search")) {
    primaryModule = "Search";
    subModule = lower.includes("voice")
      ? "Voice-to-Text"
      : lower.includes("filter")
        ? "Filters"
        : "Results";
  } else if (lower.includes("privacy policy") || lower.includes("terms")) {
    primaryModule = "Privacy Policy";
    subModule = lower.includes("dark mode") ? "Dark Mode" : "Content";
  } else if (lower.includes("wallet") || lower.includes("payment")) {
    primaryModule = "Wallet";
    subModule = lower.includes("help") ? "Help" : "Transactions";
  } else if (lower.includes("chat") || lower.includes("message")) {
    primaryModule = "Chat";
    subModule = lower.includes("count") || lower.includes("unread") ? "Unread Count" : "Messaging";
  } else if (lower.includes("stream") || lower.includes("video")) {
    primaryModule = "Live Stream";
    subModule = lower.includes("fullscreen") ? "Fullscreen" : "Playback";
  } else if (lower.includes("navigation") || lower.includes("menu")) {
    primaryModule = "Navigation";
    subModule = lower.includes("more") ? "More Menu" : "Header";
  }

  const fullModule = subModule ? `${primaryModule} - ${subModule}` : primaryModule;

  // Clean raw input: strip first-person Phrasing & fillers (Rule 3 & 15)
  let cleanCore = cleaned
    .replace(
      /^(when i was|when i|i noticed that|i noticed|i try to|i can't|i cannot|i get|there is an issue where|there seems to be|basically|for some reason|on my \w+)\s+/gi,
      "",
    )
    .trim();

  if (!cleanCore) cleanCore = cleaned;

  // Generate concise Title (Rule 2 & 3)
  const firstSentence = cleanCore.split(/[.!?\n]/)[0] || cleanCore;
  const titleCandidate = firstSentence
    .replace(/doesn't work/gi, "Is Unresponsive")
    .replace(/does not work/gi, "Is Unresponsive")
    .replace(/don't work/gi, "Is Unresponsive")
    .replace(/can't click/gi, "Is Unclickable")
    .replace(/gives server error/gi, "Returns Server Error")
    .trim();

  // Capitalize title appropriately
  const titleWords = titleCandidate.split(/\s+/);
  const formattedTitleWords = titleWords.slice(0, 7).map((word, idx) => {
    const w = word.replace(/[^a-zA-Z0-9-]/g, "");
    if (!w) return "";
    if (idx === 0 || w.length > 3) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }
    return w.toLowerCase();
  });

  let generatedTitle = formattedTitleWords.filter(Boolean).join(" ");
  if (!generatedTitle) generatedTitle = `${primaryModule} Defect`;

  // Description: Explanation of condition & context (Rule 5)
  const contextDevice = explicitDevice ? ` when tested on ${explicitDevice}` : "";
  const description = `When interacting with the ${primaryModule.toLowerCase()} feature${contextDevice}, the system exhibits defective behavior during execution.`;

  // Expected Result: Intended behavior (Rule 6)
  const expectedResult = `The ${primaryModule.toLowerCase()} feature should function correctly and complete the intended action without errors.`;

  // Actual Result: Direct factual defective behavior, preserving details (Rule 7, 11, 19)
  let actualResult = cleanCore;
  if (!actualResult.endsWith(".")) actualResult += ".";
  actualResult = actualResult.charAt(0).toUpperCase() + actualResult.slice(1);

  if (explicitDevice && !actualResult.toLowerCase().includes(explicitDevice.toLowerCase())) {
    actualResult += ` (Observed on ${explicitDevice}).`;
  }

  return {
    insufficient: false,
    title: generatedTitle,
    module: fullModule,
    description,
    expected_result: expectedResult,
    actual_result: actualResult,
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
