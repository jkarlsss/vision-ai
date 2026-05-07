"use client";

import { MessageSquareText } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import {
  ProjectDialogsProvider,
  useProjectDialogsContext,
} from "@/components/editor/project-dialogs-provider";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import type { ProjectListProject, ProjectLists } from "@/lib/project-data";
import { isProjectWorkspacePath } from "@/lib/project-routes";
import { cn } from "@/lib/utils";

interface EditorLayoutShellProps extends ProjectLists {
  children: ReactNode;
}

export function EditorLayoutShell({
  children,
  ownedProjects,
  sharedProjects,
}: EditorLayoutShellProps) {
  return (
    <ProjectDialogsProvider
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    >
      <EditorLayoutShellContent>{children}</EditorLayoutShellContent>
      <ProjectDialogs />
    </ProjectDialogsProvider>
  );
}

interface EditorLayoutShellContentProps {
  children: ReactNode;
}

function EditorLayoutShellContent({ children }: EditorLayoutShellContentProps) {
  const pathname = usePathname();
  const { ownedProjects, sharedProjects } = useProjectDialogsContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const activeProject = useMemo(
    () => getActiveWorkspaceProject(pathname, ownedProjects, sharedProjects),
    [ownedProjects, pathname, sharedProjects],
  );

  return (
    <div className="relative flex min-h-svh flex-col bg-base text-copy-primary">
      <EditorNavbar
        isAiSidebarOpen={isAiSidebarOpen}
        isSidebarOpen={isSidebarOpen}
        onShareProject={
          activeProject ? () => setIsShareDialogOpen(true) : undefined
        }
        onToggleAiSidebar={() => setIsAiSidebarOpen((isOpen) => !isOpen)}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        projectName={activeProject?.name}
        showWorkspaceActions={Boolean(activeProject)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {children}
        {activeProject && <AiSidebarPlaceholder isOpen={isAiSidebarOpen} />}
      </main>
      <ShareDialog
        key={activeProject?.id ?? "no-active-project"}
        onOpenChange={setIsShareDialogOpen}
        open={isShareDialogOpen}
        project={activeProject}
      />
    </div>
  );
}

interface AiSidebarPlaceholderProps {
  isOpen: boolean;
}

function AiSidebarPlaceholder({ isOpen }: AiSidebarPlaceholderProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="AI sidebar"
      className={cn(
        "fixed bottom-3 left-3 right-3 top-18 z-40 flex flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-2xl shadow-background/40 backdrop-blur-md transition-[opacity,transform] duration-200 ease-out md:bottom-4 md:left-auto md:right-4 md:w-80",
        isOpen
          ? "translate-x-0"
          : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0",
      )}
    >
      <div className="flex h-14 shrink-0 items-center px-4">
        <h2 className="text-sm font-medium text-copy-primary">
          AI assistant
        </h2>
      </div>
      <Separator className="bg-sidebar-border" />
      <div className="min-h-0 flex-1 p-3">
        <Empty className="h-full border border-surface-border bg-transparent">
          <EmptyHeader>
            <EmptyMedia
              className="border border-surface-border bg-elevated text-brand"
              variant="icon"
            >
              <MessageSquareText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-copy-primary">
              No messages yet
            </EmptyTitle>
            <EmptyDescription className="text-copy-secondary">
              AI chat will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </aside>
  );
}

function getActiveWorkspaceProject(
  pathname: string,
  ownedProjects: ProjectListProject[],
  sharedProjects: ProjectListProject[],
) {
  return (
    [...ownedProjects, ...sharedProjects].find((project) =>
      isProjectWorkspacePath(pathname, project.id),
    ) ?? null
  );
}
