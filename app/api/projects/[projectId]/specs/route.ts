import {
  isShareApiErrorResult,
  requireAuthenticatedShareIdentity,
  requireProjectShareAccess,
} from "@/lib/project-share";
import { jsonError } from "@/lib/project-api";
import { isValidProjectRoomId } from "@/lib/project-room-id";
import { getSpecDownloadFilename } from "@/lib/spec-routes";

interface ProjectSpecsRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: ProjectSpecsRouteContext,
) {
  const identityResult = await requireAuthenticatedShareIdentity();

  if (isShareApiErrorResult(identityResult)) {
    return identityResult.response;
  }

  const projectIdResult = await getProjectId(context);

  if ("response" in projectIdResult) {
    return projectIdResult.response;
  }

  const accessResult = await requireProjectShareAccess(
    projectIdResult.projectId,
    identityResult.identity,
  );

  if (isShareApiErrorResult(accessResult)) {
    return accessResult.response;
  }

  const specs = await accessResult.prisma.projectSpec.findMany({
    where: { projectId: projectIdResult.projectId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      id: true,
    },
  });

  return Response.json({
    specs: specs.map((spec) => ({
      createdAt: spec.createdAt.toISOString(),
      filename: getSpecDownloadFilename(projectIdResult.projectId, spec.id),
      id: spec.id,
    })),
  });
}

async function getProjectId(context: ProjectSpecsRouteContext) {
  const { projectId } = await context.params;
  const trimmedProjectId = projectId.trim();

  if (!isValidProjectRoomId(trimmedProjectId)) {
    return { response: jsonError("Project ID must be a valid room ID.", 400) };
  }

  return { projectId: trimmedProjectId };
}
