// app/api/match/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Cosine similarity → 0-100 score
function cosine(a: number[], b: number[]) {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const mag = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return dot / (mag(a) * mag(b));
}

// Generate embedding via Supabase Edge Function (gte-small)
async function generateEmbedding(text: string): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("embed", {
    body: { text },
  });

  if (error) {
    console.error("[match] Embed function error:", error);
    throw new Error(`Embedding failed: ${error.message}`);
  }

  // The edge function returns { embedding: number[] }
  return data?.embedding ?? data;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { resumeText, jdText } = body;

  if (!jdText) {
    return NextResponse.json(
      { error: "jdText is required" },
      { status: 400 }
    );
  }

  let resumeEmbedding: number[];
  let jdEmbedding: number[];

  try {
    // ── Get resume embedding ──
    // If raw text was provided, generate on the fly
    // Otherwise, use the active resume's stored embedding
    if (resumeText) {
      console.log("[match] Generating resume embedding from raw text");
      resumeEmbedding = await generateEmbedding(resumeText.slice(0, 3000));
    } else {
      // Fallback: use the active resume's stored embedding
      console.log("[match] Looking up active resume embedding from DB");
      const { data: activeResume, error: resumeError } = await supabase
        .from("resumes")
        .select("embedding")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (resumeError || !activeResume?.embedding) {
        return NextResponse.json(
          { error: "No active resume with embedding found. Upload a resume first." },
          { status: 400 }
        );
      }

      resumeEmbedding = activeResume.embedding;
    }

    // ── Get JD embedding ──
    // Always generate on the fly — the JD may not be saved yet
    console.log("[match] Generating JD embedding from text");
    jdEmbedding = await generateEmbedding(jdText.slice(0, 3000));

    // ── Validate embeddings ──
    if (
      !resumeEmbedding ||
      !jdEmbedding ||
      !Array.isArray(resumeEmbedding) ||
      !Array.isArray(jdEmbedding) ||
      resumeEmbedding.length === 0 ||
      jdEmbedding.length === 0
    ) {
      console.error("[match] Invalid embeddings:", {
        resumeLen: resumeEmbedding?.length ?? 0,
        jdLen: jdEmbedding?.length ?? 0,
        resumeType: typeof resumeEmbedding,
        jdType: typeof jdEmbedding,
      });
      return NextResponse.json(
        { error: "Failed to generate valid embeddings" },
        { status: 500 }
      );
    }

    if (resumeEmbedding.length !== jdEmbedding.length) {
      console.error("[match] Embedding dimension mismatch:", {
        resumeLen: resumeEmbedding.length,
        jdLen: jdEmbedding.length,
      });
      return NextResponse.json(
        { error: "Embedding dimension mismatch" },
        { status: 500 }
      );
    }

    // ── Compute similarity ──
    const similarity = cosine(resumeEmbedding, jdEmbedding);
    const score = Math.round(Math.max(0, Math.min(100, similarity * 100)));

    console.log("[match] Score computed:", {
      similarity: similarity.toFixed(4),
      score,
    });

    return NextResponse.json({ score });
  } catch (err) {
    console.error("[match] Error:", err);
    const message =
      err instanceof Error ? err.message : "Match scoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
