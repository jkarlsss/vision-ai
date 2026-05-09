import { auth, currentUser } from "@clerk/nextjs/server";

import type { CurrentClerkIdentity } from "@/lib/project-access";
import { checkProjectAccessByOwnerOrCollaborator } from "@/lib/project-access";
import { isApiErrorResult, jsonError, readJsonObject } from "@/lib/project-api";
import {
  ensureLiveblocksRoom,
  getLiveblocksClient,
  getLiveblocksCursorColor,
} from "@/lib/liveblocks";
import { ensureAiChatFeed } from "@/lib/liveblocks-ai-chat";
import { ensureAiStatusFeed } from "@/lib/liveblocks-ai-status";
import { isValidProjectRoomId } from "@/lib/project-room-id";

interface AuthenticatedLiveblocksUser {
  identity: CurrentClerkIdentity;
  userInfo: Liveblocks["UserMeta"]["info"];
}

interface LiveblocksRoomIdResult {
  roomId: string;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return await handleLiveblocksAuth(request);
  } catch (error) {
    console.error("Liveblocks authentication failed.", error);

    return Response.json(
      { error: "Liveblocks authentication failed." },
      { status: 500 },
    );
  }
}

async function handleLiveblocksAuth(request: Request) {
  const userResult = await requireAuthenticatedLiveblocksUser();

  if (isApiErrorResult(userResult)) {
    return userResult.response;
  }

  const bodyResult = await readJsonObject(request);

  if (isApiErrorResult(bodyResult)) {
    return bodyResult.response;
  }

  const roomResult = getLiveblocksRoomId(bodyResult.data);

  if (isApiErrorResult(roomResult)) {
    return roomResult.response;
  }

  const accessResult = await checkProjectAccessByOwnerOrCollaborator(
    roomResult.roomId,
    userResult.identity,
  );

  if (!accessResult) {
    return jsonError("Forbidden", 403);
  }

  await ensureLiveblocksRoom(accessResult.project.id);
  await ensureAiRoomFeeds(accessResult.project.id);

  const liveblocks = getLiveblocksClient();
  const session = liveblocks.prepareSession(userResult.identity.userId, {
    userInfo: userResult.userInfo,
  });

  session.allow(accessResult.project.id, session.FULL_ACCESS);

  const { body, status } = await session.authorize();

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

async function ensureAiRoomFeeds(roomId: string) {
  const results = await Promise.allSettled([
    ensureAiStatusFeed(roomId),
    ensureAiChatFeed(roomId),
  ]);
  const failedResults = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failedResults.length === 0) {
    return;
  }

  console.error(
    "Liveblocks AI feed setup failed; continuing room authentication.",
    failedResults.map((result) => getErrorLogMessage(result.reason)),
  );
}

async function requireAuthenticatedLiveblocksUser() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return { response: jsonError("Unauthorized", 401) };
  }

  const user = await currentUser();
  const primaryEmail = getPrimaryEmailAddress(user);

  return {
    identity: {
      primaryEmail,
      userId,
    },
    userInfo: {
      avatarUrl: user?.imageUrl || null,
      cursorColor: getLiveblocksCursorColor(userId),
      displayName: getDisplayName(user, primaryEmail),
    },
  } satisfies AuthenticatedLiveblocksUser;
}

function getLiveblocksRoomId(
  input: Record<string, unknown>,
): LiveblocksRoomIdResult | { response: Response } {
  const value = input.room;

  if (typeof value !== "string") {
    return { response: jsonError("Room ID must be a string.", 400) };
  }

  const roomId = value.trim();

  if (!isValidProjectRoomId(roomId)) {
    return { response: jsonError("Room ID must be a valid project ID.", 400) };
  }

  return { roomId };
}

function getDisplayName(
  user: Awaited<ReturnType<typeof currentUser>>,
  primaryEmail: string | null,
) {
  return (
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    primaryEmail ||
    "Vision AI User"
  );
}

function getPrimaryEmailAddress(
  user: Awaited<ReturnType<typeof currentUser>>,
) {
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
    )?.emailAddress ??
    null;

  return primaryEmail?.trim() || null;
}

function getErrorLogMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
