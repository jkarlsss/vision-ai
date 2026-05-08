import type { LiveblocksFlow } from "@liveblocks/react-flow";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type {
  AiChatFeedMetadata,
  AiChatFeedPayload,
  AiStatusFeedMetadata,
  AiStatusFeedPayload,
} from "@/types/tasks";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: {
        x: number;
        y: number;
      } | null;
      thinking?: boolean;
    };

    Storage: {
      flow?: LiveblocksFlow<CanvasNode, CanvasEdge>;
    };

    UserMeta: {
      id: string;
      info: {
        displayName: string;
        avatarUrl: string | null;
        cursorColor: string;
      };
    };

    RoomEvent: never;
    ThreadMetadata: Record<string, never>;
    FeedMetadata: AiChatFeedMetadata | AiStatusFeedMetadata;
    FeedMessageData: AiChatFeedPayload | AiStatusFeedPayload;
    RoomInfo: Record<string, never>;
    GroupInfo: Record<string, never>;
    ActivitiesData: Record<string, never>;
  }
}

export {};
