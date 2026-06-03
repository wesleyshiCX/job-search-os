// Supabase Edge Function — runs on Deno, uses built-in gte-small (384 dims)
// No external API key required. Fully free.

const model = new Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return json({ error: "text (string) required" }, 400);
    }

    // gte-small embedding — normalized for cosine similarity
    const embedding = await model.run(text, {
      mean_pool: true,
      normalize: true,
    });

    return json({ embedding });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
