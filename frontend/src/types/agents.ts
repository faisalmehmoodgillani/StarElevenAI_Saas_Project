export type ConnectorAuthType =
  | "free_native"
  | "oauth2_google"
  | "api_key"
  | "mcp_remote";

export interface ConnectorFieldDef {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
}

export interface WorkspaceConnector {
  connector_id: string;
  name: string;
  category: string;
  auth_type: ConnectorAuthType;
  is_free_default: boolean;
  requires_hitl: boolean;
  description: string;
  capabilities: string[];
  fields: ConnectorFieldDef[];
  is_connected: boolean;
  connected_email?: string | null;
  mcp_url?: string | null;
  cached_tools: string[];
  updated_at?: string | null;
}

export interface WorkspaceAgentItem {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  role_title: string;
  industry: string;
  skill_template_id?: string | null;
  system_prompt: string;
  bound_tools: string[];
  hitl_enabled: boolean;
  is_active: boolean;
  created_at?: string | null;
}

export interface IndustrySkillTemplate {
  skill_id: string;
  name: string;
  industry: string;
  role_title: string;
  tagline?: string;
  description: string;
  system_prompt: string;
  required_connectors: string[];
  hitl_enabled: boolean;
  is_recommended_for_workspace: boolean;
  ready_to_deploy: boolean;
  missing_connectors: string[];
}

export interface MissingToolHint {
  connector_id: string;
  connector_name: string;
  auth_type: string;
  advice: string;
}

export interface HitlActionItem {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface HitlInterruptPayload {
  type: "hitl_approval_required";
  agent_name: string;
  actions: HitlActionItem[];
  message: string;
}