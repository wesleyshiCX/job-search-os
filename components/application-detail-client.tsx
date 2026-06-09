// components/application-detail-client.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactList } from "@/components/contact-list";
import { linkContactToApplication } from "@/app/actions/contact-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Link2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const FOLLOW_UP_PRESETS = [
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
];

interface ContactRow {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
  notes: string | null;
  warmth: string;
  created_at: string;
  role: string;
}

interface LinkableContact {
  id: string;
  name: string;
  company: string | null;
}

interface ApplicationDetailClientProps {
  applicationId: string;
  followUpAt: string | null;
  sourceUrl: string | null;
  appContacts: ContactRow[];
  availableToLink: LinkableContact[];
}

export function ApplicationDetailClient({
  applicationId,
  followUpAt,
  sourceUrl,
  appContacts: initialContacts,
  availableToLink: initialAvailable,
}: ApplicationDetailClientProps) {
  const [followUpDate, setFollowUpDate] = useState(
    followUpAt
      ? new Date(followUpAt).toISOString().split("T")[0]
      : ""
  );
  const [savingDate, setSavingDate] = useState(false);

  const [contacts, setContacts] = useState(initialContacts);
  const [availableToLink, setAvailableToLink] = useState(initialAvailable);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [linking, setLinking] = useState(false);

  const isOverdue =
    followUpDate && new Date(followUpDate) < new Date();
  const isDueSoon =
    followUpDate &&
    !isOverdue &&
    new Date(followUpDate).getTime() - Date.now() <
      3 * 24 * 60 * 60 * 1000;

  async function saveFollowUpDate(dateValue: string | null) {
    setSavingDate(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const isoDate = dateValue
        ? new Date(dateValue).toISOString()
        : null;
      const { error } = await supabase
        .from("applications")
        .update({
          follow_up_at: isoDate,
          next_action_at: isoDate,
        })
        .eq("id", applicationId);
      if (!error) {
        toast.success(
          dateValue
            ? `Follow-up set for ${new Date(dateValue).toLocaleDateString()}`
            : "Follow-up cleared"
        );
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingDate(false);
    }
  }

  async function handlePresetClick(days: number) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const dateStr = future.toISOString().split("T")[0];
    setFollowUpDate(dateStr);
    await saveFollowUpDate(dateStr);
  }

  async function handleCustomSave() {
    if (!followUpDate) return;
    await saveFollowUpDate(followUpDate);
  }

  async function handleClear() {
    setFollowUpDate("");
    await saveFollowUpDate(null);
  }

  async function handleLinkContact() {
    if (!selectedContactId) return;
    setLinking(true);
    try {
      const result = await linkContactToApplication(
        applicationId,
        selectedContactId,
        "recruiter"
      );
      if (result.success) {
        toast.success("Contact linked!");
        const linked = availableToLink.find(
          (c) => c.id === selectedContactId
        );
        if (linked) {
          setContacts([
            ...contacts,
            {
              id: linked.id,
              name: linked.name,
              title: null,
              company: linked.company ?? null,
              email: null,
              linkedin_url: null,
              phone: null,
              notes: null,
              warmth: "cold",
              created_at: new Date().toISOString(),
              role: "recruiter",
            },
          ]);
          setAvailableToLink(
            availableToLink.filter((c) => c.id !== selectedContactId)
          );
          setSelectedContactId("");
        }
      } else {
        toast.error("Failed to link contact");
      }
    } catch {
      toast.error("Failed to link contact");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Follow-up date ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            Follow up
          </Label>
          {followUpDate && (
            <span
              className={`text-xs font-medium ${
                isOverdue
                  ? "text-red-400"
                  : isDueSoon
                  ? "text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {isOverdue
                ? `Overdue by ${formatDistanceToNow(new Date(followUpDate))}`
                : `Due ${formatDistanceToNow(new Date(followUpDate), {
                    addSuffix: true,
                  })}`}
            </span>
          )}
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {FOLLOW_UP_PRESETS.map((preset) => (
            <button
              key={preset.days}
              onClick={() => handlePresetClick(preset.days)}
              disabled={savingDate}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom date + save/clear */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-fit"
          />
          <Button
            size="sm"
            onClick={handleCustomSave}
            disabled={!followUpDate || savingDate}
          >
            {savingDate ? "Saving…" : "Save"}
          </Button>
          {followUpDate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={savingDate}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!followUpDate && (
          <p className="text-xs text-muted-foreground">
            Set a follow-up and you&apos;ll see it in the morning briefing.
          </p>
        )}
      </div>

      {/* ── Source URL ── */}
      {sourceUrl && (
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5">
            <Link2 className="h-4 w-4" />
            Source
          </Label>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {sourceUrl}
          </a>
        </div>
      )}

      {/* ── Contacts ── */}
      <div className="space-y-2">
        <Label>People</Label>

        {contacts.length > 0 && (
          <div className="space-y-1.5">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{c.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {c.role}
                  </Badge>
                  {c.company && (
                    <span className="text-xs text-muted-foreground">
                      {c.company}
                    </span>
                  )}
                </div>
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Email
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {availableToLink.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                value={selectedContactId}
                onValueChange={setSelectedContactId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToLink.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` (${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleLinkContact}
              disabled={!selectedContactId || linking}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ContactList
          contacts={contacts.map((c) => ({
            id: c.id,
            name: c.name,
            title: c.title,
            company: c.company,
            email: c.email,
            warmth: c.warmth,
            linkedin_url: c.linkedin_url,
            phone: c.phone,
            notes: c.notes,
            created_at: c.created_at,
          }))}
          applicationId={applicationId}
        />
      </div>
    </div>
  );
}
