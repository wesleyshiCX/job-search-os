// app/(app)/analyze/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createApplication } from "@/app/actions/applications";
import {
  getActiveResume,
  getResumes,
  setActiveResume,
} from "@/app/actions/resume-actions";
import { BatchJdAnalyzer } from "@/components/batch-jd-analyzer";
import type { Analysis } from "@/lib/ai/schemas";

const SEVERITY: Record<string, string> = {
  critical: "destructive",
  moderate: "outline",
  minor: "secondary",
};

type ResumeMeta = {
  id: string;
  label: string;
  file_type: string;
  is_active: boolean;
  created_at: string;
};

export default function AnalyzePage() {
  const router = useRouter();

  // ── Mode toggle (P3) ───────────────────────
  const [mode, setMode] = useState<"single" | "batch">("single");

  // ── V1 state ──────────────────────────────
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── V2 state (resume management) ──────────
  const [resume, setResume] = useState("");
  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [activeResumeText, setActiveResumeText] = useState<string | null>(null);
  const [activeResumeLabel, setActiveResumeLabel] = useState<string | null>(null);
  const [useStoredResume, setUseStoredResume] = useState(false);
  const [resumesLoaded, setResumesLoaded] = useState(false);

  // ── Load stored resumes on mount ──────────
  useEffect(() => {
    async function loadResumes() {
      try {
        const [resumeList, active] = await Promise.all([
          getResumes(),
          getActiveResume(),
        ]);

        setResumes(resumeList as ResumeMeta[]);

        if (active) {
          setActiveResumeText(active.raw_text);
          setActiveResumeLabel(active.label);
          setUseStoredResume(true);
        }
      } catch {
        // Graceful — just fall back to manual paste
      } finally {
        setResumesLoaded(true);
      }
    }
    loadResumes();
  }, []);

  // ── The actual resume text sent to the API ─
  const resumeText = useStoredResume && activeResumeText
    ? activeResumeText
    : resume;

  // ── V1 analyze ────────────────────────────
  async function analyze() {
    if (!jd) return toast.error("Paste a job description first.");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ jobDescription: jd, resumeText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Analysis failed");
      }
      setResult(await res.json());
      toast.success("Analysis complete");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── V1 save to pipeline ───────────────────
  async function saveToPipeline() {
    if (!result) return;
    if (!company || !roleTitle) {
      return toast.error("Add a company and role title to save.");
    }
    setSaving(true);
    try {
      await createApplication({
        company,
        roleTitle,
        jdText: jd,
        analysis: result,
      });
      toast.success("Saved to pipeline");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Analyze a Role
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste the JD. Add your resume for gap analysis and tailored bullets.
        </p>
      </div>

      {/* ── P3: Mode toggle ─────────────────── */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setMode("single")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "single"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Single JD
        </button>
        <button
          onClick={() => setMode("batch")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "batch"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Batch (up to 3)
        </button>
      </div>

      {/* ── P3: Batch mode ──────────────────── */}
      {mode === "batch" && (
        <BatchJdAnalyzer
          resumeText={resumeText}
          onSaved={() => {
            // Optionally navigate to dashboard
          }}
        />
      )}

      {/* ── Single JD mode (V1 + V2) ───────── */}
      {mode === "single" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Left: inputs ──────────────────── */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role title</label>
                <Input
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Director, Product Support"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Job description</label>
              <Textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={10}
                placeholder="Paste the full JD here…"
              />
            </div>

            {/* ── V2: Enhanced resume section ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Your resume{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>

                {resumes.length > 1 && useStoredResume && (
                  <Select
                    onValueChange={async (val) => {
                      await setActiveResume(val);
                      const active = await getActiveResume();
                      if (active) {
                        setActiveResumeText(active.raw_text);
                        setActiveResumeLabel(active.label);
                      }
                      toast.success(`Switched to "${active?.label}"`);
                    }}
                  >
                    <SelectTrigger className="h-7 w-44 text-xs">
                      <SelectValue
                        placeholder={activeResumeLabel ?? "Switch…"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label} {r.is_active ? "✓" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {useStoredResume && activeResumeText ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm font-medium text-primary">
                    Using: {activeResumeLabel}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {activeResumeText.slice(0, 160)}…
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-xs"
                    onClick={() => setUseStoredResume(false)}
                  >
                    Paste a different resume instead
                  </Button>
                </div>
              ) : (
                <>
                  <Textarea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    rows={6}
                    placeholder="Paste your resume text for personalized output…"
                  />
                  {activeResumeText && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setUseStoredResume(true)}
                    >
                      Use my stored resume ({activeResumeLabel}) instead
                    </Button>
                  )}
                </>
              )}

              {!resumesLoaded && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Checking for stored resumes…
                </p>
              )}

              {resumesLoaded && !activeResumeText && resumes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  💡 Upload a resume on the dashboard to skip pasting every time.
                </p>
              )}
            </div>

            <Button onClick={analyze} disabled={loading} className="w-full">
              {loading ? "Analyzing…" : "Generate analysis"}
            </Button>
          </div>

          {/* ── Right: results ───────────────── */}
          <div className="space-y-4">
            {loading && (
              <Card className="p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </Card>
            )}

            {!loading && !result && (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                Your tailored analysis will appear here.
              </Card>
            )}

            {result && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Results</h2>
                  <Button
                    onClick={saveToPipeline}
                    disabled={saving}
                    variant="secondary"
                  >
                    {saving ? "Saving…" : "Save to pipeline"}
                  </Button>
                </div>

                <Tabs defaultValue="bullets" className="flex flex-col">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="bullets">Bullets</TabsTrigger>
                    <TabsTrigger value="gaps">Gaps</TabsTrigger>
                    <TabsTrigger value="star">STAR</TabsTrigger>
                    <TabsTrigger value="questions">Questions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="bullets">
                    <Card className="p-5">
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {result.keywords.map((k, i) => (
                          <Badge key={i} variant="secondary">
                            {k}
                          </Badge>
                        ))}
                      </div>
                      <ul className="list-disc pl-5 space-y-2 text-sm">
                        {result.resumeBullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </Card>
                  </TabsContent>

                  <TabsContent value="gaps">
                    <Card className="p-5 space-y-3">
                      {result.gaps.map((g, i) => (
                        <div
                          key={i}
                          className="border-b last:border-0 pb-3 last:pb-0"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={SEVERITY[g.severity] as any}>
                              {g.severity}
                            </Badge>
                            <span className="text-sm font-medium">
                              {g.requirement}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {g.suggestion}
                          </p>
                        </div>
                      ))}
                    </Card>
                  </TabsContent>

                  <TabsContent value="star">
                    <div className="space-y-3">
                      {result.starStories.map((s, i) => (
                        <Card key={i} className="p-5 space-y-2">
                          <Badge>{s.competency}</Badge>
                          <p className="text-sm">
                            <b>S:</b> {s.situation}
                          </p>
                          <p className="text-sm">
                            <b>T:</b> {s.task}
                          </p>
                          <p className="text-sm">
                            <b>A:</b> {s.action}
                          </p>
                          <p className="text-sm">
                            <b>R:</b> {s.result}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="questions">
                    <div className="space-y-2">
                      {result.interviewQuestions.map((q, i) => (
                        <Card key={i} className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{q.type}</Badge>
                          </div>
                          <p className="text-sm font-medium">{q.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Framework: {q.framework}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
