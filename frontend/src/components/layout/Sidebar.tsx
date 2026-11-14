"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Database,
  LogOut,
  MessageSquare,
  Settings,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const PRIMARY_NAV: NavItem[] = [
  {
    label: "AI Command Chat",
    href: "/chat",
    icon: MessageSquare,
    badge: "Live",
  },
  {
    label: "Agent Studio",
    href: "/agents",
    icon: Bot,
  },
  {
    label: "Knowledge Base",
    href: "/knowledge",
    icon: Database,
  },
  {
    label: "CRM & Leads",
    href: "/crm",
    icon: Users,
  },
];

const SYSTEM_NAV: NavItem[] = [
  {
    label: "Workspace & Vault",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut, isMobileSidebarOpen, setIsMobileSidebarOpen } =
    useWorkspace();
  const [collapsed, setCollapsed] = useState(false);

  const renderSidebarContent = (isMobile = false) => {
    const isCollapsed = isMobile ? false : collapsed;

    return (
      <div
        className={`flex h-full flex-col border-r border-zinc-800/80 bg-[#09090B] transition-all duration-200 ${
          isCollapsed ? "w-20" : "w-68"
        }`}
      >
        {/* Top Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-4">
          <Link
            href="/chat"
            onClick={() => isMobile && setIsMobileSidebarOpen(false)}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#84CC16] text-[#09090B] shadow-lg shadow-[#84CC16]/20">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="text-base font-extrabold tracking-tight text-white">
                  Star<span className="text-[#84CC16]">Eleven</span>
                </span>
                <span className="ml-1.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400">
                  OS
                </span>
              </div>
            )}
          </Link>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="hidden rounded-lg border border-zinc-800 bg-[#121215] p-1.5 text-zinc-400 transition hover:border-zinc-700 hover:text-white lg:flex"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* User-Scoped Workspace Switcher */}
        <div className="p-3">
          <WorkspaceSwitcher collapsed={isCollapsed} />
        </div>

        {/* Primary Operations Navigation */}
        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
          <div>
            {!isCollapsed && (
              <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Agent Operations
              </p>
            )}
            <nav className="space-y-1">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && setIsMobileSidebarOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#84CC16]/15 text-[#A3E635] border border-[#84CC16]/35 shadow-sm"
                        : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-100 border border-transparent"
                    } ${isCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? "text-[#84CC16]"
                            : "text-zinc-400 group-hover:text-zinc-200"
                        }`}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="rounded-full bg-[#84CC16]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* System & Vault Navigation */}
          <div>
            {!isCollapsed && (
              <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Configuration
              </p>
            )}
            <nav className="space-y-1">
              {SYSTEM_NAV.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && setIsMobileSidebarOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#84CC16]/15 text-[#A3E635] border border-[#84CC16]/35"
                        : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-100 border border-transparent"
                    } ${isCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-[#84CC16]"
                          : "text-zinc-400 group-hover:text-zinc-200"
                      }`}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom User Profile & Sign Out */}
        <div className="border-t border-zinc-800/80 p-3">
          <div
            className={`flex items-center justify-between rounded-xl border border-zinc-800/80 bg-[#121215] p-2.5 ${
              isCollapsed ? "flex-col gap-2" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold uppercase text-[#A3E635]">
                {user?.fullName?.charAt(0) || "U"}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-zinc-100">
                    {user?.fullName || "Operator"}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={signOut}
              title="Sign Out"
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-500/15 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block">{renderSidebarContent(false)}</aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}