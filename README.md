# StarEleven AI SaaS — Enterprise Multi-Tenant AI Agent Platform

**StarEleven AI SaaS** is an enterprise-grade, multi-tenant Business-to-Business (B2B) AI Agent platform built to help organizations deploy, orchestrate, and manage autonomous AI workflows inside strictly isolated workspaces. Engineered with a **Vertical Slice & Modular Architecture**, the platform unites a **FastAPI** modular backend, **LangGraph** multi-agent orchestration, **Supabase PostgreSQL** persistent memory and authentication, **AES-256 Fernet** credential encryption, and a **Next.js App Router** frontend styled in a **Cyber-Obsidian Dark & Electric Lime** design system.

Organizations can create isolated workspaces, onboard teams, operate under either a **Fully Managed Plan** or **BYOK (Bring Your Own Key)** model, switch dynamically across leading Large Language Model (LLM) providers, and collaborate with specialized AI agents equipped with live web search and tenant-scoped database tools.

---

## 1. Complete Project Directory & File Structure

Below is the complete, up-to-date directory and file structure across the **Root**, **Backend**, and **Frontend** layers, including current implementation statuses.

### Root Directory (`StarElevenAI_Saas_Project/`)

* `README.md` — **[Completed]** Master project documentation detailing file architecture, installed libraries, connected agent tools, multi-tenant workspaces, completed modules, and roadmap.
* `.env.example` — **[Completed]** Environment blueprint defining Supabase connection pooling URLs, AES-256 Fernet keys, LLM provider secrets, Tavily search keys, and LangSmith tracing variables.
* `.gitignore` — **[Completed]** Security exclusion rules protecting `.env`, `.env.local`, Python virtual environments, build artifacts, and `node_modules`.
* `requirements.txt` — **[Completed]** Backend Python dependency manifest for FastAPI, LangGraph, LangChain, SQLAlchemy, Psycopg, Cryptography, and Tavily.

### Backend Directory (`backend/`)

* `backend/__init__.py` — **[Completed]** Initializes the root `backend` package for clean cross-module imports.
* `backend/app.py` — **[Completed & Verified]** Slim FastAPI application entrypoint configuring CORS policies, system health checks, and mounting versioned `api_v1_router` modules.
* `backend/config.py` — **[Completed & Verified]** Central application configuration loader and LangSmith observability initializer.

#### A. Database & Persistent State Layer (`backend/database/`)
* `backend/database/__init__.py` — **[Completed]** Exposes database sessions, base models, and checkpointer utilities.
* `backend/database/connection.py` — **[Completed & Verified]** Configures the SQLAlchemy engine and session factory for Supabase PostgreSQL IPv4 Session Pooler (Port 6543) using `psycopg` dialect routing and SSL enforcement.
* `backend/database/models.py` — **[Completed & Verified]** Defines multi-tenant relational tables (`Workspaces`, `Users`, and `AgentConfigs`) with UUID primary keys, tenant relationships, and plan metadata.
* `backend/database/checkpointer.py` — **[Completed & Verified]** Initializes LangGraph's `PostgresSaver` backed by PostgreSQL connection pooling to persist conversation state across `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, and `checkpoint_migrations` (`0` through `9`).
* `backend/database/test_connection.py` — **[Completed & Verified]** Automated 3-stage system diagnostic suite validating database connectivity, ORM table synchronization, and checkpointer migration integrity.

#### B. Enterprise Security, LLM Factory & Tenant Services (`backend/services/`)
* `backend/services/__init__.py` — **[Completed]** Package initializer for backend business services.
* `backend/services/security.py` — **[Completed & Verified]** AES-256 Fernet symmetric encryption vault with sanitized fallback key handling to encrypt third-party API keys before database storage and decrypt them strictly at runtime.
* `backend/services/llm_factory.py` — **[Completed & Verified]** Dynamic Multi-LLM Provider Factory instantiating chat models across Google Gemini, Groq, OpenAI, Anthropic, and OpenRouter based on active workspace and request settings.
* `backend/services/auth_service.py` — **[Scaffolded — Upcoming]** Dedicated JWT and Supabase Auth token verification service for backend route protection.
* `backend/services/tenant_service.py` — **[Scaffolded — Upcoming]** Tenant quota enforcement and workspace membership helper service.

#### C. Connected Agent Tools Layer (`backend/tools/`)
* `backend/tools/__init__.py` — **[Completed]** Package initializer registering modular LangChain/LangGraph tools.
* `backend/tools/web_search.py` — **[Completed & Verified]** Live internet research tool (`tavily_web_search`) powered by Tavily API for real-time market intelligence, competitor research, and current events.
* `backend/tools/db_lookup.py` — **[Completed & Verified]** Multi-tenant Supabase lookup tools (`get_workspace_summary` and `list_workspace_agents`) allowing authorized agents to inspect workspace records within strict `workspace_id` boundaries.

#### D. Multi-Agent LangGraph Orchestration (`backend/agents/`)
* `backend/agents/__init__.py` — **[Completed]** Package initializer for the multi-agent workflow engine.
* `backend/agents/base.py` — **[Completed & Verified]** Defines the shared LangGraph `AgentState` and Pydantic `RouteDecision` structured routing schema.
* `backend/agents/router.py` — **[Completed & Verified]** Central Meta-Agent intent router compiled with LangGraph `StateGraph` and `PostgresSaver`, classifying user intent and dispatching tasks to specialized sub-agents.
* `backend/agents/modules/__init__.py` — **[Completed]** Sub-agent modules initializer.
* `backend/agents/modules/research_agent.py` — **[Completed & Verified]** Specialized Deep Research Agent node bound with Tavily web search capabilities to synthesize factual, source-backed answers.
* `backend/agents/modules/crm_agent.py` — **[Completed & Verified]** Specialized CRM & Workspace Operations Agent node bound with multi-tenant database lookup tools for tenant insights and lead workflows.

#### E. Modular API Routers & Validation Schemas (`backend/schemas/` & `backend/api/`)
* `backend/schemas/__init__.py` — **[Completed]** Pydantic validation contracts initializer.
* `backend/schemas/chat_schema.py` — **[Completed & Verified]** Request and response contracts for standard chat, Server-Sent Events (SSE) streaming payloads, and thread history retrieval.
* `backend/schemas/workspace_schema.py` — **[Completed & Verified]** Validation contracts for user-scoped workspace creation, onboarding, and directory listing.
* `backend/schemas/agent_schema.py` — **[Completed & Verified]** Validation contracts for agent registration, LLM model bindings, system prompts, and encrypted credential updates.
* `backend/api/__init__.py` — **[Completed]** Root API package initializer.
* `backend/api/v1/__init__.py` — **[Completed & Verified]** Central v1 `APIRouter` aggregator mounted into `backend/app.py`.
* `backend/api/v1/chat_routes.py` — **[Completed & Verified]** Modular endpoints for synchronous multi-agent chat, real-time SSE token streaming, and thread conversation history.
* `backend/api/v1/workspace_routes.py` — **[Completed & Verified]** Modular endpoints for multi-tenant workspace creation and user-scoped workspace retrieval.
* `backend/api/v1/agent_routes.py` — **[Completed & Verified]** Modular endpoints for configuring workspace AI agents and storing encrypted provider keys.

#### F. RAG Knowledge & MCP Protocol Layers (`backend/rag/` & `backend/mcp/`)
* `backend/rag/__init__.py`, `backend/rag/ingestion.py`, `backend/rag/vectorstore.py` — **[Scaffolded — Upcoming]** Planned Retrieval-Augmented Generation (RAG) pipeline for PDF/document ingestion, recursive text chunking, and workspace-scoped vector search.
* `backend/mcp/__init__.py`, `backend/mcp/client.py`, `backend/mcp/configs/mcp_config.json` — **[Scaffolded — Upcoming]** Planned Model Context Protocol (MCP) client manager and server registry for connecting external tool ecosystems dynamically.

---

### Frontend Directory (`frontend/`)

* `frontend/package.json` & `frontend/package-lock.json` — **[Completed & Verified]** Defines frontend dependencies including Next.js (App Router & Turbopack), React, TypeScript 6.0, Tailwind CSS, Supabase JS & SSR clients, Axios, and Lucide icons.
* `frontend/next.config.js` — **[Completed & Verified]** Next.js framework runtime configuration.
* `frontend/tailwind.config.js` — **[Completed & Verified]** Custom **Cyber-Obsidian Dark** (`#09090B`) & **Electric Lime** (`#84CC16` / `#A3E635`) design tokens, status colors, custom glow shadows, and pulse animations.
* `frontend/postcss.config.js` — **[Completed & Verified]** PostCSS and Autoprefixer build pipeline configuration.
* `frontend/tsconfig.json` — **[Completed & Verified]** TypeScript 6.0 strict compiler configuration with `@/*` path resolution.
* `frontend/.env.local` — **[Completed]** Local frontend environment configuration connecting to the FastAPI backend (`/api/v1`) and Supabase project.
* `frontend/public/` — **[Scaffolded]** Static brand assets, vector icons, and public media files.

#### A. Global Styles & TypeScript Contracts (`frontend/src/styles/` & `frontend/src/types/`)
* `frontend/src/styles/globals.css` — **[Completed & Verified]** Global dark obsidian base theme, custom scrollbars, Electric Lime selection highlights, and blinking `.streaming-cursor` CSS animation.
* `frontend/src/types/saas.ts` — **[Completed & Verified]** Strict TypeScript interfaces covering Workspaces, Agents, Chat payloads, SSE stream frames, and `managed` vs. `byok` plan types.

#### B. Client Bridges, Supabase Auth & Tenant State (`frontend/src/lib/` & `frontend/src/context/`)
* `frontend/src/lib/api.ts` — **[Completed & Verified]** Typed HTTP API bridge communicating with FastAPI `/api/v1` endpoints for workspaces, agents, chat, and history.
* `frontend/src/lib/sse-stream.ts` — **[Completed & Verified]** `fetch` + `ReadableStream` SSE client parsing real-time agent status badges, token-by-token text chunks, and supporting mid-stream cancellation via `AbortController`.
* `frontend/src/lib/supabase.ts` — **[Completed & Verified]** Supabase browser client supporting email/password auth, 6-digit OTP verification, password recovery, and Google OAuth.
* `frontend/src/lib/session.ts` — **[Completed & Verified]** Client-side session persistence manager tracking active `workspace_id`, `user_id`, and `plan_mode`.
* `frontend/src/context/WorkspaceContext.tsx` — **[Completed & Verified]** Central React state provider synchronizing user-scoped workspaces, active workspace switching, active agent mode, and selected LLM model across all authenticated pages.

#### C. Dashboard Shell Components (`frontend/src/components/layout/`)
* `frontend/src/components/layout/WorkspaceSwitcher.tsx` — **[Completed & Verified]** Tenant-isolated workspace selector dropdown featuring active checkmarks, Managed/BYOK plan badges, and an inline **Create New Workspace** modal.
* `frontend/src/components/layout/Sidebar.tsx` — **[Completed & Verified]** Collapsible Cyber-Obsidian navigation sidebar with responsive mobile drawer support and direct navigation across all SaaS modules.
* `frontend/src/components/layout/Header.tsx` — **[Completed & Verified]** Top operator command header with real-time **Active Agent Mode** switcher, **LLM Model Engine** selector, and live system status indicators.

#### D. Next.js App Router Pages (`frontend/src/app/`)
* `frontend/src/app/layout.tsx` & `frontend/src/app/page.tsx` — **[Completed & Verified]** Root layout configuring `Plus Jakarta Sans` and `JetBrains Mono` typography, dark mode root class, and entry routing to `/login`.
* **Authentication Flow (`frontend/src/app/(auth)/` — Module 02 Completed & Verified):**
  * `frontend/src/app/(auth)/layout.tsx` — Split-screen animated Cyber-Obsidian & Electric Lime showcase layout.
  * `frontend/src/app/(auth)/login/page.tsx` — Tenant-isolated email/password login, Google OAuth login, live FastAPI server health badge, and password recovery navigation.
  * `frontend/src/app/(auth)/register/page.tsx` — Workspace onboarding with auto-slug generator, 6-digit email OTP verification, and **Managed Plan vs. BYOK** selector.
  * `frontend/src/app/(auth)/forgot-password/page.tsx` — Multi-step email OTP verification and password reset wizard.
  * `frontend/src/app/(auth)/change-password/page.tsx` — Authenticated password update screen with a live Electric Lime password strength meter.
* **Protected SaaS Dashboard (`frontend/src/app/(dashboard)/` — Module 03 Shell Completed & Verified):**
  * `frontend/src/app/(dashboard)/layout.tsx` — Protected layout wrapping all dashboard routes with `WorkspaceProvider`, `Sidebar`, and `Header`.
  * `frontend/src/app/(dashboard)/page.tsx` — **[Route Stub — Upcoming]** Executive workspace overview, active agent metrics, and quick actions.
  * `frontend/src/app/(dashboard)/chat/page.tsx` — **[Module 04 — Next Up]** Real-time multi-agent SSE streaming chat interface, tool execution badges, and persistent thread history sidebar.
  * `frontend/src/app/(dashboard)/agents/page.tsx` — **[Route Stub — Upcoming]** Agent Studio for creating custom sub-agents, editing system prompts, and assigning LLM models.
  * `frontend/src/app/(dashboard)/crm/page.tsx` — **[Route Stub — Upcoming]** CRM lead qualification pipeline Kanban board and customer directory.
  * `frontend/src/app/(dashboard)/analytics/page.tsx` — **[Route Stub — Upcoming]** Token usage analytics, latency metrics, and LangSmith trace insights.
  * `frontend/src/app/(dashboard)/pricing/page.tsx` — **[Route Stub — Upcoming]** Subscription plan management and Managed vs. BYOK tier upgrades.
  * `frontend/src/app/(dashboard)/settings/page.tsx` — **[Route Stub — Upcoming]** Workspace settings, AES-256 API Key Vault UI, and guided non-technical integration wizard.

---

## 2. Technology Stack, Installed Libraries & Packages

Every layer of StarEleven AI SaaS is powered by modern, production-tested libraries:

### Backend & API Layer
| Library / Package | Role in StarEleven AI SaaS |
| :--- | :--- |
| **FastAPI** | High-performance asynchronous REST and Server-Sent Events (SSE) web framework powering `/api/v1` modular routers and interactive OpenAPI documentation. |
| **Uvicorn** | ASGI production/development server running the FastAPI application with hot-reload support. |
| **Pydantic** | Strict runtime data validation and serialization for API request/response schemas and structured agent routing outputs. |
| **Python-Dotenv** | Securely loads environment variables and API secrets during local development. |

### Multi-Agent Orchestration & LLM Ecosystem
| Library / Package | Role in StarEleven AI SaaS |
| :--- | :--- |
| **LangGraph** | Stateful cyclic graph orchestration engine powering the central Meta-Agent intent router and conditional sub-agent execution loops. |
| **LangChain Core & Community** | Standardized message abstractions, `@tool` decorators, prompt templates, and model interfaces. |
| **LangChain Groq** | Ultra-low-latency inference integration for Llama 3.3 70B and Mixtral models. |
| **LangChain Google GenAI** | Native integration for Google Gemini Flash and Pro models. |
| **LangChain OpenAI & Anthropic** | Enterprise integrations for GPT-4o, Claude 3.5 Sonnet/Haiku, and OpenRouter-compatible endpoints. |
| **LangSmith** | End-to-end observability, token latency tracking, and execution trace debugging across multi-agent runs. |

### Database, State Persistence & Enterprise Security
| Library / Package | Role in StarEleven AI SaaS |
| :--- | :--- |
| **SQLAlchemy** | Relational ORM managing multi-tenant `Workspaces`, `Users`, and `AgentConfigs` tables in Supabase PostgreSQL. |
| **Psycopg & Psycopg-Pool** | Modern PostgreSQL adapter and connection pooler optimized for Supabase Session Pooler (Port 6543) over IPv4. |
| **LangGraph Checkpoint Postgres** | Persistent PostgreSQL checkpointer (`PostgresSaver`) storing multi-turn thread history and graph state across sessions. |
| **Cryptography (Fernet)** | Symmetric AES-256 encryption engine protecting workspace-level third-party LLM and tool API keys at rest. |
| **Tavily Python** | Real-time AI search SDK enabling the Research Agent to query live web data and synthesize structured insights. |

### Frontend Framework, UI & Authentication
| Library / Package | Role in StarEleven AI SaaS |
| :--- | :--- |
| **Next.js (App Router & Turbopack)** | Full-stack React framework providing route groups (`(auth)` and `(dashboard)`), fast compilation, and optimized production bundling. |
| **React & React DOM** | Component-driven UI runtime powering real-time SSE token rendering and interactive workspace controls. |
| **TypeScript (v6.0)** | End-to-end static type safety across API bridges, SSE stream parsers, workspace contexts, and UI components. |
| **Tailwind CSS, PostCSS & Autoprefixer** | Utility-first styling engine configured with custom Cyber-Obsidian (`#09090B`) and Electric Lime (`#84CC16`) design tokens. |
| **Supabase JS & Supabase SSR** | Official authentication and database SDKs managing user signup, 6-digit OTP verification, Google OAuth, and session tokens. |
| **Lucide React** | Crisp, consistent vector icon system used across the Sidebar, Header, Workspace Switcher, and Auth flows. |
| **Clsx & Tailwind Merge** | Utility helpers for clean conditional styling and conflict-free Tailwind class composition. |
| **Axios** | HTTP client utility supporting structured API requests and interceptors. |

---

## 3. Multi-Agent Architecture & Connected Tools

StarEleven AI SaaS operates through a **Central Meta-Agent Router** that inspects each incoming query and delegates execution to the optimal specialist agent and toolset:

| Agent / Component | Module Path | Connected Tools & Capabilities | Operational Responsibility |
| :--- | :--- | :--- | :--- |
| **Meta-Agent Intent Router** | `backend/agents/router.py` | Structured LLM Classifier (`RouteDecision`), `PostgresSaver` Memory | Evaluates conversational context and user intent to route queries dynamically while persisting thread state. |
| **Deep Research Agent** | `backend/agents/modules/research_agent.py` | `tavily_web_search` (`backend/tools/web_search.py`) | Performs real-time internet searches, gathers competitor/market intelligence, and synthesizes factual reports. |
| **CRM & Workspace Agent** | `backend/agents/modules/crm_agent.py` | `get_workspace_summary`, `list_workspace_agents` (`backend/tools/db_lookup.py`) | Queries Supabase PostgreSQL safely within the active `workspace_id` to report tenant metrics, active agents, and CRM records. |
| **General Assistant Node** | `backend/agents/router.py` | Dynamic Workspace LLM (`llm_factory.py`) | Handles direct reasoning, content drafting, summarization, and general enterprise assistance. |
| **RAG Knowledge Agent** *(Upcoming)* | `backend/rag/` | Vector Similarity Search (`pgvector` / ChromaDB) | Retrieves private organizational knowledge from uploaded PDFs and company documents per workspace. |
| **MCP External Connectors** *(Upcoming)* | `backend/mcp/` | Model Context Protocol Client (`mcp_config.json`) | Connects external third-party MCP tool servers (Google Workspace, Slack, WhatsApp CRM, custom APIs) dynamically. |

---

## 4. Multi-Tenant Workspaces, Security & Plan Modes

### Strict Workspace Isolation (`workspace_id`)
* Every organization operates inside a dedicated workspace (`workspace_id`) linked to authenticated users in Supabase.
* On the frontend, `WorkspaceContext.tsx` and `WorkspaceSwitcher.tsx` ensure that users only see and switch between workspaces belonging to their account, automatically passing `workspace_id` and `X-Workspace-ID` headers to every backend endpoint.
* On the backend, database lookup tools and API routes filter all queries strictly by `workspace_id`, supported by PostgreSQL Row Level Security (RLS) readiness.

### Dual-Mode SaaS Architecture: Managed vs. BYOK
During workspace onboarding (`/register`) or inside workspace settings, organizations choose between two flexible operational modes:
1. **Fully Managed Plan (`managed`):** Organizations run their AI agents immediately using StarEleven's platform-managed LLM infrastructure without needing to manage external API accounts.
2. **BYOK — Bring Your Own Key (`byok`):** Enterprise teams supply their own API keys for **Groq**, **Google Gemini**, **OpenAI**, **Anthropic**, or **OpenRouter**. Keys are immediately encrypted via `backend/services/security.py` using **AES-256 Fernet** before database persistence and decrypted strictly in-memory during active agent execution.

### Branded Authentication & Email Templates
* Powered by **Supabase Auth**, supporting email/password registration, **6-digit email OTP verification**, **Google OAuth**, **OTP password recovery**, and authenticated **Change Password** flows.
* Custom HTML email templates styled in **Cyber-Obsidian Dark & Electric Lime** deliver branded OTP verification codes and workspace activation links.

---

## 5. Development Milestones — Completed vs. Upcoming

### Completed & Verified Milestones
* **Backend Phase 1 — Project Root & Environment Setup:** Standardized `.env.example`, `.gitignore`, and `requirements.txt`.
* **Backend Phase 2 — Supabase PostgreSQL & Checkpointer:** Verified IPv4 Session Pooler connectivity, multi-tenant SQLAlchemy schemas, and LangGraph `PostgresSaver` migrations (`0`–`9`).
* **Backend Phase 3 — Security Vault & Dynamic LLM Factory:** Verified AES-256 Fernet encryption/decryption and multi-provider LLM instantiation.
* **Backend Phase 4 — Agent Tools & Meta-Agent Router:** Verified `tavily_web_search`, tenant-scoped `db_lookup` tools, `research_agent`, `crm_agent`, and `router.py`.
* **Backend Phase 5 — Modular FastAPI `v1` Architecture:** Refactored `app.py` into clean `APIRouter` modules (`chat_routes.py`, `workspace_routes.py`, `agent_routes.py`) and Pydantic schemas, verified end-to-end via Swagger UI.
* **Frontend Module 01 — Foundation & Theme Setup:** Configured Next.js, TypeScript 6.0, Tailwind Cyber-Obsidian & Electric Lime theme, `globals.css`, `saas.ts` types, `api.ts`, and `sse-stream.ts` client.
* **Frontend Module 02 — Complete Authentication Suite:** Built animated `/login`, `/register` (Managed vs. BYOK + OTP), `/forgot-password`, and `/change-password` pages integrated with Supabase Auth.
* **Frontend Module 03 — Enterprise Dashboard Shell:** Built `WorkspaceContext`, `WorkspaceSwitcher` (with Create Workspace modal), collapsible `Sidebar`, `Header` (with Active Agent & LLM Model selectors), and protected `(dashboard)` layout.

### Upcoming Development Roadmap
* **Step 1 — Frontend Module 04 (AI Command Center `/chat`):** Connect the real-time SSE streaming chat UI (`sse-stream.ts`), live tool execution badges, blinking streaming cursor, and persistent thread history sidebar to `/api/v1/chat/stream`.
* **Step 2 — Frontend Module 05 (Agent Studio, CRM Pipeline & Settings Vault):** Build interactive pages for `/agents`, `/crm`, `/analytics`, `/pricing`, and `/settings` (including the AES-256 API Key Vault manager and guided tool integration wizard).
* **Step 3 — RAG Document Pipeline (`backend/rag/`):** Implement workspace-scoped PDF/document upload, chunking, embeddings, and vector retrieval routes.
* **Step 4 — MCP Server Integration (`backend/mcp/`):** Activate external Model Context Protocol servers for plug-and-play enterprise tool expansion.
* **Step 5 — Production Deployment & CI/CD:** Containerize backend and frontend services and enforce production Supabase Row Level Security (RLS) policies.