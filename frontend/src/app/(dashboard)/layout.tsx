"use client";

import React from "react";
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Zap } from "lucide-react";

function DashboardShellContent({ children }: { children: React.ReactNode }) {
  const { isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090B] text-zinc-200">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-[#84CC16]/20 border border-[#84CC16]/40 text-[#A3E635]">
          <Zap className="h-6 w-6" />
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-zinc-400">
          Initializing StarEleven Workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-zinc-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#09090B]">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <DashboardShellContent>{children}</DashboardShellContent>
    </WorkspaceProvider>
  );
}