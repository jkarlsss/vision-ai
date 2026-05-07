"use client";

import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type DefaultEdgeOptions,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import {
  Circle as CircleIcon,
  CircleAlert,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  Component,
  type CSSProperties,
  type DragEvent,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useRef,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  NODE_DEFAULT_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
  type CanvasNodeSize,
  isCanvasNodeShape,
} from "@/types/canvas";

interface EditorCanvasProps {
  roomId: string;
}

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

interface ShapeDragPayload {
  defaultSize: CanvasNodeSize;
  shape: CanvasNodeShape;
}

interface ShapeTool {
  Icon: LucideIcon;
  label: string;
  shape: CanvasNodeShape;
}

const initialNodes: CanvasNode[] = [];
const initialEdges: CanvasEdge[] = [];
const shapeDragDataType = "application/vnd.vision-ai.shape+json";

const shapeTools = [
  { Icon: RectangleHorizontal, label: "Rectangle", shape: "rectangle" },
  { Icon: Diamond, label: "Diamond", shape: "diamond" },
  { Icon: CircleIcon, label: "Circle", shape: "circle" },
  { Icon: Pill, label: "Pill", shape: "pill" },
  { Icon: Cylinder, label: "Cylinder", shape: "cylinder" },
  { Icon: Hexagon, label: "Hexagon", shape: "hexagon" },
] as const satisfies readonly ShapeTool[];

const canvasNodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNodeRenderer,
} satisfies NodeTypes;

const defaultEdgeOptions = {
  markerEnd: {
    color: "var(--canvas-edge)",
    type: MarkerType.ArrowClosed,
  },
  style: {
    stroke: "var(--canvas-edge)",
    strokeWidth: 1.25,
  },
  type: "smoothstep",
} satisfies DefaultEdgeOptions;

export function EditorCanvas({ roomId }: EditorCanvasProps) {
  return (
    <section
      aria-label="Collaborative canvas"
      className="flex min-h-0 flex-1 bg-base"
    >
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider
          id={roomId}
          initialPresence={{ cursor: null, isThinking: false }}
        >
          <CanvasErrorBoundary key={roomId}>
            <ClientSideSuspense fallback={<CanvasLoadingState />}>
              {() => <LiveblocksFlowCanvas />}
            </ClientSideSuspense>
          </CanvasErrorBoundary>
        </RoomProvider>
      </LiveblocksProvider>
    </section>
  );
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Liveblocks canvas connection failed.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <CanvasErrorState />;
    }

    return this.props.children;
  }
}

function LiveblocksFlowCanvas() {
  return (
    <ReactFlowProvider>
      <LiveblocksFlowCanvasContent />
    </ReactFlowProvider>
  );
}

function LiveblocksFlowCanvasContent() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      edges: {
        initial: initialEdges,
      },
      nodes: {
        initial: initialNodes,
      },
      suspense: true,
    });
  const { screenToFlowPosition } = useReactFlow<CanvasNode, CanvasEdge>();
  const nodeCounterRef = useRef(0);

  const handleCanvasDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [],
  );

  const handleCanvasDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const payload = readShapeDragPayload(event.dataTransfer);

      if (!payload) {
        return;
      }

      nodeCounterRef.current += 1;

      const node: CanvasNode = {
        data: {
          color: DEFAULT_NODE_COLOR,
          label: "",
          shape: payload.shape,
        },
        height: payload.defaultSize.height,
        id: `${payload.shape}-${Date.now()}-${nodeCounterRef.current}`,
        position: screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
        style: {
          height: payload.defaultSize.height,
          width: payload.defaultSize.width,
        },
        type: CANVAS_NODE_TYPE,
        width: payload.defaultSize.width,
      };

      onNodesChange([{ item: node, type: "add" }]);
    },
    [onNodesChange, screenToFlowPosition],
  );

  return (
    <div
      className="relative flex min-h-0 flex-1 bg-base"
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <ReactFlow<CanvasNode, CanvasEdge>
        className="min-h-0 flex-1 bg-base"
        colorMode="dark"
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={defaultEdgeOptions}
        edges={edges}
        fitView
        nodeTypes={canvasNodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onDelete={onDelete}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <MiniMap
          bgColor="var(--bg-surface)"
          maskColor="var(--bg-base)"
          nodeColor={DEFAULT_NODE_COLOR.fill}
          nodeStrokeColor="var(--border-subtle)"
          pannable
          zoomable
        />
        <Background
          color="var(--border-default)"
          gap={24}
          size={1.25}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
      <ShapePanel />
    </div>
  );
}

function ShapePanel() {
  return (
    <div
      aria-label="Shape tools"
      className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur"
      role="toolbar"
    >
      {shapeTools.map(({ Icon, label, shape }) => (
        <Button
          aria-label={`Drag ${label} shape`}
          className="size-9 cursor-grab rounded-full text-copy-muted hover:bg-accent-dim hover:text-brand active:cursor-grabbing"
          draggable
          key={shape}
          onDragStart={(event) => handleShapeDragStart(event, shape)}
          size="icon"
          title={`Drag ${label}`}
          type="button"
          variant="ghost"
        >
          <Icon aria-hidden="true" className="size-4" />
        </Button>
      ))}
    </div>
  );
}

function CanvasNodeRenderer({
  data,
  height,
  isConnectable,
  selected,
  width,
}: NodeProps<CanvasNode>) {
  const defaultSize = NODE_DEFAULT_SIZES[data.shape];
  const nodeStyle = {
    backgroundColor: data.color.fill,
    color: data.color.text,
    height: height ?? defaultSize.height,
    width: width ?? defaultSize.width,
  } satisfies CSSProperties;

  return (
    <div
      aria-label={`${data.shape} node`}
      className={cn(
        "group relative flex items-center justify-center rounded-xl border px-4 py-3 text-center text-sm font-medium tracking-normal",
        selected ? "border-brand" : "border-border-subtle",
      )}
      style={nodeStyle}
    >
      <CanvasNodeHandle isConnectable={isConnectable} position={Position.Top} />
      <CanvasNodeHandle
        isConnectable={isConnectable}
        position={Position.Right}
      />
      <CanvasNodeHandle
        isConnectable={isConnectable}
        position={Position.Bottom}
      />
      <CanvasNodeHandle isConnectable={isConnectable} position={Position.Left} />
      <span className="max-w-full truncate">{data.label}</span>
    </div>
  );
}

interface CanvasNodeHandleProps {
  isConnectable: boolean;
  position: Position;
}

function CanvasNodeHandle({ isConnectable, position }: CanvasNodeHandleProps) {
  return (
    <Handle
      className="!size-2 !border !border-base !bg-copy-primary opacity-0 transition-opacity group-hover:opacity-100"
      isConnectable={isConnectable}
      position={position}
      type="source"
    />
  );
}

function handleShapeDragStart(
  event: DragEvent<HTMLButtonElement>,
  shape: CanvasNodeShape,
) {
  const payload = {
    defaultSize: NODE_DEFAULT_SIZES[shape],
    shape,
  } satisfies ShapeDragPayload;
  const serializedPayload = JSON.stringify(payload);

  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(shapeDragDataType, serializedPayload);
  event.dataTransfer.setData("text/plain", serializedPayload);
}

function readShapeDragPayload(dataTransfer: DataTransfer) {
  const rawPayload = dataTransfer.getData(shapeDragDataType);

  if (!rawPayload) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(rawPayload);

    if (isShapeDragPayload(payload)) {
      return payload;
    }
  } catch {
    return null;
  }

  return null;
}

function isShapeDragPayload(value: unknown): value is ShapeDragPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybePayload = value as {
    defaultSize?: unknown;
    shape?: unknown;
  };

  return (
    isCanvasNodeShape(maybePayload.shape) &&
    isCanvasNodeSize(maybePayload.defaultSize)
  );
}

function isCanvasNodeSize(value: unknown): value is CanvasNodeSize {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeSize = value as {
    height?: unknown;
    width?: unknown;
  };

  return (
    typeof maybeSize.height === "number" &&
    Number.isFinite(maybeSize.height) &&
    maybeSize.height > 0 &&
    typeof maybeSize.width === "number" &&
    Number.isFinite(maybeSize.width) &&
    maybeSize.width > 0
  );
}

function CanvasLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-base text-sm text-copy-muted">
      Loading canvas...
    </div>
  );
}

function CanvasErrorState() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-base px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-xl border border-surface-border bg-elevated text-state-error">
          <CircleAlert aria-hidden="true" className="size-4" />
        </div>
        <h1 className="text-sm font-medium tracking-normal text-copy-primary">
          Canvas connection failed
        </h1>
        <p className="text-sm leading-6 text-copy-secondary">
          The collaborative room could not be loaded.
        </p>
      </div>
    </div>
  );
}
