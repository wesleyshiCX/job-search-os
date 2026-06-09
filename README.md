Here's the cleaned-up README — fixed all the escaped backticks, broken code fences, Copy artifacts, and general markdown that'd render wrong on GitHub:

# Job Search OS

An AI-powered job search workspace for people in active job hunts — especially
folks who've been laid off. Upload your resume once, auto-match against every
job. Track contacts, log interactions, and start every day with a personalized
briefing. Analyze JDs for tailored bullets, gap analysis, STAR stories, and
likely interview questions. Compare up to 3 JDs side-by-side. Debrief after
interviews with AI coaching. Generate cover letters and outreach. Track
applications on a kanban board with funnel analytics, run streaming mock
interviews, and see exactly what the AI costs.

**Free to run.** Built on free tiers: Vercel, Supabase, and Groq.

---

## ✨ Features

### V3 — Analytics, Batch Analysis & Outreach

- **Funnel Analytics** — pipeline conversion rates, time-in-stage averages, weekly application volume, response rate
- **Resume Performance** — see how each resume version performs across your applications
- **Batch JD Analysis** — paste up to 3 JDs, analyze all against your active resume, compare scores side-by-side
- **JD URL Fetch** — paste a Greenhouse, Lever, or Workable URL; the JD is extracted automatically
- **Post-Interview Debrief** — log what happened, get AI coaching (pattern analysis, improvement techniques, predicted follow-ups)
- **Outreach Generator** — cover letters, recruiter outreach, hiring manager messages, referral notes, thank-yous, follow-ups. Pick tone and type.
- **Status Change Logging** — every kanban move is tracked for time-in-stage analytics

### V2 — Resume, Contacts & Briefing

- **Resume Upload & Storage** — Upload PDF, DOCX, or TXT once. Parsed server-side, stored with embeddings. Switch between resume versions per application.
- **Auto-Match Scoring** — Active resume is automatically matched against every new JD. No re-pasting.
- **Contact Tracker** — Recruiters, hiring managers, referrals. Track warmth (cold → advocate), log interactions, link contacts to specific applications.
- **Morning Briefing** — Daily dashboard with stale-application alerts, follow-up reminders, and funnel stats.
- **Follow-Up Engine** — Set follow-up dates on any application. Get reminded before opportunities go cold.

### V1 — Core Analysis & Tracking

- **JD Analysis** — keywords, honest gap analysis, tailored bullets, STAR stories, likely questions
- **Match Scoring** — embeddings-based resume↔JD fit score (no extra API key)
- **Application Tracker** — drag-and-drop kanban pipeline with follow-up reminders
- **Mock Interview** — streaming, in-character interviewer that adapts and pushes deeper
- **Usage Dashboard** — every LLM call instrumented: tokens, cost, per-feature breakdown

---

## 🧰 Stack

Next.js 16 · Supabase (Postgres + Auth + pgvector) · Groq (Llama 3.3 70B) ·
Vercel AI SDK · shadcn/ui · Tailwind v4 · pdfjs-dist · mammoth · dnd-kit · recharts

---

## 🚀 Deploy your own (one click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wesleyshiCX/job-search-os&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,GROQ_API_KEY)

Vercel will prompt you for environment variables during deploy. You'll
still need to set up the Supabase database, storage, and Edge Function — see steps below.

---

## 🛠️ Local setup

### Prerequisites

- Node 18+
- A free [Supabase](https://supabase.com) project
- A free [Groq](https://console.groq.com) API key

### 1. Clone + install

git clone https://github.com/wesleyshiCX/job-search-os.git
cd job-search-os
npm install

### 2. Configure environment

cp .env.example .env.local

Then fill in `.env.local`:

Supabase → Project Settings → API

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

Server-only — DO NOT prefix with NEXT_PUBLIC_

SUPABASE_SERVICE_ROLE_KEY=

Groq → console.groq.com → API Keys

GROQ_API_KEY=

⚠️ Important: `SUPABASE_SERVICE_ROLE_KEY` must never have the `NEXT_PUBLIC_` prefix. It bypasses RLS and is server-side only.

### 3. Set up the database

Run the migration SQL in Supabase Dashboard → SQL Editor. The full schema is in `supabase/migrations/`.

Alternatively:

npx supabase login
npx supabase link --project-ref
npx supabase db push

Note: If `db push` fails on the storage bucket insert, create the `resumes` bucket manually in Supabase Dashboard → Storage and run the table SQL separately.

### 4. Create the resumes storage bucket

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `resumes`, Public: No
4. Add RLS policies for INSERT, SELECT, DELETE targeting `(storage.foldername(name))[1] = auth.uid()::text`

### 5. Deploy the embeddings function

npx supabase functions deploy embed

This uses Supabase's built-in gte-small model — no extra API key required.

### 6. Configure auth redirect

In Supabase: Authentication → URL Configuration, add:

- `http://localhost:3000/**` (local development)
- your production URL (after deploying to Vercel)

### 7. Run

npm run dev

Open http://localhost:3000.

---

## 🗺️ How it works

1. **Sign in** via magic link (no password).
2. **Upload your resume** on the Dashboard — parsed and embedded automatically.
3. **Analyze** — paste a JD on `/analyze` (single or batch). Your active resume is pre-loaded for matching and tailored output.
4. **Compare** — in batch mode, up to 3 JDs are scored side-by-side against your resume.
5. **Save to pipeline** — the analysis becomes a card on your kanban board. A match score is computed.
6. **Add contacts** — link recruiters, hiring managers, and referrals to each application. Log interactions.
7. **Check your briefing** — the dashboard surfaces stale applications, follow-up reminders, and funnel stats every morning.
8. **Open an application** — click any kanban card to see contacts, debrief interviews, generate outreach, or launch a mock interview.
9. **Debrief** — log what happened in each interview round. Get AI coaching on patterns, improvements, and likely follow-ups.
10. **Generate outreach** — cover letters, recruiter messages, thank-you notes, all tailored to the specific role and your resume.
11. **Track analytics** — `/dashboard` shows funnel conversion, time-in-stage, resume performance, and weekly activity.
12. **Track usage** — `/usage` shows token counts and estimated cost per feature.

---

## 📂 Project structure

job-search-os/
├── middleware.ts # refreshes Supabase session on every request
├── next.config.ts # serverExternalPackages for pdfjs-dist
├── .env.example # env variable template (no real secrets)
├── supabase/
│ ├── migrations/ # all SQL — tables, RLS, triggers, functions
│ └── functions/
│ └── embed/
│ └── index.ts # gte-small Edge Function — expects { text }, returns { embedding }
├── lib/
│ ├── supabase/
│ │ ├── client.ts # browser Supabase client
│ │ └── server.ts # async server Supabase client (must await createClient())
│ └── ai/
│ ├── parse-resume.ts # PDF (pdfjs-dist) + DOCX (mammoth) + TXT parsing, server-side only
│ ├── jd-fetch.ts # URL → JD text: Greenhouse / Lever / Workable + generic fallback
│ ├── prompts.ts # all LLM prompt builders: analysis, debrief, outreach
│ ├── groq.ts # Groq client, model name, token pricing constants
│ ├── schemas.ts # Zod schemas: Analysis, DebriefInsights, OutreachContent
│ └── embeddings.ts # helpers for generating and storing resume embeddings
├── components/
│ ├── ui/ # shadcn/ui primitives (button, input, badge, sheet, etc.)
│ ├── kanban-board.tsx # dnd-kit drag-and-drop pipeline board
│ ├── kanban-wrapper.tsx # dynamic(() => KanbanBoard, { ssr: false }) — fixes hydration
│ ├── morning-briefing.tsx # daily briefing: overdue, upcoming, stale, funnel stats
│ ├── follow-up-queue.tsx # dashboard widget: all follow-ups sorted by urgency
│ ├── analytics-panel.tsx # collapsible wrapper for funnel analytics
│ ├── funnel-analytics.tsx # recharts: funnel, resume performance, weekly volume
│ ├── batch-jd-analyzer.tsx # paste up to 3 JDs, analyze + score in parallel
│ ├── post-interview-debrief.tsx # debrief form + AI coaching insights display
│ ├── outreach-generator.tsx # cover letters, recruiter / HM outreach, thank-yous
│ ├── application-detail-client.tsx # client component: follow-up picker, contact linking
│ ├── follow-up-picker.tsx # 3 / 5 / 7 / 14 day presets + custom date + clear
│ ├── resume-upload.tsx # upload PDF/DOCX/TXT, manage versions, set active
│ ├── contact-list.tsx # contact CRUD with warmth badges and interaction log
│ ├── interaction-log.tsx # timestamped interaction timeline per contact
│ ├── application-detail.tsx # Sheet side panel (legacy — superseded by /applications/[id])
│ ├── mock-chat.tsx # streaming mock interview (raw fetch + ReadableStream)
│ └── usage-dashboard.tsx # token counts and cost breakdown per feature
├── app/
│ ├── page.tsx # landing page
│ ├── layout.tsx # root layout with dark mode + Toaster
│ ├── (auth)/
│ │ └── login/
│ │ └── page.tsx # magic-link sign in
│ ├── auth/
│ │ └── callback/
│ │ └── route.ts # Supabase OAuth code exchange
│ ├── (app)/ # auth-guarded route group
│ │ ├── layout.tsx # checks session, redirects to /login if missing
│ │ ├── dashboard/
│ │ │ └── page.tsx # kanban + briefing + follow-up queue + analytics + resume + contacts
│ │ ├── analyze/
│ │ │ └── page.tsx # single JD analysis + batch mode toggle
│ │ ├── applications/
│ │ │ └── [id]/
│ │ │ └── page.tsx # full application detail: follow-up, contacts, debrief, outreach
│ │ ├── prep/
│ │ │ └── [appId]/
│ │ │ └── page.tsx # mock interview page
│ │ └── usage/
│ │ └── page.tsx # LLM cost telemetry dashboard
│ ├── actions/
│ │ ├── applications.ts # createApplication, updateStatus, setNextAction
│ │ ├── resume-actions.ts # uploadResume, getResumes, getActiveResume, setActiveResume, deleteResume
│ │ ├── contact-actions.ts # getContacts, createContact, getApplicationContacts, linkContactToApplication
│ │ ├── debrief-actions.ts # getDebriefs, deleteDebrief
│ │ └── outreach-actions.ts # getOutreach, deleteOutreach
│ └── api/
│ ├── analyze/
│ │ └── route.ts # POST: JD analysis via Groq, returns structured JSON
│ ├── match/
│ │ └── route.ts # POST: resume ↔ JD cosine similarity via embed Edge Function
│ ├── mock/
│ │ └── route.ts # POST: streaming mock interview (ReadableStream)
│ ├── briefing/
│ │ └── route.ts # GET: overdue + upcoming follow-ups, stale apps, funnel stats
│ ├── analytics/
│ │ └── route.ts # GET: funnel conversion, time-in-stage, resume performance
│ ├── jd-fetch/
│ │ └── route.ts # POST: URL → extracted JD text
│ ├── debrief/
│ │ └── route.ts # POST: save debrief + generate AI insights via Groq
│ └── outreach/
│ └── route.ts # POST: generate outreach content via Groq, save to DB

### RLS

All tables have row-level security. Users can only see/modify their own data. The `resumes` storage bucket uses folder-level policies keyed to `auth.uid()`.

---

## 🗄️ Database schema

### Core tables (V1)

| Table | Purpose | Key columns |
| --- | --- | --- |
| `applications` | Central application record | `id`, `user_id`, `company`, `role_title`, `status`, `jd_text`, `analysis`, `match_score`, `source_url`, `follow_up_at`, `next_action_at`, `resume_id`, `updated_at`, `created_at` |
| `telemetry` | LLM usage and cost tracking | `user_id`, `feature`, `model`, `input_tokens`, `output_tokens`, `cost_usd` |

### V2 tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `resumes` | Stored resume versions with embeddings | `user_id`, `label`, `file_path`, `file_type`, `raw_text`, `embedding`, `is_active` |
| `contacts` | Recruiters, hiring managers, referrals | `user_id`, `name`, `title`, `company`, `email`, `phone`, `linkedin_url`, `warmth`, `notes` |
| `application_contacts` | Links contacts to applications | `application_id`, `contact_id`, `role` |
| `contact_interactions` | Timestamped interaction log per contact | `contact_id`, `interaction_type`, `notes`, `occurred_at` |

### V3 tables (P2–P4)

| Table | Purpose | Key columns |
| --- | --- | --- |
| `application_status_log` | Status transition history for time-in-stage analytics | `application_id`, `from_status`, `to_status`, `changed_at` |
| `debriefs` | Post-interview notes with AI coaching insights | `user_id`, `application_id`, `round_type`, `overall_feeling`, `questions_recalled`, `answers_liked`, `answers_regret`, `ai_insights`, `interview_date` |
| `outreach` | Generated cover letters and outreach messages | `user_id`, `application_id`, `outreach_type`, `tone`, `content` |

### Columns added to existing tables

| Table | Column | Type | Purpose |
| --- | --- | --- | --- |
| `applications` | `follow_up_at` | `timestamptz` | Follow-up reminder date (V2) |
| `applications` | `next_action_at` | `timestamptz` | Alias for follow-up, used by kanban card display (V1) |
| `applications` | `source_url` | `text` | Original job posting URL (V2) |
| `applications` | `resume_id` | `uuid` | FK to resume used at time of application (V3) |
| `applications` | `updated_at` | `timestamptz` | Auto-updated by trigger on any row change (V3) |

### Kanban statuses

| Status | Meaning |
| --- | --- |
| `saved` | Saved from analysis, not yet applied |
| `applied` | Application submitted |
| `interviewing` | In active interview process |
| `offer` | Offer received |
| `rejected` | Rejected or withdrawn |

### RLS policy summary

| Table | Policy |
| --- | --- |
| `applications` | Users can only read/write their own rows (`user_id = auth.uid()`) |
| `resumes` | Users can only read/write their own rows |
| `contacts` | Users can only read/write their own rows |
| `application_contacts` | Access allowed if the linked application belongs to the user |
| `contact_interactions` | Access allowed if the linked contact belongs to the user |
| `application_status_log` | Access allowed if the linked application belongs to the user |
| `debriefs` | Users can only read/write their own rows |
| `outreach` | Users can only read/write their own rows |
| `resumes` (storage) | Folder-level policy: path must start with `auth.uid()` |

### Database functions and triggers

| Name | Type | Purpose |
| --- | --- | --- |
| `set_updated_at_fn()` | Function | Sets `NEW.updated_at = now()` on any row update |
| `set_updated_at` | Trigger | Fires `set_updated_at_fn()` before every UPDATE on `applications` |
| `set_active_resume()` | Function | Security-definer function that clears `is_active` on all other resumes before setting the new one active |

---

## 🔒 Security

- Real keys live only in `.env.local` (gitignored) and Vercel project settings
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never prefixed with `NEXT_PUBLIC_`
- `resumes` storage bucket is private with RLS
- Resume parsing happens server-side — files never reach the browser
- The Supabase CLI token is stored globally (`~/.supabase/`), never in the repo

---

## 🔧 Troubleshooting

| Issue | Solution |
| --- | --- |
| **Module not found: @ai-sdk/react** | `npm install @ai-sdk/react` |
| **pdfParse is not a function** | Ensure `pdfjs-dist` is in `serverExternalPackages` in `next.config.ts` and you're importing from `pdfjs-dist/legacy/build/pdf.mjs` |
| **Bucket not found (resume upload)** | Create the `resumes` bucket manually in Supabase Dashboard → Storage. Set to Private. |
| **Could not find table (resumes, debriefs, outreach, etc.)** | Run the migration SQL in Supabase SQL Editor. See `supabase/migrations/`. |
| **Hydration mismatch (aria-describedby errors)** | Use `KanbanWrapper` not `KanbanBoard` directly — it uses `dynamic(() => ..., { ssr: false })` to avoid dnd-kit SSR issues |
| **Invalid path on auth / magic link** | `NEXT_PUBLIC_SUPABASE_URL` must be the base URL only, e.g. `https://.supabase.co`. Do not include `/rest/v1/`. |
| **Nothing happens on mock interview send** | Deploy the embed Edge Function: `npx supabase functions deploy embed`. Check your `GROQ_API_KEY` is valid. |
| **Match scores show "—"** | Deploy the embed Edge Function: `npx supabase functions deploy embed`. Check server logs for `[match]` entries. Requires an active resume with a valid embedding. |
| **JD URL fetch returns empty or fails** | Works with Greenhouse, Lever, and Workable. Does NOT work with LinkedIn, Indeed, Glassdoor, or internal Workday portals. Paste the JD text directly instead. |
| **Debrief save fails with 500** | Ensure the `debriefs` table exists — run the V3 migration SQL in Supabase SQL Editor. |
| **Outreach save fails with 500** | Ensure the `outreach` table exists — run the V3 migration SQL in Supabase SQL Editor. |
| **Briefing shows "unavailable: column updated_at does not exist"** | Run `ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();` in Supabase SQL Editor, then create the `set_updated_at_fn()` trigger function. |
| **Kanban drag reverts immediately** | The `updateStatus` action is throwing. Check server logs — most likely cause is a missing `updated_at` column or a broken trigger. Run the SQL above to fix. |
| **record "new" has no field "updated_at" (trigger error)** | The trigger function `set_updated_at_fn()` was missing. Run `CREATE OR REPLACE FUNCTION set_updated_at_fn() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = timezone('utc'::text, now()); RETURN NEW; END; $$ LANGUAGE plpgsql;` in Supabase SQL Editor. |
| **Follow-up dates not showing in briefing** | Ensure `follow_up_at` or `next_action_at` columns exist: `ALTER TABLE applications ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ; ALTER TABLE applications ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ;` |
| **Embed function returns 404** | The Edge Function was never deployed. Run `npx supabase functions deploy embed`. The function expects `{ text }` in the request body, not `{ input }`. |
| **Contacts not linking to applications** | Ensure the `application_contacts` table exists and RLS policies allow insert. The policy must check `application_id IN (SELECT id FROM applications WHERE user_id = auth.uid())`. |
| **Stale apps always showing 0** | The `application_status_log` table may not exist. Run the V3 migration SQL. Without it the briefing falls back to `created_at` for stale detection. |

---

## 🗺️ Roadmap

| Phase | Feature | Status |
| --- | --- | --- |
| V1 | Core JD analysis, kanban pipeline, mock interview, usage dashboard | ✅ Done |
| V2 | Resume storage + embeddings, contact tracker, morning briefing, follow-up engine | ✅ Done |
| P2 | Funnel analytics, resume performance, status transition logging | ✅ Done |
| P3 | Batch JD analysis (up to 3), JD URL fetch, comparative scoring | ✅ Done |
| P4 | Post-interview debrief + AI coaching, outreach + cover letter generator | ✅ Done |
| P5 | Resume diff view, version comparison, per-application tailoring workflow | 🔲 Planned |
| P6 | Chrome extension for one-click JD capture from any job board | 🔲 Planned |
| P7 | Email integration — auto-detect replies, update application status automatically | 🔲 Planned |

---

## 🤝 Contributing

PRs welcome — especially from folks who've used this in their own search and have ideas to improve it. Open an issue first for anything substantial.

## 📄 License

MIT

