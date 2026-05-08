import { tasks } from "@trigger.dev/sdk";

import { getGenerateSpecRequest } from "@/lib/spec-generation-api";
import { readJsonObject } from "@/lib/project-api";
import {
  isShareApiErrorResult,
  requireAuthenticatedShareIdentity,
  requireProjectShareAccess,
} from "@/lib/project-share";
import {
  GENERATE_SPEC_TASK_ID,
  type GenerateSpecPayload,
  type GenerateSpecRequest,
} from "@/types/spec-generation";
import type { generateSpec } from "@/trigger/generate-spec";

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

  const specRequest = getGenerateSpecRequest(bodyResult.data);

  if ("response" in specRequest) {
    return specRequest.response;
  }

  const projectId = specRequest.roomId;
  const accessResult = await requireProjectShareAccess(
    projectId,
    identityResult.identity,
  );

  if (isShareApiErrorResult(accessResult)) {
    return accessResult.response;
  }

  const triggerResult = await triggerGenerateSpec(
    specRequest,
    projectId,
    identityResult.identity.userId,
  );

  if ("response" in triggerResult) {
    return triggerResult.response;
  }

  try {
    await accessResult.prisma.taskRun.create({
      data: {
        projectId,
        runId: triggerResult.runId,
        userId: identityResult.identity.userId,
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("Spec generation task run tracking failed.", error);

    return Response.json(
      { error: "Spec run could not be tracked." },
      { status: 500 },
    );
  }

  return Response.json({ runId: triggerResult.runId }, { status: 202 });
}

async function triggerGenerateSpec(
  specRequest: GenerateSpecRequest,
  projectId: string,
  userId: string,
) {
  const payload: GenerateSpecPayload = {
    chatHistory: specRequest.chatHistory,
    edges: specRequest.edges,
    nodes: specRequest.nodes,
    projectId,
    roomId: specRequest.roomId,
  };

  try {
    const handle = await tasks.trigger<typeof generateSpec>(
      GENERATE_SPEC_TASK_ID,
      payload,
      {
        metadata: {
          projectId,
          roomId: specRequest.roomId,
          scope: "spec",
          userId,
        },
      },
    );

    return { runId: handle.id };
  } catch (error) {
    console.error("Spec generation task trigger failed.", error);

    return {
      response: Response.json(
        { error: "Spec generation could not be started." },
        { status: 502 },
      ),
    };
  }
}
