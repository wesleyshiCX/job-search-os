import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildDebriefPrompt } from "@/lib/ai/prompts";
import { debriefInsightSchema } from "@/lib/ai/schemas";

const groq = new Groq();
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    application_id,
    round_type,
    overall_feeling,
    questions_recalled,
    answers_liked,
    answers_regret,
  } = body;

  if (!application_id || !round_type || !overall_feeling) {
    return NextResponse.json(
      { error: "application_id, round_type, and overall_feeling are required" },
      { status: 400 }
    );
  }

  // Get application for context
  const { data: app } = await supabase
    .from("applications")
    .select("role_title, company")
    .eq("id", application_id)
    .eq("user_id", user.id)
    .single();

  if (!app)
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );

  // Save the debrief
  const { data: debrief, error: dbError } = await supabase
    .from("debriefs")
    .insert({
      user_id: user.id,
      application_id,
      round_type,
      overall_feeling,
      questions_recalled: questions_recalled || null,
      answers_liked: answers_liked || null,
      answers_regret: answers_regret || null,
    })
    .select()
    .single();

  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Generate AI insights
  const prompt = buildDebriefPrompt({
    roundType: round_type,
    overallFeeling: overall_feeling,
    questionsRecalled: questions_recalled || "",
    answersLiked: answers_liked || "",
    answersRegret: answers_regret || "",
    roleTitle: app.role_title,
    company: app.company,
  });

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content!);
    const insights = debriefInsightSchema.parse(parsed);

    // Save insights to the debrief
    await supabase
      .from("debriefs")
      .update({ ai_insights: insights })
      .eq("id", debrief.id);

    // Log telemetry
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    await supabase.from("telemetry").insert({
      user_id: user.id,
      feature: "debrief",
      model: MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd:
        inputTokens * 0.00000059 + outputTokens * 0.00000079,
    });

    return NextResponse.json({
      debrief: { ...debrief, ai_insights: insights },
    });
  } catch (err) {
    console.error("Debrief AI error:", err);
    // Still return the saved debrief, just without insights
    return NextResponse.json({
      debrief,
      ai_error: "Failed to generate insights. Debrief saved without AI analysis.",
    });
  }
}
