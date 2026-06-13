# AI Interviewer

A mini AI-powered interview app inspired by [Anthropic's Interviewer](https://www.anthropic.com/news/anthropic-interviewer). Users pick a topic, answer five sequential AI-generated questions, and receive a structured summary with themes, sentiment, and keywords. Transcripts and summaries are stored in Supabase Postgres.

**Live demo:** [https://buian-ai-interviewer.vercel.app/](https://buian-ai-interviewer.vercel.app/)

**Test account**

| Field | Value |
|-------|-------|
| Email | `test@example.com` |
| Password | `123456` |

---

## Assignment requirements

This project fulfills the core brief:

| Requirement | Implementation |
|-------------|----------------|
| Start an interview on a chosen topic | Preset categories (e.g. “AI in the Workplace”) or a custom topic on the home page |
| Generate 3–5 sequential AI questions | Five core questions, generated one at a time via Groq after each answer |
| Collect answers interactively | Web UI with answer composer, submit flow, and optional follow-ups |
| Produce a brief AI summary at the end | LLM-generated summary with themes, highlights, strengths, and growth areas |
| Store transcript and summary | Supabase: Q&A in `interview_questions`, summary in `interviews.result` (JSONB) |

**Bonus:** per-answer sentiment scoring (VADER) and keyword extraction (KeyBERT), aggregated on the summary page.

---

## How to use the app

1. Sign in (or use the test account above).
2. Choose a preset topic or enter your own.
3. Answer five core questions in order. If an answer is too thin or off-topic, the interviewer may ask **one follow-up** before moving on — follow-ups do not count toward the five core questions.
4. After the last answer, you are redirected to the **Summary** page. Open **Transcript** to review the full Q&A.

---

## Architecture

```
Browser (Next.js)  →  FastAPI  →  Supabase (Auth + Postgres)
                         ↓
                    Groq (LLM)
                    NLTK VADER + KeyBERT
```

- **Frontend** (`frontend/`): Next.js App Router, shadcn/ui. Talks only to the FastAPI backend — never directly to Supabase.
- **API** (`api/`): FastAPI gateway for auth, interviews, LLM calls, and NLP. Uses `supabase-py` for Auth and database access.
- **Database** (`supabase/migrations/`): Postgres schema with Row Level Security so users only see their own interviews.

### Interview flow

1. **Create** — User picks a category; API inserts an `interviews` row and generates Core Question 1 via Groq.
2. **Submit answer** — User submits an answer; API saves it, runs LLM depth evaluation and background NLP (sentiment + keywords).
3. **Adapt** — If the answer is shallow or did not address the question, the API may insert one follow-up (LLM-generated). Otherwise it generates the next core question.
4. **Complete** — After all questions are answered, status becomes `completed` and summary generation starts asynchronously.
5. **Review** — Summary page polls until ready; transcript page lists every question/answer turn with evaluation metadata.

---

## Prompt engineering

Prompts live as markdown templates in `api/prompts/` and are loaded at runtime by `groq_service.py`. Keeping prompts in files makes them easy to iterate on without touching Python logic.

| File | Role |
|------|------|
| `interviewer.md` | System prompt for generating interview questions. Defines persona, strict 5-core + optional follow-up structure, probing techniques, and stage awareness (`Core Question N` vs follow-up). |
| `evaluate_answer.md` | Evaluates each answer: `answer_depth` (shallow / adequate / deep), `answered_question`, `evaluation_reason`, and optional `suggestions`. Drives follow-up decisions. |
| `generate_summary.md` | Post-interview debrief: overall summary, themes, highlights, strengths, and growth areas. Returns structured JSON only. |

Each LLM call includes transcript history so questions build on prior answers. Fallback question templates in `interview_service.py` are used if Groq fails.

---

## Answer evaluation

Evaluation happens in two layers after each submit:

### 1. LLM depth evaluation (Groq)

The model reads the question, answer, and category (for follow-ups: original core Q + first answer + follow-up Q + follow-up answer) and returns:

- **`answer_depth`** — `shallow`, `adequate`, or `deep`
- **`answered_question`** — whether the participant meaningfully addressed what was asked
- **`evaluation_reason`** — short explanation
- **`suggestions`** — optional tips when the answer could be stronger

If depth is shallow or the question was not answered, the service may insert **one** LLM-generated follow-up before advancing to the next core question.

### 2. NLP analysis (background)

Runs asynchronously via `nlp_service.py`:

- **Sentiment** — NLTK VADER compound score → `positive` / `neutral` / `negative` plus a numeric score per answer
- **Keywords** — KeyBERT extracts top keyphrases (default model: `all-MiniLM-L6-v2`)

Results are stored on each `interview_questions` row and aggregated when the summary is built.

---

## Stored data

### Transcript (`interview_questions` table)

Each row is one interview turn (core question or follow-up):

| Field | Description |
|-------|-------------|
| `sequence` | Order in the interview (core: 1–5; follow-up: e.g. 101, 201) |
| `question` | Interviewer text |
| `answer` | User response |
| `answered_at` | When the answer was submitted |
| `follows_question_id` | Set for follow-ups; links to the parent core question |
| `answer_depth` | LLM evaluation: shallow / adequate / deep |
| `answered_question` | Whether the answer addressed the question |
| `evaluation_reason` | Why that depth was chosen |
| `suggestions` | Optional improvement tips |
| `sentiment_label` | positive / neutral / negative |
| `sentiment_score` | VADER compound score |
| `keywords` | JSON array of `{ term, score }` from KeyBERT |

The **Transcript** page (`/interview/[id]/transcript`) renders this timeline for completed interviews.

### Summary (`interviews.result` JSONB)

Generated when the interview completes. Shape matches `InterviewSummaryResult`:

| Field | Description |
|-------|-------------|
| `status` | `pending` → `ready` (or `failed`) |
| `summary` | 2–4 sentence overall narrative |
| `themes` | 2–5 `{ title, description }` patterns from the conversation |
| `highlights` | Notable moments or insights |
| `strengths` | What the participant communicated well |
| `growth_areas` | Constructive areas for more depth |
| `overall_sentiment_label` | Aggregated sentiment across answers |
| `overall_sentiment_score` | Average compound score |
| `answers_scored` | Number of answers included in sentiment |
| `answer_sentiments` | Per-turn sentiment breakdown |
| `top_keywords` | Top aggregated keywords (up to 8) |
| `keywords` | Full ranked keyword list |
| `generated_at` | ISO timestamp when summary finished |

The **Summary** page (`/interview/[id]/summary`) shows this data; it may briefly show a loading state while generation completes.

### Interview metadata (`interviews` table)

| Field | Description |
|-------|-------------|
| `category` | Chosen topic |
| `status` | `in_progress`, `completed`, or `abandoned` |
| `started_at` / `completed_at` | Session timestamps |
| `result` | Summary JSONB (above) |

---

## Local development with Docker Compose

### Prerequisites

- Docker and Docker Compose
- A [Supabase](https://supabase.com) project (Auth + Postgres)
- A [Groq](https://groq.com) API key

### 1. Configure environment

Copy the example env files and fill in your values:

```bash
cp api/.env.example api/.env
cp frontend/.env.example frontend/.env   # optional; Docker defaults work
```

**`api/.env`** (required)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_DATABASE_URL` | Direct Postgres connection string (used by migrations) |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Optional; defaults to `openai/gpt-oss-120b` |
| `CORS_ORIGINS` | Optional locally; Docker sets `http://localhost:3000` |
| `COOKIE_SECURE` | Set to `false` for local HTTP |

**`frontend/.env`** (optional for Docker)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Browser-facing API URL (`http://localhost:8000`) |
| `API_INTERNAL_URL` | Server-side URL inside Compose (`http://api:8000`) |

### 2. Start the stack

```bash
docker compose up --build
```

Services:

| Service | URL | Purpose |
|---------|-----|---------|
| `migrate` | — | Applies SQL migrations to Supabase (runs once) |
| `api` | http://localhost:8000 | FastAPI backend |
| `frontend` | http://localhost:3000 | Next.js UI |

Health check: http://localhost:8000/health

The first API start may take ~60–90s while KeyBERT and NLTK models load.

### 3. Create a local user

Sign up at http://localhost:3000/signup, or create a user in the Supabase Auth dashboard.

---

## Running without Docker

**API**

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
cp .env.example .env   # edit with your keys
./scripts/run-migrations.sh   # from repo root, with api/.env loaded
fastapi dev main.py
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Apply migrations manually if not using Docker:

```bash
export $(grep -v '^#' api/.env | xargs)
./scripts/run-migrations.sh
```

---

## Project structure

```
ai-interviewer/
├── api/
│   ├── app/
│   │   ├── routers/          # HTTP routes (auth, interviews)
│   │   ├── services/         # Business logic, Groq, NLP, summary
│   │   └── schemas/          # Pydantic models
│   └── prompts/              # LLM prompt templates (.md)
├── frontend/
│   ├── app/                  # Next.js pages (home, interview, summary, transcript)
│   └── components/interview/   # Interview UI
├── supabase/migrations/      # Postgres schema
├── scripts/run-migrations.sh
└── docker-compose.yml
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, shadcn/ui, Tailwind CSS |
| Backend | FastAPI, Pydantic |
| LLM | Groq |
| NLP | NLTK VADER, KeyBERT |
| Database & Auth | Supabase (Postgres + Auth) |
| Deployment | Vercel (frontend), Railway or similar (API) |

---

## What graders are evaluating

The assignment evaluates four areas — how this project addresses each:

| Criterion | Approach |
|-----------|----------|
| **Code clarity and structure** | Routers → services → external integrations; typed schemas; prompts separated from code; SQL migrations with RLS |
| **Prompt design and LLM interaction** | Three dedicated prompt files with strict JSON outputs, transcript-aware question generation, fallbacks on LLM failure |
| **User experience** | Polished web UI with progress, follow-up flow, summary/transcript views, and clear topic selection |
| **Polished AI tool** | Goes beyond the minimum: adaptive follow-ups, per-answer evaluation, sentiment/keywords, auth, Docker, and a hosted demo |
