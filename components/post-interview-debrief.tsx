"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const ROUND_TYPES = [
  { value: "phone_screen", label: "Phone Screen" },
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "panel", label: "Panel" },
  { value: "case", label: "Case Study" },
  { value: "final", label: "Final Round" },
  { value: "other", label: "Other" },
];

const FEELINGS = [
  { value: "great", label: "Great", emoji: "🟢" },
  { value: "good", label: "Good", emoji: "🔵" },
  { value: "mixed", label: "Mixed", emoji: "🟡" },
  { value: "rough", label: "Rough", emoji: "🟠" },
  { value: "disaster", label: "Disaster", emoji: "🔴" },
] as const;

interface DebriefInsights {
  pattern_analysis?: string;
  strengths?: string[];
  improvements?: { area: string; technique: string; example: string }[];
  predicted_followups?: string[];
  confidence_note?: string;
}

interface Debrief {
  id: string;
  round_type: string;
  overall_feeling: string;
  interview_date: string | null;
  questions_recalled: string | null;
  answers_liked: string | null;
  answers_regret: string | null;
  ai_insights: DebriefInsights | null;
  created_at: string;
}

interface PostInterviewDebriefProps {
  applicationId: string;
}

export function PostInterviewDebrief({
  applicationId,
}: PostInterviewDebriefProps) {
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [roundType, setRoundType] = useState("behavioral");
  const [feeling, setFeeling] = useState("good");
  const [questionsRecalled, setQuestionsRecalled] = useState("");
  const [answersLiked, setAnswersLiked] = useState("");
  const [answersRegret, setAnswersRegret] = useState("");

  useEffect(() => {
    loadDebriefs();
  }, [applicationId]);

  async function loadDebriefs() {
    try {
      const { getDebriefs } = await import(
        "@/app/actions/debrief-actions"
      );
      const data = await getDebriefs(applicationId);
      setDebriefs((data as Debrief[]) ?? []);
    } catch (err) {
      console.error("[Debrief] Load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          round_type: roundType,
          overall_feeling: feeling,
          questions_recalled: questionsRecalled,
          answers_liked: answersLiked,
          answers_regret: answersRegret,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to save debrief");
        return;
      }

      if (data.ai_error) {
        toast.warning(
          "Debrief saved, but AI insights failed. You can still view your notes."
        );
      } else {
        toast.success("Debrief saved with AI insights");
      }

      const newDebrief: Debrief = {
        id: data.debrief?.id ?? crypto.randomUUID(),
        round_type: data.debrief?.round_type ?? roundType,
        overall_feeling: data.debrief?.overall_feeling ?? feeling,
        interview_date:
          data.debrief?.interview_date ??
          data.debrief?.created_at ??
          new Date().toISOString(),
        questions_recalled:
          data.debrief?.questions_recalled ?? questionsRecalled,
        answers_liked: data.debrief?.answers_liked ?? answersLiked,
        answers_regret: data.debrief?.answers_regret ?? answersRegret,
        ai_insights: data.debrief?.ai_insights ?? null,
        created_at:
          data.debrief?.created_at ?? new Date().toISOString(),
      };

      setDebriefs([newDebrief, ...debriefs]);
      resetForm();
    } catch (err) {
      console.error("[Debrief] Submit error:", err);
      toast.error(
        "Something went wrong. Check that the debriefs table exists in your database."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { deleteDebrief } = await import(
        "@/app/actions/debrief-actions"
      );
      await deleteDebrief(id);
      setDebriefs(debriefs.filter((d) => d.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success("Debrief deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  function resetForm() {
    setShowForm(false);
    setRoundType("behavioral");
    setFeeling("good");
    setQuestionsRecalled("");
    setAnswersLiked("");
    setAnswersRegret("");
  }

  function getFeelingMeta(value: string) {
    return FEELINGS.find((f) => f.value === value) ?? FEELINGS[1];
  }

  function getRoundLabel(value: string) {
    return ROUND_TYPES.find((r) => r.value === value)?.label ?? value;
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Unknown date";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-6 bg-muted rounded w-40" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Interview Debriefs
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "Cancel" : "Add Debrief"}
        </button>
      </div>

      {/* New debrief form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border rounded-lg p-4 space-y-4 bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">New Debrief</span>
            <button
              type="button"
              onClick={resetForm}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Round Type
              </label>
              <select
                value={roundType}
                onChange={(e) => setRoundType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-22 text-sm"
              >
                {ROUND_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                How did it go?
              </label>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {FEELINGS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFeeling(f.value)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${
                      feeling === f.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <span>{f.emoji}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Questions they asked
            </label>
            <textarea
              value={questionsRecalled}
              onChange={(e) => setQuestionsRecalled(e.target.value)}
              placeholder='"Tell me about a time you scaled a support team..."'
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              What you nailed
            </label>
            <textarea
              value={answersLiked}
              onChange={(e) => setAnswersLiked(e.target.value)}
              placeholder="The STAR story about the Epic EHR rollout landed well..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              What you&apos;d redo
            </label>
            <textarea
              value={answersRegret}
              onChange={(e) => setAnswersRegret(e.target.value)}
              placeholder="Should've quantified the ADP cost savings more specifically..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving & Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Save & Generate Insights
              </>
            )}
          </button>
        </form>
      )}

      {/* Empty state */}
      {debriefs.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No debriefs yet. Log your first interview to get AI coaching.
        </p>
      )}

      {/* Existing debriefs */}
      <div className="space-y-2">
        {debriefs.map((debrief) => {
          const isExpanded = expandedId === debrief.id;
          const feelingMeta = getFeelingMeta(debrief.overall_feeling);

          return (
            <div
              key={debrief.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              {/* Collapsed header */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : debrief.id)
                  }
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium">
                    {getRoundLabel(debrief.round_type)}
                  </span>
                  <span className="text-xs">
                    {feelingMeta.emoji} {feelingMeta.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto mr-2">
                    {formatDate(debrief.interview_date)}
                  </span>
                </button>
                <button
                  onClick={() => handleDelete(debrief.id)}
                  className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t">
                  {/* Raw notes */}
                  {(debrief.questions_recalled ||
                    debrief.answers_liked ||
                    debrief.answers_regret) && (
                    <div className="pt-3 space-y-2">
                      {debrief.questions_recalled && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Questions Asked
                          </span>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap">
                            {debrief.questions_recalled}
                          </p>
                        </div>
                      )}
                      {debrief.answers_liked && (
                        <div>
                          <span className="text-xs font-medium text-emerald-400">
                            Nailed It
                          </span>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap">
                            {debrief.answers_liked}
                          </p>
                        </div>
                      )}
                      {debrief.answers_regret && (
                        <div>
                          <span className="text-xs font-medium text-orange-400">
                            Would Redo
                          </span>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap">
                            {debrief.answers_regret}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI insights */}
                  {debrief.ai_insights ? (
                    <div className="rounded-md bg-muted/50 p-3 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium">
                          AI Insights
                        </span>
                      </div>

                      {debrief.ai_insights.pattern_analysis && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Pattern
                          </span>
                          <p className="text-sm mt-0.5">
                            {debrief.ai_insights.pattern_analysis}
                          </p>
                        </div>
                      )}

                      {debrief.ai_insights.strengths &&
                        debrief.ai_insights.strengths.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-emerald-400">
                              Strengths
                            </span>
                            <ul className="mt-0.5 space-y-0.5">
                              {debrief.ai_insights.strengths.map((s, i) => (
                                <li key={i} className="text-sm flex gap-2">
                                  <span className="text-emerald-400 shrink-0">
                                    +
                                  </span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {debrief.ai_insights.improvements &&
                        debrief.ai_insights.improvements.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-orange-400">
                              Improvements
                            </span>
                            <div className="mt-0.5 space-y-2">
                              {debrief.ai_insights.improvements.map(
                                (imp, i) => (
                                  <div key={i} className="text-sm">
                                    <p className="font-medium">
                                      {imp.area}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {imp.technique}
                                    </p>
                                    <p className="text-xs italic mt-0.5">
                                      {imp.example}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {debrief.ai_insights.predicted_followups &&
                        debrief.ai_insights.predicted_followups.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-blue-400">
                              Predicted Follow-ups
                            </span>
                            <ul className="mt-0.5 space-y-0.5">
                              {debrief.ai_insights.predicted_followups.map(
                                (q, i) => (
                                  <li key={i} className="text-sm">
                                    {i + 1}. {q}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {debrief.ai_insights.confidence_note && (
                        <div className="pt-1 border-t border-border">
                          <p className="text-sm italic">
                            {debrief.ai_insights.confidence_note}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No AI insights generated for this debrief.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
