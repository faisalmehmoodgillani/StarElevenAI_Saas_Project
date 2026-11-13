# StarEleven AI SaaS — Enterprise Multi-Tenant AI Agent Platform

**StarEleven AI SaaS** is an enterprise-grade, multi-tenant Business-to-Business (B2B) AI Agent platform engineered to help organizations deploy, orchestrate, and manage autonomous AI workflows inside strictly isolated workspaces. Built on a **Vertical Slice & Modular Architecture**, the platform unites a **FastAPI** modular backend, **LangGraph** stateful multi-agent orchestration, **Supabase PostgreSQL** persistent memory and authentication, **AES-256 Fernet** credential encryption, and a **Next.js App Router** frontend styled in a **Cyber-Obsidian Dark (`#09090B`) & Electric Lime (`#84CC16`)** design system.

Organizations can create isolated workspaces, authenticate via 6-digit email OTP or Google OAuth, operate under either a **Fully Managed Plan** or **BYOK (Bring Your Own Key)** model, switch dynamically across leading Large Language Model (LLM) providers (or enter custom model IDs), and collaborate with specialized AI agents equipped with live web search, tenant-scoped database tools, rich GFM table rendering, and persistent thread memory.

> **Cost & Pricing Companion Guide:** For a complete non-technical breakdown of Free Tier limits, Paid Production infrastructure costs, 100% free open-source tool alternatives (such as DuckDuckGo Search, BeautifulSoup, and Supabase `pgvector`), and SaaS client profit margins, see [`docs/COST_AND_PRICING_GUIDE.md`](docs/COST_AND_PRICING_GUIDE.md).

---

## 1. Visual Project Directory & File Structure

Below is the complete, up-to-date directory tree across the **Root**, **Backend**, and **Frontend** layers, reflecting the current frozen baseline and upcoming modules.

```text
StarElevenAI_Saas_Project/
├── .env.example                                  # [Completed] Environment blueprint (Supabase, Fernet, LLMs, Tavily, LangSmith)
├── .gitignore                                    # [Completed] Security exclusions (.env, .env.local, .venv, node_modules)
├── README.md                                     # [Completed] Master architecture, directory tree, skills, build log & roadmap
├── requirements.txt                              # [Completed] Backend Python dependency manifest
├── docs/
│   └── COST_AND_PRICING_GUIDE.md                 # [Completed] Free vs. Paid API cost breakdown, free alternatives & SaaS margins
│
├── backend/
│   ├── __init__.py                               # [Completed] Root backend package initializer
│   ├── app.py                                    # [Frozen & Live] Slim FastAPI entrypoint, CORS policies & v1 router mount
│   ├── config.py                                 # [Frozen & Live] Central environment & LangSmith observability loader
│   │
│   ├── database/
│   │   ├── __init__.py                           # [Completed] Database layer exports
│   │   ├── connection.py                         # [Frozen & Live] SQLAlchemy engine for Supabase IPv4 Session Pooler (Port 6543)
│   │   ├── models.py                             # [Frozen & Live] Multi-tenant ORM tables (Workspaces, Users, AgentConfigs)
│   │   ├── checkpointer.py                       # [Frozen & Live] LangGraph PostgresSaver + Supabase checkpoint hard-delete helper
│   │   └── test_connection.py                    # [Completed] Automated 3-stage DB, ORM & checkpointer migration verifier
│   │
│   ├── services/
│   │   ├── __init__.py                           # [Completed] Services package initializer
│   │   ├── security.py                           # [Frozen & Live] AES-256 Fernet API key encryption & runtime decryption vault
│   │   ├── llm_factory.py                        # [Frozen & Live] Dynamic Multi-LLM Factory (Groq gpt-oss-20b, Gemini, OpenAI, Claude)
│   │   ├── auth_service.py                       # [Scaffolded — Upcoming] Backend JWT & Supabase token verification guard
│   │   └── tenant_service.py                     # [Scaffolded — Upcoming] Workspace usage quotas & plan enforcement service
│   │
│   ├── tools/
│   │   ├── __init__.py                           # [Completed] Modular LangChain/LangGraph tools registry
│   │   ├── web_search.py                         # [Frozen & Live] Live internet search tool (tavily_web_search)
│   │   └── db_lookup.py                          # [Frozen & Live] Tenant-isolated DB tools (get_workspace_summary, list_workspace_agents)
│   │
│   ├── agents/
│   │   ├── __init__.py                           # [Completed] Multi-agent engine initializer
│   │   ├── base.py                               # [Frozen & Live] Shared LangGraph AgentState & Pydantic RouteDecision schema
│   │   ├── router.py                             # [Frozen & Live] Central Meta-Agent intent router compiled with PostgresSaver
│   │   └── modules/
│   │       ├── __init__.py                       # [Completed] Sub-agent modules initializer
│   │       ├── research_agent.py                 # [Frozen & Live] Deep Research Agent bound with live web search tools
│   │       └── crm_agent.py                      # [Frozen & Live] CRM & Workspace Operations Agent bound with DB lookup tools
│   │
│   ├── schemas/
│   │   ├── __init__.py                           # [Completed] Pydantic contracts initializer
│   │   ├── chat_schema.py                        # [Frozen & Live] Chat, SSE streaming & thread history validation schemas
│   │   ├── workspace_schema.py                   # [Frozen & Live] Workspace creation, onboarding & directory schemas
│   │   └── agent_schema.py                       # [Frozen & Live] Agent configuration, model binding & BYOK key schemas
│   │
│   ├── api/
│   │   ├── __init__.py                           # [Completed] API root initializer
│   │   └── v1/
│   │       ├── __init__.py                       # [Frozen & Live] Central v1 APIRouter aggregator
│   │       ├── auth_sync.py                      # [Frozen & Live] Hybrid Supabase Auth <-> PostgreSQL workspace sync endpoint
│   │       ├── chat_routes.py                    # [Frozen & Live] /chat, /chat/stream (SSE), history & DELETE thread purge endpoints
│   │       ├── workspace_routes.py               # [Frozen & Live] /workspaces & /my-workspaces user-scoped tenant endpoints
│   │       └── agent_routes.py                   # [Frozen & Live] /agents configuration & encrypted key storage endpoints
│   │
│   ├── rag/                                      # [Scaffolded — Module 07 Upcoming]
│   │   ├── __init__.py                           # RAG pipeline initializer
│   │   ├── ingestion.py                          # PDF/DOCX/TXT/CSV document loader & recursive text splitter
│   │   └── vectorstore.py                        # Workspace-scoped Supabase pgvector similarity retriever
│   │
│   └── mcp/                                      # [Scaffolded — Module 08 Upcoming]
│       ├── __init__.py                           # Model Context Protocol initializer
│       ├── client.py                             # Multi-server MCP client manager
│       └── configs/
│           └── mcp_config.json                   # External MCP tool server registry
│
└── frontend/
    ├── .env.local                                # [Completed] Frontend API base URL & Supabase public credentials
    ├── next.config.js                            # [Frozen & Live] Next.js runtime configuration
    ├── package.json                              # [Frozen & Live] Next.js, React, TypeScript, Tailwind, Supabase & Lucide deps
    ├── postcss.config.js                         # [Frozen & Live] PostCSS & Autoprefixer pipeline
    ├── tailwind.config.ts                        # [Frozen & Live] Cyber-Obsidian (#09090B) & Electric Lime (#84CC16) design tokens
    ├── tsconfig.json                             # [Frozen & Live] Strict TypeScript configuration with @/* path aliases
    │
    └── src/
        ├── styles/
        │   └── globals.css                       # [Frozen & Live] Dark obsidian theme, scrollbars & .streaming-cursor animation
        ├── types/
        │   ├── saas.ts                           # [Frozen & Live] Core SaaS interfaces (Workspaces, Agents, SSE frames, PlanMode)
        │   └── chat.ts                           # [Frozen & Live] Chat messages, threads & live LangGraph telemetry types
        ├── lib/
        │   ├── supabase/
        │   │   └── client.ts                     # [Frozen & Live] Singleton browser Supabase client (WorkspaceContext & Dashboard)
        │   ├── supabase.ts                       # [Frozen & Live] Supabase Auth & Google OAuth helper (Login, Register & Callback)
        │   ├── api.ts                            # [Frozen & Live] Typed HTTP bridge for /api/v1 & Supabase thread hard-delete
        │   ├── session.ts                        # [Frozen & Live] Client-side active workspace & plan session persistence
        │   └── sse-stream.ts                     # [Frozen & Live] Normalized SSE ReadableStream parser with AbortController
        ├── context/
        │   └── WorkspaceContext.tsx              # [Frozen & Live] Global user-scoped workspaces, active agent & hybrid model state
        │
        ├── components/
        │   ├── layout/
        │   │   ├── Header.tsx                    # [Frozen & Live] Operator header with Active Agent & Hybrid Custom Model selector
        │   │   ├── Sidebar.tsx                   # [Frozen & Live] Collapsible Cyber-Obsidian navigation sidebar & mobile drawer
        │   │   └── WorkspaceSwitcher.tsx         # [Frozen & Live] User-isolated workspace switcher & Create Workspace modal
        │   └── chat/
        │       ├── AgentTelemetryBadge.tsx       # [Frozen & Live] Live agent routing & tool execution status indicator
        │       ├── ChatComposer.tsx              # [Frozen & Live] Auto-expanding prompt box, slash commands, voice & stop control
        │       ├── MarkdownRenderer.tsx          # [Frozen & Live] Enterprise GFM table parser, CSV export, zero-star bold & <think> toggle
        │       ├── MessageBubble.tsx             # [Frozen & Live] User & AI message bubbles powered by MarkdownRenderer
        │       └── ThreadSidebar.tsx             # [Frozen & Live] Persistent conversation history sidebar with Supabase hard-delete
        │
        └── app/
            ├── layout.tsx                        # [Frozen & Live] Root font & dark mode layout
            ├── page.tsx                          # [Frozen & Live] Entry redirect to /login
            ├── (auth)/                           # [Module 02 — Frozen & Live]
            │   ├── layout.tsx                    # Split-screen animated Cyber-Obsidian & Electric Lime auth showcase
            │   ├── login/page.tsx                # Tenant-isolated email/password login, Google OAuth & live API health badge
            │   ├── register/page.tsx             # Workspace onboarding, auto-slug, 6-digit OTP & Managed vs. BYOK selector
            │   ├── callback/page.tsx             # Google OAuth callback handler & automatic workspace provisioning
            │   ├── forgot-password/page.tsx      # Multi-step email OTP verification & password reset wizard
            │   └── change-password/page.tsx      # Authenticated password updater with Electric Lime strength meter
            └── (dashboard)/
                ├── layout.tsx                    # [Frozen & Live] Protected SaaS shell wrapping WorkspaceProvider, Sidebar & Header
                ├── page.tsx                      # [Route Stub — Upcoming] Executive workspace overview & quick metrics
                ├── chat/page.tsx                 # [Module 04 — Frozen & Live] Real-time SSE streaming AI Command Center
                ├── agents/page.tsx               # [Module 05 — Next Up] Agent Studio (create/edit agents, prompts & tool toggles)
                ├── settings/page.tsx             # [Module 06 — Upcoming] Workspace edit, Managed/BYOK switch & AES-256 Key Vault
                ├── knowledge/page.tsx            # [Module 07 — Upcoming] RAG Knowledge Base document upload & vector index manager
                ├── crm/page.tsx                  # [Upcoming] CRM lead qualification Kanban pipeline & customer directory
                ├── analytics/page.tsx            # [Upcoming] Token usage charts, latency metrics & LangSmith trace insights
                └── pricing/page.tsx              # [Upcoming] SaaS subscription tiers & Managed vs. BYOK billing portal
```

---

## 2. Technology Stack, Installed Libraries & Packages

| Layer | Library / Package | Role in StarEleven AI SaaS |
| :--- | :--- | :--- |
| **Backend API** | **FastAPI & Uvicorn** | High-performance asynchronous REST and Server-Sent Events (SSE) web server powering `/api/v1` modular routers. |
| **Validation** | **Pydantic & Python-Dotenv** | Strict runtime request/response contracts, structured router decisions, and environment configuration loading. |
| **Orchestration** | **LangGraph & LangChain Core** | Stateful cyclic graph engine powering the central Meta-Agent router, conditional tool routing, and sub-agent execution flows. |
| **LLM Providers** | **LangChain (Groq, Google GenAI, OpenAI, Anthropic)** | Unified multi-model interface supporting Groq (`openai/gpt-oss-20b` default, `qwen3-32b`, `kimi-k2`), Gemini, GPT-4o, Claude, and OpenRouter. |
| **Observability** | **LangSmith** | End-to-end execution tracing, run monitoring, token usage auditing, and multi-agent latency debugging. |
| **Database & Memory** | **SQLAlchemy, Psycopg3 (`psycopg_pool`) & LangGraph PostgresSaver** | Connects via Supabase IPv4 Session Pooler (Port 6543) to manage multi-tenant tables and persistent thread checkpoints. |
| **Security** | **Cryptography (Fernet)** | Symmetric AES-256 encryption vault protecting client BYOK API keys at rest and decrypting strictly in-memory at runtime. |
| **Agent Tools** | **Tavily Python** *(+ DuckDuckGo fallback planned)* | Real-time web search SDK powering `research_agent` for live market intelligence and current events. |
| **Frontend Core** | **Next.js 14 (App Router), React & TypeScript** | Full-stack React framework with route groups (`(auth)` and `(dashboard)`), strict typing, and `@/*` module resolution. |
| **Styling & Icons** | **Tailwind CSS, PostCSS, Clsx, Tailwind Merge & Lucide React** | Custom Cyber-Obsidian (`#09090B`) and Electric Lime (`#84CC16`) design tokens with crisp vector iconography. |
| **Auth & HTTP** | **Supabase JS, Supabase SSR & Fetch SSE Streams** | Manages email/password signup, 6-digit OTP verification, Google OAuth, password recovery, and real-time token streaming. |

---

## 3. Multi-Agent Architecture & Connected Tools

| Agent / Node | Module Path | Connected Tools & Capabilities | Operational Responsibility |
| :--- | :--- | :--- | :--- |
| **Meta-Agent Intent Router** | `backend/agents/router.py` | Structured LLM Classifier (`RouteDecision`), `PostgresSaver` Checkpointer | Evaluates user intent and conversation history to dispatch requests to the right specialist agent while persisting thread state. |
| **Deep Research Agent** | `backend/agents/modules/research_agent.py` | `tavily_web_search` (`backend/tools/web_search.py`) | Queries live web sources, gathers up-to-date market intelligence, and synthesizes structured, cited answers. |
| **CRM & Workspace Agent** | `backend/agents/modules/crm_agent.py` | `get_workspace_summary`, `list_workspace_agents` (`backend/tools/db_lookup.py`) | Queries Supabase PostgreSQL strictly filtered by `workspace_id` to report tenant metrics, active agents, and workspace status. |
| **General Assistant Node** | `backend/agents/router.py` | Dynamic Workspace LLM (`llm_factory.py`) | Handles direct reasoning, content drafting, GFM table generation, summarization, and general enterprise workflows. |
| **RAG Knowledge Agent** *(Module 07)* | `backend/rag/` | `rag_retriever` (Supabase `pgvector` similarity search) | Retrieves private organizational knowledge from uploaded PDFs, DOCX, TXT, and CSV documents per workspace. |
| **MCP Tool Connectors** *(Module 08)* | `backend/mcp/` | Model Context Protocol Client (`mcp_config.json`) | Connects external MCP tool servers (Google Workspace, Slack, WhatsApp CRM, custom APIs) dynamically without core code changes. |

---

## 4. Core Agentic AI Skills & LangGraph Capabilities Matrix

Aligned with modern production Agentic AI engineering principles covered in the project's technical blueprint, StarEleven AI SaaS implements modular **Agentic Skills** that can be bound dynamically to workspace agents:

| Agentic Skill / Pattern | Architectural Implementation in StarEleven AI SaaS | Status |
| :--- | :--- | :--- |
| **1. Structured Intent Routing & Conditional Edges** | Uses Pydantic `RouteDecision` schemas and LangGraph conditional edges (`router.py`) to classify queries and route dynamically between General, Research, and CRM nodes. | **Live (Frozen)** |
| **2. Stateful Graph Memory & Reducers** | Manages shared `AgentState` (`base.py`) with `add_messages` reducers so multi-turn context, tool outputs, and routing metadata stay synchronized across nodes. | **Live (Frozen)** |
| **3. Tool Calling & Custom `@tool` Binding** | Binds typed LangChain `@tool` functions (`tavily_web_search`, `get_workspace_summary`, `list_workspace_agents`) with strict `workspace_id` isolation. | **Live (Frozen)** |
| **4. Short-Term Thread Persistence & Hard-Delete** | Persists conversation checkpoints in Supabase PostgreSQL (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`) via `PostgresSaver`, with full cascade hard-delete on thread removal. | **Live (Frozen)** |
| **5. Enterprise Output & GFM Data Reporting Skill** | Renders structured Markdown tables with one-click CSV export, zero-raw-star bold formatting, and collapsible `<think>` reasoning pills (`MarkdownRenderer.tsx`). | **Live (Frozen)** |
| **6. End-to-End Observability & Run Tracing** | Integrates **LangSmith** (`config.py`) to trace every agent step, tool invocation, token count, and latency metric in real time. | **Live (Frozen)** |
| **7. RAG Document Ingestion & Vector Retrieval Skill** | Chunks uploaded PDF/DOCX/TXT/CSV files via `RecursiveCharacterTextSplitter` and performs workspace-scoped similarity search in Supabase `pgvector` (`backend/rag/`). | **Upcoming (Module 07)** |
| **8. Model Context Protocol (MCP) Plug-and-Play Skill** | Connects external MCP servers (`backend/mcp/configs/mcp_config.json`) so third-party API updates never require rewriting core agent logic. | **Upcoming (Module 08)** |
| **9. Human-in-the-Loop (HITL) Approval Gates** | Uses LangGraph `interrupt` checkpoints to pause execution and request explicit operator approval in the UI before executing sensitive actions (emails, CRM edits, payments). | **Upcoming (Module 09)** |
| **10. Cross-Thread Long-Term Memory & Free Utility Skills** | Adds persistent user-fact memory across sessions plus free-first utility tools: DuckDuckGo search fallback, BeautifulSoup web scraper, Open-Meteo weather, `yfinance` stocks, and safe AST math calculator. | **Upcoming (Module 10)** |

---

## 5. Authentication, Google OAuth & Gmail SMTP Configuration

StarEleven AI SaaS implements a **Hybrid Authentication & Tenant Sync Architecture** combining **Supabase Auth** with **PostgreSQL Multi-Tenant Tables**:

* **Google Cloud Console & OAuth 2.0 Setup:**
  * Configured a Web Application OAuth 2.0 Client in **Google Cloud Console** with Authorized Redirect URI pointing to Supabase's OAuth callback endpoint (`/auth/v1/callback`).
  * Integrated one-click **Continue with Google** on `/login` and `/register`, routing through Next.js `/callback` to automatically sync or provision the user's default workspace via `/api/v1/auth/sync-workspace`.
* **Gmail Custom SMTP & App Password Setup:**
  * Enabled 2-Step Verification on the official Gmail sender account and generated a 16-character **Google App Password**.
  * Configured **Supabase Custom SMTP** (`smtp.gmail.com`, Port `465`/`587`) to bypass Supabase's default 2-emails/hour sandbox limit, enabling instant delivery of up to ~500 OTP and password recovery emails per day at zero cost.
* **Branded Email Templates & Tenant Privacy:**
  * Styled custom HTML email templates in **Cyber-Obsidian Dark & Electric Lime** for **Confirm Signup (6-Digit OTP)**, **Reset Password (OTP)**, **Change Email**, and **Password Changed** notifications.
  * Removed public workspace dropdowns from `/login` so all workspaces remain strictly private and user-scoped after authentication.

---

## 6. Step-by-Step Build Chronicle (Session 01 – Session 04)

* **Step 1 — Architecture Planning & Reference Benchmark Analysis (Session 01):**
  * Analyzed enterprise B2B multi-tenant SaaS patterns (`bops` and `wacrm` benchmarks) to design workspace isolation and Managed vs. BYOK pricing tiers without copying external code.
  * Initialized clean monorepo structure (`backend/` and `frontend/`), `.env.example`, `.gitignore`, `requirements.txt`, and project documentation.
* **Step 2 — Supabase PostgreSQL & LangGraph Checkpointer Connection (Session 01 & 02):**
  * Built `backend/database/connection.py` to connect FastAPI with Supabase PostgreSQL IPv4 Session Pooler (`postgresql+psycopg://`, Port `6543`).
  * Created multi-tenant ORM tables (`workspaces`, `users`, `agent_configs`) in `backend/database/models.py` and verified connectivity via `backend/database/test_connection.py`.
  * Configured `psycopg_pool` and LangGraph `PostgresSaver` in `backend/database/checkpointer.py` to initialize `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, and `checkpoint_migrations` (`0–9`).
* **Step 3 — AES-256 Security Vault & Dynamic Multi-LLM Factory (Session 01 & 02):**
  * Implemented symmetric encryption/decryption in `backend/services/security.py` using `cryptography.fernet` to protect client BYOK API keys at rest.
  * Built `backend/services/llm_factory.py` supporting `Groq`, `Google Gemini`, `OpenAI`, `Anthropic`, and `OpenRouter` dynamically per workspace.
* **Step 4 — Multi-Agent LangGraph Router & Modular FastAPI `v1` Split (Session 02):**
  * Created `backend/tools/web_search.py` (Tavily search) and `backend/tools/db_lookup.py` (tenant-scoped Supabase workspace queries).
  * Built `backend/agents/base.py`, `router.py`, `research_agent.py`, and `crm_agent.py` for structured intent routing.
  * Split `backend/app.py` into slim modular `APIRouter` files (`backend/api/v1/chat_routes.py`, `workspace_routes.py`, `agent_routes.py`) and Pydantic schemas (`backend/schemas/`), verified end-to-end on Swagger UI (`/docs`).
* **Step 5 — Frontend Module 01: Cyber-Obsidian Theme & API/SSE Bridge (Session 03):**
  * Configured Next.js 14 App Router, TypeScript, and Cyber-Obsidian (`#09090B`) + Electric Lime (`#84CC16`) design tokens (`tailwind.config.ts`, `globals.css`).
  * Created typed contracts (`frontend/src/types/saas.ts`), REST client (`frontend/src/lib/api.ts`), and normalized SSE stream handler (`frontend/src/lib/sse-stream.ts`).
* **Step 6 — Frontend Module 02: Hybrid Auth, Google OAuth & Gmail Custom SMTP (Session 03):**
  * Connected Google Cloud OAuth 2.0 and Gmail Custom SMTP (16-char App Password) with Supabase Auth and Cyber-Obsidian + Electric Lime HTML email templates.
  * Built `/login`, `/register` (Managed vs. BYOK + 6-digit OTP), `/callback` (Google OAuth), `/forgot-password`, `/change-password`, `frontend/src/lib/supabase.ts`, `frontend/src/lib/session.ts`, and `backend/api/v1/auth_sync.py`.
* **Step 7 — Frontend Module 03: Enterprise Dashboard Shell & Hybrid Model Selector (Session 03):**
  * Built singleton browser Supabase client (`frontend/src/lib/supabase/client.ts`) and `WorkspaceContext.tsx` with user-scoped `/api/v1/auth/my-workspaces` isolation.
  * Created `WorkspaceSwitcher.tsx` (with Create Workspace modal), collapsible `Sidebar.tsx`, protected `(dashboard)/layout.tsx`, and `Header.tsx` featuring `openai/gpt-oss-20b` default + `+ Custom Model` creator.
* **Step 8 — Frontend Module 04: Real-Time SSE Chat & Supabase Thread Hard-Delete (Session 04):**
  * Built `/chat` (`frontend/src/app/(dashboard)/chat/page.tsx`), `AgentTelemetryBadge.tsx`, `ChatComposer.tsx` (slash commands, voice dictation, stop stream), and `ThreadSidebar.tsx`.
  * Built `MarkdownRenderer.tsx` and `MessageBubble.tsx` with styled GFM tables, one-click CSV export, `<think>` reasoning toggle, and zero-raw-star bold formatting.
  * Connected `delete_thread_checkpoints` (`checkpointer.py`), `DELETE /api/v1/threads/{workspace_id}/{thread_id}` (`chat_routes.py`), and `starElevenApi.deleteThread` (`api.ts`) so deleting a thread purges all checkpoint records from Supabase.

---

## 7. Notebook Questions & Architectural Decisions Tracker

This table tracks every key architectural question, debugging issue, and product requirement raised across all sessions and NotebookLM discussions so nothing is overlooked in future modules:

| # | Session / Source | Question / Requirement Raised | Architectural Decision & Resolution | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Session 01 | Analyze `wacrm` and `bops` GitHub repositories to design a B2B multi-tenant SaaS workflow and pricing structure without copying external files. | Designed clean multi-tenant isolation (`workspace_id`) and Managed vs. BYOK dual-tier architecture. | **Completed** |
| **2** | Session 02 | Can `backend/app.py` be split into smaller modular files to prevent errors as the platform scales? | Refactored `app.py` into a slim entrypoint with modular `backend/api/v1/` routers and `backend/schemas/` Pydantic contracts. | **Completed & Verified** |
| **3** | Session 02 | Which Supabase tables store data, what are `checkpoint_migrations` (`0–9`), and is an empty `checkpoint_ns` normal? | Confirmed LangGraph tracks schema versions `0–9` and empty `checkpoint_ns` (`""`) is standard for top-level graph checkpoints. | **Completed & Verified** |
| **4** | Session 03 | Why did public workspaces appear on `/login`, why did workspace sync/delete fail, and how to add 6-digit Email OTP + Google Sign-In? | Removed public workspace dropdown from `/login`, added `auth_sync.py` user-scoped isolation, and configured Google OAuth + Gmail Custom SMTP OTPs. | **Completed & Verified** |
| **5** | Session 03 | How should Module 03 Dashboard Shell handle multi-workspace creation, and where will workspace editing live? | Built `WorkspaceSwitcher` + Create Workspace modal in Module 03; scoped workspace edit form to Module 06 (`/settings`). | **Shell Done / Edit Pending** |
| **6** | Session 03 | Old Groq Llama models threw deprecation errors; need working default (`openai/gpt-oss-20b`), non-technical presets, and custom model input. | Set `openai/gpt-oss-20b` as default across frontend/backend and added friendly presets + `+ Custom Model` input in `Header.tsx`. | **Completed & Verified** |
| **7** | Session 04 | Chat table responses showed raw `\|---\|` pipes and stray `*` characters in bold lists during streaming. | Built custom GFM `MarkdownRenderer.tsx` with styled tables, CSV export, `<think>` toggle, and streaming-safe bold parsing. | **Completed & Verified** |
| **8** | Session 04 | Deleting a chat thread in the UI should also delete its checkpoint history from Supabase PostgreSQL. | Implemented `delete_thread_checkpoints`, `DELETE /api/v1/threads/{workspace_id}/{thread_id}`, and `starElevenApi.deleteThread`. | **Completed & Verified** |
| **9** | Cost & Tools Plan | Track Free vs. Paid API costs and integrate 100% free tool alternatives (e.g., DuckDuckGo fallback for Tavily, BeautifulSoup, `pgvector`). | Created `docs/COST_AND_PRICING_GUIDE.md`; scheduled DuckDuckGo fallback and free utility tools in Module 10. | **Documented / Code Pending** |
| **10** | NotebookLM Skills | Integrate advanced LangGraph skills discussed in NotebookLM: Agent Studio, BYOK Vault, RAG `pgvector`, MCP Servers, HITL approvals, Long-Term Memory, and PDF/MD export. | Mapped systematically into Modules 05–11 below using Vertical Slice (Backend + Frontend) delivery. | **Planned (Modules 05–11)** |

---

## 8. Frozen Baseline vs. Upcoming Development Roadmap

### Frozen & Verified Baseline (Modules 01–04)

| Module | Scope & Key Deliverables | Status |
| :--- | :--- | :--- |
| **Backend Core (`v1`)** | Supabase Session Pooler connection, multi-tenant ORM, LangGraph `PostgresSaver` + hard-delete, AES-256 Fernet vault, Multi-LLM Factory (`openai/gpt-oss-20b`), Meta-Router + Research/CRM sub-agents, and modular `v1` routers. | **Frozen & Live** |
| **Module 01: Foundation** | Cyber-Obsidian & Electric Lime Tailwind theme, TypeScript contracts (`saas.ts`), HTTP bridge (`api.ts`), and normalized SSE stream parser (`sse-stream.ts`). | **Frozen & Live** |
| **Module 02: Auth Suite** | Animated `/login`, `/register` (Managed vs. BYOK + 6-digit OTP), `/callback` (Google OAuth), `/forgot-password`, `/change-password`, and Gmail SMTP OTP delivery. | **Frozen & Live** |
| **Module 03: Dashboard Shell** | `WorkspaceContext`, singleton `supabase/client.ts`, user-scoped `WorkspaceSwitcher` + Create Workspace modal, collapsible `Sidebar`, and `Header` with Active Agent & Hybrid Custom Model selector. | **Frozen & Live** |
| **Module 04: AI Command Center** | Real-time SSE streaming `/chat`, GFM Table renderer with CSV export, zero-raw-star Markdown parser, collapsible `<think>` reasoning pill, and persistent thread sidebar with Supabase purge. | **Frozen & Live** |

### Upcoming Development Roadmap (Modules 05–11)

| Priority | Module / Feature | Technical & Functional Scope |
| :--- | :--- | :--- |
| **1 (Next Up)** | **Module 05: Agent Studio (`/agents`)** | Full CRUD interface and backend routes to create custom workspace agents, edit system prompts, toggle assigned tools, and activate/deactivate agents. |
| **2** | **Module 06: Workspace Settings & BYOK Vault (`/settings`)** | Workspace profile editor (rename workspace/slug), Managed vs. BYOK plan switcher, and encrypted API Key Vault UI for Groq, Gemini, OpenAI, Claude, and OpenRouter. |
| **3** | **Module 07: RAG Knowledge Base (`backend/rag/` + `/knowledge`)** | Upload PDF, DOCX, TXT, and CSV files; perform recursive text chunking; store embeddings in Supabase `pgvector`; and equip agents with a `rag_retriever` tool. |
| **4** | **Module 08: Model Context Protocol Hub (`backend/mcp/`)** | Activate plug-and-play external MCP tool servers (Google Drive, Slack, WhatsApp CRM, custom REST/MCP connectors) via `mcp_config.json`. |
| **5** | **Module 09: Human-in-the-Loop (HITL) Approvals** | LangGraph `interrupt` checkpoints requiring explicit user approval in the chat UI before sensitive actions execute (sending external emails, modifying CRM records, or financial operations). |
| **6** | **Module 10: Free-First Utility Tools, Memory & Exports** | Add automatic **DuckDuckGo Search** fallback (when Tavily key is absent), clean web scraper (`BeautifulSoup` + `trafilatura`), safe math calculator, weather (`Open-Meteo`), finance (`yfinance`), cross-thread long-term user memory tools, and downloadable PDF/Markdown report exports. |
| **7** | **Module 11: CRM Pipeline, Analytics, Billing & Production CI/CD** | Interactive `/crm` Kanban board, `/analytics` token & LangSmith cost dashboard, `/pricing` subscription billing, Docker containers, GitHub Actions CI/CD, and Supabase Row Level Security (RLS). |