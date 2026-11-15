"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  Sparkles,
  Plug,
  Plus,
  ShieldCheck,
  Wrench,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  Globe,
  Mail,
  Server,
  KeyRound,
  RefreshCw,
  MessageSquare,
  Power,
  Unplug,
  Layers,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_BASE_URL } from "@/lib/api";
import {
  IndustrySkillTemplate,
  WorkspaceAgentItem,
  WorkspaceConnector,
} from "@/types/agents";
import { ConnectorConfigModal } from "@/components/agents/ConnectorConfigModal";
import { AgentBuilderModal } from "@/components/agents/AgentBuilderModal";

type StudioTab = "agents" | "skills" | "connectors";

export default function AgentsStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeWorkspace } = useWorkspace();

  const workspaceId =
    activeWorkspace?.id || activeWorkspace?.workspace_id || "";
  const workspaceName = activeWorkspace?.name || "StarEleven Workspace";

  const [activeTab, setActiveTab] = useState<StudioTab>("agents");
  const [agents, setAgents] = useState<WorkspaceAgentItem[]>([]);
  const [skills, setSkills] = useState<IndustrySkillTemplate[]>([]);
  const [connectors, setConnectors] = useState<WorkspaceConnector[]>([]);
  const [workspaceIndustry, setWorkspaceIndustry] = useState<string>("agency");

  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<WorkspaceAgentItem | null>(
    null
  );
  const [activeConnectorModal, setActiveConnectorModal] =
    useState<WorkspaceConnector | null>(null);

  // Connector category filter
  const [connectorFilter, setConnectorFilter] = useState<string>("all");

  // Handle Google OAuth redirect feedback & ?tab= query param
  useEffect(() => {
    const tabParam = searchParams?.get("tab") as StudioTab | null;
    if (tabParam && ["agents", "skills", "connectors"].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const connected = searchParams?.get("connected");
    const oauthError = searchParams?.get("oauth_error");

    if (connected === "google_workspace") {
      setActiveTab("connectors");
      setBanner({
        type: "success",
        text: "Google Workspace (Gmail + Calendar) connected successfully via 1-Click OAuth!",
      });
      router.replace("/agents?tab=connectors");
    } else if (oauthError) {
      setActiveTab("connectors");
      setBanner({
        type: "error",
        text: `Google OAuth connection interrupted (${oauthError}). Please try again.`,
      });
      router.replace("/agents?tab=connectors");
    }
  }, [searchParams, router]);

  const loadStudioData = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);

    try {
      const [agentsRes, skillsRes, connectorsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/agents-studio/${workspaceId}`),
        fetch(`${API_BASE_URL}/api/v1/agents-studio/skills/${workspaceId}`),
        fetch(`${API_BASE_URL}/api/v1/connectors/catalog/${workspaceId}`),
      ]);

      if (agentsRes.ok) {
        const aData = await agentsRes.json();
        setAgents(aData.agents || []);
      }
      if (skillsRes.ok) {
        const sData = await skillsRes.json();
        setSkills(sData.skills || []);
        if (sData.workspace_industry) {
          setWorkspaceIndustry(sData.workspace_industry);
        }
      }
      if (connectorsRes.ok) {
        const cData = await connectorsRes.json();
        setConnectors(cData.connectors || []);
      }
    } catch {
      setBanner({
        type: "error",
        text: "Could not load Agent Studio data. Please verify backend connection.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadStudioData();
  }, [loadStudioData]);

  // 1-Click Google Workspace OAuth Starter
  const handleConnectGoogleWorkspace = async () => {
    if (!workspaceId) return;
    setBusyId("google_workspace");
    setBanner(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/connectors/google/connect?workspace_id=${encodeURIComponent(
          workspaceId
        )}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.auth_url) {
        throw new Error(
          data.detail || "Unable to initiate Google Workspace OAuth."
        );
      }
      window.location.href = data.auth_url;
    } catch (err: unknown) {
      setBanner({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Google Workspace OAuth failed to start.",
      });
      setBusyId(null);
    }
  };

  // Disconnect external connector
  const handleDisconnectConnector = async (connectorId: string) => {
    if (!workspaceId) return;
    setBusyId(`disc_${connectorId}`);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/connectors/${workspaceId}/${connectorId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setBanner({
          type: "success",
          text: `Disconnected '${connectorId}' and wiped encrypted credentials.`,
        });
        await loadStudioData();
      }
    } finally {
      setBusyId(null);
    }
  };

  // Probe Remote MCP Server tools
  const handleProbeMcpTools = async (connectorId: string) => {
    if (!workspaceId) return;
    setBusyId(`probe_${connectorId}`);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/agents-studio/discover-mcp/${workspaceId}/${connectorId}`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const discoveredList = data?.discovered?.tools || [];
        setBanner({
          type: "success",
          text: `Probed MCP server: ${discoveredList.length} tool(s) discovered & cached.`,
        });
        await loadStudioData();
      } else {
        setBanner({
          type: "error",
          text: data.detail || "MCP probe failed.",
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  // 1-Click Deploy Industry Skill Template
  const handleDeploySkill = async (skill: IndustrySkillTemplate) => {
    if (!workspaceId) return;
    setBusyId(skill.skill_id);
    setBanner(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/agents-studio/deploy-skill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaceId,
            skill_id: skill.skill_id,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Failed to deploy skill template.");
      }

      setBanner({
        type: "success",
        text: `Deployed '${skill.name}'! You can now pin it in AI Command Center.`,
      });
      setActiveTab("agents");
      await loadStudioData();
    } catch (err: unknown) {
      setBanner({
        type: "error",
        text:
          err instanceof Error ? err.message : "Skill deployment failed.",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Toggle Agent Active / HITL state
  const handleQuickPatchAgent = async (
    agent: WorkspaceAgentItem,
    patch: { is_active?: boolean; hitl_enabled?: boolean }
  ) => {
    if (!workspaceId) return;
    setBusyId(agent.id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/agents-studio/${workspaceId}/${agent.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? data.agent : a))
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  // Delete Agent
  const handleDeleteAgent = async (agent: WorkspaceAgentItem) => {
    if (!workspaceId) return;
    setBusyId(`del_${agent.id}`);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/agents-studio/${workspaceId}/${agent.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== agent.id));
        setBanner({
          type: "success",
          text: `Removed '${agent.name}' from workspace.`,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const connectedCount = connectors.filter((c) => c.is_connected).length;
  const activeAgentsCount = agents.filter((a) => a.is_active).length;

  const connectorNameMap = Object.fromEntries(
    connectors.map((c) => [c.connector_id, c.name])
  );

  const filteredConnectors = connectors.filter((c) => {
    if (connectorFilter === "all") return true;
    return c.auth_type === connectorFilter;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Executive Studio Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#121215] via-[#151812] to-[#121215] p-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#84CC16] shadow-[0_0_10px_#84CC16]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">
              Agent Studio &amp; MCP Orchestrator
            </span>
            <span className="rounded-md border border-zinc-800 bg-[#09090B] px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
              Industry: {workspaceIndustry.replace("_", " ")}
            </span>
          </div>
          <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
            {workspaceName} — Autonomous Workforce
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
            Connect 1-click OAuth apps or Remote MCP servers, deploy
            industry-tuned AI specialists, and pin them to any chat session with
            Human-in-the-Loop approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#09090B] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#84CC16]" />
            Open Command Center
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAgent(null);
              setIsBuilderOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2.5 text-xs font-bold text-[#09090B] shadow-lg shadow-[#84CC16]/20 transition hover:bg-[#A3E635]"
          >
            <Plus className="h-4 w-4" />
            Build Custom Agent
          </button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#121215] px-5 py-3.5">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">
              Deployed Workspace Agents
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold text-white">
              {activeAgentsCount}{" "}
              <span className="text-xs font-normal text-zinc-500">
                / {agents.length} total
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-[#84CC16]/30 bg-[#84CC16]/10 p-2.5 text-[#A3E635]">
            <Bot className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#121215] px-5 py-3.5">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">
              Connected Tools &amp; MCPs
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold text-[#A3E635]">
              {connectedCount}{" "}
              <span className="text-xs font-normal text-zinc-500">
                / {connectors.length} available
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-300">
            <Plug className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#121215] px-5 py-3.5">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">
              Execution Safety Policy
            </p>
            <p className="mt-0.5 font-mono text-sm font-bold text-amber-300">
              HITL Approval Active
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === "success"
              ? "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635]"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#84CC16]" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === "agents"
              ? "bg-[#84CC16] text-[#09090B] shadow-lg shadow-[#84CC16]/15"
              : "border border-zinc-800 bg-[#121215] text-zinc-300 hover:border-zinc-700 hover:text-white"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>My Workspace Agents</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
              activeTab === "agents"
                ? "bg-[#09090B]/20 text-[#09090B]"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {agents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("skills")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === "skills"
              ? "bg-[#84CC16] text-[#09090B] shadow-lg shadow-[#84CC16]/15"
              : "border border-zinc-800 bg-[#121215] text-zinc-300 hover:border-zinc-700 hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Industry AI Skills</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
              activeTab === "skills"
                ? "bg-[#09090B]/20 text-[#09090B]"
                : "bg-[#84CC16]/15 text-[#A3E635]"
            }`}
          >
            1-Click
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("connectors")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === "connectors"
              ? "bg-[#84CC16] text-[#09090B] shadow-lg shadow-[#84CC16]/15"
              : "border border-zinc-800 bg-[#121215] text-zinc-300 hover:border-zinc-700 hover:text-white"
          }`}
        >
          <Plug className="h-4 w-4" />
          <span>Tools &amp; MCP Connectors</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
              activeTab === "connectors"
                ? "bg-[#09090B]/20 text-[#09090B]"
                : "bg-emerald-500/15 text-emerald-300"
            }`}
          >
            {connectedCount}/{connectors.length}
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin text-[#84CC16]" />
          <p className="mt-3 font-mono text-xs">
            Loading workspace agents, skills &amp; connectors...
          </p>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* TAB 1: MY WORKSPACE AGENTS                                     */}
          {/* ============================================================== */}
          {activeTab === "agents" && (
            <div>
              {agents.length === 0 ? (
                /* Clean Blank-Slate Onboarding Card */
                <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-[#121215]/70 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                    <Layers className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-white">
                    Zero Pre-Built Bloat — Your Canvas is Clean
                  </h2>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-zinc-400">
                    Your workspace starts with 0 hardcoded agents so you only
                    deploy what your business actually uses. Deploy an
                    industry-ready specialist in 1 click or build a custom
                    agent with your connected tools.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("skills")}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#84CC16] px-5 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635]"
                    >
                      <Sparkles className="h-4 w-4" />
                      Explore Industry AI Skills
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingAgent(null);
                        setIsBuilderOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-[#09090B] px-5 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-white"
                    >
                      <Plus className="h-4 w-4 text-[#84CC16]" />
                      Build Custom Agent
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                        agent.is_active
                          ? "border-zinc-800 bg-[#121215] hover:border-[#84CC16]/40"
                          : "border-zinc-800/60 bg-[#121215]/40 opacity-75"
                      }`}
                    >
                      <div>
                        {/* Card Top Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#84CC16]/35 bg-[#84CC16]/12 text-[#A3E635]">
                              <Bot className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold text-white">
                                {agent.name}
                              </h3>
                              <p className="truncate text-[11px] text-zinc-400">
                                {agent.role_title}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={busyId === agent.id}
                            onClick={() =>
                              handleQuickPatchAgent(agent, {
                                is_active: !agent.is_active,
                              })
                            }
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold transition ${
                              agent.is_active
                                ? "border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]"
                                : "border-zinc-700 bg-zinc-900 text-zinc-400"
                            }`}
                            title="Toggle agent active status"
                          >
                            <Power className="h-2.5 w-2.5" />
                            {agent.is_active ? "ACTIVE" : "PAUSED"}
                          </button>
                        </div>

                        {/* System Prompt Snippet */}
                        <p className="mt-3.5 line-clamp-3 rounded-xl border border-zinc-800/80 bg-[#09090B] p-3 text-[11px] leading-relaxed text-zinc-400">
                          {agent.system_prompt}
                        </p>

                        {/* Bound Tools Chips */}
                        <div className="mt-3.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                            Bound Tools ({agent.bound_tools.length})
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {agent.bound_tools.length === 0 ? (
                              <span className="rounded-md border border-zinc-800 bg-[#09090B] px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                                Pure Reasoning (No external tools)
                              </span>
                            ) : (
                              agent.bound_tools.map((cid) => (
                                <span
                                  key={cid}
                                  className="inline-flex items-center gap-1 rounded-md border border-[#84CC16]/30 bg-[#84CC16]/10 px-2 py-0.5 font-mono text-[10px] text-[#A3E635]"
                                >
                                  <Wrench className="h-2.5 w-2.5" />
                                  {connectorNameMap[cid] || cid}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Controls */}
                      <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickPatchAgent(agent, {
                              hitl_enabled: !agent.hitl_enabled,
                            })
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold transition ${
                            agent.hitl_enabled
                              ? "border-amber-500/35 bg-amber-500/10 text-amber-300"
                              : "border-zinc-800 bg-[#09090B] text-zinc-500"
                          }`}
                          title="Toggle Human-in-the-Loop approval guard"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {agent.hitl_enabled ? "HITL ON" : "HITL OFF"}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/chat?pinAgent=${encodeURIComponent(agent.id)}`
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#84CC16] px-2.5 py-1.5 text-[11px] font-bold text-[#09090B] transition hover:bg-[#A3E635]"
                            title="Pin this agent and open Command Center"
                          >
                            <span>Pin &amp; Chat</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingAgent(agent);
                              setIsBuilderOpen(true);
                            }}
                            className="rounded-lg border border-zinc-800 bg-[#09090B] p-1.5 text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                            title="Edit agent"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={busyId === `del_${agent.id}`}
                            onClick={() => handleDeleteAgent(agent)}
                            className="rounded-lg border border-zinc-800 bg-[#09090B] p-1.5 text-zinc-400 transition hover:border-rose-500/40 hover:text-rose-400"
                            title="Delete agent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: INDUSTRY AI SKILLS LIBRARY                              */}
          {/* ============================================================== */}
          {activeTab === "skills" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => {
                const isDeploying = busyId === skill.skill_id;
                return (
                  <div
                    key={skill.skill_id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                      skill.is_recommended_for_workspace
                        ? "border-[#84CC16]/45 bg-gradient-to-b from-[#151812] to-[#121215]"
                        : "border-zinc-800 bg-[#121215]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md border border-zinc-800 bg-[#09090B] px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
                          {skill.industry.replace("_", " ")}
                        </span>

                        {skill.is_recommended_for_workspace && (
                          <span className="rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                            Recommended
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-sm font-bold text-white">
                        {skill.name}
                      </h3>
                      <p className="text-[11px] font-medium text-[#A3E635]">
                        {skill.role_title}
                      </p>

                      <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">
                        {skill.description}
                      </p>

                      {/* Required Connectors Status */}
                      <div className="mt-4 space-y-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          Required Tools:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skill.required_connectors.map((cid) => {
                            const isMissing =
                              skill.missing_connectors.includes(cid);
                            return (
                              <span
                                key={cid}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] ${
                                  isMissing
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                    : "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                                }`}
                              >
                                {isMissing ? "Missing:" : "Ready:"}{" "}
                                {connectorNameMap[cid] || cid}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-zinc-800/80 pt-3.5">
                      {skill.ready_to_deploy ? (
                        <button
                          type="button"
                          disabled={isDeploying}
                          onClick={() => handleDeploySkill(skill)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-4 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
                        >
                          {isDeploying ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Deploying Agent...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              1-Click Deploy Specialist
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTab("connectors")}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
                        >
                          <Plug className="h-4 w-4" />
                          Connect Missing Tool First
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: TOOLS & MCP CONNECTORS                                  */}
          {/* ============================================================== */}
          {activeTab === "connectors" && (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "All Connectors" },
                  { id: "free_native", label: "Free Built-in ($0)" },
                  { id: "oauth2_google", label: "1-Click Google OAuth" },
                  { id: "api_key", label: "API Key Apps" },
                  { id: "mcp_remote", label: "Remote MCP Servers" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setConnectorFilter(pill.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      connectorFilter === pill.id
                        ? "border-[#84CC16] bg-[#84CC16]/15 text-[#A3E635]"
                        : "border-zinc-800 bg-[#121215] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Connectors Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredConnectors.map((conn) => {
                  const isGoogle = conn.auth_type === "oauth2_google";
                  const isMcp = conn.auth_type === "mcp_remote";
                  const isFree = conn.is_free_default;

                  return (
                    <div
                      key={conn.connector_id}
                      className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#121215] p-5 transition hover:border-zinc-700"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#09090B] text-[#A3E635]">
                              {isGoogle ? (
                                <Mail className="h-5 w-5" />
                              ) : isMcp ? (
                                <Server className="h-5 w-5" />
                              ) : isFree ? (
                                <Globe className="h-5 w-5" />
                              ) : (
                                <KeyRound className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                                {conn.category}
                              </span>
                              <h3 className="text-sm font-bold text-white">
                                {conn.name}
                              </h3>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {isFree ? (
                            <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                              FREE • ACTIVE
                            </span>
                          ) : conn.is_connected ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                              <CheckCircle2 className="h-3 w-3" /> CONNECTED
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full border border-zinc-800 bg-[#09090B] px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
                              NOT CONNECTED
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                          {conn.description}
                        </p>

                        {/* Connected Email or MCP URL Metadata */}
                        {conn.connected_email && (
                          <p className="mt-2 font-mono text-[11px] text-[#A3E635]">
                            Linked Account: {conn.connected_email}
                          </p>
                        )}
                        {conn.mcp_url && (
                          <p className="mt-2 truncate font-mono text-[11px] text-[#A3E635]">
                            Endpoint: {conn.mcp_url}
                          </p>
                        )}

                        {/* Discovered / Available Capabilities */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(conn.cached_tools || conn.capabilities).map(
                            (cap) => (
                              <span
                                key={cap}
                                className="rounded border border-zinc-800 bg-[#09090B] px-2 py-0.5 font-mono text-[10px] text-zinc-400"
                              >
                                {cap}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3.5">
                        {conn.requires_hitl ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-300">
                            <ShieldCheck className="h-3 w-3" />
                            HITL Protected
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-zinc-500">
                            AES-256 Encrypted
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          {isFree ? (
                            <span className="font-mono text-[11px] text-zinc-400">
                              Zero Setup Needed
                            </span>
                          ) : isGoogle ? (
                            <>
                              <button
                                type="button"
                                disabled={busyId === "google_workspace"}
                                onClick={handleConnectGoogleWorkspace}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-3.5 py-1.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
                              >
                                {busyId === "google_workspace" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Mail className="h-3.5 w-3.5" />
                                )}
                                {conn.is_connected
                                  ? "Reconnect Google"
                                  : "1-Click Connect Google"}
                              </button>

                              {conn.is_connected && (
                                <button
                                  type="button"
                                  disabled={
                                    busyId === `disc_${conn.connector_id}`
                                  }
                                  onClick={() =>
                                    handleDisconnectConnector(conn.connector_id)
                                  }
                                  className="rounded-xl border border-zinc-800 bg-[#09090B] p-1.5 text-zinc-400 transition hover:border-rose-500/40 hover:text-rose-400"
                                  title="Disconnect Google Workspace"
                                >
                                  <Unplug className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {isMcp && conn.is_connected && (
                                <button
                                  type="button"
                                  disabled={
                                    busyId === `probe_${conn.connector_id}`
                                  }
                                  onClick={() =>
                                    handleProbeMcpTools(conn.connector_id)
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-[#09090B] px-3 py-1.5 text-[11px] font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
                                >
                                  <RefreshCw
                                    className={`h-3 w-3 ${
                                      busyId === `probe_${conn.connector_id}`
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                  />
                                  Discover Tools
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setActiveConnectorModal(conn)}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 px-3.5 py-1.5 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B]"
                              >
                                {conn.is_connected ? "Configure" : "Connect"}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>

                              {conn.is_connected && (
                                <button
                                  type="button"
                                  disabled={
                                    busyId === `disc_${conn.connector_id}`
                                  }
                                  onClick={() =>
                                    handleDisconnectConnector(conn.connector_id)
                                  }
                                  className="rounded-xl border border-zinc-800 bg-[#09090B] p-1.5 text-zinc-400 transition hover:border-rose-500/40 hover:text-rose-400"
                                  title="Disconnect"
                                >
                                  <Unplug className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom Agent Builder / Editor Modal */}
      <AgentBuilderModal
        isOpen={isBuilderOpen}
        editingAgent={editingAgent}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        connectors={connectors}
        apiBaseUrl={API_BASE_URL}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingAgent(null);
        }}
        onSaved={(savedAgent, isNew) => {
          setBanner({
            type: "success",
            text: isNew
              ? `Created '${savedAgent.name}'! Ready to pin in AI Command Center.`
              : `Updated '${savedAgent.name}' successfully.`,
          });
          void loadStudioData();
        }}
        onGoToConnectors={() => setActiveTab("connectors")}
      />

      {/* API Key / Remote MCP Connector Modal */}
      <ConnectorConfigModal
        connector={activeConnectorModal}
        workspaceId={workspaceId}
        apiBaseUrl={API_BASE_URL}
        onClose={() => setActiveConnectorModal(null)}
        onConnected={(cid) => {
          setBanner({
            type: "success",
            text: `Connector '${cid}' encrypted and saved to workspace!`,
          });
          void loadStudioData();
        }}
      />
    </div>
  );
}