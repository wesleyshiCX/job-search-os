import { z } from "zod";

const severity = z
  .string()
  .transform((s) => s.toLowerCase())
  .pipe(z.enum(["critical", "moderate", "minor"]).catch("moderate"));

const questionType = z
  .string()
  .transform((s) => s.toLowerCase())
  .pipe(z.enum(["behavioral", "technical", "leadership"]).catch("behavioral"));

export const analysisSchema = z.object({
  keywords: z.array(z.string()).default([]),
  gaps: z
    .array(
      z.object({
        requirement: z.string(),
        severity,
        suggestion: z.string(),
      })
    )
    .default([]),
  resumeBullets: z.array(z.string()).default([]),
  starStories: z
    .array(
      z.object({
        competency: z.string(),
        situation: z.string(),
        task: z.string(),
        action: z.string(),
        result: z.string(),
      })
    )
    .default([]),
  interviewQuestions: z
    .array(
      z.object({
        question: z.string(),
        type: questionType,
        framework: z.string(),
      })
    )
    .default([]),
});

export type Analysis = z.infer<typeof analysisSchema>;
// ── P4: Debrief insights ────────────────────────────────────

export const debriefInsightSchema = z.object({
  pattern_analysis: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(
    z.object({
      area: z.string(),
      technique: z.string(),
      example: z.string(),
    })
  ),
  predicted_followups: z.array(z.string()),
  confidence_note: z.string(),
});

export type DebriefInsights = z.infer<typeof debriefInsightSchema>;

// ── P4: Outreach content ─────────────────────────────────────

export const outreachContentSchema = z.object({
  subject_line: z.string(),
  body: z.string(),
});

export type OutreachContent = z.infer<typeof outreachContentSchema>;
