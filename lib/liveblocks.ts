import "server-only";

import { Liveblocks } from "@liveblocks/node";

const cursorColorPalette = [
  "#52A8FF",
  "#BF7AF0",
  "#FF990A",
  "#FF6166",
  "#F75F8F",
  "#62C073",
  "#0AC7B4",
  "#00C8D4",
] as const;

const globalForLiveblocks = globalThis as typeof globalThis & {
  liveblocks?: Liveblocks;
};

export function getLiveblocksClient() {
  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = new Liveblocks({
      secret: getLiveblocksSecretKey(),
    });
  }

  return globalForLiveblocks.liveblocks;
}

export function getLiveblocksCursorColor(userId: string) {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }

  return cursorColorPalette[hash % cursorColorPalette.length];
}

export async function ensureLiveblocksRoom(roomId: string) {
  return getLiveblocksClient().getOrCreateRoom(roomId, {
    defaultAccesses: [],
  });
}

function getLiveblocksSecretKey() {
  const secretKey = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secretKey) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required to initialize Liveblocks.");
  }

  return secretKey;
}
