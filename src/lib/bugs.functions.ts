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
   - Concise, highly specific, professional defect title in Title Case summarizing the core problem in as few words as practical.
   - It MUST be significantly shorter than the raw input and state the exact defect clearly.
   - Remove filler words, first-person phrasing ("When I...", "I noticed...", "The user is..."), and vague terms.
   - Benchmark Examples:
     * Raw: "In tutor, when you remove a subject under region and levels it disappears briefly but appears back again. When the save button is clicked the subject is removed permanently. Also when the tutor leaves the region and levels section, the subject is still removed without clicking the save button"
       -> Bug: Removed Subject Reappears Before Saving
     * Raw: "Saved subjects don't reflect in the saved items on tutor but the digipreneur courses reflect."
       -> Bug: Saved Subjects Not Displayed in Saved Items
     * Raw: "No tour guide is given when you login two different account types on the same device. The first account you login receives a tour but when you logout and login another account type no tour is given."
       -> Bug: Tour Guide Not Displayed After Switching Account Types
     * Raw: "The text on the Privacy Policy page is displayed in black in Dark Mode..."
       -> Bug: Privacy Policy Text Remains Black in Dark Mode

3. MODULE ("module"):
   - Identify the specific feature or functional area using sub-feature hierarchy: "Feature - Sub-Feature".
   - Benchmark Examples: "Tutor - Region and Levels", "Tutor - Saved Items", "Account Login - Tour Guide", "Privacy Policy - Dark Mode", "Sign Up - Google", "Notifications - Unread Count", "Search - Voice-to-Text".
   - Avoid generic categories like "General", "System", "Application", "Other" whenever specific context exists.

4. DESCRIPTION ("description"):
   - Detailed, professional narrative explaining where the issue occurs, the workflow/actions taken, and the exact defective behaviors observed.
   - Benchmark Examples:
     * "When a tutor removes a subject under Region and Levels, the subject disappears briefly but reappears again. However, clicking the Save button removes the subject permanently. Additionally, the subject remains removed even when the tutor leaves the Region and Levels section without clicking Save."
     * "When a tutor saves subjects, the saved subjects are not reflected in the Saved Items section, although Digipreneur courses that are saved are displayed correctly."
     * "When two different account types are logged into on the same device, the tour guide is displayed only for the first account. After logging out and logging into another account type, the tour guide is not displayed."

5. EXPECTED RESULT ("expected_result"):
   - Articulates the expected software logic and intended user experience clearly.
   - Benchmark Examples:
     * "A removed subject should either remain unchanged until the tutor clicks Save, or the removal should be immediately saved and consistently reflected. Leaving the section without saving should not apply the change."
     * "Saved subjects should appear in the tutor's Saved Items section, similar to saved Digipreneur courses."
     * "Each account type should receive the tour guide when logging in for the first time on the device."

6. ACTUAL RESULT ("actual_result"):
   - Factual, direct summary of the observed defective behavior contrasting the expected state.
   - Benchmark Examples:
     * "The subject temporarily disappears and reappears, but is permanently removed after clicking Save. The subject is also removed when the tutor leaves the section without clicking Save."
     * "Saved subjects do not appear in Saved Items, while saved Digipreneur courses are displayed."
     * "The first account receives the tour guide, but the second account type does not receive it after login."

7. DISTINCTNESS & QUALITY STANDARDS:
   - Every section must have a distinct purpose:
     * Bug: What is wrong? (Concise title)
     * Module: Where is it happening? (Specific area/sub-feature)
     * Description: What workflow and condition causes the issue?
     * Expected Result: What should happen logically?
     * Actual Result: What actually happens factually?
   - Eliminate first-person wording ("I can't click..." -> "The button is unresponsive.").
   - Never output generic boilerplate sentences. Adapt precisely to the domain terms provided by the user.`;

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

export const structureBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rawInput: string }) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<StructureBugResult> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];
    const apiKey = lovableKey || openaiKey;

    if (!apiKey) {
      console.error("No AI API Key provided (LOVABLE_API_KEY or OPENAI_API_KEY).");
      return { ok: false, reason: "ai" };
    }

    const endpoint = lovableKey
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const modelName = lovableKey ? "openai/gpt-6-astra" : "gpt-4o";

    let parsed: z.infer<typeof structuredSchema> | null = null;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          reasoning_effort: lovableKey ? "low" : undefined,
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
        console.error("AI API Error", response.status, await response.text());
        return { ok: false, reason: "ai" };
      }
    } catch (error) {
      console.error("Failed to process bug with AI", error);
      return { ok: false, reason: "ai" };
    }

    if (!parsed) {
      return { ok: false, reason: "ai" };
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
