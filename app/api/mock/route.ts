import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { groqAI, MODEL, estCost } from "@/lib/ai/groq";
import { mockInterviewSystemPrompt } from "@/lib/ai/prompts";

function toCoreMessages(raw: any[]) {
  return raw.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: Array.isArray(msg.parts)
      ? msg.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("\n")
      : typeof msg.content === "string"
        ? msg.content
        : "",
  }));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const body = await req.json();
  const jdContext = body.jdContext ?? "";
  const rawMessages = body.messages;

  if (!Array.isArray(rawMessages)) {
    return new Response("invalid messages", { status: 400 });
  }

  const messages = toCoreMessages(rawMessages);

  const result = streamText({
    model: groqAI(MODEL),
    temperature: 0.6,
    system: mockInterviewSystemPrompt(jdContext),
    messages,
    onFinish: async ({ usage }) => {
      try {
        // Handle both v5 and v6 usage field names
        const inTok = (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
        const outTok = (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;
        await supabase.from("telemetry").insert({
          user_id: user.id,
          endpoint: "mock",
          model: MODEL,
          prompt_tokens: inTok,
          completion_tokens: outTok,
          est_cost_usd: estCost(inTok, outTok),
        });
      } catch (e) {
        console.error("telemetry insert failed:", e);
      }
    },
  });

  // Raw text stream — maximum compatibility
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.textStream) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
