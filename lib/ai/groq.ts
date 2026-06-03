import Groq from "groq-sdk";
import { createGroq } from "@ai-sdk/groq";

// Raw SDK — used for structured JSON completions (analyze route)
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Vercel AI SDK provider — used for streaming (mock route)
export const groqAI = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Single model + pricing source of truth
export const MODEL = "llama-3.3-70b-versatile";

// Groq pricing per 1M tokens (Llama 3.3 70B)
export const PRICE = { in: 0.59, out: 0.79 } as const;

/** Compute USD cost from token usage. */
export function estCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens * PRICE.in + completionTokens * PRICE.out) / 1_000_000;
}
