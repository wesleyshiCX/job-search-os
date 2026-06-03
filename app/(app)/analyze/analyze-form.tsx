"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { setActiveResume } from "@/app/actions/resume-actions";

type ResumeMeta = {
  id: string;
  label: string;
  file_type: string;
  is_active: boolean;
  created_at: string;
};

export function AnalyzeForm({
  hasActiveResume,
  activeResumeText,
  resumes,
}: {
  hasActiveResume: boolean;
  activeResumeText: string | null;
  resumes: ResumeMeta[];
}) {
  const [jd, setJd] = useState("");
  const [resumeOverride, setResumeOverride] = useState("");
  const [useStoredResume, setUseStoredResume] = useState(hasActiveResume);
  const [loading, setLoading] = useState(false);

  const resumeText = useStoredResume && activeResumeText
    ? activeResumeText
    : resumeOverride;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        // Call the existing /api/analyze endpoint
        // (adapted to send resumeText in the body)
        const formData = new FormData();
        formData.append("jd", jd);
        if (resumeText) formData.append("resume", resumeText);

        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
          });
          // Handle response as your existing flow does
          if (!res.ok) throw new Error("Analysis failed");
          // ... redirect or show results as before
        } catch {
          alert("Something went wrong");
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-4"
    >
      {/* JD input — always required */}
      <div>
        <Label htmlFor="jd">Job Description</Label>
        <Textarea
          id="jd"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={10}
          required
        />
      </div>

      {/* Resume section */}
      <div>
        <div className="flex items-center justify-between">
          <Label>Your Resume</Label>
          {resumes.length > 1 && (
            <Select
              onValueChange={async (val) => {
                await setActiveResume(val);
                setUseStoredResume(true);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Switch resume..." />
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
          <div className="mt-2 rounded-lg border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Using your active resume ({activeResumeText.slice(0, 100)}...)
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0"
              onClick={() => setUseStoredResume(false)}
            >
              Paste a different resume instead
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              value={resumeOverride}
              onChange={(e) => setResumeOverride(e.target.value)}
              placeholder="Paste your resume text here..."
              rows={8}
            />
            {hasActiveResume && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => setUseStoredResume(true)}
              >
                Use my stored resume instead
              </Button>
            )}
          </>
        )}
      </div>

      <Button type="submit" disabled={loading || !jd.trim()}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze Job
          </>
        )}
      </Button>
    </form>
  );
}
