import { createClient } from "@/lib/supabase/server";

/** Calls the `embed` Edge Function → returns a 384-dim normalized vector. */
export async function embed(text: string): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("embed", {
    body: { text: text.slice(0, 8000) }, // keep within model context
  });
  if (error) throw error;
  return data.embedding as number[];
}

/** Cosine similarity → 0-100 match score. Vectors are already normalized,
 *  so cosine == dot product. We still divide by magnitudes defensively. */
export function matchScore(a: number[], b: number[]): number {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const magB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  const cosine = dot / (magA * magB || 1);
  // map [-1,1] → [0,100], clamp
  return Math.max(0, Math.min(100, Math.round(((cosine + 1) / 2) * 100)));
}
