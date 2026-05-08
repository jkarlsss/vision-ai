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

export interface CanvasEdgeData extends Record<string, unknown> {
  label?: string;
}

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;
export type CanvasEdge = Edge<
  CanvasEdgeData,
  typeof CANVAS_EDGE_TYPE | "smoothstep"
>;

export interface CanvasSnapshot {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
}

type CanvasNodeStyle = NonNullable<CanvasNode["style"]>;

export function createCanvasSnapshot(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
): CanvasSnapshot {
  return {
    edges: edges.map(normalizeCanvasEdge),
    nodes: nodes.map(normalizeCanvasNode),
  };
}

export function parseCanvasSnapshot(value: unknown): CanvasSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null;
  }

  const nodes = value.nodes.map(parseCanvasNode);
  const edges = value.edges.map(parseCanvasEdge);

  if (nodes.some((node) => node === null) || edges.some((edge) => edge === null)) {
    return null;
  }

  return {
    edges: edges as CanvasEdge[],
    nodes: nodes as CanvasNode[],
  };
}

export function serializeCanvasSnapshot(snapshot: CanvasSnapshot) {
  return JSON.stringify(createCanvasSnapshot(snapshot.nodes, snapshot.edges));
}

export function isCanvasNodeShape(value: unknown): value is CanvasNodeShape {
  return (
    typeof value === "string" &&
    NODE_SHAPES.includes(value as CanvasNodeShape)
  );
}

export function isCanvasNodeColor(value: unknown): value is CanvasNodeColor {
  return (
    isRecord(value) &&
    NODE_COLORS.some(
      (color) => value.fill === color.fill && value.text === color.text,
    )
  );
}

function normalizeCanvasNode(node: CanvasNode): CanvasNode {
  const normalizedNode: CanvasNode = {
    data: {
      color: node.data.color,
      label: node.data.label,
      shape: node.data.shape,
    },
    id: node.id,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    type: CANVAS_NODE_TYPE,
  };

  copyOptionalNumber(normalizedNode, "height", node.height);
  copyOptionalNumber(normalizedNode, "width", node.width);

  if (node.style) {
    normalizedNode.style = sanitizeCanvasStyle(node.style);
  }

  return normalizedNode;
}

function normalizeCanvasEdge(edge: CanvasEdge): CanvasEdge {
  const normalizedEdge: CanvasEdge = {
    data: {
      label: typeof edge.data?.label === "string" ? edge.data.label : "",
    },
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: CANVAS_EDGE_TYPE,
  };

  if (typeof edge.sourceHandle === "string") {
    normalizedEdge.sourceHandle = edge.sourceHandle;
  }

  if (typeof edge.targetHandle === "string") {
    normalizedEdge.targetHandle = edge.targetHandle;
  }

  return normalizedEdge;
}

function parseCanvasNode(value: unknown): CanvasNode | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  const position = parseCanvasPosition(value.position);
  const data = parseCanvasNodeData(value.data);

  if (!position || !data) {
    return null;
  }

  const node: CanvasNode = {
    data,
    id: value.id,
    position,
    type: CANVAS_NODE_TYPE,
  };
  const height = parsePositiveNumber(value.height);
  const width = parsePositiveNumber(value.width);
  const style = parseCanvasStyle(value.style);

  if (height !== null) {
    node.height = height;
  }

  if (width !== null) {
    node.width = width;
  }

  if (style) {
    node.style = style;
  }

  return node;
}

function parseCanvasEdge(value: unknown): CanvasEdge | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.source !== "string" ||
    typeof value.target !== "string"
  ) {
    return null;
  }

  const edge: CanvasEdge = {
    data: {
      label: getCanvasEdgeLabel(value.data),
    },
    id: value.id,
    source: value.source,
    target: value.target,
    type: CANVAS_EDGE_TYPE,
  };

  if (typeof value.sourceHandle === "string") {
    edge.sourceHandle = value.sourceHandle;
  }

  if (typeof value.targetHandle === "string") {
    edge.targetHandle = value.targetHandle;
  }

  return edge;
}

function parseCanvasNodeData(value: unknown): CanvasNodeData | null {
  if (!isRecord(value) || !isCanvasNodeColor(value.color) || !isCanvasNodeShape(value.shape)) {
    return null;
  }

  return {
    color: value.color,
    label: typeof value.label === "string" ? value.label : "",
    shape: value.shape,
  };
}

function parseCanvasPosition(value: unknown) {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return null;
  }

  return {
    x: value.x,
    y: value.y,
  };
}

function parseCanvasStyle(value: unknown): CanvasNodeStyle | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return sanitizeCanvasStyle(value);
}

function sanitizeCanvasStyle(style: object): CanvasNodeStyle {
  const safeStyle: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(style)) {
    if (typeof value === "string" || typeof value === "number") {
      safeStyle[key] = value;
    }
  }

  return safeStyle as CanvasNodeStyle;
}

function getCanvasEdgeLabel(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }

  return typeof value.label === "string" ? value.label : "";
}

function parsePositiveNumber(value: unknown) {
  return isFiniteNumber(value) && value > 0 ? value : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function copyOptionalNumber<T extends CanvasNode>(
  node: T,
  key: "height" | "width",
  value: number | undefined,
) {
  if (value !== undefined) {
    node[key] = value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
