# StarEleven AI SaaS — Enterprise Multi-Tenant AI Agent Platform

**StarEleven AI SaaS** is an enterprise-grade, multi-tenant Business-to-Business (B2B) AI Agent platform designed to empower organizations with autonomous, specialized AI workflows. Built on a modern, modular full-stack architecture, the platform combines a **FastAPI** backend, **LangGraph** multi-agent orchestration, **Supabase PostgreSQL** persistent memory, **Model Context Protocol (MCP)** readiness, and a **Next.js** web application.

The platform enables businesses to manage isolated workspaces, dynamically switch across leading Large Language Model (LLM) providers, protect sensitive credentials with enterprise encryption, and deploy specialized AI agents for live research, Customer Relationship Management (CRM), and conversational automation.

---

## Step 1: Project Vision & Core Capabilities

StarEleven AI SaaS is engineered to solve real-world enterprise automation needs by separating business logic, security, memory, and agent intelligence into clean, maintainable layers:

* **Strict Multi-Tenant Workspace Isolation:** Every organization operates inside an isolated workspace (`workspace_id`), enforced at the PostgreSQL database level using Supabase **Row Level Security (RLS)** policies.
* **Enterprise Key Vault Security:** All workspace-level third-party API keys and secrets are encrypted at rest using **AES-256 Fernet symmetric encryption** and decrypted dynamically only during active model execution.
* **Dynamic Multi-LLM Provider Factory:** Workspaces and individual requests can seamlessly switch between **Google Gemini**, **Groq**, **OpenAI**, **Anthropic**, and **OpenRouter** without modifying core agent workflows.
* **Intelligent Meta-Agent Routing:** Powered by **LangGraph**, a central intent router evaluates incoming user queries and delegates tasks to specialized sub-agents (General Assistant, Deep Research Agent, or CRM Workspace Agent).
* **Persistent Thread Memory & Checkpointing:** Full conversational state and multi-turn thread history are persisted in PostgreSQL using LangGraph's `PostgresSaver` checkpointer, allowing users to resume conversations reliably across sessions.
* **Real-Time Streaming & Observability:** Supports Server-Sent Events (SSE) for real-time token streaming to the frontend alongside end-to-end execution tracing via **LangSmith**.

---

## Step 2: System Architecture Overview

The platform is structured into four decoupled architectural tiers:

1. **Presentation Layer (Next.js Frontend):** A modular App Router dashboard supporting authentication, real-time streaming chat, agent configuration, CRM views, analytics, and subscription management.
2. **API & Schema Gateway (FastAPI Modular Routers):** A slim application entrypoint backed by versioned `APIRouter` modules and strict Pydantic request/response schemas.
3. **Agentic Orchestration & Services Layer (LangGraph + Core Services):** Houses the Meta-Agent intent router, specialized sub-agent nodes, external tools, AES-256 security vault, and dynamic multi-LLM factory.
4. **Persistence & Security Layer (Supabase PostgreSQL):** Manages multi-tenant relational tables (`Workspaces`, `Users`, `AgentConfigs`) alongside LangGraph checkpoint tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`).

---

## Step 3: Development Progress — Completed & Verified Modules

Significant foundational and core backend milestones have already been built, integrated, and verified through automated diagnostics and live API testing:

* **Phase 1 — Project Root & Environment Configuration (Completed):** Standardized dependency management, environment variable templates, and version control exclusions.
* **Phase 2 — Database & Persistence Engine (Completed & Verified):** Configured Supabase PostgreSQL IPv4 Session Pooler connectivity, multi-tenant SQLAlchemy ORM schemas, and LangGraph `PostgresSaver` state checkpointer. Verified via a 3-stage automated diagnostic suite.
* **Phase 3 — Security Vault & Dynamic LLM Factory (Completed & Verified):** Built and tested AES-256 Fernet encryption/decryption services with fallback sanitization, plus dynamic multi-provider LLM instantiation.
* **Phase 4 — Tools & Multi-Agent LangGraph Workflow (Completed & Verified):** Implemented live web search tooling (Tavily), multi-tenant workspace database lookup tools, shared agent state definitions, specialized Research and CRM sub-agents, and the central Meta-Agent intent router.
* **Phase 5 — FastAPI Server & Modular API Refactoring (Completed & Tested):** Verified live chat, streaming, and thread history endpoints via Swagger UI, and structured the API into clean, modular routers and schemas.
* **Phase 6 — Frontend Package Initialization (Initialized):** Configured `frontend/package.json` with core Next.js, React, TypeScript, Tailwind CSS, and Supabase client dependencies.

---

## Step 4: Complete Folder & File Directory Breakdown

Below is a comprehensive breakdown of every folder and file created in the repository, detailing its architectural role and current implementation status.

### A. Root Directory (`StarElevenAI_Saas_Project/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `README.md` | **Completed** | Master project documentation covering architecture, development milestones, directory structure, and roadmap. |
| `.env.example` | **Completed** | Blueprint of all required environment variables for database pooling, encryption keys, LLM providers, search tools, JWT auth, and LangSmith tracing. |
| `.gitignore` | **Completed** | Protects sensitive files (`.env`), virtual environments, Python build artifacts, and frontend dependencies from accidental exposure. |
| `requirements.txt` | **Completed** | Defines all Python backend packages including FastAPI, Uvicorn, LangGraph, LangChain, SQLAlchemy, Psycopg, Cryptography, and Tavily. |

---

### B. Backend Core & Configuration (`backend/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `backend/__init__.py` | **Completed** | Initializes `backend` as a structured Python package for clean cross-module imports. |
| `backend/app.py` | **Completed & Tested** | Slim FastAPI application entrypoint that initializes the web server, configures CORS policies, and mounts versioned API routers. |
| `backend/config.py` | **Completed** | Centralizes application configuration and activates LangSmith observability and tracing parameters. |

---

### C. Database & State Persistence Layer (`backend/database/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `backend/database/__init__.py` | **Completed** | Package initializer exposing database session utilities and models. |
| `backend/database/connection.py` | **Completed & Verified** | Configures the SQLAlchemy engine and session factory for Supabase PostgreSQL (Port 6543 Session Pooler) with `psycopg` dialect routing and SSL security. |
| `backend/database/models.py` | **Completed & Verified** | Defines multi-tenant relational database tables (`Workspaces`, `Users`, and `AgentConfigs`) with UUID primary keys and tenant isolation relationships. |
| `backend/database/checkpointer.py` | **Completed & Verified** | Initializes LangGraph's `PostgresSaver` backed by PostgreSQL connection pooling to automatically persist conversation checkpoints and thread state. |
| `backend/database/test_connection.py` | **Completed & Verified** | Automated 3-step system diagnostic runner that verifies database connectivity, ORM table synchronization, and checkpointer migration readiness. |

---

### D. Enterprise Security & LLM Services (`backend/services/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `backend/services/__init__.py` | **Completed** | Package initializer for core backend business services. |
| `backend/services/security.py` | **Completed & Verified** | Implements the AES-256 Fernet encryption vault to encrypt plain-text API keys before database storage and decrypt them safely at runtime. |
| `backend/services/llm_factory.py` | **Completed & Verified** | Dynamic Multi-LLM factory service that instantiates chat models across Google Gemini, Groq, OpenAI, Anthropic, and OpenRouter based on workspace settings. |
| `backend/services/auth_service.py` | **Scaffolded (Upcoming)** | Dedicated service for JWT authentication token generation, verification, and tenant membership validation. |

---

### E. Agent Tools Layer (`backend/tools/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `backend/tools/__init__.py` | **Completed** | Package initializer for LangChain/LangGraph agent tools. |
| `backend/tools/web_search.py` | **Completed & Verified** | Live web research tool powered by the Tavily API, enabling agents to retrieve current market trends, competitor data, and external facts. |
| `backend/tools/db_lookup.py` | **Completed & Verified** | Multi-tenant database lookup tool enabling the CRM agent to inspect workspace summaries and active agent configurations safely within tenant boundaries. |

---

### F. Multi-Agent Orchestration Layer (`backend/agents/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `backend/agents/__init__.py` | **Completed** | Package initializer for the multi-agent workflow engine. |
| `backend/agents/base.py` | **Completed & Verified** | Defines the shared LangGraph `AgentState` and Pydantic structured routing schemas used to pass context and routing decisions across nodes. |
| `backend/agents/router.py` | **Completed & Verified** | Central Meta-Agent intent router compiled with LangGraph `StateGraph` and `PostgresSaver`, classifying user intent and routing execution to the right sub-agent. |
| `backend/agents/modules/__init__.py` | **Completed** | Package initializer for specialized sub-agent modules. |
| `backend/agents/modules/research_agent.py` | **Completed & Verified** | Specialized Research Agent node equipped with web search capabilities to synthesize factual, up-to-date answers. |
| `backend/agents/modules/crm_agent.py` | **Completed & Verified** | Specialized CRM & Workspace Agent node equipped with database lookup tools to handle tenant-specific workspace and lead queries. |

---

### G. Modular API Routers & Data Schemas (`backend/schemas/` & `backend/api/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `backend/schemas/__init__.py` | **Completed** | Package initializer for Pydantic validation contracts. |
| `backend/schemas/chat_schema.py` | **Completed** | Request and response schemas for standard chat, SSE streaming payloads, and conversation thread history. |
| `backend/schemas/workspace_schema.py` | **Completed** | Validation contracts for creating, updating, and listing multi-tenant workspaces. |
| `backend/schemas/agent_schema.py` | **Completed** | Validation contracts for configuring workspace AI agents, selecting LLM providers, and submitting API keys. |
| `backend/api/__init__.py` | **Completed** | Root API package initializer. |
| `backend/api/v1/__init__.py` | **Completed** | Version 1 central router aggregator that combines all domain sub-routers for `backend/app.py`. |
| `backend/api/v1/chat_routes.py` | **Completed** | Modular endpoints handling synchronous chat execution, real-time SSE token streaming, and thread history retrieval. |
| `backend/api/v1/workspace_routes.py` | **Completed** | Modular endpoints for multi-tenant workspace creation and workspace directory retrieval. |
| `backend/api/v1/agent_routes.py` | **Completed** | Modular endpoints for managing agent configurations and encrypted provider credentials per workspace. |

---

### H. Model Context Protocol & RAG Layers (`backend/mcp/` & `backend/rag/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `backend/mcp/client.py` | **Scaffolded (Upcoming)** | Planned Model Context Protocol (MCP) client manager for connecting external tool servers dynamically. |
| `backend/mcp/configs/mcp_config.json` | **Scaffolded (Upcoming)** | Configuration registry defining external MCP tool server endpoints and capabilities. |
| `backend/rag/` | **Scaffolded (Upcoming)** | Planned Retrieval-Augmented Generation (RAG) pipeline for document ingestion, chunking, vector embeddings, and private knowledge retrieval. |

---

### I. Frontend Web Application (`frontend/`)

| File / Folder | Status | Purpose & Responsibility |
| :--- | :--- | :--- |
| `frontend/package.json` | **Completed** | Defines frontend dependencies including Next.js 14, React 18, TypeScript, Tailwind CSS, Axios, Supabase JS, and Lucide icons. |
| `frontend/public/` | **Scaffolded (Upcoming)** | Static public assets including logos, icons, and media files. |
| `frontend/src/app/(auth)/login/` | **Scaffolded (Upcoming)** | User login page and session authentication flow. |
| `frontend/src/app/(auth)/register/` | **Scaffolded (Upcoming)** | New user registration and initial workspace onboarding flow. |
| `frontend/src/app/(dashboard)/chat/` | **Scaffolded (Upcoming)** | Primary multi-agent chat workspace featuring real-time SSE streaming responses and thread history navigation. |
| `frontend/src/app/(dashboard)/agents/` | **Scaffolded (Upcoming)** | Agent management interface for configuring models, system prompts, and encrypted API keys. |
| `frontend/src/app/(dashboard)/crm/` | **Scaffolded (Upcoming)** | CRM dashboard for viewing leads, customer interactions, and agent-assisted insights. |
| `frontend/src/app/(dashboard)/analytics/` | **Scaffolded (Upcoming)** | Usage analytics dashboard tracking token consumption, agent routing metrics, and workspace activity. |
| `frontend/src/app/(dashboard)/pricing/` | **Scaffolded (Upcoming)** | Subscription plans, usage quotas, and billing management interface. |
| `frontend/src/app/(dashboard)/settings/` | **Scaffolded (Upcoming)** | Workspace settings, team access controls, and security preferences. |
| `frontend/src/components/` (`ui/`, `layout/`, `chat/`) | **Scaffolded (Upcoming)** | Modular React UI components, dashboard navigation shells, and streaming chat message bubbles. |
| `frontend/src/lib/`, `types/`, `styles/` | **Scaffolded (Upcoming)** | Typed API client helpers, shared TypeScript interfaces, and global Tailwind CSS styling. |

---

## Step 5: Step-by-Step Operational Workflow

1. **Environment & Secret Initialization:** Sensitive credentials (Supabase database URL, Fernet encryption secret, LLM API keys, and LangSmith keys) are loaded securely from the local environment configuration.
2. **Database & Checkpointer Verification:** The diagnostic suite validates PostgreSQL connectivity, ensures multi-tenant ORM tables exist, and verifies LangGraph's 10 internal checkpoint migration steps (`0` through `9`).
3. **API Gateway Activation:** The FastAPI backend launches and exposes interactive OpenAPI documentation alongside modular REST and SSE endpoints.
4. **Multi-Agent Execution Flow:**
   * A user sends a message tied to a `workspace_id` and `thread_id`.
   * The security vault decrypts the workspace's configured LLM key and initializes the chosen model via the LLM factory.
   * LangGraph loads prior conversation history from PostgreSQL using `thread_id`.
   * The Meta-Agent router classifies intent and routes execution to General Chat, the Research Agent (Tavily search), or the CRM Agent (Supabase lookup).
   * The response streams back to the client in real time while the updated conversation state is checkpointed to PostgreSQL.

---

## Step 6: Upcoming Development Roadmap

* **Step 1 — Modular API Verification:** Run end-to-end verification across all separated v1 routes (`chat_routes.py`, `workspace_routes.py`, and `agent_routes.py`).
* **Step 2 — RAG Knowledge Base Pipeline (`backend/rag/`):** Build document upload, text chunking, embedding generation, and vector similarity search scoped by workspace.
* **Step 3 — MCP Server Integration (`backend/mcp/`):** Connect external Model Context Protocol servers to expand agent tool capabilities dynamically.
* **Step 4 — Authentication & RLS Enforcement (`auth_service.py`):** Implement full JWT authentication middleware and activate PostgreSQL Row Level Security policies in Supabase.
* **Step 5 — Next.js Frontend Dashboard (`frontend/`):** Build the interactive SaaS dashboard UI connected to the FastAPI streaming endpoints.