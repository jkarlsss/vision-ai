import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/backend";
import type { Prisma } from "@/app/generated/prisma/client";

import { getPrismaClient, jsonError } from "@/lib/project-api";
import type { CurrentClerkIdentity, ProjectAccess } from "@/lib/project-access";

export const projectCollaboratorSelect = {
  id: true,
  email: true,
  createdAt: true,
} as const;

type ProjectCollaboratorRecord = Prisma.ProjectCollaboratorGetPayload<{
  select: typeof projectCollaboratorSelect;
}>;

type PrismaClient = Awaited<ReturnType<typeof getPrismaClient>>;

interface ApiErrorResult {
  response: Response;
}

interface AuthenticatedIdentityResult {
  identity: CurrentClerkIdentity;
}

interface ProjectShareAccessResult {
  access: ProjectAccess;
  prisma: PrismaClient;
}

interface CollaboratorEmailResult {
  email: string;
}

interface ClerkUserProfile {
  avatarUrl: string | null;
  displayName: string | null;
}

export interface ShareCollaborator {
  avatarUrl: string | null;
  createdAt: string;
  displayName: string | null;
  email: string;
  id: string;
}

const MAX_CLERK_EMAIL_LOOKUP = 500;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isShareApiErrorResult(
  result: unknown,
): result is ApiErrorResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "response" in result
  );
}

export async function requireAuthenticatedShareIdentity(): Promise<
  AuthenticatedIdentityResult | ApiErrorResult
> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return { response: jsonError("Unauthorized", 401) };
  }

  const user = await currentUser();

  return {
    identity: {
      primaryEmail: getPrimaryEmailAddress(user),
      userId,
    },
  };
}

export async function requireProjectShareAccess(
  projectId: string,
  identity: CurrentClerkIdentity,
): Promise<ProjectShareAccessResult | ApiErrorResult> {
  const prisma = await getPrismaClient();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      collaborators: {
        where: getPrimaryEmailCollaboratorWhere(identity.primaryEmail),
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!project) {
    return { response: jsonError("Project not found.", 404) };
  }

  if (project.ownerId === identity.userId) {
    return { access: "owner", prisma };
  }

  if (project.collaborators.length > 0) {
    return { access: "collaborator", prisma };
  }

  return { response: jsonError("Forbidden", 403) };
}

export function getInviteCollaboratorEmail(
  input: Record<string, unknown>,
): CollaboratorEmailResult | ApiErrorResult {
  const value = input.email;

  if (typeof value !== "string") {
    return { response: jsonError("Collaborator email must be a string.", 400) };
  }

  const email = normalizeEmail(value);

  if (email.length > 254 || !emailPattern.test(email)) {
    return {
      response: jsonError("Collaborator email must be a valid email.", 400),
    };
  }

  return { email };
}

export async function enrichCollaborators(
  collaborators: ProjectCollaboratorRecord[],
): Promise<ShareCollaborator[]> {
  const profilesByEmail = await getClerkProfilesByEmail(
    collaborators.map((collaborator) => collaborator.email),
  );

  return collaborators.map((collaborator) => {
    const profile = profilesByEmail.get(normalizeEmail(collaborator.email));

    return {
      avatarUrl: profile?.avatarUrl ?? null,
      createdAt: collaborator.createdAt.toISOString(),
      displayName: profile?.displayName ?? null,
      email: collaborator.email,
      id: collaborator.id,
    };
  });
}

export function hasPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
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

  return primaryEmail ? normalizeEmail(primaryEmail) : null;
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

async function getClerkProfilesByEmail(emails: string[]) {
  const normalizedEmails = Array.from(new Set(emails.map(normalizeEmail)))
    .filter(Boolean)
    .slice(0, MAX_CLERK_EMAIL_LOOKUP);
  const requestedEmailSet = new Set(normalizedEmails);

  if (normalizedEmails.length === 0) {
    return new Map<string, ClerkUserProfile>();
  }

  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      emailAddress: normalizedEmails,
      limit: normalizedEmails.length,
    });
    const profilesByEmail = new Map<string, ClerkUserProfile>();

    for (const user of users.data) {
      const profile = getClerkUserProfile(user);

      for (const emailAddress of user.emailAddresses) {
        const email = normalizeEmail(emailAddress.emailAddress);

        if (requestedEmailSet.has(email) && !profilesByEmail.has(email)) {
          profilesByEmail.set(email, profile);
        }
      }
    }

    return profilesByEmail;
  } catch {
    return new Map<string, ClerkUserProfile>();
  }
}

function getClerkUserProfile(user: User): ClerkUserProfile {
  const displayName =
    user.fullName?.trim() ||
    user.username?.trim() ||
    user.primaryEmailAddress?.emailAddress.trim() ||
    null;

  return {
    avatarUrl: user.imageUrl || null,
    displayName,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
