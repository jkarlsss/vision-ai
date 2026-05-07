import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { signInPath } from "@/lib/auth-routes";
import { getPrismaClient } from "@/lib/project-api";

export type ProjectAccess = "owner" | "collaborator";

export interface CurrentClerkIdentity {
  primaryEmail: string | null;
  userId: string;
}

export interface ProjectAccessProject {
  id: string;
  name: string;
  ownerId: string;
  updatedAt: Date;
}

export interface ProjectAccessResult {
  access: ProjectAccess;
  identity: CurrentClerkIdentity;
  project: ProjectAccessProject;
}

interface ProjectAccessRecord extends ProjectAccessProject {
  collaborators: Array<{
    id: string;
  }>;
}

export async function getCurrentClerkIdentity(): Promise<CurrentClerkIdentity> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    redirect(signInPath);
  }

  const user = await currentUser();

  return {
    primaryEmail: getPrimaryEmailAddress(user),
    userId,
  };
}

export async function getProjectAccessForCurrentUser(
  roomId: string,
): Promise<ProjectAccessResult | null> {
  const identity = await getCurrentClerkIdentity();

  return checkProjectAccessByOwnerOrCollaborator(roomId, identity);
}

export async function checkProjectAccessByOwnerOrCollaborator(
  roomId: string,
  identity: CurrentClerkIdentity,
): Promise<ProjectAccessResult | null> {
  const prisma = await getPrismaClient();
  const project = await prisma.project.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      updatedAt: true,
      collaborators: {
        where: getPrimaryEmailCollaboratorWhere(identity.primaryEmail),
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!project) {
    return null;
  }

  const access = getProjectAccess(project, identity);

  if (!access) {
    return null;
  }

  return {
    access,
    identity,
    project: {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
      updatedAt: project.updatedAt,
    },
  };
}

function getProjectAccess(
  project: ProjectAccessRecord,
  identity: CurrentClerkIdentity,
): ProjectAccess | null {
  if (project.ownerId === identity.userId) {
    return "owner";
  }

  if (project.collaborators.length > 0) {
    return "collaborator";
  }

  return null;
}

function getPrimaryEmailAddress(
  user: Awaited<ReturnType<typeof currentUser>>,
) {
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
    )?.emailAddress ??
    null;

  return primaryEmail?.trim() || null;
}

function getPrimaryEmailCollaboratorWhere(primaryEmail: string | null) {
  if (!primaryEmail) {
    return { email: "__no-authenticated-primary-email__" };
  }

  return {
    email: {
      equals: primaryEmail,
      mode: "insensitive" as const,
    },
  };
}
