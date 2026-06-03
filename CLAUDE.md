
---

```markdown
# Project context for AI assistants

## What this is
Job Search OS — AI-powered job search workspace. Next.js 16 + Supabase + Groq.
V1: core analysis, kanban, mock interview, usage tracking.
V2: resume storage, contact management, morning briefing, follow-up engine.
V3 (P2–P4): funnel analytics, batch JD analysis, JD URL fetch, interview debriefs, outreach generator.

## Key conventions
- **Tailwind v4**: CSS-based config in `app/globals.css` (`@theme inline`), NO `tailwind.config.ts`
- **Supabase**: uses `@supabase/ssr` (NOT the deprecated `auth-helpers-nextjs`)
- **Server client is async**: always `await createClient()` when importing from `@/lib/supabase/server`
- **AI**: structured JSON via `groq-sdk` (analyze, debrief, outreach routes); raw `streamText` + `ReadableStream` (mock route, no `useChat`)
- **All prompts** live in `lib/ai/prompts.ts`; model + pricing in `lib/ai/groq.ts`
- **Zod schemas** for analysis output in `lib/ai/schemas.ts` — includes `Analysis`, `DebriefInsights`, `OutreachContent`
- **snake_case** for DB columns, **kebab-case** for file names
- **Dark mode by default**: `className="dark"` on `<html>`, palette defined in `globals.css`
- **Server actions** in `app/actions/` — all use `"use server"` directive
- **Dynamic imports** for client-only components: `KanbanWrapper` wraps `KanbanBoard` with `dynamic(() => ..., { ssr: false })` to avoid dnd-kit hydration mismatch

## V3 architecture (P2–P4)

### P2: Funnel analytics + resume performance

- **`/api/analytics`** — server-side route computing funnel counts, conversion rates, response rate, resume performance, weekly activity, and avg time-in-stage
- **`application_status_log`** table — every status change is logged by `updateStatus()` in `app/actions/applications.ts`
- **`applications.resume_id`** — captured at save time via `createApplication()`, links each app to the resume used
- **`components/funnel-analytics.tsx`** — recharts bar charts for funnel + weekly volume, table for resume performance
- **`components/analytics-panel.tsx`** — collapsible wrapper on the dashboard
- Status log is written in two places: `createApplication()` logs `null → saved`, `updateStatus()` logs the transition

### P3: Batch JD analysis + URL fetch

- **Batch mode** lives in `components/batch-jd-analyzer.tsx` — up to 3 JDs, parallel analysis via `/api/analyze`, parallel scoring via `/api/match`
- **Two-pass approach**: Pass 1 runs all `/api/analyze` calls, shows results immediately with `score: null`. Pass 2 runs all `/api/match` calls, merges scores, re-sorts by match.
- **`resumeText`** is passed as a prop from the analyze page — the batch analyzer doesn't fetch it independently
- **JD URL fetch**: `lib/ai/jd-fetch.ts` fetches the page with a real Chrome User-Agent, tries ATS-specific regex patterns (Greenhouse, Lever, Workable), falls back to full-text extraction with section markers
- **Known limitation**: URL fetch does NOT work with LinkedIn, Indeed, Glassdoor, or internal Workday portals — these require login or client-side JS. The UI documents this.
- **Field names**: The batch analyzer sends `{ jobDescription, resumeText }` to `/api/analyze` and `{ resumeText, jdText }` to `/api/match` — these match the route signatures

### P4: Interview debrief + outreach generator

- **`/api/debrief`** — saves the debrief row, then generates AI insights via Groq, saves `ai_insights` JSON back to the row
- **`/api/outreach`** — generates outreach content via Groq, saves to `outreach` table. Fetches resume text from the linked resume or falls back to active resume.
- **Debrief insights schema** (`DebriefInsights`): `pattern_analysis`, `strengths[]`, `improvements[]{area, technique, example}`, `predicted_followups[]`, `confidence_note`
- **Outreach types**: cover_letter, recruiter_outreach, hiring_manager_outreach, referral_note, thank_you, follow_up
- **Tone options**: professional, warm, confident, casual
- Both components are rendered inside `components/application-detail.tsx` below the contacts section
- Server actions for CRUD: `app/actions/debrief-actions.ts`, `app/actions/outreach-actions.ts`

## V2 architecture

### Resume pipeline
1. User uploads PDF/DOCX/TXT → `components/resume-upload.tsx`
2. File stored in Supabase Storage bucket `resumes/{userId}/{uuid}.{ext}`
3. Text parsed server-side in `lib/ai/parse-resume.ts` using `pdfjs-dist` (PDF) or `mammoth` (DOCX)
4. `pdfjs-dist` must be in `serverExternalPackages` in `next.config.ts` — it does not bundle cleanly with Turbopack
5. Parsed text stored in `resumes.raw_text`; embedding generated via `supabase/functions/embed` and stored in `resumes.embedding`
6. Only one resume can be active per user — enforced by unique partial index `resumes_one_active_per_user` on `(user_id) WHERE is_active = true`
7. Active resume auto-populates `/analyze` — user can toggle between stored and manual paste

### Contact system
1. `contacts` table — name, title, company, email, phone, linkedin_url, warmth (cold/warm/hot/advocate), notes
2. `application_contacts` junction table — links contacts to applications with a role (recruiter/hiring_manager/referral/interviewer/other)
3. `contact_interactions` table — timestamped log per contact with interaction_type (email_sent, call, interview, etc.) and notes
4. All three tables have RLS — users only see their own data
5. `application_contacts` RLS checks both `applications.user_id` and `contacts.user_id`

### Morning briefing
- `GET /api/briefing` — server-side route that computes:
  - Stale applications (no status change in 7+ days, not in terminal state)
  - Upcoming follow-ups (follow_up_at within next 3 days)
  - Funnel stats (applied, responded, interviewing, rejected, response rate)
- `components/morning-briefing.tsx` — client component that fetches on mount
- Briefing is the first thing on `/dashboard`

### Kanban layout
- `components/kanban-board.tsx` uses CSS Grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`), NOT flex with overflow-x
- Columns use `flex-1 min-w-0` — no fixed minimum width
- `components/kanban-wrapper.tsx` wraps with `dynamic(() => ..., { ssr: false })` to avoid dnd-kit hydration mismatch on `aria-describedby`

## Key paths
- Auth guard: `app/(app)/layout.tsx`
- LLM telemetry logged on every call → `telemetry` table → `/usage` dashboard
- Embeddings: `supabase/functions/embed/` (gte-small, no API key needed). Expects `{ text }` in request body, returns `{ embedding: number[] }`.
- Resume parsing: `lib/ai/parse-resume.ts`
- JD URL fetch: `lib/ai/jd-fetch.ts`
- Resume actions: `app/actions/resume-actions.ts`
- Contact actions: `app/actions/contact-actions.ts`
- Debrief actions: `app/actions/debrief-actions.ts`
- Outreach actions: `app/actions/outreach-actions.ts`
- Briefing API: `app/api/briefing/route.ts`
- Analytics API: `app/api/analytics/route.ts`
- JD fetch API: `app/api/jd-fetch/route.ts`
- Debrief API: `app/api/debrief/route.ts`
- Outreach API: `app/api/outreach/route.ts`
- Match API: `app/api/match/route.ts` — accepts `{ resumeText, jdText }` for on-the-fly scoring OR falls back to DB lookup
- Route groups: `(auth)` = login only, `(app)` = auth-guarded workspace

## Environment variables
| Variable | Where | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | Safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` + Vercel | **Server-only.** Never prefix with `NEXT_PUBLIC_`. Bypasses RLS. |
| `GROQ_API_KEY` | `.env.local` + Vercel | Server-only |

## Database
- `resumes` — stored resume versions with embeddings, one active per user
- `contacts` — people with warmth scoring
- `application_contacts` — junction with role
- `contact_interactions` — timestamped log
- `application_status_log` — status transitions for time-in-stage analytics
- `debriefs` — interview debriefs with AI insights JSON
- `outreach` — generated outreach content (cover letters, follow-ups, etc.)
- `applications` — V1 + `follow_up_at`, `source_url`, `resume_id` columns
- `set_active_resume()` — security-definer function that unsets old active before setting new
- All tables use RLS; `resumes` storage bucket uses folder-level policies on `auth.uid()`

## Don't
- Don't commit `.env.local`
- Don't add `tailwind.config.ts` (v4 uses `@theme` in globals.css)
- Don't use `useChat` from `@ai-sdk/react` — the mock interview uses raw `fetch` + `ReadableStream`
- Don't forget `await` on `createClient()` in server components/routes
- Don't import `KanbanBoard` directly in server components — use `KanbanWrapper` (SSR hydration fix)
- Don't use `Linkedin` from `lucide-react` — it was removed. Use `ExternalLink` instead
- Don't use `pdf-parse` — it's broken with Turbopack. Use `pdfjs-dist` with `serverExternalPackages`
- Don't prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`
- Don't use `Switch` from shadcn without `checked`/`onCheckedChange` controlled state — Radix Switch doesn't submit to FormData natively
- Don't send `{ input }` to the embed Edge Function — it expects `{ text }`
- Don't send `{ jd_text }` to `/api/analyze` — it expects `{ jobDescription, resumeText }`
- Don't send only DB lookups to `/api/match` — for unsaved JDs, send `{ resumeText, jdText }` and it generates embeddings on the fly
- Don't call `updateJdInput()` multiple times in sequence in async handlers — use functional `setJdInputs(prev => ...)` to avoid stale state overwrites
