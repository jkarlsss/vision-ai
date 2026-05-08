import { tasks } from "@trigger.dev/sdk";

import {
  getDesignAgentRequest,
  type DesignAgentRequest,
} from "@/lib/design-agent-api";
import { readJsonObject } from "@/lib/project-api";
import {
  isShareApiErrorResult,
  requireAuthenticatedShareIdentity,
  requireProjectShareAccess,
} from "@/lib/project-share";
import {
  DESIGN_AGENT_TASK_ID,
  type DesignAgentPayload,
} from "@/types/design-agent";
import type { designAgentTask } from "@/trigger/design-agent";

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

  const designRequest = getDesignAgentRequest(bodyResult.data);

  if ("response" in designRequest) {
    return designRequest.response;
  }

  const accessResult = await requireProjectShareAccess(
    designRequest.projectId,
    identityResult.identity,
  );

  if (isShareApiErrorResult(accessResult)) {
    return accessResult.response;
  }

  const triggerResult = await triggerDesignAgent(
    designRequest,
    identityResult.identity.userId,
  );

  if ("response" in triggerResult) {
    return triggerResult.response;
  }

  try {
    await accessResult.prisma.taskRun.create({
      data: {
        projectId: designRequest.projectId,
        runId: triggerResult.runId,
        userId: identityResult.identity.userId,
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("Design agent task run tracking failed.", error);

    return Response.json(
      { error: "Design run could not be tracked." },
      { status: 500 },
    );
  }

  return Response.json({ runId: triggerResult.runId }, { status: 202 });
}

async function triggerDesignAgent(
  designRequest: DesignAgentRequest,
  userId: string,
) {
  const payload: DesignAgentPayload = {
    prompt: designRequest.prompt,
    roomId: designRequest.roomId,
  };

  try {
    const handle = await tasks.trigger<typeof designAgentTask>(
      DESIGN_AGENT_TASK_ID,
      payload,
      {
        metadata: {
          projectId: designRequest.projectId,
          roomId: designRequest.roomId,
          userId,
        },
      },
    );

    return { runId: handle.id };
  } catch (error) {
    console.error("Design agent task trigger failed.", error);

    return {
      response: Response.json(
        { error: "Design generation could not be started." },
        { status: 502 },
      ),
    };
  }
}
