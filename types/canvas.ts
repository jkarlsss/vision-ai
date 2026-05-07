import type { Edge, Node } from "@xyflow/react";

export const CANVAS_NODE_TYPE = "canvasNode" as const;
export const CANVAS_EDGE_TYPE = "canvasEdge" as const;

export const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED" },
  { fill: "#10233D", text: "#52A8FF" },
  { fill: "#2E1938", text: "#BF7AF0" },
  { fill: "#331B00", text: "#FF990A" },
  { fill: "#3C1618", text: "#FF6166" },
  { fill: "#3A1726", text: "#F75F8F" },
  { fill: "#0F2E18", text: "#62C073" },
  { fill: "#062822", text: "#0AC7B4" },
] as const;

export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const;

export type CanvasNodeColor = (typeof NODE_COLORS)[number];
export type CanvasNodeShape = (typeof NODE_SHAPES)[number];

export interface CanvasNodeSize {
  height: number;
  width: number;
}

export const DEFAULT_NODE_COLOR = NODE_COLORS[0];
export const DEFAULT_NODE_SHAPE = "rectangle" satisfies CanvasNodeShape;

export const NODE_DEFAULT_SIZES = {
  rectangle: { height: 88, width: 176 },
  diamond: { height: 140, width: 140 },
  circle: { height: 104, width: 104 },
  pill: { height: 72, width: 168 },
  cylinder: { height: 96, width: 144 },
  hexagon: { height: 96, width: 152 },
} as const satisfies Record<CanvasNodeShape, CanvasNodeSize>;

export interface CanvasNodeData extends Record<string, unknown> {
  color: CanvasNodeColor;
  label: string;
  shape: CanvasNodeShape;
}

export type CanvasEdgeData = Record<string, never>;

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;
export type CanvasEdge = Edge<
  CanvasEdgeData,
  typeof CANVAS_EDGE_TYPE | "smoothstep"
>;

export function isCanvasNodeShape(value: unknown): value is CanvasNodeShape {
  return (
    typeof value === "string" &&
    NODE_SHAPES.includes(value as CanvasNodeShape)
  );
}
