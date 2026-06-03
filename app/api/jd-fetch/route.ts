import { NextRequest, NextResponse } from "next/server";
import { fetchJdFromUrl } from "@/lib/ai/jd-fetch";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "url is required" },
      { status: 400 }
    );
  }

  try {
    const result = await fetchJdFromUrl(url);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch JD";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
