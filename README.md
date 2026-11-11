# 🌟 StarEleven AI SaaS - Enterprise Multi-Tenant AI Agent Platform

StarEleven AI SaaS is a production-grade, multi-tenant B2B AI Agent application built with a high-performance modern tech stack: **FastAPI** backend engine, **LangGraph** workflow agent orchestrator, **Supabase PostgreSQL** for persistent memory state, **Model Context Protocol (MCP)** for tool execution, and **Next.js** for the frontend UI.

The platform features workspace-level dynamic multi-LLM provider switching (**Google Gemini, Groq, OpenAI, Anthropic, OpenRouter**), end-to-end secret key encryption, and strict database-level tenant isolation using PostgreSQL **Row Level Security (RLS)**.

---

## 📐 Architecture Overview

```text
                               +-----------------------------+
                               |     Next.js Frontend UI     |
                               | (App Router / Tailwind CSS) |
                               +--------------+--------------+
                                              |
                                              v (REST API / SSE Streaming)
                               +--------------+--------------+
                               |       FastAPI Backend       |
                               +--------------+--------------+
                                              |
      +---------------------------------------+---------------------------------------+
      |                                       |                                       |
      v                                       v                                       v
+-------------------+               +-------------------+                   +-------------------+
| Dynamic LLM       |               | LangGraph Engine  |                   | Security Vault    |
| Factory Service   |               | (PostgresSaver &  |                   | (AES-256 Fernet   |
| (Gemini/Groq/     |               | State Persistence)|                   | Secret Storage)   |
| OpenAI/Anthropic) |               +---------+---------+                   +-------------------+
+-------------------+                         |
                                              v
                               +--------------+--------------+
                               | Supabase PostgreSQL Database|
                               | (Session Pooler / Port 6543 |
                               |  Row Level Security (RLS)   |
                               +-----------------------------+
```

---

## 🔥 Key Enterprise Features

- 🏢 **Multi-Tenant Data Isolation**: Enforced at the PostgreSQL database layer via Supabase **Row Level Security (RLS)** policies scoped by `workspace_id`.
- 🔐 **AES-256 Key Vault Encryption**: End-to-end symmetric encryption (`cryptography` Fernet) for all user API keys, external tools, and system secrets stored in the database.
- 🤖 **Dynamic Multi-LLM Provider Factory**: Instant workspace-level or request-level model switching across **Google Gemini**, **Groq**, **OpenAI**, **Anthropic**, and **OpenRouter**.
- 🔄 **LangGraph State Checkpointer**: Seamless session persistence and state checkpointer backed by `psycopg_pool` connection management.
- 🧪 **Automated System Verification Suite**: Integrated 3-stage diagnostic runner (`backend/database/test_connection.py`) to verify engine health, ORM schema synchronization, and checkpointer viability.

---

## 📁 Repository Directory Structure

```text
StarElevenAI_Saas_Project/
├── backend/
│   ├── app.py                     # FastAPI application entrypoint & API routes
│   ├── config.py                  # Environment settings & LangSmith tracing config
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py          # SQLAlchemy Session Engine (psycopg dialect auto-routing)
│   │   ├── models.py              # Multi-tenant ORM Schemas (Workspace, User, AgentConfig)
│   │   ├── checkpointer.py        # LangGraph PostgresSaver checkpointer setup
│   │   └── test_connection.py     # System diagnostic verification script
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py                # Agent state definitions & Pydantic models
│   │   ├── router.py              # Central Meta-Agent intent router workflow
│   │   └── modules/
│   │       ├── __init__.py
│   │       ├── research_agent.py  # Deep research & web tool agent node
│   │       └── crm_agent.py       # Lead qualification & CRM agent node
│   ├── services/
│   │   ├── __init__.py
│   │   ├── security.py            # AES-256 Fernet key encryption & decryption service
│   │   ├── llm_factory.py         # Dynamic Multi-LLM provider instantiation service
│   │   └── auth_service.py        # JWT auth & tenant validation service
│   ├── mcp/                       # Model Context Protocol integration
│   │   ├── client.py              # MCP client manager
│   │   └── configs/mcp_config.json
│   ├── tools/                     # System tools (Web search, DB query tools)
│   └── rag/                       # Document ingestion & vectorstore services
├── frontend/                      # Next.js App Router Frontend UI
├── .env.example                   # Environment configuration template
├── .gitignore                     # Version control exclusions
├── requirements.txt               # Backend Python dependencies
└── README.md                      # Project documentation
```

---

## 🛠️ Complete Setup & Installation Guide

### 1. Prerequisites
- **Python**: Version 3.11+
- **Node.js**: Version 18+
- **Supabase Account**: Managed PostgreSQL instance with IPv4 pooler enabled

### 2. Environment Setup
Clone the repository and initialize the Python virtual environment:

```bash
git clone https://github.com/faisalmehmoodgillani/StarElevenAI_Saas_Project.git
cd StarElevenAI_Saas_Project

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

### 3. Environment Variable Configuration (`.env`)
Create a `.env` file in the root directory based on `.env.example`:

```env
# Supabase PostgreSQL Connection String (Port 6543 Session Pooler)
# Note: Special characters in passwords must be percent-encoded (e.g., ! becomes %21)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[ENCODED-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"

# Key Encryption Secret (Generate via Fernet.generate_key())
ENCRYPTION_KEY="your-32-byte-base64-fernet-key"

# Default System LLM Provider API Keys
GROQ_API_KEY="gsk_..."
GOOGLE_API_KEY="AIzaSy..."
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
OPENROUTER_API_KEY="sk-or-..."

# JWT Security Credentials
JWT_SECRET="super-secret-jwt-key"
JWT_ALGORITHM="HS256"

# LangSmith Tracing Setup
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY="lsv2_pt_..."
LANGSMITH_PROJECT="StarElevenAI_Saas_Project"
```

---

## 🧪 System Diagnostics Execution

To verify database engine connectivity, table synchronization, and state saver checkpointer status, run the test script:

```bash
python backend/database/test_connection.py
```

### Successful Output Example:
```text
============================================================
StarEleven AI SaaS Project - System Diagnostics & Verification
============================================================

[1/3] Testing Direct Supabase PostgreSQL Connection...
 SUCCESS: Connected to Supabase PostgreSQL.
 Engine Version: PostgreSQL 15.x ...

[2/3] Verifying Multi-Tenant Relational Schemas (Tables)...
 SUCCESS: Database schemas verified and synced (Workspaces, Users, AgentConfigs).

[3/3] Testing LangGraph State Persistence Checkpointer...
 SUCCESS: LangGraph PostgresSaver checkpointer initialized and table structure setup completed.

============================================================
ALL SYSTEM CONNECTIONS VERIFIED SUCCESSFULLY! READY FOR DEVELOPMENT.
============================================================
```

---

## 🔒 Security Architecture & RLS Enforcements

### 1. Row Level Security (RLS) Policy
To enforce multi-tenant workspace isolation at the PostgreSQL layer, run the following SQL policy in Supabase SQL Editor:

```sql
-- Enable Row Level Security on core application tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;

-- Enforce Workspace Isolation
CREATE POLICY workspace_isolation_policy ON agent_configs
    FOR ALL
    USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
```

### 2. Secret Key Encryption Strategy
API keys are encrypted using AES-256 prior to database persistence and decrypted dynamically at runtime:

- **Write Path**: Frontend -> FastAPI -> `encrypt_api_key(plain_key)` -> Stored in Supabase `agent_configs.encrypted_api_key`.
- **Execution Path**: DB Query -> `decrypt_api_key(encrypted_key)` -> `llm_factory.py` -> LangChain Provider Instance.

---

## 🚀 Running the Application Servers

### Start FastAPI Backend:
```bash
uvicorn backend.app:app --reload --port 8000
```
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### Start Next.js Frontend UI:
```bash
cd frontend
npm install
npm run dev
```
- Dashboard Interface: `http://localhost:3000`



<!-- 1. Final Modular Project Layout

StarElevenAI_Saas_Project/
├── .env.example                       # API Keys & DB Config Template
├── .gitignore                         # Git exclusion rules
├── requirements.txt                   # Backend dependencies
├── README.md                          # Main project documentation
│
├── backend/                           # FASTAPI BACKEND CORE
│   ├── app.py                         # Main FastAPI app & SSE streaming endpoints
│   ├── config.py                      # System settings & LangSmith tracing init
│   │
│   ├── database/                      # DATABASE & STATE PERSISTENCE
│   │   ├── __init__.py
│   │   ├── connection.py              # Supabase PostgreSQL engine
│   │   ├── models.py                  # SQLAlchemy schemas (Workspaces, Users, Agents)
│   │   └── checkpointer.py            # LangGraph Postgres State Saver
│   │
│   ├── agents/                        # MULTI-AGENT ARCHITECTURE
│   │   ├── __init__.py
│   │   ├── base.py                    # Base agent state & graph templates
│   │   ├── router.py                  # Meta-Agent / Central Intent Router
│   │   └── modules/                   # Specialized Sub-Agents
│   │       ├── __init__.py
│   │       ├── research_agent.py      # Web & RAG Deep Research Agent
│   │       └── crm_agent.py           # Lead Qualification & Pipeline Agent
│   │
│   ├── mcp/                           # MODEL CONTEXT PROTOCOL (MCP) INTEGRATION
│   │   ├── __init__.py
│   │   ├── client.py                  # MCP Client Manager & Tool Sync
│   │   └── configs/
│   │       └── mcp_config.json        # MCP Server endpoints configuration
│   │
│   ├── tools/                         # AGENT TOOLS & UTILITIES
│   │   ├── __init__.py
│   │   ├── web_search.py              # Tavily web search tool integration
│   │   └── db_tools.py                # Business DB lookup tools
│   │
│   ├── rag/                           # RETRIEVAL AUGMENTED GENERATION
│   │   ├── __init__.py
│   │   ├── ingestion.py               # Document loader & recursive chunker
│   │   └── vectorstore.py             # ChromaDB / Supabase pgvector store
│   │
│   └── services/                      # SAAS BUSINESS LOGIC
│       ├── __init__.py
│       ├── auth_service.py            # JWT / Supabase Auth validator
│       └── tenant_service.py          # Multi-tenant workspace data isolation (`tenant_id`)
│
└── frontend/                          # NEXT.JS / REACT FRONTEND UI
    ├── package.json                   # NPM dependencies
    ├── next.config.js                 # Framework configuration
    ├── tailwind.config.js             # Electric Lime (`#84CC16`) UI Theme
    ├── .env.local                     # Local Frontend Env Variables
    │
    ├── public/                        # Static assets & logos
    │   └── logo.svg
    │
    └── src/
        ├── app/                       # NEXT.JS APP ROUTER
        │   ├── layout.tsx             # Root layout & theme providers
        │   ├── page.tsx               # Landing page / Auth redirect
        │   │
        │   ├── (auth)/                # AUTHENTICATION FLOW
        │   │   ├── login/page.tsx     # User & Workspace Login
        │   │   └── register/page.tsx  # Workspace Signup / Onboarding
        │   │
        │   └── (dashboard)/           # SAAS DASHBOARD CORE
        │       ├── layout.tsx         # App Shell (Sidebar, Workspace Switcher)
        │       ├── page.tsx           # Dashboard Overview & Stats
        │       ├── chat/page.tsx      # Real-time Multi-Agent SSE Streaming Chat
        │       ├── agents/page.tsx    # Agents Catalog & Studio Builder
        │       ├── crm/page.tsx       # Lead Pipeline & Customer Management
        │       ├── analytics/page.tsx # Token Usage, Costs & Agent Logs
        │       ├── pricing/page.tsx   # SaaS Subscription & Pricing Plans
        │       └── settings/page.tsx  # Workspace & API Key Vault
        │
        ├── components/                # UI COMPONENTS
        │   ├── ui/                    # Electric Lime Buttons, Cards, Badges
        │   ├── layout/                # Sidebar, Header, Workspace Switcher
        │   └── chat/                  # Message Bubbles, Tool Indicators, Streaming Cursor
        │
        ├── lib/                       # API CLIENTS & SSE UTILS
        │   ├── api.ts                 # Axios / Fetch HTTP Client
        │   ├── sse-stream.ts          # Server-Sent Events Reader
        │   └── supabase.ts            # Supabase Auth Client
        │
        ├── types/                     # TYPESCRIPT SCHEMAS
        │   ├── agent.ts               # Agent state definitions
        │   ├── chat.ts                # Message & event types
        │   └── tenant.ts              # Workspace & Tenant schemas
        │
        └── styles/                    # GLOBAL STYLES
            └── globals.css            # Tailwind Obsidian + Lime CSS
```

2. Terminal Creation Command (One-Click Setup)

# 1. Sabhi Directories Create Karein
mkdir -p backend/database backend/agents/modules backend/mcp/configs backend/tools backend/rag backend/services frontend/public frontend/src/app/\(auth\)/login frontend/src/app/\(auth\)/register frontend/src/app/\(dashboard\)/chat frontend/src/app/\(dashboard\)/agents frontend/src/app/\(dashboard\)/crm frontend/src/app/\(dashboard\)/analytics frontend/src/app/\(dashboard\)/pricing frontend/src/app/\(dashboard\)/settings frontend/src/components/ui frontend/src/components/layout frontend/src/components/chat frontend/src/lib frontend/src/types frontend/src/styles

# 2. Root Files Create Karein
touch .env.example .gitignore requirements.txt README.md

# 3. Backend Files Create Karein
touch backend/app.py backend/config.py
touch backend/database/__init__.py backend/database/connection.py backend/database/models.py backend/database/checkpointer.py
touch backend/agents/__init__.py backend/agents/base.py backend/agents/router.py
touch backend/agents/modules/__init__.py backend/agents/modules/research_agent.py backend/agents/modules/crm_agent.py
touch backend/mcp/__init__.py backend/mcp/client.py backend/mcp/configs/mcp_config.json
touch backend/tools/__init__.py backend/tools/web_search.py backend/tools/db_tools.py
touch backend/rag/__init__.py backend/rag/ingestion.py backend/rag/vectorstore.py
touch backend/services/__init__.py backend/services/auth_service.py backend/services/tenant_service.py

# 4. Frontend Files Create Karein
touch frontend/package.json frontend/next.config.js frontend/tailwind.config.js frontend/.env.local
touch frontend/src/app/layout.tsx frontend/src/app/page.tsx
touch frontend/src/app/\(auth\)/login/page.tsx frontend/src/app/\(auth\)/register/page.tsx
touch frontend/src/app/\(dashboard\)/layout.tsx frontend/src/app/\(dashboard\)/page.tsx frontend/src/app/\(dashboard\)/chat/page.tsx frontend/src/app/\(dashboard\)/agents/page.tsx frontend/src/app/\(dashboard\)/crm/page.tsx frontend/src/app/\(dashboard\)/analytics/page.tsx frontend/src/app/\(dashboard\)/pricing/page.tsx frontend/src/app/\(dashboard\)/settings/page.tsx
touch frontend/src/lib/api.ts frontend/src/lib/sse-stream.ts frontend/src/lib/supabase.ts
touch frontend/src/types/agent.ts frontend/src/types/chat.ts frontend/src/types/tenant.ts
touch frontend/src/styles/globals.css -->