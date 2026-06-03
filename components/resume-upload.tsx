"use client";

import { useState, useRef } from "react";
import { uploadResume } from "@/app/actions/resume-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileText, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type ResumeMeta = {
  id: string;
  label: string;
  file_type: string;
  is_active: boolean;
  created_at: string;
};

export function ResumeUpload({
  resumes,
  activeResume,
}: {
  resumes: ResumeMeta[];
  activeResume: { id: string; label: string } | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [setActive, setSetActive] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);

    const fd = new FormData(e.currentTarget);
    // Override the hidden input value with the current switch state
    fd.set("setActive", setActive ? "true" : "false");

    try {
      const result = await uploadResume(fd);
      if (result.success) {
        toast.success("Resume uploaded and parsed!");
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Resumes
        </CardTitle>
        <CardDescription>
          Upload once, auto-match against every job. PDF, DOCX, or TXT.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing resumes */}
        {resumes.length > 0 && (
          <div className="space-y-2">
            {resumes.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  r.is_active
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {r.is_active && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.file_type.toUpperCase()} ·{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!r.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { setActiveResume } = await import(
                          "@/app/actions/resume-actions"
                        );
                        await setActiveResume(r.id);
                        toast.success(`"${r.label}" set as active`);
                      }}
                    >
                      Set Active
                    </Button>
                  )}
                  {r.is_active && (
                    <span className="text-xs font-medium text-primary">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="file">Upload Resume</Label>
            <Input
              ref={fileRef}
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) =>
                setFileName(e.target.files?.[0]?.name || "")
              }
              className="cursor-pointer"
            />
            {fileName && (
              <p className="mt-1 text-xs text-muted-foreground">
                {fileName}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              name="label"
              placeholder='e.g. "Leadership", "SaaS", "Default"'
              defaultValue="Default"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="setActive"
              checked={setActive}
              onCheckedChange={setSetActive}
            />
            <Label htmlFor="setActive" className="text-sm cursor-pointer">
              Set as my active resume
            </Label>
          </div>

          {/* Hidden input driven by React state — not a static "true" */}
          <input type="hidden" name="setActive" value={setActive ? "true" : "false"} />

          <Button type="submit" disabled={uploading || !fileName}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing & uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Resume
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
