// app/(app)/applications/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { PostInterviewDebrief } from "@/components/post-interview-debrief";
import { OutreachGenerator } from "@/components/outreach-generator";
import { FollowUpPicker } from "@/components/follow-up-picker";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Link2,
  Mic,
} from "lucide-react";
import Link from "next/link";
import { getApplicationContacts, getContacts } from "@/app/actions/contact-actions";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!app) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Application not found.</p>
        <Link
          href="/dashboard"
          className="text-primary hover:underline text-sm mt-2 inline-block"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const [appContacts, allContacts] = await Promise.all([
    getApplicationContacts(id),
    getContacts(),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pipeline
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {app.company}
          </h1>
          <p className="text-sm text-muted-foreground">{app.role_title}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{app.status}</Badge>
            {app.match_score != null && (
              <Badge
                variant={
                  app.match_score >= 75
                    ? "default"
                    : app.match_score >= 50
                    ? "outline"
                    : "destructive"
                }
              >
                {app.match_score}% match
              </Badge>
            )}
          </div>
        </div>

        {/* Mock interview button */}
        <Link href={`/prep/${app.id}`}>
          <Button variant="outline" className="gap-2">
            <Mic className="h-4 w-4" />
            Mock Interview
          </Button>
        </Link>
      </div>

      {/* Follow-up picker */}
      <FollowUpPicker
        applicationId={id}
        currentDate={app.next_action_at ?? app.follow_up_at ?? null}
      />

      {/* Source URL */}
      {app.source_url && (
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5">
            <Link2 className="h-4 w-4" />
            Source
          </Label>
          <a
            href={app.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {app.source_url}
          </a>
        </div>
      )}

      {/* Linked contacts */}
      <div className="space-y-2">
        <Label>People</Label>
        {appContacts.length > 0 ? (
          <div className="space-y-1.5">
            {appContacts.map((ac: any) => (
              <div
                key={ac.contacts.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{ac.contacts.name}</span>
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
        ) : (
          <p className="text-xs text-muted-foreground">
            No contacts linked yet.
          </p>
        )}
      </div>

      {/* ── Interview Debriefs ── */}
      <div className="border-t pt-4">
        <PostInterviewDebrief applicationId={id} />
      </div>

      {/* ── Outreach & Cover Letters ── */}
      <div className="border-t pt-4">
        <OutreachGenerator applicationId={id} />
      </div>
    </div>
  );
}
