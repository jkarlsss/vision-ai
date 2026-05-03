import {
  getCreateProjectId,
  getCreateProjectName,
  getPrismaClient,
  isApiErrorResult,
  jsonError,
  projectSelect,
  readJsonObject,
  requireAuthenticatedUserId,
} from "@/lib/project-api";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireAuthenticatedUserId();

  if (isApiErrorResult(authResult)) {
    return authResult.response;
  }

  const prisma = await getPrismaClient();
  const projects = await prisma.project.findMany({
    where: { ownerId: authResult.userId },
    orderBy: { createdAt: "desc" },
    select: projectSelect,
  });

  return Response.json({ projects });
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUserId();

  if (isApiErrorResult(authResult)) {
    return authResult.response;
  }

  const bodyResult = await readJsonObject(request);

  if (isApiErrorResult(bodyResult)) {
    return bodyResult.response;
  }

  const nameResult = getCreateProjectName(bodyResult.data);

  if (isApiErrorResult(nameResult)) {
    return nameResult.response;
  }

  const idResult = getCreateProjectId(bodyResult.data);

  if (isApiErrorResult(idResult)) {
    return idResult.response;
  }

  const prisma = await getPrismaClient();
  const projectData = idResult.projectId
    ? {
        id: idResult.projectId,
        name: nameResult.name,
        ownerId: authResult.userId,
      }
    : {
        name: nameResult.name,
        ownerId: authResult.userId,
      };

  try {
    const project = await prisma.project.create({
      data: projectData,
      select: projectSelect,
    });

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return jsonError("Project ID already exists.", 409);
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
