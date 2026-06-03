import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildOutreachPrompt } from "@/lib/ai/prompts";
import { outreachContentSchema } from "@/lib/ai/schemas";

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
  const { application_id, outreach_type, tone } = body;

  if (!application_id || !outreach_type || !tone) {
    return NextResponse.json(
      { error: "application_id, outreach_type, and tone are required" },
      { status: 400 }
    );
  }

  // Get application with JD
  const { data: app } = await supabase
    .from("applications")
    .select("role_title, company, jd_text, resume_id, resumes(raw_text)")
    .eq("id", application_id)
    .eq("user_id", user.id)
    .single();

  if (!app)
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );

  // Get resume text — prefer the resume linked to this application, fallback to active
  let resumeText = "";

  if (app.resume_id && (app.resumes as any)?.raw_text) {
    resumeText = (app.resumes as any).raw_text;
  } else {
    const { data: activeResume } = await supabase
      .from("resumes")
      .select("raw_text")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    resumeText = activeResume?.raw_text ?? "";
  }

  if (!resumeText) {
    return NextResponse.json(
      { error: "No resume found. Upload a resume first." },
      { status: 400 }
    );
  }

  // Generate outreach
  const prompt = buildOutreachPrompt({
    outreachType: outreach_type,
    tone,
    roleTitle: app.role_title,
    company: app.company,
    resumeText,
    jdText: app.jd_text ?? "",
  });

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2048,
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content!);
    const generated = outreachContentSchema.parse(parsed);

    // Save to outreach table
    const { data: outreach, error: dbError } = await supabase
      .from("outreach")
      .insert({
        user_id: user.id,
        application_id,
        outreach_type,
        tone,
        content: generated.body,
      })
      .select()
      .single();

    if (dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 });

    // Log telemetry
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    await supabase.from("telemetry").insert({
      user_id: user.id,
      feature: "outreach",
      model: MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd:
        inputTokens * 0.00000059 + outputTokens * 0.00000079,
    });

    return NextResponse.json({
      outreach: { ...outreach, subject_line: generated.subject_line },
    });
  } catch (err) {
    console.error("Outreach AI error:", err);
    return NextResponse.json(
      { error: "Failed to generate outreach content." },
      { status: 500 }
    );
  }
}
