"use client";

import { useMemo, useState } from "react";

export type ProjectAccess = "owner" | "collaborator";

export interface MockProject {
  id: string;
  name: string;
  slug: string;
  access: ProjectAccess;
  updatedLabel: string;
}

export type ProjectDialogType = "create" | "rename" | "delete";

interface ProjectDialogState {
  type: ProjectDialogType | null;
  project: MockProject | null;
}

const INITIAL_PROJECTS: MockProject[] = [
  {
    id: "project-realtime-platform",
    name: "Realtime Platform",
    slug: "realtime-platform",
    access: "owner",
    updatedLabel: "Updated today",
  },
  {
    id: "project-ai-support",
    name: "AI Support Desk",
    slug: "ai-support-desk",
    access: "owner",
    updatedLabel: "Updated yesterday",
  },
  {
    id: "project-payments-core",
    name: "Payments Core",
    slug: "payments-core",
    access: "collaborator",
    updatedLabel: "Shared project",
  },
];

const EMPTY_DIALOG_STATE: ProjectDialogState = {
  type: null,
  project: null,
};

export function getProjectSlugPreview(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-project";
}

export function useProjectDialogs() {
  const [projects, setProjects] = useState<MockProject[]>(INITIAL_PROJECTS);
  const [dialogState, setDialogState] =
    useState<ProjectDialogState>(EMPTY_DIALOG_STATE);
  const [createProjectName, setCreateProjectName] = useState("");
  const [renameProjectName, setRenameProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const ownedProjects = useMemo(
    () => projects.filter((project) => project.access === "owner"),
    [projects],
  );

  const sharedProjects = useMemo(
    () => projects.filter((project) => project.access === "collaborator"),
    [projects],
  );

  const createProjectSlug = getProjectSlugPreview(createProjectName);
  const renameProjectSlug = getProjectSlugPreview(renameProjectName);
  const canSubmitCreate = createProjectName.trim().length > 0;
  const canSubmitRename = renameProjectName.trim().length > 0;

  function openCreateDialog() {
    setCreateProjectName("");
    setDialogState({
      type: "create",
      project: null,
    });
  }

  function openRenameDialog(project: MockProject) {
    setRenameProjectName(project.name);
    setDialogState({
      type: "rename",
      project,
    });
  }

  function openDeleteDialog(project: MockProject) {
    setDialogState({
      type: "delete",
      project,
    });
  }

  function closeDialog() {
    if (isLoading) {
      return;
    }

    setDialogState(EMPTY_DIALOG_STATE);
  }

  async function runMockMutation(mutate: () => void) {
    setIsLoading(true);
    try {
      await Promise.resolve();
      mutate();
    } finally {
      setIsLoading(false);
    }
  }

  async function submitCreateProject() {
    if (!canSubmitCreate) {
      return;
    }

    await runMockMutation(() => {
      const trimmedName = createProjectName.trim();
      const slug = getProjectSlugPreview(trimmedName);

      setProjects((currentProjects) => [
        {
          id: `project-${slug}-${Date.now()}`,
          name: trimmedName,
          slug,
          access: "owner",
          updatedLabel: "Created just now",
        },
        ...currentProjects,
      ]);
      setCreateProjectName("");
      setDialogState(EMPTY_DIALOG_STATE);
    });
  }

  async function submitRenameProject() {
    if (!dialogState.project || !canSubmitRename) {
      return;
    }

    await runMockMutation(() => {
      const projectId = dialogState.project?.id;
      const trimmedName = renameProjectName.trim();
      const slug = getProjectSlugPreview(trimmedName);

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                name: trimmedName,
                slug,
                updatedLabel: "Renamed just now",
              }
            : project,
        ),
      );
      setDialogState(EMPTY_DIALOG_STATE);
    });
  }

  async function confirmDeleteProject() {
    if (!dialogState.project) {
      return;
    }

    await runMockMutation(() => {
      const projectId = dialogState.project?.id;

      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId),
      );
      setDialogState(EMPTY_DIALOG_STATE);
    });
  }

  return {
    canSubmitCreate,
    canSubmitRename,
    closeDialog,
    confirmDeleteProject,
    createProjectName,
    createProjectSlug,
    dialogState,
    isLoading,
    openCreateDialog,
    openDeleteDialog,
    openRenameDialog,
    ownedProjects,
    projects,
    renameProjectName,
    renameProjectSlug,
    setCreateProjectName,
    setRenameProjectName,
    sharedProjects,
    submitCreateProject,
    submitRenameProject,
  };
}

export type ProjectDialogsController = ReturnType<typeof useProjectDialogs>;
