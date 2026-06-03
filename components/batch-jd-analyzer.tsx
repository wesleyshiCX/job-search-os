// components/batch-jd-analyzer.tsx
// Only the analyzeAll function changes. Full file for clean replacement.

"use client";

import { useState } from "react";
import {
  Link,
  Loader2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const MAX_JDS = 3;

interface AnalysisResult {
  jdIndex: number;
  company: string;
  roleTitle: string;
  matchScore: number | null;
  analysis: any;
  jdText: string;
  saving: boolean;
  saved: boolean;
}

interface BatchJdAnalyzerProps {
  resumeText: string;
  onSaved?: () => void;
}

export function BatchJdAnalyzer({ resumeText, onSaved }: BatchJdAnalyzerProps) {
  const [jdInputs, setJdInputs] = useState<
    { text: string; url: string; company: string; roleTitle: string }[]
  >([{ text: "", url: "", company: "", roleTitle: "" }]);

  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState<number | null>(null);

  function addJdSlot() {
    if (jdInputs.length >= MAX_JDS) return;
    setJdInputs([
      ...jdInputs,
      { text: "", url: "", company: "", roleTitle: "" },
    ]);
  }

  function removeJdSlot(index: number) {
    setJdInputs(jdInputs.filter((_, i) => i !== index));
  }

  function updateJdInput(
    index: number,
    field: string,
    value: string
  ) {
    setJdInputs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function fetchUrl(index: number) {
    const url = jdInputs[index].url.trim();
    if (!url) return;

    setFetchingUrl(index);
    try {
      const res = await fetch("/api/jd-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to fetch JD from URL");
        return;
      }

      if (!data.text || data.text.length < 10) {
        toast.error(
          "URL was fetched but no JD content was found. Try pasting the text directly."
        );
        return;
      }

      setJdInputs((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], text: data.text };

        if (data.title && !updated[index].roleTitle) {
          const parts = data.title.split(/ at | - | \| /);
          if (parts.length >= 2) {
            updated[index] = {
              ...updated[index],
              roleTitle: parts[0].trim(),
              company: parts[1].trim(),
            };
          } else {
            updated[index] = {
              ...updated[index],
              roleTitle: data.title,
            };
          }
        }

        return updated;
      });

      toast.success("JD fetched from URL");
    } catch (err) {
      console.error("[BatchJdAnalyzer] Fetch error:", err);
      toast.error("Failed to fetch JD");
    } finally {
      setFetchingUrl(null);
    }
  }

  async function analyzeAll() {
    const validJds = jdInputs.filter((j) => j.text.trim());
    if (validJds.length === 0) {
      toast.error("Paste at least one job description");
      return;
    }

    setAnalyzing(true);
    setResults([]);

    try {
      // ── Pass 1: Run all JD analyses in parallel ──
      const analysisPromises = validJds.map(async (jd, i) => {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription: jd.text,
            resumeText: resumeText || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Analysis failed for JD ${i + 1}`);
        }

        return res.json();
      });

      const analysisResponses = await Promise.allSettled(analysisPromises);

      // Build initial results (no scores yet)
      let analysisResults: AnalysisResult[] = analysisResponses.map(
        (response, i) => {
          const jd = validJds[i];
          const originalIndex = jdInputs.indexOf(jd);

          if (response.status === "fulfilled") {
            const data = response.value;
            return {
              jdIndex: originalIndex,
              company: jd.company || data.company || `JD ${i + 1}`,
              roleTitle: jd.roleTitle || data.roleTitle || "Unknown Role",
              matchScore: null,
              analysis: data.analysis ?? data,
              jdText: jd.text,
              saving: false,
              saved: false,
            };
          }

          return {
            jdIndex: jdInputs.indexOf(jd),
            company: jd.company || `JD ${i + 1}`,
            roleTitle: jd.roleTitle || "Unknown Role",
            matchScore: null,
            analysis: { error: response.reason?.message || "Analysis failed" },
            jdText: jd.text,
            saving: false,
            saved: false,
          };
        }
      );

      // Show results immediately (without scores) so the user sees progress
      setResults([...analysisResults]);

      // ── Pass 2: Fetch match scores in parallel ──
      if (resumeText) {
        const scorePromises = analysisResults
          .filter((r) => !r.analysis?.error)
          .map(async (result) => {
            try {
              const res = await fetch("/api/match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  resumeText,
                  jdText: result.jdText,
                }),
              });

              if (!res.ok) {
                console.warn(
                  `[BatchJdAnalyzer] Match score failed for JD ${result.jdIndex}: ${res.status}`
                );
                return { jdIndex: result.jdIndex, score: null };
              }

              const data = await res.json();
              console.log("[BatchJdAnalyzer] Match score response:", {
                jdIndex: result.jdIndex,
                score: data.score ?? data.matchScore ?? data.match_score ?? null,
                raw: data,
              });

              return {
                jdIndex: result.jdIndex,
                score:
                  data.score ??
                  data.matchScore ??
                  data.match_score ??
                  null,
              };
            } catch (err) {
              console.warn("[BatchJdAnalyzer] Match score error:", err);
              return { jdIndex: result.jdIndex, score: null };
            }
          });

        const scoreResponses = await Promise.allSettled(scorePromises);

        // Merge scores into results
        const scoreMap = new Map<number, number | null>();
        for (const resp of scoreResponses) {
          if (resp.status === "fulfilled") {
            scoreMap.set(resp.value.jdIndex, resp.value.score);
          }
        }

        analysisResults = analysisResults.map((r) => ({
          ...r,
          matchScore: scoreMap.get(r.jdIndex) ?? r.matchScore,
        }));
      }

      // Sort by match score descending
      analysisResults.sort((a, b) => {
        if (a.matchScore === null && b.matchScore === null) return 0;
        if (a.matchScore === null) return 1;
        if (b.matchScore === null) return -1;
        return b.matchScore - a.matchScore;
      });

      setResults(analysisResults);
    } catch (err) {
      toast.error("Analysis failed");
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveToPipeline(result: AnalysisResult) {
    setResults(
      results.map((r) =>
        r.jdIndex === result.jdIndex ? { ...r, saving: true } : r
      )
    );

    try {
      const { createApplication } = await import(
        "@/app/actions/applications"
      );
      await createApplication({
        company: result.company,
        roleTitle: result.roleTitle,
        jdText: result.jdText,
        analysis: result.analysis,
        matchScore: result.matchScore ?? undefined,
      });

      setResults(
        results.map((r) =>
          r.jdIndex === result.jdIndex
            ? { ...r, saving: false, saved: true }
            : r
        )
      );
      toast.success(`${result.roleTitle} at ${result.company} saved to pipeline`);
      onSaved?.();
    } catch {
      setResults(
        results.map((r) =>
          r.jdIndex === result.jdIndex ? { ...r, saving: false } : r
        )
      );
      toast.error("Failed to save");
    }
  }

  async function saveAllUnsaved() {
    const unsaved = results.filter((r) => !r.saved && !r.analysis?.error);
    for (const result of unsaved) {
      await saveToPipeline(result);
    }
  }

  function getScoreColor(score: number | null): string {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  }

  function getScoreLabel(score: number | null): string {
    if (score === null) return "—";
    if (score >= 85) return "Strong";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Weak";
  }

  function renderSaveButton(result: AnalysisResult) {
    if (result.analysis?.error) {
      return <span className="text-xs text-red-400">Failed</span>;
    }
    if (result.saved) {
      return (
        <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>
      );
    }
    if (result.saving) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving…
        </span>
      );
    }
    return (
      <button
        onClick={() => saveToPipeline(result)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Save className="h-3.5 w-3.5" />
        Save
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* JD Input Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Paste up to {MAX_JDS} job descriptions
          </h3>
          {jdInputs.length < MAX_JDS && (
            <button
              onClick={addJdSlot}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another
            </button>
          )}
        </div>

        {jdInputs.map((jd, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 space-y-3 bg-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                JD {index + 1} of {jdInputs.length}
              </span>
              {jdInputs.length > 1 && (
                <button
                  onClick={() => removeJdSlot(index)}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Company"
                value={jd.company}
                onChange={(e) =>
                  updateJdInput(index, "company", e.target.value)
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Role Title"
                value={jd.roleTitle}
                onChange={(e) =>
                  updateJdInput(index, "roleTitle", e.target.value)
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="url"
                    placeholder="Paste JD URL (Greenhouse, Lever, etc.)"
                    value={jd.url}
                    onChange={(e) =>
                      updateJdInput(index, "url", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => fetchUrl(index)}
                  disabled={!jd.url.trim() || fetchingUrl === index}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fetchingUrl === index ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  Fetch
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-muted-foreground/80">URL fetch</span> works with
                Greenhouse, Lever, Workable, and most company career pages.
                Does <span className="font-medium">not</span> work with
                LinkedIn (requires login), Indeed, Glassdoor, or internal Workday portals.
                If fetch fails, paste the JD text directly below.
              </p>
            </div>

            <textarea
              placeholder="Paste the full job description here…"
              value={jd.text}
              onChange={(e) =>
                updateJdInput(index, "text", e.target.value)
              }
              rows={6}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
        ))}
      </div>

      {/* Resume indicator */}
      {resumeText ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-medium text-primary">
            Analyzing against your active resume
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {resumeText.slice(0, 120)}…
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          💡 Upload a resume on the dashboard for match scoring and tailored analysis.
        </p>
      )}

      {/* Analyze button */}
      <button
        onClick={analyzeAll}
        disabled={analyzing || jdInputs.every((j) => !j.text.trim())}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {analyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing {jdInputs.filter((j) => j.text.trim()).length} JD
            {jdInputs.filter((j) => j.text.trim()).length !== 1 ? "s" : ""}…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze All vs. Active Resume
          </>
        )}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Comparative Scoring — sorted by match
            </h3>
            {results.some((r) => !r.saved && !r.analysis?.error) && (
              <button
                onClick={saveAllUnsaved}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Save All to Pipeline
              </button>
            )}
          </div>

          {/* Comparison table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Role</th>
                  <th className="text-center px-3 py-2.5 font-medium w-20">Score</th>
                  <th className="text-center px-3 py-2.5 font-medium w-24">Fit</th>
                  <th className="text-center px-3 py-2.5 font-medium w-20">Gaps</th>
                  <th className="text-right px-4 py-2.5 font-medium w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const gaps = result.analysis?.gap_analysis?.length ?? result.analysis?.gaps?.length ?? 0;
                  const hasError = !!result.analysis?.error;

                  return (
                    <tr
                      key={result.jdIndex}
                      className={`border-t border-muted ${hasError ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{result.roleTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.company}
                          </p>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span
                          className={`text-lg font-semibold ${getScoreColor(result.matchScore)}`}
                        >
                          {result.matchScore !== null ? `${result.matchScore}` : "—"}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            result.matchScore !== null && result.matchScore >= 70
                              ? "bg-emerald-400/10 text-emerald-400"
                              : result.matchScore !== null && result.matchScore >= 50
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {getScoreLabel(result.matchScore)}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3 text-muted-foreground">
                        {gaps > 0 ? gaps : "—"}
                      </td>
                      <td className="text-right px-4 py-3">
                        {renderSaveButton(result)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expandable detail cards */}
          <div className="space-y-2">
            {results.map((result) => {
              const isExpanded = expandedResult === result.jdIndex;
              const hasAnalysis = result.analysis && !result.analysis.error;

              return (
                <div
                  key={`detail-${result.jdIndex}`}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedResult(isExpanded ? null : result.jdIndex)
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium">{result.roleTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.company}
                    </span>
                    <span
                      className={`ml-auto text-sm font-semibold ${getScoreColor(result.matchScore)}`}
                    >
                      {result.matchScore ?? "—"}
                    </span>
                  </button>

                  {isExpanded && hasAnalysis && (
                    <div className="px-4 pb-4 border-t space-y-4 pt-3">
                      {result.analysis.tailored_bullets?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-emerald-400">
                            Tailored Bullets
                          </span>
                          <ul className="mt-1 space-y-1">
                            {result.analysis.tailored_bullets.map(
                              (b: string, i: number) => (
                                <li key={i} className="text-sm flex gap-2">
                                  <span className="text-emerald-400 shrink-0">•</span>
                                  {b}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {result.analysis.resumeBullets?.length > 0 && !result.analysis.tailored_bullets && (
                        <div>
                          <span className="text-xs font-medium text-emerald-400">
                            Tailored Bullets
                          </span>
                          <ul className="mt-1 space-y-1">
                            {result.analysis.resumeBullets.map(
                              (b: string, i: number) => (
                                <li key={i} className="text-sm flex gap-2">
                                  <span className="text-emerald-400 shrink-0">•</span>
                                  {b}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {result.analysis.gap_analysis?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-orange-400">
                            Gaps
                          </span>
                          <ul className="mt-1 space-y-1">
                            {result.analysis.gap_analysis.map(
                              (g: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  {i + 1}. {g}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {result.analysis.gaps?.length > 0 && !result.analysis.gap_analysis && (
                        <div>
                          <span className="text-xs font-medium text-orange-400">
                            Gaps
                          </span>
                          <ul className="mt-1 space-y-1">
                            {result.analysis.gaps.map(
                              (g: any, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  {typeof g === "string" ? g : g.requirement ?? JSON.stringify(g)}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {result.analysis.likely_questions?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-blue-400">
                            Likely Interview Questions
                          </span>
                          <ul className="mt-1 space-y-1">
                            {result.analysis.likely_questions
                              .slice(0, 5)
                              .map((q: string, i: number) => (
                                <li key={i} className="text-sm">{q}</li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {result.analysis.interviewQuestions?.length > 0 && !result.analysis.likely_questions && (
                        <div>
                          <span className="text-xs font-medium text-blue-400">
                            Likely Interview Questions
                          </span>
                          <ul className="mt-1 space-y-1">
                            {result.analysis.interviewQuestions
                              .slice(0, 5)
                              .map((q: any, i: number) => (
                                <li key={i} className="text-sm">
                                  {typeof q === "string" ? q : q.question ?? JSON.stringify(q)}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {result.analysis.keywords?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Keywords
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {result.analysis.keywords.map(
                              (k: string, i: number) => (
                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                  {k}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
