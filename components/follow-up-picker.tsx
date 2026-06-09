// components/follow-up-picker.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, X } from "lucide-react";
import { toast } from "sonner";
import { setNextAction } from "@/app/actions/applications";

interface FollowUpPickerProps {
  applicationId: string;
  currentDate: string | null;
  onSaved?: () => void;
}

const PRESETS = [
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "7 days", days: 7 },
];

export function FollowUpPicker({
  applicationId,
  currentDate,
  onSaved,
}: FollowUpPickerProps) {
  const [date, setDate] = useState(
    currentDate ? new Date(currentDate).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);

  function applyPreset(days: number) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const formatted = target.toISOString().split("T")[0];
    setDate(formatted);
  }

  async function save() {
    setSaving(true);
    try {
      await setNextAction(
        applicationId,
        date ? new Date(date).toISOString() : null
      );
      toast.success("Follow-up date saved");
      onSaved?.();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      await setNextAction(applicationId, null);
      setDate("");
      toast.success("Follow-up cleared");
      onSaved?.();
    } catch {
      toast.error("Failed to clear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <CalendarClock className="h-4 w-4" />
        Follow up
      </label>

      {/* Preset buttons */}
      <div className="flex items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            onClick={() => applyPreset(preset.days)}
            className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
          >
            {preset.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">or</span>
      </div>

      {/* Date input + actions */}
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" onClick={save} disabled={saving || !date}>
          {saving ? "…" : "Save"}
        </Button>
        {currentDate && (
          <button
            onClick={clear}
            disabled={saving}
            className="text-muted-foreground hover:text-red-400 transition-colors p-1.5"
            title="Clear follow-up"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Current status */}
      {currentDate && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Follow up by {new Date(currentDate).toLocaleDateString()}
          {new Date(currentDate) < new Date() && (
            <span className="text-red-400 font-medium ml-1">(overdue)</span>
          )}
        </p>
      )}
    </div>
  );
}
