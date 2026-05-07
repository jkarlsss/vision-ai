import {
  enrichCollaborators,
  getInviteCollaboratorEmail,
  hasPrismaErrorCode,
  isShareApiErrorResult,
  projectCollaboratorSelect,
  requireAuthenticatedShareIdentity,
  requireProjectShareAccess,
} from "@/lib/project-share";
import {
  isApiErrorResult,
  jsonError,
  readJsonObject,
  requireAuthenticatedUserId,
  requireProjectOwner,
} from "@/lib/project-api";

interface ProjectCollaboratorsRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: ProjectCollaboratorsRouteContext,
) {
  const identityResult = await requireAuthenticatedShareIdentity();

  if (isShareApiErrorResult(identityResult)) {
    return identityResult.response;
  }

  const projectIdResult = await getProjectId(context);

  if (isShareApiErrorResult(projectIdResult)) {
    return projectIdResult.response;
  }

  const accessResult = await requireProjectShareAccess(
    projectIdResult.projectId,
    identityResult.identity,
  );

  if (isShareApiErrorResult(accessResult)) {
    return accessResult.response;
  }

  const collaborators = await accessResult.prisma.projectCollaborator.findMany({
    where: { projectId: projectIdResult.projectId },
    orderBy: { createdAt: "asc" },
    select: projectCollaboratorSelect,
  });

  return Response.json({
    access: accessResult.access,
    collaborators: await enrichCollaborators(collaborators),
  });
}

export async function POST(
  request: Request,
  context: ProjectCollaboratorsRouteContext,
) {
  const authResult = await requireAuthenticatedUserId();

  if (isApiErrorResult(authResult)) {
    return authResult.response;
  }

  const projectIdResult = await getProjectId(context);

  if (isShareApiErrorResult(projectIdResult)) {
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

  const emailResult = getInviteCollaboratorEmail(bodyResult.data);

  if (isShareApiErrorResult(emailResult)) {
    return emailResult.response;
  }

  try {
    const collaborator = await ownerResult.prisma.projectCollaborator.create({
      data: {
        email: emailResult.email,
        projectId: projectIdResult.projectId,
      },
      select: projectCollaboratorSelect,
    });
    const [enrichedCollaborator] = await enrichCollaborators([collaborator]);

    return Response.json(
      { collaborator: enrichedCollaborator },
      { status: 201 },
    );
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      return jsonError("Collaborator already exists.", 409);
    }

    throw error;
  }
}

async function getProjectId(context: ProjectCollaboratorsRouteContext) {
  const { projectId } = await context.params;
  const trimmedProjectId = projectId.trim();

  if (!trimmedProjectId) {
    return { response: jsonError("Project ID is required.", 400) };
  }

  return { projectId: trimmedProjectId };
}
