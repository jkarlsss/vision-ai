import {
  getRenameProjectName,
  isApiErrorResult,
  jsonError,
  projectSelect,
  readJsonObject,
  requireAuthenticatedUserId,
  requireProjectOwner,
} from "@/lib/project-api";

interface ProjectRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: ProjectRouteContext,
) {
  const authResult = await requireAuthenticatedUserId();

  if (isApiErrorResult(authResult)) {
    return authResult.response;
  }

  const projectIdResult = await getProjectId(context);

  if (isApiErrorResult(projectIdResult)) {
    return projectIdResult.response;
  }

  const ownerResult = await requireProjectOwner(
    projectIdResult.projectId,
    authResult.userId,
  );

  if (isApiErrorResult(ownerResult)) {
    return ownerResult.response;
  }

  const bodyResult = await readJsonObject(request);

  if (isApiErrorResult(bodyResult)) {
    return bodyResult.response;
  }

  const nameResult = getRenameProjectName(bodyResult.data);

  if (isApiErrorResult(nameResult)) {
    return nameResult.response;
  }

  const project = await ownerResult.prisma.project.update({
    where: { id: projectIdResult.projectId },
    data: { name: nameResult.name },
    select: projectSelect,
  });

  return Response.json({ project });
}

export async function DELETE(
  _request: Request,
  context: ProjectRouteContext,
) {
  const authResult = await requireAuthenticatedUserId();

  if (isApiErrorResult(authResult)) {
    return authResult.response;
  }

  const projectIdResult = await getProjectId(context);

  if (isApiErrorResult(projectIdResult)) {
    return projectIdResult.response;
  }

  const ownerResult = await requireProjectOwner(
    projectIdResult.projectId,
    authResult.userId,
  );

  if (isApiErrorResult(ownerResult)) {
    return ownerResult.response;
  }

  const project = await ownerResult.prisma.project.delete({
    where: { id: projectIdResult.projectId },
    select: projectSelect,
  });

  return Response.json({ project });
}

async function getProjectId(context: ProjectRouteContext) {
  const { projectId } = await context.params;
  const trimmedProjectId = projectId.trim();

  if (!trimmedProjectId) {
    return { response: jsonError("Project ID is required.", 400) };
  }

  return { projectId: trimmedProjectId };
}
