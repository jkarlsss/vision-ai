"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import {
  useProjectActions,
  type ProjectActionsController,
} from "@/hooks/use-project-actions";
import type { ProjectLists } from "@/lib/project-data";

const ProjectDialogsContext = createContext<ProjectActionsController | null>(
  null,
);

interface ProjectDialogsProviderProps extends ProjectLists {
  children: ReactNode;
}

export function ProjectDialogsProvider({
  children,
  ownedProjects,
  sharedProjects,
}: ProjectDialogsProviderProps) {
  const projectDialogs = useProjectActions({
    ownedProjects,
    sharedProjects,
  });

  return (
    <ProjectDialogsContext.Provider value={projectDialogs}>
      {children}
    </ProjectDialogsContext.Provider>
  );
}

export function useProjectDialogsContext() {
  const context = useContext(ProjectDialogsContext);

  if (!context) {
    throw new Error(
      "useProjectDialogsContext must be used inside ProjectDialogsProvider",
    );
  }

  return context;
}
