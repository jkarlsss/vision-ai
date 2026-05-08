import { z } from "zod";

import { isValidProjectRoomId } from "@/lib/project-room-id";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_SHAPES,
  isCanvasNodeColor,
} from "@/types/canvas";
import { aiChatFeedPayloadSchema } from "@/types/tasks";

export const GENERATE_SPEC_TASK_ID = "generate-spec" as const;

const roomIdSchema = z
  .string()
  .trim()
  .refine(isValidProjectRoomId, "Room ID must be a valid project ID.");

const positionSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .strict();

const nodeDataSchema = z
  .object({
    color: z.custom(isCanvasNodeColor, "Node color must use the canvas palette."),
    label: z.string().trim().max(200),
    shape: z.enum(NODE_SHAPES),
  })
  .passthrough();

const canvasNodeSchema = z
  .object({
    data: nodeDataSchema,
    height: z.number().positive().optional(),
    id: z.string().trim().min(1).max(200),
    position: positionSchema,
    type: z.string().optional(),
    width: z.number().positive().optional(),
  })
  .passthrough()
  .transform((node) => ({
    data: {
      color: node.data.color,
      label: node.data.label,
      shape: node.data.shape,
    },
    height: node.height,
    id: node.id,
    position: node.position,
    type: CANVAS_NODE_TYPE,
    width: node.width,
  }));

const edgeDataSchema = z
  .object({
    label: z.string().trim().max(200).optional(),
  })
  .passthrough()
  .optional();

const canvasEdgeSchema = z
  .object({
    data: edgeDataSchema,
    id: z.string().trim().min(1).max(200),
    source: z.string().trim().min(1).max(200),
    sourceHandle: z.string().trim().min(1).max(80).optional(),
    target: z.string().trim().min(1).max(200),
    targetHandle: z.string().trim().min(1).max(80).optional(),
    type: z.string().optional(),
  })
  .passthrough()
  .transform((edge) => ({
    data: {
      label: edge.data?.label ?? "",
    },
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    type: CANVAS_EDGE_TYPE,
  }));

const generateSpecRequestFields = {
  chatHistory: z.array(aiChatFeedPayloadSchema).max(100),
  edges: z.array(canvasEdgeSchema).max(400),
  nodes: z.array(canvasNodeSchema).max(200),
  roomId: roomIdSchema,
} as const;

export const generateSpecRequestSchema = z
  .object(generateSpecRequestFields)
  .strict();

export const generateSpecPayloadSchema = z
  .object({
    projectId: roomIdSchema,
    ...generateSpecRequestFields,
  })
  .strict()
  .refine((payload) => payload.projectId === payload.roomId, {
    message: "Project ID must match the room ID.",
    path: ["projectId"],
  });

export type GenerateSpecRequest = z.infer<typeof generateSpecRequestSchema>;
export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;
export type GenerateSpecResult = string;
