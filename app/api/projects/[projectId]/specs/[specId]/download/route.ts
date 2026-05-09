import {
  isShareApiErrorResult,
  requireAuthenticatedShareIdentity,
  requireProjectShareAccess,
} from "@/lib/project-share";
import { jsonError } from "@/lib/project-api";
import { isValidProjectRoomId } from "@/lib/project-room-id";
import { getSpecDownloadFilename } from "@/lib/spec-routes";
import { fetchSpecMarkdown, specMarkdownContentType } from "@/lib/spec-storage";

interface ProjectSpecDownloadRouteContext {
  params: Promise<{
    projectId: string;
    specId: string;
  }>;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: ProjectSpecDownloadRouteContext,
) {
  const identityResult = await requireAuthenticatedShareIdentity();

  if (isShareApiErrorResult(identityResult)) {
    return identityResult.response;
  }

  const paramsResult = await getDownloadParams(context);

  if ("response" in paramsResult) {
    return paramsResult.response;
  }

  const accessResult = await requireProjectShareAccess(
    paramsResult.projectId,
    identityResult.identity,
  );

  if (isShareApiErrorResult(accessResult)) {
    return accessResult.response;
  }

  const spec = await accessResult.prisma.projectSpec.findUnique({
    where: { id: paramsResult.specId },
    select: {
      filePath: true,
      projectId: true,
    },
  });

  if (!spec || spec.projectId !== paramsResult.projectId) {
    return jsonError("Spec not found.", 404);
  }

  const fileResult = await getSpecFile(spec.filePath);

  if ("response" in fileResult) {
    return fileResult.response;
  }

  return new Response(fileResult.stream, {
    headers: getDownloadHeaders({
      filename: getSpecDownloadFilename(
        paramsResult.projectId,
        paramsResult.specId,
      ),
      size: fileResult.size,
    }),
  });
}

async function getDownloadParams(context: ProjectSpecDownloadRouteContext) {
  const { projectId, specId } = await context.params;
  const trimmedProjectId = projectId.trim();
  const trimmedSpecId = specId.trim();

  if (!isValidProjectRoomId(trimmedProjectId)) {
    return { response: jsonError("Project ID must be a valid room ID.", 400) };
  }

  if (!isValidSpecId(trimmedSpecId)) {
    return { response: jsonError("Spec ID must be valid.", 400) };
  }

  return {
    projectId: trimmedProjectId,
    specId: trimmedSpecId,
  };
}

async function getSpecFile(filePath: string) {
  try {
    const specFile = await fetchSpecMarkdown(filePath);

    if (!specFile) {
      return { response: jsonError("Spec file not found.", 404) };
    }

    return specFile;
  } catch (error) {
    console.error("Spec download fetch failed.", error);

    return {
      response: Response.json(
        { error: "Spec file could not be loaded." },
        { status: 502 },
      ),
    };
  }
}

function getDownloadHeaders(options: { filename: string; size: number }) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${options.filename}"`,
    "Content-Type": specMarkdownContentType,
  });

  if (options.size > 0) {
    headers.set("Content-Length", String(options.size));
  }

  return headers;
}

function isValidSpecId(value: string) {
  return value.length > 0 && value.length <= 120;
}
