"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactList } from "@/components/contact-list";
import {
  getApplicationContacts,
  linkContactToApplication,
} from "@/app/actions/contact-actions";
import {
  Clock,
  CalendarClock,
  Link2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { PostInterviewDebrief } from "@/components/post-interview-debrief";
import { OutreachGenerator } from "@/components/outreach-generator";

type Application = {
  id: string;
  company: string;
  title: string;
  status: string;
  follow_up_at: string | null;
  source_url: string | null;
  notes: string | null;
};

type Contact = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  warmth: string;
};

export function ApplicationDetail({
  application,
  allContacts,
  open,
  onClose,
}: {
  application: Application | null;
  allContacts: Contact[];
  open: boolean;
  onClose: () => void;
}) {
  const [appContacts, setAppContacts] = useState<
    { role: string; contacts: Contact }[]
  >([]);
  const [followUpDate, setFollowUpDate] = useState(
    application?.follow_up_at
      ? new Date(application.follow_up_at).toISOString().split("T")[0]
      : ""
  );

  useEffect(() => {
    if (application?.id) {
      getApplicationContacts(application.id).then(setAppContacts);
    }
  }, [application?.id]);

  useEffect(() => {
    if (application?.follow_up_at) {
      setFollowUpDate(
        new Date(application.follow_up_at).toISOString().split("T")[0]
      );
    }
  }, [application?.follow_up_at]);

  if (!application) return null;

  const linkedContactIds = appContacts.map(
    (ac) => ac.contacts.id
  );
  const availableToLink = allContacts.filter(
    (c) => !linkedContactIds.includes(c.id)
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{application.company}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {application.title}
          </p>
          <Badge variant="outline" className="w-fit">
            {application.status}
          </Badge>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Follow-up date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              Follow up by
            </Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
              <Button
                size="sm"
                onClick={async () => {
                  const supabase = (
                    await import("@/lib/supabase/client")
                  ).createClient();
                  const { error } = await supabase
                    .from("applications")
                    .update({
                      follow_up_at: followUpDate
                        ? new Date(followUpDate).toISOString()
                        : null,
                    })
                    .eq("id", application.id);
                  if (!error) toast.success("Follow-up date saved");
                  else toast.error("Failed to save");
                }}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Source URL */}
          {application.source_url && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4" />
                Source
              </Label>
              <a
                href={application.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {application.source_url}
              </a>
            </div>
          )}

          {/* Linked contacts */}
          <div className="space-y-2">
            <Label>People</Label>
            {appContacts.length > 0 && (
              <div className="space-y-1.5">
                {appContacts.map((ac) => (
                  <div
                    key={ac.contacts.id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {ac.contacts.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {ac.role}
                      </Badge>
                    </div>
                    {ac.contacts.email && (
                      <a
                        href={`mailto:${ac.contacts.email}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Email
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Link existing contact */}
            {availableToLink.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select name="linkContact">
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
                  onClick={async () => {
                    const select = document.querySelector(
                      '[name="linkContact"]'
                    ) as HTMLSelectElement;
                    const contactId = select?.value;
                    if (!contactId) return;
                    const result = await linkContactToApplication(
                      application.id,
                      contactId,
                      "recruiter"
                    );
                    if (result.success) {
                      toast.success("Contact linked!");
                      // Refresh
                      getApplicationContacts(application.id).then(
                        setAppContacts
                      );
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Full contact list with add */}
            <ContactList
              contacts={appContacts.map((ac) => ({
                ...ac.contacts,
                linkedin_url: null,
                phone: null,
                notes: null,
                created_at: "",
              }))}
              applicationId={application.id}
            />
          </div>

          {/* ── P4: Interview Debriefs ────────────── */}
          <div className="border-t pt-4">
            <PostInterviewDebrief applicationId={application.id} />
          </div>

          {/* ── P4: Outreach & Cover Letters ───────── */}
          <div className="border-t pt-4">
            <OutreachGenerator applicationId={application.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
