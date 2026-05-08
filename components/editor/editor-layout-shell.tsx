"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import {
  CanvasSaveStatusProvider,
  useCanvasSaveStatus,
} from "@/components/editor/canvas-save-status-context";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { EditorRoomProvider } from "@/components/editor/editor-room-provider";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import {
  ProjectDialogsProvider,
  useProjectDialogsContext,
} from "@/components/editor/project-dialogs-provider";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import {
  StarterTemplatesProvider,
  useStarterTemplates,
} from "@/components/editor/starter-templates-context";
import type { ProjectListProject, ProjectLists } from "@/lib/project-data";
import { isProjectWorkspacePath } from "@/lib/project-routes";

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
      <StarterTemplatesProvider>
        <CanvasSaveStatusProvider>
          <EditorLayoutShellContent>{children}</EditorLayoutShellContent>
          <ProjectDialogs />
        </CanvasSaveStatusProvider>
      </StarterTemplatesProvider>
    </ProjectDialogsProvider>
  );
}

interface EditorLayoutShellContentProps {
  children: ReactNode;
}

function EditorLayoutShellContent({ children }: EditorLayoutShellContentProps) {
  const pathname = usePathname();
  const { ownedProjects, sharedProjects } = useProjectDialogsContext();
  const { openStarterTemplates } = useStarterTemplates();
  const { requestManualSave, saveStatus, setSaveStatus } =
    useCanvasSaveStatus();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const activeProject = useMemo(
    () => getActiveWorkspaceProject(pathname, ownedProjects, sharedProjects),
    [ownedProjects, pathname, sharedProjects],
  );

  useEffect(() => {
    setSaveStatus("saved");
  }, [activeProject?.id, setSaveStatus]);

  return (
    <div className="relative flex min-h-svh flex-col bg-base text-copy-primary">
      <EditorNavbar
        isAiSidebarOpen={isAiSidebarOpen}
        isSidebarOpen={isSidebarOpen}
        onShareProject={
          activeProject ? () => setIsShareDialogOpen(true) : undefined
        }
        onOpenStarterTemplates={
          activeProject ? openStarterTemplates : undefined
        }
        onSaveCanvas={activeProject ? requestManualSave : undefined}
        onToggleAiSidebar={() => setIsAiSidebarOpen((isOpen) => !isOpen)}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        projectName={activeProject?.name}
        saveStatus={activeProject ? saveStatus : undefined}
        showWorkspaceActions={Boolean(activeProject)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {activeProject ? (
          <EditorRoomProvider roomId={activeProject.id}>
            {children}
            <AiSidebar
              isOpen={isAiSidebarOpen}
              onClose={() => setIsAiSidebarOpen(false)}
              projectId={activeProject.id}
              roomId={activeProject.id}
            />
          </EditorRoomProvider>
        ) : (
          children
        )}
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
