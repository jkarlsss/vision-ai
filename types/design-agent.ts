import type {
  CanvasNodeColor,
  CanvasNodeShape,
  CanvasNodeSize,
} from "@/types/canvas";

export const DESIGN_AGENT_TASK_ID = "design-agent";

export interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

export interface DesignAgentResult {
  actionCount: number;
  appliedActionCount: number;
  message: string;
  roomId: string;
  skippedActionCount: number;
  status: "completed" | "failed";
  summary: string;
}

export interface DesignAgentPosition {
  x: number;
  y: number;
}

export interface AddNodeDesignAction {
  colorIndex?: number;
  id: string;
  label: string;
  position: DesignAgentPosition;
  shape: CanvasNodeShape;
  size?: CanvasNodeSize;
  type: "addNode";
}

export interface MoveNodeDesignAction {
  id: string;
  position: DesignAgentPosition;
  type: "moveNode";
}

export interface ResizeNodeDesignAction {
  id: string;
  size: CanvasNodeSize;
  type: "resizeNode";
}

export interface UpdateNodeDataDesignAction {
  color?: CanvasNodeColor;
  colorIndex?: number;
  id: string;
  label?: string;
  shape?: CanvasNodeShape;
  type: "updateNodeData";
}

export interface DeleteNodeDesignAction {
  id: string;
  type: "deleteNode";
}

export interface AddEdgeDesignAction {
  id?: string;
  label?: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  type: "addEdge";
}

export interface DeleteEdgeDesignAction {
  id: string;
  type: "deleteEdge";
}

export type DesignAgentAction =
  | AddNodeDesignAction
  | MoveNodeDesignAction
  | ResizeNodeDesignAction
  | UpdateNodeDataDesignAction
  | DeleteNodeDesignAction
  | AddEdgeDesignAction
  | DeleteEdgeDesignAction;
