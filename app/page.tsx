// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Target,
  KanbanSquare,
  MessageSquareText,
  BarChart3,
  ArrowRight,
  FileUp,
  Users,
  Sun,
  CalendarClock,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "JD Analysis",
    desc: "Paste any job description. Get ATS keywords, honest gap analysis, and metric-driven resume bullets.",
  },
  {
    icon: FileUp,
    title: "Resume Storage",
    desc: "Upload your resume once — PDF, DOCX, or TXT. Auto-matched against every job. Switch versions per application.",
    badge: "New",
  },
  {
    icon: Sparkles,
    title: "Match Scoring",
    desc: "Embeddings-based resume-to-role fit score so you prioritize the right applications.",
  },
  {
    icon: Users,
    title: "Contact Tracker",
    desc: "Recruiters, hiring managers, referrals. Track warmth, log interactions, and never forget who said what.",
    badge: "New",
  },
  {
    icon: Sun,
    title: "Morning Briefing",
    desc: "A daily dashboard with stale-application alerts, follow-up reminders, and funnel stats. Start every day with clarity.",
    badge: "New",
  },
  {
    icon: CalendarClock,
    title: "Follow-up Engine",
    desc: "Set follow-up dates on any application. Get reminded before opportunities go cold.",
    badge: "New",
  },
  {
    icon: KanbanSquare,
    title: "Pipeline Tracker",
    desc: "Drag-and-drop kanban board. See every stage at a glance — applied to offer.",
  },
  {
    icon: MessageSquareText,
    title: "Mock Interviews",
    desc: "A streaming, in-character interviewer that adapts to your answers and pushes you deeper.",
  },
  {
    icon: BarChart3,
    title: "Usage & Cost",
    desc: "Every AI call is instrumented — tokens, cost, and per-feature breakdown. Total transparency.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen app-glow">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <span className="font-bold text-lg tracking-tight">Job Search OS</span>
          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/wesleyshiCX/job-search-os"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-sm text-muted-foreground mb-8">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered · Free to run · Open source
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          Run your job search
          <br />
          <span className="bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
            like a product.
          </span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Tailored resume bullets, gap analysis, STAR stories, mock interviews,
          and an application tracker — now with stored resumes, contact management,
          and a daily briefing. Built for people in an active search.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-8 text-base">
            <Link href="/login">
              Get started free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
            <Link href="https://github.com/wesleyshiCX/job-search-os">
              View source
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all"
            >
              <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg tracking-tight">{f.title}</h3>
                {f.badge && (
                  <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {f.badge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
          {/* CTA card filling the 10th grid slot */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-chart-2/10 p-6 flex flex-col justify-center">
            <h3 className="font-semibold text-lg tracking-tight">Ready to start?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with a magic link. No password, no credit card.
            </p>
            <Button asChild className="mt-4 w-fit">
              <Link href="/login">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* V2 Highlight — Relationship tracking callout */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-chart-2/30 bg-gradient-to-br from-chart-2/10 via-card to-primary/5 p-8 sm:p-10">
          <div className="grid sm:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-chart-2/30 bg-chart-2/10 px-3 py-1 text-xs font-medium text-chart-2 mb-4">
                <Users className="h-3.5 w-3.5" />
                New in v2
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Your network is your edge.
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg">
                Most job search tools ignore the human side. Job Search OS now
                tracks every recruiter, hiring manager, and referral — with warmth
                scoring, interaction logs, and follow-up reminders so nothing
                falls through the cracks.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-chart-2" />
                  Link contacts to specific applications
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-chart-2" />
                  Log calls, emails, and coffee chats per person
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-chart-2" />
                  Morning briefing flags who to follow up with today
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-chart-2" />
                  Upload your resume once — auto-match against every JD
                </li>
              </ul>
            </div>
            <div className="hidden sm:flex flex-col gap-3 min-w-[220px]">
              {/* Mini mock of the morning briefing */}
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="h-4 w-4 text-chart-4" />
                  <span className="text-sm font-medium">Good morning</span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs font-medium">REPAY</p>
                    <p className="text-[11px] text-muted-foreground">No response in 9 days</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs font-medium">Sarah Chen</p>
                    <p className="text-[11px] text-muted-foreground">Follow up by Friday</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <div className="rounded bg-primary/10 px-2 py-1 text-center">
                      <p className="text-sm font-semibold">12</p>
                      <p className="text-[9px] text-muted-foreground">Applied</p>
                    </div>
                    <div className="rounded bg-chart-3/10 px-2 py-1 text-center">
                      <p className="text-sm font-semibold">5</p>
                      <p className="text-[9px] text-muted-foreground">Responded</p>
                    </div>
                    <div className="rounded bg-chart-4/10 px-2 py-1 text-center">
                      <p className="text-sm font-semibold">2</p>
                      <p className="text-[9px] text-muted-foreground">Interview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Job Search OS — open source, MIT licensed.</span>
          <span>Built with Next.js · Supabase · Groq</span>
        </div>
      </footer>
    </div>
  );
}
