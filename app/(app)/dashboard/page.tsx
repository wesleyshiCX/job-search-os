// app/(app)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/kanban-board";
import { MorningBriefing } from "@/components/morning-briefing";
import { ResumeUpload } from "@/components/resume-upload";
import { ContactList } from "@/components/contact-list";
import { FollowUpQueue } from "@/components/follow-up-queue";
import { getResumes, getActiveResume } from "@/app/actions/resume-actions";
import { getContacts } from "@/app/actions/contact-actions";
import { AnalyticsPanel } from "@/components/analytics-panel";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: apps } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  const [resumes, activeResume, contacts] = await Promise.all([
    getResumes(),
    getActiveResume(),
    getContacts(),
  ]);

  return (
    <div className="space-y-6">
      {/* Morning briefing — full width */}
      <MorningBriefing />

      {/* Follow-up queue — full width */}
      <FollowUpQueue applications={apps ?? []} />

      {/* Analytics Panel — full width */}
      <AnalyticsPanel />

      {/* Pipeline header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Drag applications across stages. Click a card to prep.
        </p>
      </div>

      {/* Kanban board */}
      <div className="min-w-0 overflow-x-auto -mx-6 px-6 pb-2">
        <KanbanBoard initialApps={apps ?? []} />
      </div>

      {/* Resume + Contacts */}
      <div className="grid gap-6 sm:grid-cols-2">
        <ResumeUpload
          resumes={resumes.map((r: any) => ({
            id: r.id,
            label: r.label,
            file_type: r.file_type,
            is_active: r.is_active,
            created_at: r.created_at,
          }))}
          activeResume={
            activeResume
              ? { id: activeResume.id, label: activeResume.label }
              : null
          }
        />

        <ContactList
          contacts={contacts.map((c: any) => ({
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
        />
      </div>
    </div>
  );
}
