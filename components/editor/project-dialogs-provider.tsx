"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import {
  useProjectDialogs,
  type ProjectDialogsController,
} from "@/hooks/use-project-dialogs";

const ProjectDialogsContext = createContext<ProjectDialogsController | null>(
  null,
);

interface ProjectDialogsProviderProps {
  children: ReactNode;
}

export function ProjectDialogsProvider({
  children,
}: ProjectDialogsProviderProps) {
  const projectDialogs = useProjectDialogs();

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
