import { auth as triggerAuth } from "@trigger.dev/sdk";

import { getDesignAgentTokenRequest } from "@/lib/design-agent-api";
import { getPrismaClient, jsonError, readJsonObject } from "@/lib/project-api";
import {
  isShareApiErrorResult,
  requireAuthenticatedShareIdentity,
  requireProjectShareAccess,
} from "@/lib/project-share";
import { DESIGN_AGENT_TASK_ID } from "@/types/design-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identityResult = await requireAuthenticatedShareIdentity();

  if (isShareApiErrorResult(identityResult)) {
    return identityResult.response;
  }

  const bodyResult = await readJsonObject(request);

  if ("response" in bodyResult) {
    return bodyResult.response;
  }

  const tokenRequest = getDesignAgentTokenRequest(bodyResult.data);

  if ("response" in tokenRequest) {
    return tokenRequest.response;
  }

  const taskRunResult = await requireOwnedTaskRun(
    tokenRequest.runId,
    identityResult.identity.userId,
  );

  if ("response" in taskRunResult) {
    return taskRunResult.response;
  }

  const accessResult = await requireProjectShareAccess(
    taskRunResult.projectId,
    identityResult.identity,
  );

  if (isShareApiErrorResult(accessResult)) {
    return accessResult.response;
  }

  try {
    const token = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [tokenRequest.runId],
          tasks: [DESIGN_AGENT_TASK_ID],
        },
      },
      expirationTime: "15m",
    });

    return Response.json({ token });
  } catch (error) {
    console.error("Design agent run token creation failed.", error);

    return Response.json(
      { error: "Design run token could not be created." },
      { status: 502 },
    );
  }
}

async function requireOwnedTaskRun(runId: string, userId: string) {
  const prisma = await getPrismaClient();
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
    select: {
      projectId: true,
      userId: true,
    },
  });

  if (!taskRun) {
    return { response: jsonError("Task run not found.", 404) };
  }

  if (taskRun.userId !== userId) {
    return { response: jsonError("Forbidden", 403) };
  }

  return { projectId: taskRun.projectId };
}
