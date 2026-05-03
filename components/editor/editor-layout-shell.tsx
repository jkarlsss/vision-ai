"use client";

import { useState, type ReactNode } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectDialogsProvider } from "@/components/editor/project-dialogs-provider";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import type { ProjectLists } from "@/lib/project-data";

interface EditorLayoutShellProps extends ProjectLists {
  children: ReactNode;
}

export function EditorLayoutShell({
  children,
  ownedProjects,
  sharedProjects,
}: EditorLayoutShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <ProjectDialogsProvider
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    >
      <div className="relative flex min-h-svh flex-col bg-base text-copy-primary">
        <EditorNavbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        />
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <ProjectDialogs />
      </div>
    </ProjectDialogsProvider>
  );
}
