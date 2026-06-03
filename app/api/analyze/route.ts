import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, MODEL, estCost } from "@/lib/ai/groq";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { analysisSchema } from "@/lib/ai/schemas";

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Input
  const { jobDescription, resumeText } = await req.json();
  if (!jobDescription) {
    return NextResponse.json(
      { error: "job description required" },
      { status: 400 }
    );
  }

  // Generate structured analysis
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ANALYZE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE RESUME:\n${
          resumeText || "Not provided — write strong generic examples and mark gaps as minor."
        }`,
      },
    ],
  });

  const raw = JSON.parse(completion.choices[0].message.content || "{}");

  // Telemetry — log cost/tokens for every call (feeds the /usage dashboard)
  const u = completion.usage;
  if (u) {
    await supabase.from("telemetry").insert({
      user_id: user.id,
      endpoint: "analyze",
      model: MODEL,
      prompt_tokens: u.prompt_tokens,
      completion_tokens: u.completion_tokens,
      est_cost_usd: estCost(u.prompt_tokens, u.completion_tokens),
    });
  }

  // Validate + normalize (resilient schema handles enum casing, missing fields)
  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) {
    // Keep a trimmed log for debugging without flooding the console
    console.error("Analyze schema validation failed:", parsed.error.issues);
    return NextResponse.json(
      { error: "schema_validation", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  return NextResponse.json(parsed.data);
}
