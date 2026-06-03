# Job Search OS

An AI-powered job search workspace for people in active job hunts — especially
folks who've been laid off. Upload your resume once, auto-match against every
job. Track contacts, log interactions, and start every day with a personalized
briefing. Analyze JDs for tailored bullets, gap analysis, STAR stories, and
likely interview questions. Track applications on a kanban board, run streaming
mock interviews, and see exactly what the AI costs.

**Free to run.** Built on free tiers: Vercel, Supabase, and Groq.

---

## ✨ Features

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
Vercel AI SDK · shadcn/ui · Tailwind v4 · pdfjs-dist · mammoth · dnd-kit

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

2. Configure environment

cp .env.example .env.local

Then fill in .env.local:

# Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only — DO NOT prefix with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=

# Groq → console.groq.com → API Keys
GROQ_API_KEY=

⚠️ Important: SUPABASE_SERVICE_ROLE_KEY must never have the NEXT_PUBLIC_ prefix. It bypasses RLS and is server-side only.

3. Set up the database

Run the migration SQL in Supabase Dashboard → SQL Editor. The full schema is in supabase/migrations/ or paste directly from the SQL block in this README’s deployment guide.
Alternatively:

npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push

Note: If db push fails on the storage bucket insert, create the resumes bucket manually in Supabase Dashboard → Storage and run the table SQL separately.

4. Create the resumes storage bucket

   1. Go to Supabase Dashboard → Storage
   2. Click "New bucket"
   3. Name: resumes, Public: No
   4. Add RLS policies for INSERT, SELECT, DELETE targeting (storage.foldername(name))[1] = auth.uid()::text

5. Deploy the embeddings function

npx supabase functions deploy embed

This uses Supabase’s built-in gte-small model — no extra API key required.

6. Configure auth redirect

In Supabase: Authentication → URL Configuration, add:
   - http://localhost:3000/** (local development)
   - your production URL (after deploying to Vercel)

7. Run

npm run dev

Open http://localhost:3000.

🗺️ How it works

1. Sign in via magic link (no password).
2. Upload your resume on the Dashboard — parsed and embedded automatically.
3. Analyze — paste a JD on /analyze. Your active resume is pre-loaded for matching and tailored output.
4. Save to pipeline — the analysis becomes a card on your kanban board. A match score is computed.
5. Add contacts — link recruiters, hiring managers, and referrals to each application. Log interactions.
6. Check your briefing — the dashboard surfaces stale applications, follow-up reminders, and funnel stats every morning.
7. Prep — click any card to launch a streaming mock interview tailored to that role.
8. Track usage — /usage shows token counts and estimated cost per feature.

📂 Project structure
Plain Text
Copy
job-search-os/
├── middleware.ts                    # refreshes Supabase session
├── next.config.ts                  # serverExternalPackages for pdfjs-dist
├── .env.example                    # env template (no secrets)
├── supabase/
│   ├── migrations/                 # database schema + RLS
│   └── functions/embed/            # gte-small embeddings Edge Function
├── lib/
│   ├── supabase/                   # browser + server clients
│   └── ai/
│       ├── parse-resume.ts         # PDF/DOCX/TXT parsing (pdfjs-dist + mammoth)
│       ├── prompts.ts              # all LLM prompts
│       ├── groq.ts                 # model config + pricing
│       ├── schemas.ts              # Zod schemas for analysis output
│       └── embeddings.ts           # embedding helpers
├── components/
│   ├── kanban-board.tsx            # drag-and-drop pipeline
│   ├── kanban-wrapper.tsx          # dynamic import wrapper (SSR fix for dnd-kit)
│   ├── morning-briefing.tsx        # daily briefing card
│   ├── resume-upload.tsx           # upload + manage resume versions
│   ├── contact-list.tsx            # contact CRUD + warmth badges
│   ├── interaction-log.tsx         # interaction timeline per contact
│   ├── application-detail.tsx      # side sheet with contacts + follow-up
│   ├── mock-chat.tsx               # streaming mock interview
│   ├── usage-dashboard.tsx         # cost telemetry charts
│   └── ui/                         # shadcn/ui components
├── app/
│   ├── (auth)/login/               # magic-link sign in
│   ├── auth/callback/              # OAuth code exchange
│   ├── (app)/                      # auth-guarded workspace
│   │   ├── dashboard/              # kanban pipeline + briefing + sidebar
│   │   ├── analyze/                # JD analysis (auto-loads stored resume)
│   │   ├── prep/[appId]/           # mock interview
│   │   └── usage/                  # cost telemetry
│   ├── actions/
│   │   ├── applications.ts         # V1 application CRUD
│   │   ├── resume-actions.ts       # V2 resume upload, get, set active, delete
│   │   └── contact-actions.ts      # V2 contact CRUD, linking, interactions
│   └── api/
│       ├── analyze/route.ts        # JD analysis endpoint
│       ├── match/route.ts          # embedding match score
│       ├── mock/route.ts           # streaming mock interview
│       └── briefing/route.ts       # V2 morning briefing data
└── page.tsx                        # landing page


## 🗄️ Database schema

### V2 tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `resumes` | Stored resume versions | `user_id`, `label`, `file_path`, `file_type`, `raw_text`, `embedding`, `is_active` |
| `contacts` | Recruiters, hiring managers, referrals | `user_id`, `name`, `title`, `company`, `email`, `warmth` |
| `application_contacts` | Links contacts to specific applications | `application_id`, `contact_id`, `role` |
| `contact_interactions` | Interaction log per contact | `contact_id`, `interaction_type`, `notes`, `occurred_at` |

### V2 columns on existing tables

| Table | New columns |
|-------|------------|
| `applications` | `follow_up_at`, `source_url` |

### RLS

All V2 tables have row-level security. Users can only see/modify their own data. The `resumes` storage bucket uses folder-level policies keyed to `auth.uid()`.


🔒 Security
- Real keys live only in .env.local (gitignored) and Vercel project settings
- SUPABASE_SERVICE_ROLE_KEY is server-only — never prefixed with NEXT_PUBLIC_
- resumes storage bucket is private with RLS
- Resume parsing happens server-side — files never reach the browser
- The Supabase CLI token is stored globally (~/.supabase/), never in the repo

🔧 Troubleshooting
Module not found: @ai-sdk/react
   - Update dependencies: npm install @ai-sdk/react

pdfParse is not a function
   - Ensure pdfjs-dist is in serverExternalPackages in next.config.ts and you’re importing from pdfjs-dist/legacy/build/pdf.mjs.

Bucket not found (resume upload)
   - Create the resumes bucket manually in Supabase Dashboard → Storage. Set to Private.

Could not find the table 'public.resumes'
   - Run the V2 migration SQL in Supabase SQL Editor. See supabase/migrations/.

Hydration mismatch (aria-describedby errors)
   - The KanbanWrapper component uses dynamic(() => ..., { ssr: false }) to avoid dnd-kit SSR issues. Make sure you’re using KanbanWrapper (not KanbanBoard directly) in the dashboard.

Invalid path specified in request URL (auth/magic link)
   - Your NEXT_PUBLIC_SUPABASE_URL must be the base URL only (e.g., https://<project-id>.supabase.co). Do not include /rest/v1/.

"Nothing happens" on mock interview send
   - Ensure the embed Edge Function is deployed: npx supabase functions deploy embed
   - Check your GROQ_API_KEY is valid

🤝 Contributing

PRs welcome — especially from folks who’ve used this in their own search and have ideas to improve it. Open an issue first for anything substantial.

📄 License
MIT