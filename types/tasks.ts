import { z } from "zod";

export const AI_CHAT_FEED_ID = "ai-chat" as const;
export const AI_STATUS_FEED_ID = "ai-status-feed" as const;

export const aiStatusLevelSchema = z.enum(["info", "success", "error"]);
export const aiStatusPhaseSchema = z.enum([
  "start",
  "processing",
  "complete",
  "error",
]);
export const aiStatusScopeSchema = z.enum(["design", "spec"]);

export const aiStatusFeedPayloadSchema = z
  .object({
    level: aiStatusLevelSchema,
    phase: aiStatusPhaseSchema,
    runId: z.string().min(1).optional(),
    scope: aiStatusScopeSchema.optional(),
    text: z.string().trim().min(1).max(240).optional(),
  })
  .strict();

export type AiStatusLevel = z.infer<typeof aiStatusLevelSchema>;
export type AiStatusPhase = z.infer<typeof aiStatusPhaseSchema>;
export type AiStatusScope = z.infer<typeof aiStatusScopeSchema>;
export type AiStatusFeedPayload = z.infer<typeof aiStatusFeedPayloadSchema>;

export const aiChatRoleSchema = z.enum(["user", "assistant"]);
export const aiChatSenderSchema = z
  .object({
    avatarUrl: z.string().trim().min(1).max(2048).nullable(),
    id: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(120),
  })
  .strict();
export const aiChatFeedPayloadSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
    role: aiChatRoleSchema,
    sender: aiChatSenderSchema,
    timestamp: z.number().int().positive(),
  })
  .strict();

export type AiChatRole = z.infer<typeof aiChatRoleSchema>;
export type AiChatSender = z.infer<typeof aiChatSenderSchema>;
export type AiChatFeedPayload = z.infer<typeof aiChatFeedPayloadSchema>;

export interface AiStatusFeedMetadata {
  kind: "ai-status";
  name: string;
}

export interface AiChatFeedMetadata {
  kind: "ai-chat";
  name: string;
}

export function parseAiStatusFeedPayload(
  value: unknown,
): AiStatusFeedPayload | null {
  const result = aiStatusFeedPayloadSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function parseAiChatFeedPayload(
  value: unknown,
): AiChatFeedPayload | null {
  const result = aiChatFeedPayloadSchema.safeParse(value);

  return result.success ? result.data : null;
}
