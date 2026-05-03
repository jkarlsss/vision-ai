import { auth } from "@clerk/nextjs/server";

import { DEFAULT_PROJECT_NAME } from "@/lib/project-constants";
import { isValidProjectRoomId } from "@/lib/project-room-id";

export const projectSelect = {
  id: true,
  ownerId: true,
  name: true,
  description: true,
  status: true,
  canvasJsonPath: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ApiErrorStatus = 400 | 401 | 403 | 404 | 409;

interface ApiErrorResult {
  response: Response;
}

interface AuthenticatedUserResult {
  userId: string;
}

interface JsonObjectResult {
  data: Record<string, unknown>;
}

interface ProjectNameResult {
  name: string;
}

interface CreateProjectIdResult {
  projectId: string | null;
}

export function isApiErrorResult(result: unknown): result is ApiErrorResult {
  return isRecord(result) && "response" in result;
}

export function jsonError(message: string, status: ApiErrorStatus) {
  return Response.json({ error: message }, { status });
}

export async function requireAuthenticatedUserId(): Promise<
  AuthenticatedUserResult | ApiErrorResult
> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return { response: jsonError("Unauthorized", 401) };
  }

  return { userId };
}

export async function getPrismaClient() {
  const { prisma } = await import("@/lib/prisma");

  return prisma;
}

export async function readJsonObject(
  request: Request,
): Promise<JsonObjectResult | ApiErrorResult> {
  const body = await request.text();

  if (!body.trim()) {
    return { data: {} };
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(body);
  } catch {
    return { response: jsonError("Request body must be valid JSON.", 400) };
  }

  if (!isRecord(parsedBody)) {
    return { response: jsonError("Request body must be a JSON object.", 400) };
  }

  return { data: parsedBody };
}

export function getCreateProjectName(
  input: Record<string, unknown>,
): ProjectNameResult | ApiErrorResult {
  const value = input.name;

  if (value === undefined || value === null) {
    return { name: DEFAULT_PROJECT_NAME };
  }

  if (typeof value !== "string") {
    return { response: jsonError("Project name must be a string.", 400) };
  }

  return { name: value.trim() || DEFAULT_PROJECT_NAME };
}

export function getCreateProjectId(
  input: Record<string, unknown>,
): CreateProjectIdResult | ApiErrorResult {
  const value = input.id;

  if (value === undefined || value === null) {
    return { projectId: null };
  }

  if (typeof value !== "string") {
    return { response: jsonError("Project ID must be a string.", 400) };
  }

  const projectId = value.trim();

  if (!isValidProjectRoomId(projectId)) {
    return {
      response: jsonError("Project ID must be a valid room ID.", 400),
    };
  }

  return { projectId };
}

export function getRenameProjectName(
  input: Record<string, unknown>,
): ProjectNameResult | ApiErrorResult {
  const value = input.name;

  if (typeof value !== "string" || !value.trim()) {
    return {
      response: jsonError("Project name must be a non-empty string.", 400),
    };
  }

  return { name: value.trim() };
}

export async function requireProjectOwner(
  projectId: string,
  userId: string,
) {
  const prisma = await getPrismaClient();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return { response: jsonError("Project not found.", 404) };
  }

  if (project.ownerId !== userId) {
    return { response: jsonError("Forbidden", 403) };
  }

  return { prisma };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
