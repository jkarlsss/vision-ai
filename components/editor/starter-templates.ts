import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  NODE_COLORS,
  NODE_DEFAULT_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColor,
  type CanvasNodeShape,
  type CanvasNodeSize,
} from "@/types/canvas";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
}

interface TemplateNodeOptions {
  color?: CanvasNodeColor;
  size?: CanvasNodeSize;
}

interface TemplateEdgeOptions {
  label?: string;
  sourceHandle?: CanvasHandlePosition;
  targetHandle?: CanvasHandlePosition;
}

interface ClonedTemplateCanvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

type CanvasHandlePosition = "bottom" | "left" | "right" | "top";

const handle = {
  bottom: "bottom",
  left: "left",
  right: "right",
  top: "top",
} as const satisfies Record<CanvasHandlePosition, CanvasHandlePosition>;

export const CANVAS_TEMPLATES = [
  {
    id: "microservices-commerce",
    name: "Microservices Commerce",
    description:
      "API gateway, domain services, event bus, and service-owned databases for a commerce platform.",
    nodes: [
      templateNode("ms-web-client", "Web client", "hexagon", -80, 180, {
        color: NODE_COLORS[7],
      }),
      templateNode("ms-api-gateway", "API gateway", "pill", 190, 188, {
        color: NODE_COLORS[1],
      }),
      templateNode("ms-auth-service", "Auth service", "pill", 460, 56, {
        color: NODE_COLORS[2],
      }),
      templateNode("ms-orders-service", "Orders service", "pill", 460, 188, {
        color: NODE_COLORS[1],
      }),
      templateNode("ms-payments-service", "Payments service", "pill", 460, 320, {
        color: NODE_COLORS[5],
      }),
      templateNode("ms-event-bus", "Event bus", "rectangle", 740, 196, {
        color: NODE_COLORS[3],
      }),
      templateNode("ms-orders-db", "Orders DB", "cylinder", 460, 472, {
        color: NODE_COLORS[6],
      }),
      templateNode("ms-payments-db", "Payments DB", "cylinder", 740, 472, {
        color: NODE_COLORS[6],
      }),
    ],
    edges: [
      templateEdge("ms-client-gateway", "ms-web-client", "ms-api-gateway", {
        label: "HTTPS",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("ms-gateway-auth", "ms-api-gateway", "ms-auth-service", {
        label: "JWT",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("ms-gateway-orders", "ms-api-gateway", "ms-orders-service", {
        label: "REST",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("ms-orders-payments", "ms-orders-service", "ms-payments-service", {
        label: "charge",
        sourceHandle: handle.bottom,
        targetHandle: handle.top,
      }),
      templateEdge("ms-orders-db-edge", "ms-orders-service", "ms-orders-db", {
        label: "write",
        sourceHandle: handle.bottom,
        targetHandle: handle.top,
      }),
      templateEdge("ms-payments-db-edge", "ms-payments-service", "ms-payments-db", {
        label: "write",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("ms-orders-events", "ms-orders-service", "ms-event-bus", {
        label: "events",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("ms-payments-events", "ms-payments-service", "ms-event-bus", {
        label: "events",
        sourceHandle: handle.right,
        targetHandle: handle.bottom,
      }),
    ],
  },
  {
    id: "cicd-release-pipeline",
    name: "CI/CD Pipeline",
    description:
      "Source control through build, tests, artifacts, staged rollout, approval, production, and monitoring.",
    nodes: [
      templateNode("cicd-repository", "Git repository", "hexagon", -120, 150, {
        color: NODE_COLORS[7],
      }),
      templateNode("cicd-runner", "CI runner", "rectangle", 160, 154, {
        color: NODE_COLORS[1],
      }),
      templateNode("cicd-tests", "Tests pass?", "diamond", 440, 124, {
        color: NODE_COLORS[2],
      }),
      templateNode("cicd-artifacts", "Artifact registry", "cylinder", 720, 154, {
        color: NODE_COLORS[6],
      }),
      templateNode("cicd-staging", "Staging deploy", "pill", 1000, 56, {
        color: NODE_COLORS[3],
      }),
      templateNode("cicd-approval", "Approval gate", "diamond", 1240, 124, {
        color: NODE_COLORS[4],
      }),
      templateNode("cicd-production", "Production", "hexagon", 1520, 154, {
        color: NODE_COLORS[7],
      }),
      templateNode("cicd-observability", "Observability", "rectangle", 1240, 344, {
        color: NODE_COLORS[5],
      }),
    ],
    edges: [
      templateEdge("cicd-repo-runner", "cicd-repository", "cicd-runner", {
        label: "push",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("cicd-runner-tests", "cicd-runner", "cicd-tests", {
        label: "build",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("cicd-tests-artifacts", "cicd-tests", "cicd-artifacts", {
        label: "package",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("cicd-artifacts-staging", "cicd-artifacts", "cicd-staging", {
        label: "deploy",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("cicd-staging-approval", "cicd-staging", "cicd-approval", {
        label: "promote",
        sourceHandle: handle.right,
        targetHandle: handle.top,
      }),
      templateEdge("cicd-approval-production", "cicd-approval", "cicd-production", {
        label: "release",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("cicd-production-observability", "cicd-production", "cicd-observability", {
        label: "metrics",
        sourceHandle: handle.bottom,
        targetHandle: handle.right,
      }),
      templateEdge("cicd-observability-approval", "cicd-observability", "cicd-approval", {
        label: "rollback signal",
        sourceHandle: handle.top,
        targetHandle: handle.bottom,
      }),
    ],
  },
  {
    id: "event-driven-analytics",
    name: "Event-Driven Analytics",
    description:
      "Ingest API, event stream, processors, indexes, notifications, and warehouse fan-out.",
    nodes: [
      templateNode("eda-clients", "Clients", "hexagon", -100, 160, {
        color: NODE_COLORS[7],
      }),
      templateNode("eda-ingest-api", "Ingest API", "pill", 180, 168, {
        color: NODE_COLORS[1],
      }),
      templateNode("eda-event-stream", "Event stream", "rectangle", 460, 168, {
        color: NODE_COLORS[3],
      }),
      templateNode("eda-stream-processor", "Stream processor", "pill", 740, 52, {
        color: NODE_COLORS[2],
      }),
      templateNode("eda-notifications", "Notifications", "pill", 740, 284, {
        color: NODE_COLORS[5],
      }),
      templateNode("eda-analytics-store", "Analytics store", "cylinder", 1020, 52, {
        color: NODE_COLORS[6],
      }),
      templateNode("eda-search-index", "Search index", "cylinder", 1020, 284, {
        color: NODE_COLORS[6],
      }),
      templateNode("eda-warehouse", "Warehouse", "cylinder", 1300, 168, {
        color: NODE_COLORS[4],
      }),
    ],
    edges: [
      templateEdge("eda-clients-ingest", "eda-clients", "eda-ingest-api", {
        label: "events",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("eda-ingest-stream", "eda-ingest-api", "eda-event-stream", {
        label: "publish",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("eda-stream-processor", "eda-event-stream", "eda-stream-processor", {
        label: "consume",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("eda-stream-notifications", "eda-event-stream", "eda-notifications", {
        label: "fan out",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("eda-processor-store", "eda-stream-processor", "eda-analytics-store", {
        label: "aggregate",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("eda-notifications-index", "eda-notifications", "eda-search-index", {
        label: "index",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("eda-store-warehouse", "eda-analytics-store", "eda-warehouse", {
        label: "batch",
        sourceHandle: handle.right,
        targetHandle: handle.left,
      }),
      templateEdge("eda-index-warehouse", "eda-search-index", "eda-warehouse", {
        label: "sync",
        sourceHandle: handle.right,
        targetHandle: handle.bottom,
      }),
    ],
  },
] as const satisfies readonly CanvasTemplate[];

export function cloneCanvasTemplate(
  template: CanvasTemplate,
): ClonedTemplateCanvas {
  return {
    edges: template.edges.map(cloneTemplateEdge),
    nodes: template.nodes.map(cloneTemplateNode),
  };
}

function templateNode(
  id: string,
  label: string,
  shape: CanvasNodeShape,
  x: number,
  y: number,
  options: TemplateNodeOptions = {},
): CanvasNode {
  const size = options.size ?? NODE_DEFAULT_SIZES[shape];

  return {
    data: {
      color: options.color ?? DEFAULT_NODE_COLOR,
      label,
      shape,
    },
    height: size.height,
    id,
    position: { x, y },
    style: {
      height: size.height,
      width: size.width,
    },
    type: CANVAS_NODE_TYPE,
    width: size.width,
  };
}

function templateEdge(
  id: string,
  source: string,
  target: string,
  options: TemplateEdgeOptions = {},
): CanvasEdge {
  return {
    data: {
      label: options.label ?? "",
    },
    id,
    source,
    sourceHandle: options.sourceHandle,
    target,
    targetHandle: options.targetHandle,
    type: CANVAS_EDGE_TYPE,
  };
}

function cloneTemplateNode(node: CanvasNode): CanvasNode {
  return {
    ...node,
    data: {
      ...node.data,
    },
    position: {
      ...node.position,
    },
    style: node.style
      ? {
          ...node.style,
        }
      : undefined,
  };
}

function cloneTemplateEdge(edge: CanvasEdge): CanvasEdge {
  return {
    ...edge,
    data: edge.data
      ? {
          ...edge.data,
        }
      : undefined,
  };
}
