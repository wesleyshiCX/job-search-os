// components/follow-up-edit.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const QUICK_OPTIONS = [
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
];

interface FollowUpEditProps {
  applicationId: string;
  currentFollowUpAt: string | null;
  nextActionAt?: string | null;
}

export function FollowUpEdit({
  applicationId,
  currentFollowUpAt,
  nextActionAt,
}: FollowUpEditProps) {
  const followUpValue = currentFollowUpAt ?? nextActionAt;
  const [date, setDate] = useState(
    followUpValue
      ? new Date(followUpValue).toISOString().split("T")[0]
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Determine which column to update
  // follow_up_at is the V2 column, next_action_at is the V1 column
  // We update both to keep them in sync
  async function saveFollowUp(dateValue: string | null) {
    const supabase = (await import("@/lib/supabase/client")).createClient();

    const updateData: Record<string, any> = {};
    if (dateValue) {
      const isoDate = new Date(dateValue).toISOString();
      updateData.follow_up_at = isoDate;
      updateData.next_action_at = isoDate;
    } else {
      updateData.follow_up_at = null;
      updateData.next_action_at = null;
    }

    const { error } = await supabase
      .from("applications")
      .update(updateData)
      .eq("id", applicationId);

    if (error) {
      console.error("[FollowUpEdit] Save error:", error);
      throw error;
    }
  }

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      await saveFollowUp(date);
      toast.success(
        `Follow-up set for ${new Date(date).toLocaleDateString()}`
      );
    } catch {
      toast.error("Failed to save follow-up date");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickSet(days: number) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const dateStr = future.toISOString().split("T")[0];
    setDate(dateStr);
    setSaving(true);
    try {
      await saveFollowUp(dateStr);
      toast.success(
        `Follow-up set for ${future.toLocaleDateString()} (${days} days)`
      );
    } catch {
      toast.error("Failed to save follow-up date");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      await saveFollowUp(null);
      setDate("");
      toast.success("Follow-up cleared");
    } catch {
      toast.error("Failed to clear follow-up");
    } finally {
      setClearing(false);
    }
  }

  const isOverdue =
    followUpValue && new Date(followUpValue) < new Date();
  const isDueSoon =
    followUpValue &&
    !isOverdue &&
    new Date(followUpValue).getTime() - Date.now() <
      3 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarClock className="h-4 w-4" />
          Follow up
        </Label>

        {followUpValue && (
          <span
            className={`text-xs font-medium ${
              isOverdue
                ? "text-red-400"
                : isDueSoon
                ? "text-amber-400"
                : "text-muted-foreground"
            }`}
          >
            <Clock className="h-3 w-3 inline mr-1" />
            {isOverdue
              ? `Overdue by ${formatDistanceToNow(new Date(followUpValue))}`
              : `Due ${formatDistanceToNow(new Date(followUpValue), {
                  addSuffix: true,
                })}`}
          </span>
        )}
      </div>

      {/* Quick-set buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => handleQuickSet(opt.days)}
            disabled={saving}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date */}
      <div className="flex gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!date || saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        {followUpValue && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={clearing}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!followUpValue && (
        <p className="text-xs text-muted-foreground">
          Set a follow-up date and you'll be reminded on the morning briefing.
        </p>
      )}
    </div>
  );
}

function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}
