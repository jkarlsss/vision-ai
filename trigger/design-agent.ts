import { logger, task } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";

import {
  applyDesignActions,
  clearDesignAgentPresence,
  prepareDesignAgentRoom,
  readDesignCanvasSnapshot,
  updateDesignAgentPresence,
} from "@/lib/liveblocks-design-agent";
import { appendAiStatusMessage } from "@/lib/liveblocks-ai-status";
import {
  NODE_COLORS,
  NODE_DEFAULT_SIZES,
  NODE_SHAPES,
  type CanvasNode,
  type CanvasNodeShape,
  type CanvasNodeSize,
  type CanvasSnapshot,
} from "@/types/canvas";
import {
  type AddEdgeDesignAction,
  type AddNodeDesignAction,
  DESIGN_AGENT_TASK_ID,
  type DesignAgentAction,
  type DesignAgentPosition,
  type DesignAgentPayload,
  type DesignAgentResult,
} from "@/types/design-agent";

const defaultGeminiModel = "gemini-3-flash-preview";

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const sizeSchema = z.object({
  height: z.number().positive(),
  width: z.number().positive(),
});

const colorIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(NODE_COLORS.length - 1);

const nodeShapeSchema = z.enum(NODE_SHAPES);
const nodeHandleSchema = z.enum(["top", "right", "bottom", "left"]);
const designActionTypeSchema = z.enum([
  "addNode",
  "moveNode",
  "resizeNode",
  "updateNodeData",
  "deleteNode",
  "addEdge",
  "deleteEdge",
]);

const designActionSchema = z.discriminatedUnion("type", [
  z.object({
    colorIndex: colorIndexSchema.optional(),
    id: z.string().min(1),
    label: z.string().min(1),
    position: positionSchema,
    shape: nodeShapeSchema,
    size: sizeSchema.optional(),
    type: z.literal("addNode"),
  }),
  z.object({
    id: z.string().min(1),
    position: positionSchema,
    type: z.literal("moveNode"),
  }),
  z.object({
    id: z.string().min(1),
    size: sizeSchema,
    type: z.literal("resizeNode"),
  }),
  z.object({
    colorIndex: colorIndexSchema.optional(),
    id: z.string().min(1),
    label: z.string().optional(),
    shape: nodeShapeSchema.optional(),
    type: z.literal("updateNodeData"),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("deleteNode"),
  }),
  z.object({
    id: z.string().min(1).optional(),
    label: z.string().optional(),
    source: z.string().min(1),
    sourceHandle: nodeHandleSchema.optional(),
    target: z.string().min(1),
    targetHandle: nodeHandleSchema.optional(),
    type: z.literal("addEdge"),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("deleteEdge"),
  }),
]);

const generatedDesignActionSchema = z.object({
  colorIndex: colorIndexSchema.optional(),
  id: z.string().min(1).optional(),
  label: z.string().optional(),
  position: positionSchema.optional(),
  shape: nodeShapeSchema.optional(),
  size: sizeSchema.optional(),
  source: z.string().min(1).optional(),
  sourceHandle: nodeHandleSchema.optional(),
  target: z.string().min(1).optional(),
  targetHandle: nodeHandleSchema.optional(),
  type: designActionTypeSchema,
});

const generatedDesignPlanSchema = z.object({
  actions: z.array(generatedDesignActionSchema).min(1).max(40),
  summary: z.string().min(1),
});

type GeneratedDesignPlan = z.infer<typeof generatedDesignPlanSchema>;
type CanvasHandlePosition = z.infer<typeof nodeHandleSchema>;

interface PlannedNode {
  id: string;
  label: string;
  position: DesignAgentPosition;
  shape: CanvasNodeShape;
  size: CanvasNodeSize;
}

const templateLayoutHorizontalSpacing = 280;
const templateLayoutVerticalSpacing = 132;
const templateLayoutStartX = -80;
const templateLayoutCenterY = 188;
const templateStorageYOffset = 156;
const templateStorageXSpacing = 180;

export const designAgentTask = task({
  id: DESIGN_AGENT_TASK_ID,
  run: async (
    payload: DesignAgentPayload,
    { ctx },
  ): Promise<DesignAgentResult> => {
    const runId = ctx.run.id;

    logger.info("Design agent task started.", {
      promptLength: payload.prompt.length,
      runId,
      roomId: payload.roomId,
    });

    try {
      await prepareDesignAgentRoom(payload.roomId);
      await safeUpdatePresence(payload.roomId, {
        cursor: { x: 0, y: -80 },
        thinking: true,
      });
      await safeAppendStatus(payload.roomId, {
        level: "info",
        message: "Ghost AI started reading the canvas.",
        phase: "start",
        runId,
      });

      const snapshot = await readDesignCanvasSnapshot(payload.roomId);

      await safeUpdatePresence(payload.roomId, {
        cursor: getSnapshotCursor(snapshot),
        thinking: true,
      });
      await safeAppendStatus(payload.roomId, {
        level: "info",
        message: "Ghost AI is planning canvas changes.",
        phase: "processing",
        runId,
      });

      const plan = await generateDesignPlan(payload.prompt, snapshot);

      await safeUpdatePresence(payload.roomId, {
        cursor: getActionCursor(plan.actions, snapshot),
        thinking: true,
      });
      await safeAppendStatus(payload.roomId, {
        level: "info",
        message: `Ghost AI is applying ${plan.actions.length} canvas action${
          plan.actions.length === 1 ? "" : "s"
        }.`,
        phase: "processing",
        runId,
      });

      const applyResult = await applyDesignActions(
        payload.roomId,
        plan.actions,
      );
      const completeMessage =
        applyResult.skippedActionCount > 0
          ? `Ghost AI updated the canvas and skipped ${applyResult.skippedActionCount} invalid action${
              applyResult.skippedActionCount === 1 ? "" : "s"
            }.`
          : "Ghost AI updated the canvas.";

      await safeAppendStatus(payload.roomId, {
        level: "success",
        message: completeMessage,
        phase: "complete",
        runId,
      });

      logger.info("Design agent task completed.", {
        actionCount: plan.actions.length,
        appliedActionCount: applyResult.appliedActionCount,
        runId,
        skippedActionCount: applyResult.skippedActionCount,
      });

      return {
        actionCount: plan.actions.length,
        appliedActionCount: applyResult.appliedActionCount,
        message: completeMessage,
        roomId: payload.roomId,
        skippedActionCount: applyResult.skippedActionCount,
        status: "completed",
        summary: plan.summary,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      logger.error("Design agent task failed.", {
        error: errorMessage,
        runId,
        roomId: payload.roomId,
      });

      await safeAppendStatus(payload.roomId, {
        level: "error",
        message: "Ghost AI could not update the canvas.",
        phase: "error",
        runId,
      });

      return {
        actionCount: 0,
        appliedActionCount: 0,
        message: "Design generation failed.",
        roomId: payload.roomId,
        skippedActionCount: 0,
        status: "failed",
        summary: errorMessage,
      };
    } finally {
      await safeClearPresence(payload.roomId);
    }
  },
});

async function generateDesignPlan(
  prompt: string,
  snapshot: CanvasSnapshot,
): Promise<{ actions: DesignAgentAction[]; summary: string }> {
  const model = getGeminiModel();
  const result = await generateText({
    maxOutputTokens: 4_000,
    model,
    prompt: buildDesignPlanPrompt(prompt, snapshot),
    system:
      "You are Ghost AI, a collaborative systems architecture design agent. You must call the submitDesignPlan tool with canvas actions. Do not answer in prose.",
    temperature: 0.2,
    toolChoice: { type: "tool", toolName: "submitDesignPlan" },
    tools: {
      submitDesignPlan: tool({
        description:
          "Submit the validated action plan that edits the React Flow canvas.",
        execute: async (plan) => plan,
        inputSchema: generatedDesignPlanSchema,
      }),
    },
  });
  const toolResult = result.toolResults.find(
    (candidate) => candidate.toolName === "submitDesignPlan",
  );

  if (!toolResult) {
    throw new Error("Gemini did not submit a design plan tool call.");
  }

  return normalizeGeneratedDesignPlan(
    generatedDesignPlanSchema.parse(toolResult.output),
    snapshot,
  );
}

function normalizeGeneratedDesignPlan(
  plan: GeneratedDesignPlan,
  snapshot: CanvasSnapshot,
) {
  const actions = plan.actions.reduce<DesignAgentAction[]>((validActions, action) => {
    const normalizedAction = normalizeGeneratedDesignAction(action);

    if (normalizedAction) {
      validActions.push(normalizedAction);
    }

    return validActions;
  }, []);

  if (actions.length === 0) {
    throw new Error("Gemini returned a design plan without valid canvas actions.");
  }

  return {
    actions: polishGeneratedDesignActions(actions, snapshot),
    summary: plan.summary.trim(),
  };
}

function normalizeGeneratedDesignAction(
  action: z.infer<typeof generatedDesignActionSchema>,
): DesignAgentAction | null {
  const parsedAction = designActionSchema.safeParse(action);

  return parsedAction.success ? parsedAction.data : null;
}

function polishGeneratedDesignActions(
  actions: readonly DesignAgentAction[],
  snapshot: CanvasSnapshot,
): DesignAgentAction[] {
  const nodeStyledActions = addTemplateStyleNodeDetails(actions);
  const layoutActions =
    snapshot.nodes.length === 0
      ? layoutInitialGeneratedDesign(nodeStyledActions)
      : nodeStyledActions;

  return addTemplateStyleEdgeDetails(layoutActions, snapshot);
}

function addTemplateStyleNodeDetails(
  actions: readonly DesignAgentAction[],
): DesignAgentAction[] {
  return actions.map((action) => {
    if (action.type !== "addNode") {
      return action;
    }

    const shape = getTemplateStyleNodeShape(action.label, action.shape);

    return {
      ...action,
      colorIndex: getTemplateStyleNodeColorIndex(action.label, shape),
      shape,
      size: shape === action.shape ? action.size : undefined,
    };
  });
}

function getTemplateStyleNodeShape(
  label: string,
  fallbackShape: CanvasNodeShape,
): CanvasNodeShape {
  const normalizedLabel = label.toLowerCase();

  if (
    hasAnyLabelPart(normalizedLabel, [
      "db",
      "database",
      "store",
      "warehouse",
      "lake",
      "registry",
    ])
  ) {
    return "cylinder";
  }

  if (hasAnyLabelPart(normalizedLabel, ["bus", "broker", "queue", "stream", "topic"])) {
    return "rectangle";
  }

  if (hasAnyLabelPart(normalizedLabel, ["decision", "gate", "approval", "pass?"])) {
    return "diamond";
  }

  if (
    hasAnyLabelPart(normalizedLabel, [
      "client",
      "browser",
      "mobile",
      "external",
      "partner",
      "user",
    ])
  ) {
    return "hexagon";
  }

  if (
    hasAnyLabelPart(normalizedLabel, [
      "api",
      "gateway",
      "service",
      "processor",
      "worker",
      "runner",
      "auth",
      "payment",
      "order",
      "inventory",
    ])
  ) {
    return "pill";
  }

  return fallbackShape;
}

function getTemplateStyleNodeColorIndex(label: string, shape: CanvasNodeShape) {
  const normalizedLabel = label.toLowerCase();

  if (shape === "cylinder") {
    return 6;
  }

  if (hasAnyLabelPart(normalizedLabel, ["bus", "broker", "queue", "stream", "topic"])) {
    return 3;
  }

  if (shape === "hexagon") {
    return 7;
  }

  if (hasAnyLabelPart(normalizedLabel, ["auth", "identity", "login"])) {
    return 2;
  }

  if (hasAnyLabelPart(normalizedLabel, ["payment", "billing", "invoice"])) {
    return 5;
  }

  if (shape === "diamond") {
    return 4;
  }

  if (hasAnyLabelPart(normalizedLabel, ["gateway", "api", "service", "processor"])) {
    return 1;
  }

  return 0;
}

function layoutInitialGeneratedDesign(
  actions: readonly DesignAgentAction[],
): DesignAgentAction[] {
  const addNodeActions = actions.filter(isAddNodeAction);
  const addEdgeActions = actions.filter(isAddEdgeAction);

  if (addNodeActions.length < 3 || addEdgeActions.length < 2) {
    return [...actions];
  }

  const addNodesById = new Map(addNodeActions.map((node) => [node.id, node]));
  const storageParents = getStorageParentMap(addNodesById, addEdgeActions);
  const mainNodeIds = new Set(
    addNodeActions
      .filter((node) => !storageParents.has(node.id))
      .map((node) => node.id),
  );

  if (mainNodeIds.size < 2) {
    return [...actions];
  }

  const nodePositions = new Map<string, DesignAgentPosition>();
  const mainNodeLayers = getMainNodeLayers(
    addNodeActions,
    addEdgeActions,
    mainNodeIds,
  );
  const layerGroups = groupMainNodesByLayer(addNodeActions, mainNodeLayers);

  for (const [layer, nodes] of layerGroups) {
    const sortedNodes = [...nodes].sort(compareAddNodesForLayout);

    sortedNodes.forEach((node, index) => {
      nodePositions.set(node.id, {
        x: templateLayoutStartX + layer * templateLayoutHorizontalSpacing,
        y:
          templateLayoutCenterY +
          (index - (sortedNodes.length - 1) / 2) *
            templateLayoutVerticalSpacing,
      });
    });
  }

  const storageCountsByParent = new Map<string, number>();

  for (const node of addNodeActions) {
    const parentId = storageParents.get(node.id);

    if (!parentId) {
      continue;
    }

    const parentPosition = nodePositions.get(parentId);
    const parentNode = addNodesById.get(parentId);

    if (!parentPosition || !parentNode) {
      continue;
    }

    const storageIndex = storageCountsByParent.get(parentId) ?? 0;
    storageCountsByParent.set(parentId, storageIndex + 1);

    nodePositions.set(node.id, {
      x: parentPosition.x + storageIndex * templateStorageXSpacing,
      y: parentPosition.y + getActionNodeSize(parentNode).height + templateStorageYOffset,
    });
  }

  return actions.map((action) =>
    action.type === "addNode" && nodePositions.has(action.id)
      ? {
          ...action,
          position: nodePositions.get(action.id) ?? action.position,
        }
      : action,
  );
}

function getStorageParentMap(
  addNodesById: ReadonlyMap<string, AddNodeDesignAction>,
  addEdgeActions: readonly AddEdgeDesignAction[],
) {
  const storageParents = new Map<string, string>();

  for (const edge of addEdgeActions) {
    const sourceNode = addNodesById.get(edge.source);
    const targetNode = addNodesById.get(edge.target);

    if (
      sourceNode &&
      targetNode?.shape === "cylinder" &&
      sourceNode.shape !== "cylinder" &&
      !storageParents.has(targetNode.id)
    ) {
      storageParents.set(targetNode.id, sourceNode.id);
    }
  }

  return storageParents;
}

function getMainNodeLayers(
  addNodeActions: readonly AddNodeDesignAction[],
  addEdgeActions: readonly AddEdgeDesignAction[],
  mainNodeIds: ReadonlySet<string>,
) {
  const outgoingEdgesBySource = new Map<string, string[]>();
  const incomingCountByNode = new Map<string, number>();
  const layerByNode = new Map<string, number>();
  const addNodesById = new Map(addNodeActions.map((node) => [node.id, node]));

  for (const nodeId of mainNodeIds) {
    outgoingEdgesBySource.set(nodeId, []);
    incomingCountByNode.set(nodeId, 0);
    layerByNode.set(nodeId, 0);
  }

  for (const edge of addEdgeActions) {
    if (!mainNodeIds.has(edge.source) || !mainNodeIds.has(edge.target)) {
      continue;
    }

    outgoingEdgesBySource.get(edge.source)?.push(edge.target);
    incomingCountByNode.set(
      edge.target,
      (incomingCountByNode.get(edge.target) ?? 0) + 1,
    );
  }

  const queue = [...mainNodeIds]
    .filter((nodeId) => (incomingCountByNode.get(nodeId) ?? 0) === 0)
    .sort((left, right) =>
      compareAddNodesForLayout(
        addNodesById.get(left) ?? null,
        addNodesById.get(right) ?? null,
      ),
    );
  const visitedNodeIds = new Set<string>();

  while (queue.length > 0) {
    const sourceId = queue.shift();

    if (!sourceId || visitedNodeIds.has(sourceId)) {
      continue;
    }

    visitedNodeIds.add(sourceId);

    for (const targetId of outgoingEdgesBySource.get(sourceId) ?? []) {
      layerByNode.set(
        targetId,
        Math.max(
          layerByNode.get(targetId) ?? 0,
          (layerByNode.get(sourceId) ?? 0) + 1,
        ),
      );
      incomingCountByNode.set(
        targetId,
        Math.max((incomingCountByNode.get(targetId) ?? 1) - 1, 0),
      );

      if ((incomingCountByNode.get(targetId) ?? 0) === 0) {
        queue.push(targetId);
        queue.sort((left, right) =>
          compareAddNodesForLayout(
            addNodesById.get(left) ?? null,
            addNodesById.get(right) ?? null,
          ),
        );
      }
    }
  }

  let fallbackLayer = Math.max(0, ...layerByNode.values()) + 1;

  for (const nodeId of mainNodeIds) {
    if (!visitedNodeIds.has(nodeId)) {
      layerByNode.set(nodeId, fallbackLayer);
      fallbackLayer += 1;
    }
  }

  return compactNodeLayers(layerByNode);
}

function compactNodeLayers(layerByNode: ReadonlyMap<string, number>) {
  const layerIndexes = [...new Set(layerByNode.values())].sort(
    (left, right) => left - right,
  );
  const compactLayerByOriginalLayer = new Map(
    layerIndexes.map((layer, index) => [layer, index]),
  );
  const compactLayers = new Map<string, number>();

  for (const [nodeId, layer] of layerByNode) {
    compactLayers.set(nodeId, compactLayerByOriginalLayer.get(layer) ?? 0);
  }

  return compactLayers;
}

function groupMainNodesByLayer(
  addNodeActions: readonly AddNodeDesignAction[],
  layerByNode: ReadonlyMap<string, number>,
) {
  const layerGroups = new Map<number, AddNodeDesignAction[]>();

  for (const node of addNodeActions) {
    const layer = layerByNode.get(node.id);

    if (typeof layer !== "number") {
      continue;
    }

    const group = layerGroups.get(layer) ?? [];
    group.push(node);
    layerGroups.set(layer, group);
  }

  return [...layerGroups.entries()].sort(
    ([leftLayer], [rightLayer]) => leftLayer - rightLayer,
  );
}

function addTemplateStyleEdgeDetails(
  actions: readonly DesignAgentAction[],
  snapshot: CanvasSnapshot,
): DesignAgentAction[] {
  const plannedNodes = getPlannedNodesAfterActions(snapshot, actions);

  return actions.map((action) => {
    if (action.type !== "addEdge") {
      return action;
    }

    const sourceNode = plannedNodes.get(action.source);
    const targetNode = plannedNodes.get(action.target);

    if (!sourceNode || !targetNode) {
      return action;
    }

    const handles = getTemplateStyleHandles(sourceNode, targetNode);

    return {
      ...action,
      label: action.label?.trim() || getTemplateStyleEdgeLabel(sourceNode, targetNode),
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    };
  });
}

function getPlannedNodesAfterActions(
  snapshot: CanvasSnapshot,
  actions: readonly DesignAgentAction[],
) {
  const plannedNodes = new Map(
    snapshot.nodes.map((node) => [node.id, getPlannedNodeFromCanvasNode(node)]),
  );

  for (const action of actions) {
    if (action.type === "addNode") {
      plannedNodes.set(action.id, {
        id: action.id,
        label: action.label,
        position: action.position,
        shape: action.shape,
        size: getActionNodeSize(action),
      });
      continue;
    }

    if (action.type === "addEdge") {
      continue;
    }

    const plannedNode = plannedNodes.get(action.id);

    if (action.type === "moveNode" && plannedNode) {
      plannedNodes.set(action.id, {
        ...plannedNode,
        position: action.position,
      });
    } else if (action.type === "resizeNode" && plannedNode) {
      plannedNodes.set(action.id, {
        ...plannedNode,
        size: action.size,
      });
    } else if (action.type === "updateNodeData" && plannedNode) {
      plannedNodes.set(action.id, {
        ...plannedNode,
        label: action.label ?? plannedNode.label,
        shape: action.shape ?? plannedNode.shape,
        size: action.shape ? NODE_DEFAULT_SIZES[action.shape] : plannedNode.size,
      });
    } else if (action.type === "deleteNode") {
      plannedNodes.delete(action.id);
    }
  }

  return plannedNodes;
}

function getPlannedNodeFromCanvasNode(node: CanvasNode): PlannedNode {
  return {
    id: node.id,
    label: node.data.label,
    position: node.position,
    shape: node.data.shape,
    size: {
      height: node.height ?? NODE_DEFAULT_SIZES[node.data.shape].height,
      width: node.width ?? NODE_DEFAULT_SIZES[node.data.shape].width,
    },
  };
}

function getTemplateStyleHandles(
  sourceNode: PlannedNode,
  targetNode: PlannedNode,
): {
  sourceHandle: CanvasHandlePosition;
  targetHandle: CanvasHandlePosition;
} {
  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaY = targetCenter.y - sourceCenter.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }

  return deltaY >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
}

function getNodeCenter(node: PlannedNode) {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

function getTemplateStyleEdgeLabel(
  sourceNode: PlannedNode,
  targetNode: PlannedNode,
) {
  const sourceLabel = sourceNode.label.toLowerCase();
  const targetLabel = targetNode.label.toLowerCase();

  if (targetNode.shape === "cylinder") {
    return "write";
  }

  if (sourceNode.shape === "cylinder") {
    return "read";
  }

  if (hasAnyLabelPart(sourceLabel, ["client", "web", "mobile", "browser"])) {
    return "HTTPS";
  }

  if (hasAnyLabelPart(targetLabel, ["auth", "identity", "login"])) {
    return "JWT";
  }

  if (hasAnyLabelPart(sourceLabel, ["order"]) && hasAnyLabelPart(targetLabel, ["payment"])) {
    return "charge";
  }

  if (hasAnyLabelPart(targetLabel, ["bus", "broker", "queue", "stream", "topic"])) {
    return "events";
  }

  if (hasAnyLabelPart(sourceLabel, ["bus", "broker", "queue", "stream", "topic"])) {
    return "consume";
  }

  if (hasAnyLabelPart(targetLabel, ["search", "index"])) {
    return "index";
  }

  if (hasAnyLabelPart(targetLabel, ["cache", "cdn"])) {
    return "cache";
  }

  if (hasAnyLabelPart(targetLabel, ["warehouse", "analytics", "lake"])) {
    return "sync";
  }

  if (hasAnyLabelPart(targetLabel, ["notification", "email", "sms"])) {
    return "notify";
  }

  if (
    hasAnyLabelPart(sourceLabel, ["gateway", "api"]) ||
    hasAnyLabelPart(targetLabel, ["service", "api"])
  ) {
    return "REST";
  }

  return "request";
}

function hasAnyLabelPart(label: string, parts: readonly string[]) {
  return parts.some((part) => label.includes(part));
}

function getActionNodeSize(action: AddNodeDesignAction) {
  return action.size ?? NODE_DEFAULT_SIZES[action.shape];
}

function compareAddNodesForLayout(
  left: AddNodeDesignAction | null,
  right: AddNodeDesignAction | null,
) {
  if (!left || !right) {
    return left ? -1 : right ? 1 : 0;
  }

  if (left.position.y !== right.position.y) {
    return left.position.y - right.position.y;
  }

  if (left.position.x !== right.position.x) {
    return left.position.x - right.position.x;
  }

  return left.label.localeCompare(right.label);
}

function isAddNodeAction(
  action: DesignAgentAction,
): action is AddNodeDesignAction {
  return action.type === "addNode";
}

function isAddEdgeAction(
  action: DesignAgentAction,
): action is AddEdgeDesignAction {
  return action.type === "addEdge";
}

function getGeminiModel() {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required for design generation.");
  }

  const google = createGoogleGenerativeAI({ apiKey });

  return google(process.env.GEMINI_MODEL?.trim() || defaultGeminiModel);
}

function buildDesignPlanPrompt(prompt: string, snapshot: CanvasSnapshot) {
  return [
    "User request:",
    prompt,
    "",
    "Current canvas snapshot:",
    JSON.stringify(snapshot, null, 2),
    "",
    "Allowed node shapes:",
    NODE_SHAPES.join(", "),
    "",
    "Node color palette by index:",
    NODE_COLORS.map(
      (color, index) => `${index}: fill ${color.fill}, text ${color.text}`,
    ).join("\n"),
    "",
    "Default node sizes:",
    JSON.stringify(NODE_DEFAULT_SIZES, null, 2),
    "",
    "Planning rules:",
    "- Use addNode, moveNode, resizeNode, updateNodeData, deleteNode, addEdge, and deleteEdge actions only.",
    "- Use existing node and edge IDs exactly when changing or deleting existing canvas items.",
    "- For new nodes, provide stable lowercase IDs and short readable labels.",
    "- For new edges, source and target must be existing node IDs or IDs of nodes added earlier in the same plan.",
    "- Match the starter template visual style: readable left-to-right architecture diagrams, not dense trees or long branch rails.",
    "- For an empty canvas, create 6-9 meaningful nodes in columns: clients/external systems, gateway/API, domain services, async/shared infrastructure, and service-owned data stores.",
    "- Place datastore cylinders below their owning service when possible. Keep the main request/event path flowing left to right.",
    "- Every addEdge must include a short non-empty label such as HTTPS, REST, JWT, events, publish, consume, write, read, charge, sync, or metrics.",
    "- Every addEdge must include sourceHandle and targetHandle. Use right-to-left handles for horizontal flow, bottom-to-top for downward datastore/service dependencies, and top-to-bottom for upward feedback.",
    "- Positions are top-left React Flow canvas coordinates. Keep nodes spaced at least 220px horizontally or 140px vertically where possible.",
    "- Use only the allowed shapes and color palette indexes.",
    "- Prefer service or process nodes as pill, storage nodes as cylinder, decision points as diamond, endpoints/events as circle, external systems as hexagon, and general components as rectangle.",
    "- Do not delete or rename existing user work unless the user clearly asked for it.",
    "- If the canvas is empty, create a useful initial architecture with nodes and edges.",
    "- If the canvas has content, extend or refine it instead of replacing everything unless the prompt asks for replacement.",
  ].join("\n");
}

async function safeAppendStatus(
  roomId: string,
  options: Parameters<typeof appendAiStatusMessage>[1],
) {
  try {
    await appendAiStatusMessage(roomId, options);
  } catch (error) {
    logger.error("Design agent status update failed.", {
      error: getErrorMessage(error),
      roomId,
    });
  }
}

async function safeUpdatePresence(
  roomId: string,
  options: Parameters<typeof updateDesignAgentPresence>[1],
) {
  try {
    await updateDesignAgentPresence(roomId, options);
  } catch (error) {
    logger.error("Design agent presence update failed.", {
      error: getErrorMessage(error),
      roomId,
    });
  }
}

async function safeClearPresence(roomId: string) {
  try {
    await clearDesignAgentPresence(roomId);
  } catch (error) {
    logger.error("Design agent presence clear failed.", {
      error: getErrorMessage(error),
      roomId,
    });
  }
}

function getSnapshotCursor(snapshot: CanvasSnapshot): DesignAgentPosition {
  const firstNode = snapshot.nodes[0];

  if (!firstNode) {
    return { x: 0, y: -80 };
  }

  return {
    x: firstNode.position.x,
    y: firstNode.position.y - 80,
  };
}

function getActionCursor(
  actions: readonly DesignAgentAction[],
  snapshot: CanvasSnapshot,
): DesignAgentPosition {
  for (const action of actions) {
    if (action.type === "addNode" || action.type === "moveNode") {
      return action.position;
    }

    if (
      action.type === "resizeNode" ||
      action.type === "updateNodeData" ||
      action.type === "deleteNode"
    ) {
      const node = snapshot.nodes.find((candidate) => candidate.id === action.id);

      if (node) {
        return node.position;
      }
    }
  }

  return getSnapshotCursor(snapshot);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown design agent error.";
}
