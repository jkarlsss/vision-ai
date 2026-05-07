import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";

import {
  getCurrentClerkIdentity,
  getProjectAccessForCurrentUser,
  type ProjectAccess,
} from "@/lib/project-access";
import { getProjectUpdatedLabel } from "@/lib/project-format";
import { getPrismaClient } from "@/lib/project-api";

export type { ProjectAccess };

export interface ProjectListProject {
  id: string;
  name: string;
  access: ProjectAccess;
  updatedLabel: string;
}

export interface ProjectLists {
  ownedProjects: ProjectListProject[];
  sharedProjects: ProjectListProject[];
}

const projectListSelect = {
  id: true,
  name: true,
  updatedAt: true,
} as const;

type ProjectListRecord = {
  id: string;
  name: string;
  updatedAt: Date;
};

export async function getProjectListsForCurrentUser(): Promise<ProjectLists> {
  const identity = await getCurrentClerkIdentity();
  const prisma = await getPrismaClient();
  const sharedProjectWhere = getSharedProjectWhere(
    identity.userId,
    identity.primaryEmail,
  );

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: identity.userId },
      orderBy: { updatedAt: "desc" },
      select: projectListSelect,
    }),
    sharedProjectWhere
      ? prisma.project.findMany({
          where: sharedProjectWhere,
          orderBy: { updatedAt: "desc" },
          select: projectListSelect,
        })
      : Promise.resolve([]),
  ]);

  return {
    ownedProjects: ownedProjects.map((project) =>
      toProjectListProject(project, "owner"),
    ),
    sharedProjects: sharedProjects.map((project) =>
      toProjectListProject(project, "collaborator"),
    ),
  };
}

export async function getProjectForCurrentUser(projectId: string) {
  const projectAccess = await getProjectAccessForCurrentUser(projectId);

  return projectAccess
    ? toProjectListProject(projectAccess.project, projectAccess.access)
    : null;
}

function getSharedProjectWhere(
  userId: string,
  primaryEmail: string | null,
): Prisma.ProjectWhereInput | null {
  if (!primaryEmail) {
    return null;
  }

  return {
    ownerId: { not: userId },
    collaborators: {
      some: {
        email: {
          equals: primaryEmail,
          mode: "insensitive",
        },
      },
    },
  };
}

function toProjectListProject(
  project: ProjectListRecord,
  access: ProjectAccess,
): ProjectListProject {
  return {
    id: project.id,
    name: project.name,
    access,
    updatedLabel: getProjectUpdatedLabel(project.updatedAt),
  };
}
