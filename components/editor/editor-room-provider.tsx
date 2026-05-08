"use client";

import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import type { ReactNode } from "react";

interface EditorRoomProviderProps {
  children: ReactNode;
  roomId: string;
}

export function EditorRoomProvider({
  children,
  roomId,
}: EditorRoomProviderProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
        key={roomId}
      >
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  );
}
