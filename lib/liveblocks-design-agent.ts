import "server-only";

import { mutateFlow, type MutableFlow } from "@liveblocks/react-flow/node";

import { ensureAiStatusFeed } from "@/lib/liveblocks-ai-status";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  NODE_COLORS,
  NODE_DEFAULT_SIZES,
  createCanvasSnapshot,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeData,
  type CanvasNodeShape,
  type CanvasNodeSize,
  type CanvasSnapshot,
} from "@/types/canvas";
import type {
  AddEdgeDesignAction,
  AddNodeDesignAction,
  DesignAgentAction,
  DesignAgentPosition,
  ResizeNodeDesignAction,
  UpdateNodeDataDesignAction,
} from "@/types/design-agent";
import {
  ensureLiveblocksRoom,
  getLiveblocksClient,
} from "@/lib/liveblocks";

interface UpdateAiPresenceOptions {
  cursor: DesignAgentPosition | null;
  thinking: boolean;
  ttl?: number;
}

export interface ApplyDesignActionsResult {
  appliedActionCount: number;
  edgeCount: number;
  nodeCount: number;
  skippedActionCount: number;
}

interface NodeBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

const aiAgentUserId = "vision-ai-design-agent";
const aiAgentName = "Ghost AI";
const aiAgentColor = "#8b82ff";
const defaultPresenceTtlSeconds = 45;
const clearPresenceTtlSeconds = 2;
const maxCanvasCoordinate = 4_000;
const minCanvasCoordinate = -2_000;
const maxNodeDimension = 420;
const minNodeDimension = 48;
const nodeGridSize = 20;
const nodeSpacing = 56;
const maxNodeLabelLength = 72;
const maxEdgeLabelLength = 48;
const validHandleIds = new Set(["top", "right", "bottom", "left"]);

export async function prepareDesignAgentRoom(roomId: string) {
  await ensureLiveblocksRoom(roomId);
  await ensureAiStatusFeed(roomId);
}

export async function readDesignCanvasSnapshot(
  roomId: string,
): Promise<CanvasSnapshot> {
  let snapshot = createCanvasSnapshot([], []);

  await mutateFlow<CanvasNode, CanvasEdge>(
    { client: getLiveblocksClient(), roomId },
    (flow) => {
      snapshot = createCanvasSnapshot(flow.nodes, flow.edges);
    },
  );

  return snapshot;
}

export async function applyDesignActions(
  roomId: string,
  actions: readonly DesignAgentAction[],
): Promise<ApplyDesignActionsResult> {
  let result: ApplyDesignActionsResult = {
    appliedActionCount: 0,
    edgeCount: 0,
    nodeCount: 0,
    skippedActionCount: 0,
  };

  await mutateFlow<CanvasNode, CanvasEdge>(
    { client: getLiveblocksClient(), roomId },
    (flow) => {
      result = applyActionsToFlow(flow, actions);
    },
  );

  return result;
}

export async function updateDesignAgentPresence(
  roomId: string,
  options: UpdateAiPresenceOptions,
) {
  await getLiveblocksClient().setPresence(roomId, {
    data: {
      cursor: options.cursor
        ? {
            x: options.cursor.x,
            y: options.cursor.y,
          }
        : null,
      thinking: options.thinking,
    },
    ttl: options.ttl ?? defaultPresenceTtlSeconds,
    userId: aiAgentUserId,
    userInfo: {
      avatarUrl: null,
      color: aiAgentColor,
      cursorColor: aiAgentColor,
      displayName: aiAgentName,
      name: aiAgentName,
    },
  });
}

export async function clearDesignAgentPresence(roomId: string) {
  await updateDesignAgentPresence(roomId, {
    cursor: null,
    thinking: false,
    ttl: clearPresenceTtlSeconds,
  });
}

function applyActionsToFlow(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  actions: readonly DesignAgentAction[],
): ApplyDesignActionsResult {
  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));
  const edgesById = new Map(flow.edges.map((edge) => [edge.id, edge]));
  const nodeIdMap = new Map<string, string>();
  const edgeIdMap = new Map<string, string>();
  let appliedActionCount = 0;
  let skippedActionCount = 0;

  for (const action of actions) {
    const wasApplied = applyDesignAction({
      action,
      edgeIdMap,
      edgesById,
      flow,
      nodeIdMap,
      nodesById,
    });

    if (wasApplied) {
      appliedActionCount += 1;
    } else {
      skippedActionCount += 1;
    }
  }

  return {
    appliedActionCount,
    edgeCount: edgesById.size,
    nodeCount: nodesById.size,
    skippedActionCount,
  };
}

interface ApplyDesignActionOptions {
  action: DesignAgentAction;
  edgeIdMap: Map<string, string>;
  edgesById: Map<string, CanvasEdge>;
  flow: MutableFlow<CanvasNode, CanvasEdge>;
  nodeIdMap: Map<string, string>;
  nodesById: Map<string, CanvasNode>;
}

function applyDesignAction({
  action,
  edgeIdMap,
  edgesById,
  flow,
  nodeIdMap,
  nodesById,
}: ApplyDesignActionOptions) {
  if (action.type === "addNode") {
    return addNodeAction(flow, nodesById, nodeIdMap, action);
  }

  if (action.type === "moveNode") {
    const nodeId = resolveMappedId(action.id, nodeIdMap);
    const node = nodesById.get(nodeId);

    if (!node) {
      return false;
    }

    const nextNode = {
      ...node,
      position: normalizePosition(action.position),
    };

    flow.updateNode(nodeId, { position: nextNode.position });
    nodesById.set(nodeId, nextNode);
    return true;
  }

  if (action.type === "resizeNode") {
    return resizeNodeAction(flow, nodesById, nodeIdMap, action);
  }

  if (action.type === "updateNodeData") {
    return updateNodeDataAction(flow, nodesById, nodeIdMap, action);
  }

  if (action.type === "deleteNode") {
    const nodeId = resolveMappedId(action.id, nodeIdMap);

    if (!nodesById.has(nodeId)) {
      return false;
    }

    for (const edge of Array.from(edgesById.values())) {
      if (edge.source === nodeId || edge.target === nodeId) {
        flow.removeEdge(edge.id);
        edgesById.delete(edge.id);
      }
    }

    flow.removeNode(nodeId);
    nodesById.delete(nodeId);
    return true;
  }

  if (action.type === "addEdge") {
    return addEdgeAction(
      flow,
      nodesById,
      edgesById,
      nodeIdMap,
      edgeIdMap,
      action,
    );
  }

  const edgeId = resolveMappedId(action.id, edgeIdMap);

  if (!edgesById.has(edgeId)) {
    return false;
  }

  flow.removeEdge(edgeId);
  edgesById.delete(edgeId);
  return true;
}

function addNodeAction(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  nodesById: Map<string, CanvasNode>,
  nodeIdMap: Map<string, string>,
  action: AddNodeDesignAction,
) {
  const nodeId = getUniqueId(sanitizeId(action.id, "node"), nodesById);
  const size = normalizeSize(action.size, action.shape);
  const position = findAvailablePosition(
    normalizePosition(action.position),
    size,
    nodesById,
  );
  const color = NODE_COLORS[action.colorIndex ?? 0] ?? DEFAULT_NODE_COLOR;
  const node: CanvasNode = {
    data: {
      color,
      label: sanitizeLabel(action.label, maxNodeLabelLength),
      shape: action.shape,
    },
    height: size.height,
    id: nodeId,
    position,
    style: {
      height: size.height,
      width: size.width,
    },
    type: CANVAS_NODE_TYPE,
    width: size.width,
  };

  flow.addNode(node);
  nodesById.set(nodeId, node);
  nodeIdMap.set(action.id, nodeId);
  return true;
}

function resizeNodeAction(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  nodesById: Map<string, CanvasNode>,
  nodeIdMap: Map<string, string>,
  action: ResizeNodeDesignAction,
) {
  const nodeId = resolveMappedId(action.id, nodeIdMap);
  const node = nodesById.get(nodeId);

  if (!node) {
    return false;
  }

  const size = normalizeSize(action.size, node.data.shape);
  const nextNode = resizeCanvasNode(node, size);

  flow.updateNode(nodeId, nextNode);
  nodesById.set(nodeId, nextNode);
  return true;
}

function updateNodeDataAction(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  nodesById: Map<string, CanvasNode>,
  nodeIdMap: Map<string, string>,
  action: UpdateNodeDataDesignAction,
) {
  const nodeId = resolveMappedId(action.id, nodeIdMap);
  const node = nodesById.get(nodeId);

  if (!node) {
    return false;
  }

  const dataPatch: Partial<CanvasNodeData> = {};

  if (typeof action.label === "string") {
    dataPatch.label = sanitizeLabel(action.label, maxNodeLabelLength);
  }

  if (action.shape) {
    dataPatch.shape = action.shape;
  }

  if (typeof action.colorIndex === "number") {
    dataPatch.color = NODE_COLORS[action.colorIndex] ?? node.data.color;
  } else if (action.color) {
    dataPatch.color = action.color;
  }

  if (Object.keys(dataPatch).length === 0) {
    return false;
  }

  const nextNode: CanvasNode = {
    ...node,
    data: {
      ...node.data,
      ...dataPatch,
    },
  };

  flow.updateNodeData(nodeId, dataPatch);
  nodesById.set(nodeId, nextNode);
  return true;
}

function addEdgeAction(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  nodesById: Map<string, CanvasNode>,
  edgesById: Map<string, CanvasEdge>,
  nodeIdMap: Map<string, string>,
  edgeIdMap: Map<string, string>,
  action: AddEdgeDesignAction,
) {
  const source = resolveMappedId(action.source, nodeIdMap);
  const target = resolveMappedId(action.target, nodeIdMap);

  if (!nodesById.has(source) || !nodesById.has(target) || source === target) {
    return false;
  }

  const fallbackId = `${source}-to-${target}`;
  const requestedId = action.id
    ? sanitizeId(action.id, "edge")
    : sanitizeId(fallbackId, "edge");
  const edgeId = getUniqueId(requestedId, edgesById);
  const edge: CanvasEdge = {
    data: {
      label: sanitizeLabel(action.label ?? "", maxEdgeLabelLength),
    },
    id: edgeId,
    source,
    target,
    type: CANVAS_EDGE_TYPE,
  };
  const sourceHandle = normalizeHandle(action.sourceHandle);
  const targetHandle = normalizeHandle(action.targetHandle);

  if (sourceHandle) {
    edge.sourceHandle = sourceHandle;
  }

  if (targetHandle) {
    edge.targetHandle = targetHandle;
  }

  flow.addEdge(edge);
  edgesById.set(edgeId, edge);

  if (action.id) {
    edgeIdMap.set(action.id, edgeId);
  }

  return true;
}

function resizeCanvasNode(node: CanvasNode, size: CanvasNodeSize): CanvasNode {
  return {
    ...node,
    height: size.height,
    style: {
      ...node.style,
      height: size.height,
      width: size.width,
    },
    width: size.width,
  };
}

function findAvailablePosition(
  position: DesignAgentPosition,
  size: CanvasNodeSize,
  nodesById: Map<string, CanvasNode>,
) {
  let nextPosition = position;
  let attempts = 0;

  while (
    attempts < 20 &&
    Array.from(nodesById.values()).some((node) =>
      boundsOverlap(
        {
          ...nextPosition,
          ...size,
        },
        getNodeBounds(node),
      ),
    )
  ) {
    attempts += 1;
    nextPosition = normalizePosition({
      x: position.x + attempts * (size.width + nodeSpacing),
      y: position.y + Math.floor(attempts / 4) * (size.height + nodeSpacing),
    });
  }

  return nextPosition;
}

function boundsOverlap(first: NodeBounds, second: NodeBounds) {
  return (
    first.x < second.x + second.width + nodeSpacing &&
    first.x + first.width + nodeSpacing > second.x &&
    first.y < second.y + second.height + nodeSpacing &&
    first.y + first.height + nodeSpacing > second.y
  );
}

function getNodeBounds(node: CanvasNode): NodeBounds {
  const fallbackSize = NODE_DEFAULT_SIZES[node.data.shape];

  return {
    height: node.height ?? getNumericStyleValue(node.style?.height) ?? fallbackSize.height,
    width: node.width ?? getNumericStyleValue(node.style?.width) ?? fallbackSize.width,
    x: node.position.x,
    y: node.position.y,
  };
}

function normalizePosition(position: DesignAgentPosition): DesignAgentPosition {
  return {
    x: clamp(roundToGrid(position.x), minCanvasCoordinate, maxCanvasCoordinate),
    y: clamp(roundToGrid(position.y), minCanvasCoordinate, maxCanvasCoordinate),
  };
}

function normalizeSize(
  size: CanvasNodeSize | undefined,
  shape: CanvasNodeShape,
): CanvasNodeSize {
  const fallbackSize = NODE_DEFAULT_SIZES[shape];

  return {
    height: clamp(
      roundToGrid(size?.height ?? fallbackSize.height),
      minNodeDimension,
      maxNodeDimension,
    ),
    width: clamp(
      roundToGrid(size?.width ?? fallbackSize.width),
      minNodeDimension,
      maxNodeDimension,
    ),
  };
}

function getNumericStyleValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function sanitizeLabel(label: string, maxLength: number) {
  return label.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeId(value: string, fallback: string) {
  const sanitizedId = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return sanitizedId || fallback;
}

function getUniqueId(
  preferredId: string,
  existingItems: ReadonlyMap<string, unknown>,
) {
  if (!existingItems.has(preferredId)) {
    return preferredId;
  }

  let suffix = 2;
  let nextId = `${preferredId}-${suffix}`;

  while (existingItems.has(nextId)) {
    suffix += 1;
    nextId = `${preferredId}-${suffix}`;
  }

  return nextId;
}

function resolveMappedId(id: string, idMap: Map<string, string>) {
  return idMap.get(id) ?? id;
}

function normalizeHandle(value: string | undefined) {
  const handle = value?.trim().toLowerCase();

  return handle && validHandleIds.has(handle) ? handle : undefined;
}

function roundToGrid(value: number) {
  return Number.isFinite(value)
    ? Math.round(value / nodeGridSize) * nodeGridSize
    : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
