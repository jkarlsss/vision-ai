import { get, put } from "@vercel/blob";

import {
  isShareApiErrorResult,
  requireAuthenticatedShareIdentity,
  requireProjectShareAccess,
} from "@/lib/project-share";
import { jsonError, readJsonObject } from "@/lib/project-api";
import { isValidProjectRoomId } from "@/lib/project-room-id";
import {
  parseCanvasSnapshot,
  serializeCanvasSnapshot,
  type CanvasSnapshot,
} from "@/types/canvas";

interface ProjectCanvasRouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export const runtime = "nodejs";

const canvasBlobAccess = "private" as const;

export async function GET(
  _request: Request,
  context: ProjectCanvasRouteContext,
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

  const project = await accessResult.prisma.project.findUnique({
    where: { id: projectIdResult.projectId },
    select: { canvasJsonPath: true },
  });

  if (!project) {
    return jsonError("Project not found.", 404);
  }

  if (!project.canvasJsonPath) {
    return Response.json({ canvas: null });
  }

  const canvas = await fetchSavedCanvasSnapshot(project.canvasJsonPath);

  if (!canvas) {
    return Response.json(
      { error: "Saved canvas could not be loaded." },
      { status: 502 },
    );
  }

  return Response.json({ canvas });
}

export async function PUT(
  request: Request,
  context: ProjectCanvasRouteContext,
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

  const bodyResult = await readJsonObject(request);

  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  const canvas = parseCanvasSnapshot(bodyResult.data);

  if (!canvas) {
    return jsonError("Canvas JSON must include valid nodes and edges.", 400);
  }

  let blob: Awaited<ReturnType<typeof put>>;

  try {
    blob = await put(
      `canvas/${projectIdResult.projectId}.json`,
      serializeCanvasSnapshot(canvas),
      {
        access: canvasBlobAccess,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      },
    );
  } catch (error) {
    console.error("Canvas snapshot upload failed.", error);

    return Response.json(
      { error: "Canvas could not be saved to Vercel Blob." },
      { status: 502 },
    );
  }

  await accessResult.prisma.project.update({
    where: { id: projectIdResult.projectId },
    data: { canvasJsonPath: blob.url },
    select: { id: true },
  });

  return Response.json({
    canvas,
    canvasJsonPath: blob.url,
  });
}

async function getProjectId(context: ProjectCanvasRouteContext) {
  const { projectId } = await context.params;
  const trimmedProjectId = projectId.trim();

  if (!isValidProjectRoomId(trimmedProjectId)) {
    return { response: jsonError("Project ID must be a valid room ID.", 400) };
  }

  return { projectId: trimmedProjectId };
}

async function fetchSavedCanvasSnapshot(
  pathOrUrl: string,
): Promise<CanvasSnapshot | null> {
  try {
    const blob = await get(getCanvasBlobPathname(pathOrUrl), {
      access: canvasBlobAccess,
      useCache: false,
    });

    if (!blob?.stream || blob.statusCode !== 200) {
      return null;
    }

    const data: unknown = await new Response(blob.stream).json();

    return parseCanvasSnapshot(data);
  } catch (error) {
    console.error("Saved canvas snapshot fetch failed.", error);

    return null;
  }
}

function getCanvasBlobPathname(pathOrUrl: string) {
  try {
    return new URL(pathOrUrl).pathname.replace(/^\/+/, "");
  } catch {
    return pathOrUrl.replace(/^\/+/, "");
  }
}
