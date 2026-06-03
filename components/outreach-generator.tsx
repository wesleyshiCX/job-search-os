"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  X,
  Trash2,
  Copy,
  Sparkles,
  RefreshCw,
  Mail,
  Send,
  User,
  MessageSquare,
  Handshake,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const OUTREACH_TYPES = [
  {
    value: "cover_letter",
    label: "Cover Letter",
    icon: Mail,
  },
  {
    value: "recruiter_outreach",
    label: "Recruiter Outreach",
    icon: Send,
  },
  {
    value: "hiring_manager_outreach",
    label: "Hiring Manager",
    icon: User,
  },
  {
    value: "referral_note",
    label: "Referral Note",
    icon: Handshake,
  },
  {
    value: "thank_you",
    label: "Thank You",
    icon: MessageSquare,
  },
  {
    value: "follow_up",
    label: "Follow-Up",
    icon: Clock,
  },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm" },
  { value: "confident", label: "Confident" },
  { value: "casual", label: "Casual" },
];

interface OutreachItem {
  id: string;
  outreach_type: string;
  tone: string;
  content: string;
  created_at: string;
}

interface OutreachGeneratorProps {
  applicationId: string;
}

export function OutreachGenerator({
  applicationId,
}: OutreachGeneratorProps) {
  const [items, setItems] = useState<OutreachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [outreachType, setOutreachType] = useState("cover_letter");
  const [tone, setTone] = useState("professional");

  // Preview state
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    loadOutreach();
  }, [applicationId]);

  async function loadOutreach() {
    try {
      const { getOutreach } = await import(
        "@/app/actions/outreach-actions"
      );
      const data = await getOutreach(applicationId);
      setItems(data as OutreachItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);

    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          outreach_type: outreachType,
          tone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to generate");
        return;
      }

      toast.success("Outreach generated");
      setItems([data.outreach, ...items]);
      setPreviewId(data.outreach.id);
      setShowForm(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { deleteOutreach } = await import(
        "@/app/actions/outreach-actions"
      );
      await deleteOutreach(id);
      setItems(items.filter((i) => i.id !== id));
      if (previewId === id) setPreviewId(null);
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  function getTypeLabel(value: string) {
    return OUTREACH_TYPES.find((t) => t.value === value)?.label ?? value;
  }

  function getTypeIcon(value: string) {
    return OUTREACH_TYPES.find((t) => t.value === value)?.icon ?? Mail;
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
          Outreach & Cover Letters
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "Cancel" : "Generate New"}
        </button>
      </div>

      {/* Generate form */}
      {showForm && (
        <form
          onSubmit={handleGenerate}
          className="border rounded-lg p-4 space-y-4 bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Generate Outreach</span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Type
              </label>
              <select
                value={outreachType}
                onChange={(e) => setOutreachType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {OUTREACH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        </form>
      )}

      {/* Existing outreach items */}
      {items.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No outreach generated yet. Create cover letters, follow-ups, and more.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = getTypeIcon(item.outreach_type);
          const isPreview = previewId === item.id;

          return (
            <div
              key={item.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-muted">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">
                  {getTypeLabel(item.outreach_type)}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {item.tone}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(item.content)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-3">
                {isPreview ? (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                    {item.content}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.content.slice(0, 150)}...
                  </p>
                )}
              </div>

              {/* Expand/collapse */}
              <button
                onClick={() =>
                  setPreviewId(isPreview ? null : item.id)
                }
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1.5 border-t border-muted transition-colors"
              >
                {isPreview ? "Collapse" : "Read full"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
