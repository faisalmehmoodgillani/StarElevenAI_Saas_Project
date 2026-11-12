import { PlanMode } from "@/types/saas";

export interface StarElevenSession {
  workspace_id: string;
  workspace_name: string;
  slug: string;
  user_id: string;
  email: string;
  full_name: string;
  plan_mode: PlanMode;
  logged_in_at: string;
}

const SESSION_STORAGE_KEY = "stareleven_active_session_v1";

export const sessionService = {
  getSession(): StarElevenSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StarElevenSession;
    } catch {
      return null;
    }
  },

  saveSession(session: StarElevenSession): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  },

  updatePlanMode(planMode: PlanMode): void {
    const current = this.getSession();
    if (!current) return;
    this.saveSession({ ...current, plan_mode: planMode });
  },

  clearSession(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  },
};