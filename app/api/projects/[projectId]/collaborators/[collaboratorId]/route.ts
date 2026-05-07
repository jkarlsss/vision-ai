import {
  enrichCollaborators,
  projectCollaboratorSelect,
} from "@/lib/project-share";
import {
  isApiErrorResult,
  jsonError,
  requireAuthenticatedUserId,
  requireProjectOwner,
} from "@/lib/project-api";

interface ProjectCollaboratorRouteContext {
  params: Promise<{
    collaboratorId: string;
    projectId: string;
  }>;
}

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: ProjectCollaboratorRouteContext,
) {
  const authResult = await requireAuthenticatedUserId();

  if (isApiErrorResult(authResult)) {
    return authResult.response;
  }

  const paramsResult = await getRouteParams(context);

  if ("response" in paramsResult) {
    return paramsResult.response;
  }

  const ownerResult = await requireProjectOwner(
    paramsResult.projectId,
    authResult.userId,
  );

  if (isApiErrorResult(ownerResult)) {
    return ownerResult.response;
  }

  const collaborator = await ownerResult.prisma.projectCollaborator.findFirst({
    where: {
      id: paramsResult.collaboratorId,
      projectId: paramsResult.projectId,
    },
    select: projectCollaboratorSelect,
  });

  if (!collaborator) {
    return jsonError("Collaborator not found.", 404);
  }

  await ownerResult.prisma.projectCollaborator.delete({
    where: { id: collaborator.id },
  });

  const [enrichedCollaborator] = await enrichCollaborators([collaborator]);

  return Response.json({ collaborator: enrichedCollaborator });
}

async function getRouteParams(context: ProjectCollaboratorRouteContext) {
  const { collaboratorId, projectId } = await context.params;
  const trimmedCollaboratorId = collaboratorId.trim();
  const trimmedProjectId = projectId.trim();

  if (!trimmedProjectId) {
    return { response: jsonError("Project ID is required.", 400) };
  }

  if (!trimmedCollaboratorId) {
    return { response: jsonError("Collaborator ID is required.", 400) };
  }

  return {
    collaboratorId: trimmedCollaboratorId,
    projectId: trimmedProjectId,
  };
}
