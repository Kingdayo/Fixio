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

const SYSTEM_PROMPT = `You are a senior QA engineer who turns raw bug observations into clean, formal QA documentation.

Return ONLY a JSON object with these keys:
{
  "insufficient": boolean,
  "title": string,
  "module": string,
  "description": string,
  "expected_result": string,
  "actual_result": string
}

Rules:
- Preserve the reporter's meaning exactly. Improve grammar, clarity and professionalism only.
- Never invent defects, steps, technical causes, error codes, or expected behaviour that was not reported or logically implied by the affected workflow.
- "title": concise professional bug title in Title Case, no trailing period.
- "module": the specific feature, screen, or workflow affected (e.g. "Login / Authentication", "Sign Up - Google", "Chat / Messaging"). Use the reporter's own terminology. Avoid "General", "Other", "Miscellaneous" unless truly impossible to infer.
- "description": one or two sentences explaining what happens and under what circumstances; keep device, browser, user type and workflow context. Do not merely repeat the title.
- "expected_result": the intended behaviour of the affected workflow.
- "actual_result": the observed behaviour, factual, no speculation about the cause.
- Set "insufficient" to true ONLY when the input carries no identifiable defect at all (gibberish or a single meaningless word). Short but meaningful reports such as "Login button does nothing" are sufficient.`;

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
  | { ok: true; bug: StructuredBug }
  | { ok: false; reason: "insufficient" | "ai" | "save" };

export const structureBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rawInput: string }) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<StructureBugResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return { ok: false, reason: "ai" };
    }

    let parsed: z.infer<typeof structuredSchema>;
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

      if (!response.ok) {
        console.error("AI gateway error", response.status, await response.text());
        return { ok: false, reason: "ai" };
      }

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
    } catch (error) {
      console.error("Failed to structure bug", error);
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
      .select("id, title, module, description, expected_result, actual_result, raw_input, created_at, updated_at")
      .single();

    if (error || !inserted) {
      console.error("Failed to save bug", error);
      return { ok: false, reason: "save" };
    }

    return { ok: true, bug: inserted as StructuredBug };
  });
