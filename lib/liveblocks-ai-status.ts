import "server-only";

import { getLiveblocksClient } from "@/lib/liveblocks";
import {
  AI_STATUS_FEED_ID,
  type AiStatusFeedPayload,
  type AiStatusLevel,
  type AiStatusPhase,
  type AiStatusScope,
} from "@/types/tasks";

interface AppendAiStatusOptions {
  level: AiStatusLevel;
  message: string;
  phase: AiStatusPhase;
  runId: string;
  scope?: AiStatusScope;
}

const aiStatusFeedMetadata = {
  kind: "ai-status",
  name: "AI status feed",
} as const;

export async function ensureAiStatusFeed(roomId: string) {
  const liveblocks = getLiveblocksClient();

  try {
    await liveblocks.getFeed({
      feedId: AI_STATUS_FEED_ID,
      roomId,
    });
    return;
  } catch (error) {
    if (!isLiveblocksStatus(error, 404)) {
      throw error;
    }
  }

  try {
    await liveblocks.createFeed({
      feedId: AI_STATUS_FEED_ID,
      metadata: aiStatusFeedMetadata,
      roomId,
    });
  } catch (error) {
    if (!isLiveblocksStatus(error, 409)) {
      throw error;
    }
  }
}

export async function appendAiStatusMessage(
  roomId: string,
  options: AppendAiStatusOptions,
) {
  await ensureAiStatusFeed(roomId);

  const payload: AiStatusFeedPayload = {
    level: options.level,
    phase: options.phase,
    runId: options.runId,
    scope: options.scope ?? "design",
    text: options.message,
  };

  await getLiveblocksClient().createFeedMessage({
    data: payload,
    feedId: AI_STATUS_FEED_ID,
    roomId,
  });
}

function isLiveblocksStatus(error: unknown, status: number) {
  return getLiveblocksErrorStatus(error) === status;
}

function getLiveblocksErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;

  return typeof status === "number" ? status : null;
}
