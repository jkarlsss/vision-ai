"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DEFAULT_PROJECT_NAME } from "@/lib/project-constants";
import { getProjectUpdatedLabel } from "@/lib/project-format";
import {
  createProjectRoomId as buildProjectRoomId,
  createShortProjectRoomSuffix,
} from "@/lib/project-room-id";
import {
  getProjectWorkspacePath,
  isProjectWorkspacePath,
} from "@/lib/project-routes";
import type {
  ProjectListProject,
  ProjectLists,
} from "@/lib/project-data";

export type {
  ProjectAccess,
  ProjectListProject,
  ProjectLists,
} from "@/lib/project-data";

export type ProjectDialogType = "create" | "rename" | "delete";

interface ProjectDialogState {
  type: ProjectDialogType | null;
  project: ProjectListProject | null;
}

interface ProjectMutationResponse {
  project: ProjectListProject;
}

interface ApiProject {
  id: string;
  name: string;
  updatedAt: string;
}

interface ApiErrorResponse {
  error: string;
}

const EMPTY_DIALOG_STATE: ProjectDialogState = {
  type: null,
  project: null,
};

export function useProjectActions({
  ownedProjects: initialOwnedProjects = [],
  sharedProjects: initialSharedProjects = [],
}: ProjectLists) {
  const pathname = usePathname();
  const router = useRouter();
  const [createdOwnedProjects, setCreatedOwnedProjects] = useState<
    ProjectListProject[]
  >([]);
  const [projectOverrides, setProjectOverrides] = useState<
    Record<string, ProjectListProject>
  >({});
  const [deletedProjectIds, setDeletedProjectIds] = useState<string[]>([]);
  const [dialogState, setDialogState] =
    useState<ProjectDialogState>(EMPTY_DIALOG_STATE);
  const [createProjectName, setCreateProjectName] = useState("");
  const [createProjectSuffix, setCreateProjectSuffix] = useState(() =>
    createShortProjectRoomSuffix(),
  );
  const [renameProjectName, setRenameProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const deletedProjectIdSet = useMemo(
    () => new Set(deletedProjectIds),
    [deletedProjectIds],
  );

  const ownedProjects = useMemo(() => {
    const createdProjectIds = new Set(
      createdOwnedProjects.map((project) => project.id),
    );
    const projects = [
      ...createdOwnedProjects,
      ...initialOwnedProjects.filter(
        (project) => !createdProjectIds.has(project.id),
      ),
    ];

    return projects
      .filter((project) => !deletedProjectIdSet.has(project.id))
      .map((project) => projectOverrides[project.id] ?? project);
  }, [
    createdOwnedProjects,
    deletedProjectIdSet,
    initialOwnedProjects,
    projectOverrides,
  ]);

  const sharedProjects = useMemo(
    () =>
      initialSharedProjects
        .filter((project) => !deletedProjectIdSet.has(project.id))
        .map((project) => projectOverrides[project.id] ?? project),
    [deletedProjectIdSet, initialSharedProjects, projectOverrides],
  );

  const createProjectRoomId = useMemo(
    () => createProjectRoomIdForInput(createProjectName, createProjectSuffix),
    [createProjectName, createProjectSuffix],
  );

  const canSubmitCreate = !isLoading;
  const canSubmitRename = renameProjectName.trim().length > 0 && !isLoading;

  function openCreateDialog() {
    setCreateProjectName("");
    setCreateProjectSuffix(createShortProjectRoomSuffix());
    setMutationError(null);
    setDialogState({
      type: "create",
      project: null,
    });
  }

  function openRenameDialog(project: ProjectListProject) {
    setRenameProjectName(project.name);
    setMutationError(null);
    setDialogState({
      type: "rename",
      project,
    });
  }

  function openDeleteDialog(project: ProjectListProject) {
    setMutationError(null);
    setDialogState({
      type: "delete",
      project,
    });
  }

  function closeDialog() {
    if (isLoading) {
      return;
    }

    setMutationError(null);
    setDialogState(EMPTY_DIALOG_STATE);
  }

  async function submitCreateProject() {
    if (!canSubmitCreate) {
      return;
    }

    const roomId = createProjectRoomId;
    const trimmedName = createProjectName.trim();

    await runMutation(async () => {
      const { project } = await requestProjectMutation("/api/projects", {
        body: JSON.stringify({
          id: roomId,
          name: trimmedName || DEFAULT_PROJECT_NAME,
        }),
        method: "POST",
      });

      setCreatedOwnedProjects((currentProjects) => [
        project,
        ...currentProjects.filter(
          (currentProject) => currentProject.id !== project.id,
        ),
      ]);
      setCreateProjectName("");
      setDialogState(EMPTY_DIALOG_STATE);
      router.push(getProjectWorkspacePath(project.id));
    });
  }

  async function submitRenameProject() {
    const targetProject = dialogState.project;

    if (!targetProject || !canSubmitRename) {
      return;
    }

    const trimmedName = renameProjectName.trim();

    await runMutation(async () => {
      const { project } = await requestProjectMutation(
        `/api/projects/${encodeURIComponent(targetProject.id)}`,
        {
          body: JSON.stringify({ name: trimmedName }),
          method: "PATCH",
        },
      );

      setProjectOverrides((currentProjects) => ({
        ...currentProjects,
        [project.id]: project,
      }));
      setDialogState(EMPTY_DIALOG_STATE);
      router.refresh();
    });
  }

  async function confirmDeleteProject() {
    const targetProject = dialogState.project;

    if (!targetProject) {
      return;
    }

    await runMutation(async () => {
      await requestProjectMutation(
        `/api/projects/${encodeURIComponent(targetProject.id)}`,
        { method: "DELETE" },
      );

      setDeletedProjectIds((currentProjectIds) => [
        ...currentProjectIds.filter(
          (currentProjectId) => currentProjectId !== targetProject.id,
        ),
        targetProject.id,
      ]);
      setDialogState(EMPTY_DIALOG_STATE);

      if (isProjectWorkspacePath(pathname, targetProject.id)) {
        router.replace("/editor");
        return;
      }

      router.refresh();
    });
  }

  async function runMutation(mutate: () => Promise<void>) {
    setIsLoading(true);
    setMutationError(null);

    try {
      await mutate();
    } catch (error) {
      setMutationError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return {
    canSubmitCreate,
    canSubmitRename,
    closeDialog,
    confirmDeleteProject,
    createProjectName,
    createProjectRoomId,
    dialogState,
    isLoading,
    mutationError,
    openCreateDialog,
    openDeleteDialog,
    openRenameDialog,
    ownedProjects,
    renameProjectName,
    setCreateProjectName,
    setRenameProjectName,
    sharedProjects,
    submitCreateProject,
    submitRenameProject,
  };
}

async function requestProjectMutation(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<ProjectMutationResponse> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
    // Handle empty responses (e.g., 204 No Content from DELETE)
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

    // DELETE may not return a project
  if (init.method === "DELETE") {
    return { project: null as unknown as ProjectListProject };
  }


  if (!isRecord(data) || !isApiProject(data.project)) {
    throw new Error("Project response was invalid.");
  }

  return {
    project: toProjectListProject(data.project),
  };
}

function createProjectRoomIdForInput(name: string, suffix: string) {
  return buildProjectRoomId(name, suffix);
}

function toProjectListProject(project: ApiProject): ProjectListProject {
  return {
    id: project.id,
    name: project.name,
    access: "owner",
    updatedLabel: getProjectUpdatedLabel(project.updatedAt),
  };
}

function getApiErrorMessage(data: unknown) {
  if (isApiErrorResponse(data)) {
    return data.error;
  }

  return "Project request failed.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Project request failed.";
}

function isApiProject(value: unknown): value is ApiProject {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ProjectActionsController = ReturnType<typeof useProjectActions>;
