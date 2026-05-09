import "server-only";

import { getLiveblocksClient } from "@/lib/liveblocks";
import { AI_CHAT_FEED_ID } from "@/types/tasks";

const aiChatFeedMetadata = {
  kind: "ai-chat",
  name: "AI sidebar chat",
} as const;

export async function ensureAiChatFeed(roomId: string) {
  const liveblocks = getLiveblocksClient();

  try {
    await liveblocks.getFeed({
      feedId: AI_CHAT_FEED_ID,
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
      feedId: AI_CHAT_FEED_ID,
      metadata: aiChatFeedMetadata,
      roomId,
    });
  } catch (error) {
    if (!isLiveblocksStatus(error, 409)) {
      throw error;
    }
  }
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
