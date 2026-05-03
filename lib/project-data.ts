import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";

import { signInPath } from "@/lib/auth-routes";
import { getProjectUpdatedLabel } from "@/lib/project-format";
import { getPrismaClient } from "@/lib/project-api";

export type ProjectAccess = "owner" | "collaborator";

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
  const user = await currentUser();

  if (!user) {
    redirect(signInPath);
  }

  const prisma = await getPrismaClient();
  const emailAddresses = getUserEmailAddresses(user.emailAddresses);
  const sharedProjectWhere = getSharedProjectWhere(user.id, emailAddresses);

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: user.id },
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
  const user = await currentUser();

  if (!user) {
    redirect(signInPath);
  }

  const prisma = await getPrismaClient();
  const emailAddresses = getUserEmailAddresses(user.emailAddresses);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ...projectListSelect,
      ownerId: true,
      collaborators: {
        where: getCollaboratorEmailWhere(emailAddresses),
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!project) {
    return null;
  }

  if (project.ownerId === user.id) {
    return toProjectListProject(project, "owner");
  }

  if (project.collaborators.length > 0) {
    return toProjectListProject(project, "collaborator");
  }

  return null;
}

function getUserEmailAddresses(
  emailAddresses: Array<{ emailAddress: string }> = [],
) {
  return [
    ...new Set(
      emailAddresses
        .map((email) => email.emailAddress.trim())
        .filter(Boolean),
    ),
  ];
}

function getSharedProjectWhere(
  userId: string,
  emailAddresses: string[],
): Prisma.ProjectWhereInput | null {
  if (emailAddresses.length === 0) {
    return null;
  }

  return {
    ownerId: { not: userId },
    collaborators: {
      some: getCollaboratorEmailWhere(emailAddresses),
    },
  };
}

function getCollaboratorEmailWhere(
  emailAddresses: string[],
): Prisma.ProjectCollaboratorWhereInput {
  if (emailAddresses.length === 0) {
    return { email: "__no-authenticated-user-email__" };
  }

  return {
    email: {
      in: emailAddresses,
      mode: "insensitive",
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
