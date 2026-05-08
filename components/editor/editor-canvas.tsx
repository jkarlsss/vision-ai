"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
    ClientSideSuspense,
    LiveblocksProvider,
    RoomProvider,
    useCanRedo,
    useCanUndo,
    useHistory,
    useRedo,
    useOthersMapped,
    useUndo,
    useUpdateMyPresence,
    shallow,
} from "@liveblocks/react/suspense";
import {
    Background,
    BackgroundVariant,
    ConnectionMode,
    EdgeLabelRenderer,
    getSmoothStepPath,
    Handle,
    MarkerType,
    NodeResizer,
    NodeToolbar,
    Position,
    ReactFlow,
    ReactFlowProvider,
    ViewportPortal,
    useReactFlow,
    useViewport,
    type DefaultEdgeOptions,
    type EdgeProps,
    type EdgeTypes,
    type NodeProps,
    type NodeTypes,
} from "@xyflow/react";
import {
    CircleAlert,
    Circle as CircleIcon,
    Cylinder,
    Diamond,
    Hexagon,
    Maximize2,
    MousePointer2,
    Pill,
    RectangleHorizontal,
    Redo2,
    Undo2,
    ZoomIn,
    ZoomOut,
    type LucideIcon,
} from "lucide-react";
import {
    Component,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type CSSProperties,
    type DragEvent,
    type ErrorInfo,
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
    type RefObject,
} from "react";

import {
    cloneCanvasTemplate,
    type CanvasTemplate,
} from "@/components/editor/starter-templates";
import {
    editorUserButtonAppearance,
    editorUserProfileAppearance,
} from "@/components/editor/clerk-user-button-appearance";
import { useCanvasSaveStatus } from "@/components/editor/canvas-save-status-context";
import { useStarterTemplates } from "@/components/editor/starter-templates-context";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import {
    Avatar,
    AvatarFallback,
    AvatarGroup,
    AvatarGroupCount,
    AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";
import {
    CANVAS_EDGE_TYPE,
    CANVAS_NODE_TYPE,
    DEFAULT_NODE_COLOR,
    isCanvasNodeShape,
    NODE_COLORS,
    NODE_DEFAULT_SIZES,
    type CanvasEdge,
    type CanvasEdgeData,
    type CanvasNode,
    type CanvasNodeColor,
    type CanvasNodeShape,
    type CanvasNodeSize,
    type CanvasSnapshot,
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

interface DragPointerPosition {
  x: number;
  y: number;
}

interface ShapeDragPreviewState extends ShapeDragPayload {
  position: DragPointerPosition;
}

interface ShapeTool {
  Icon: LucideIcon;
  label: string;
  shape: CanvasNodeShape;
}

interface CurrentUserPresenceProps {
  currentUserId: string | null | undefined;
}

interface PresenceAvatarParticipantData {
  avatarUrl: string | null;
  cursorColor: string;
  displayName: string;
  userId: string;
}

interface PresenceCursorParticipantData {
  cursor: Liveblocks["Presence"]["cursor"];
  cursorColor: string;
  displayName: string;
  userId: string;
}

interface PresenceCursorParticipant extends PresenceCursorParticipantData {
  connectionId: number;
}

const initialNodes: CanvasNode[] = [];
const initialEdges: CanvasEdge[] = [];
const edgeInteractionWidth = 24;
const edgeLabelHint = "Label";
const maxVisibleCollaboratorAvatars = 5;
const shapeDragDataType = "application/vnd.vision-ai.shape+json";
const viewportAnimationDuration = 150;
const minimumNodeSize = {
  height: 48,
  width: 72,
} satisfies CanvasNodeSize;
const nodeResizeHandleStyle = {
  backgroundColor: "var(--accent-primary)",
  border: "1px solid var(--bg-base)",
  height: 8,
  width: 8,
} satisfies CSSProperties;
const nodeResizeLineStyle = {
  borderColor: "var(--accent-primary)",
  opacity: 0.36,
} satisfies CSSProperties;
const canvasUserButtonAppearance = {
  ...editorUserButtonAppearance,
  elements: {
    ...editorUserButtonAppearance?.elements,
    userButtonAvatarBox: {
      height: "2rem",
      width: "2rem",
    },
  },
} satisfies ComponentProps<typeof UserButton>["appearance"];

const shapeTools = [
  { Icon: RectangleHorizontal, label: "Rectangle", shape: "rectangle" },
  { Icon: Diamond, label: "Diamond", shape: "diamond" },
  { Icon: CircleIcon, label: "Circle", shape: "circle" },
  { Icon: Pill, label: "Pill", shape: "pill" },
  { Icon: Cylinder, label: "Cylinder", shape: "cylinder" },
  { Icon: Hexagon, label: "Hexagon", shape: "hexagon" },
] as const satisfies readonly ShapeTool[];

interface CanvasControlBarProps {
  canRedo: boolean;
  canUndo: boolean;
  onRedo: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

function CanvasControlBar({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  onZoomIn,
  onZoomOut,
  onFitView,
}: CanvasControlBarProps) {
  return (
    <div
      aria-label="Canvas controls"
      className="pointer-events-auto absolute bottom-6 left-6 z-20 flex h-9 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1 shadow-xl backdrop-blur"
      role="toolbar"
    >
      <div
        aria-label="Zoom controls"
        className="flex h-full items-center gap-1"
        role="group"
      >
        <Button
          aria-label="Zoom out"
          className="size-6 rounded-full hover:bg-accent-dim hover:text-brand text-copy-muted"
          onClick={onZoomOut}
          size="icon"
          title="Zoom out"
          type="button"
          variant="ghost"
        >
          <ZoomOut aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label="Fit view"
          className="size-6 rounded-full hover:bg-accent-dim hover:text-brand text-copy-muted"
          onClick={onFitView}
          size="icon"
          title="Fit view"
          type="button"
          variant="ghost"
        >
          <Maximize2 aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label="Zoom in"
          className="size-6 rounded-full hover:bg-accent-dim hover:text-brand text-copy-muted"
          onClick={onZoomIn}
          size="icon"
          title="Zoom in"
          type="button"
          variant="ghost"
        >
          <ZoomIn aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <div className="h-5 w-px bg-surface-border" />
      <div
        aria-label="History controls"
        className="flex h-full items-center gap-1"
        role="group"
      >
        <Button
          aria-label="Undo"
          className={cn(
            "size-6 rounded-full hover:bg-accent-dim hover:text-brand",
            !canUndo && "opacity-40",
            canUndo && "text-copy-muted hover:text-brand",
          )}
          disabled={!canUndo}
          onClick={onUndo}
          size="icon"
          title="Undo"
          type="button"
          variant="ghost"
        >
          <Undo2 aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label="Redo"
          className={cn(
            "size-6 rounded-full hover:bg-accent-dim hover:text-brand",
            !canRedo && "opacity-40",
            canRedo && "text-copy-muted hover:text-brand",
          )}
          disabled={!canRedo}
          onClick={onRedo}
          size="icon"
          title="Redo"
          type="button"
          variant="ghost"
        >
          <Redo2 aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

const canvasNodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNodeRenderer,
} satisfies NodeTypes;

const canvasEdgeTypes = {
  [CANVAS_EDGE_TYPE]: CanvasEdgeRenderer,
  smoothstep: CanvasEdgeRenderer,
} satisfies EdgeTypes;

const defaultEdgeOptions = {
  data: {
    label: "",
  },
  interactionWidth: edgeInteractionWidth,
  markerEnd: {
    color: "var(--canvas-edge)",
    type: MarkerType.ArrowClosed,
  },
  style: {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    stroke: "var(--canvas-edge)",
    strokeWidth: 1.5,
  },
  type: CANVAS_EDGE_TYPE,
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
          initialPresence={{ cursor: null, thinking: false }}
        >
          <CanvasErrorBoundary key={roomId}>
            <ClientSideSuspense fallback={<CanvasLoadingState />}>
              {() => <LiveblocksFlowCanvas projectId={roomId} />}
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

interface LiveblocksFlowCanvasProps {
  projectId: string;
}

function LiveblocksFlowCanvas({ projectId }: LiveblocksFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <LiveblocksFlowCanvasContent projectId={projectId} />
    </ReactFlowProvider>
  );
}

function LiveblocksFlowCanvasContent({ projectId }: LiveblocksFlowCanvasProps) {
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
  const reactFlowInstance = useReactFlow<CanvasNode, CanvasEdge>();
  const { screenToFlowPosition } = reactFlowInstance;
  const { userId: currentUserId } = useAuth();
  const { manualSaveRequestId, setSaveStatus } = useCanvasSaveStatus();
  const updateMyPresence = useUpdateMyPresence();
  const nodeCounterRef = useRef(0);
  const [shapeDragPreview, setShapeDragPreview] =
    useState<ShapeDragPreviewState | null>(null);
  const { isStarterTemplatesOpen, setStarterTemplatesOpen } =
    useStarterTemplates();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const history = useHistory();
  const undo = useUndo();
  const redo = useRedo();
  const renderedEdges = useMemo(
    () => edges.map(toRenderableCanvasEdge),
    [edges],
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      updateMyPresence({
        cursor: screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
      });
    },
    [screenToFlowPosition, updateMyPresence],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  const handleZoomOut = useCallback(() => {
    void reactFlowInstance.zoomOut({ duration: viewportAnimationDuration });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    void reactFlowInstance.fitView({ duration: viewportAnimationDuration });
  }, [reactFlowInstance]);

  const handleZoomIn = useCallback(() => {
    void reactFlowInstance.zoomIn({ duration: viewportAnimationDuration });
  }, [reactFlowInstance]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo();
    }
  }, [canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo();
    }
  }, [canRedo, redo]);

  const handleStarterTemplateImport = useCallback(
    (template: CanvasTemplate) => {
      const nextCanvas = cloneCanvasTemplate(template);

      setShapeDragPreview(null);
      history.pause();

      try {
        if (nodes.length > 0 || edges.length > 0) {
          onDelete({ edges, nodes });
        }

        if (nextCanvas.nodes.length > 0) {
          onNodesChange(
            nextCanvas.nodes.map((node) => ({
              item: node,
              type: "add" as const,
            })),
          );
        }

        if (nextCanvas.edges.length > 0) {
          onEdgesChange(
            nextCanvas.edges.map((edge) => ({
              item: edge,
              type: "add" as const,
            })),
          );
        }
      } finally {
        history.resume();
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          void reactFlowInstance.fitView({
            duration: viewportAnimationDuration,
            padding: 0.18,
          });
        });
      });
    },
    [
      edges,
      history,
      nodes,
      onDelete,
      onEdgesChange,
      onNodesChange,
      reactFlowInstance,
    ],
  );

  const handleSavedCanvasLoad = useCallback(
    (snapshot: CanvasSnapshot) => {
      history.pause();

      try {
        if (nodes.length > 0 || edges.length > 0) {
          onDelete({ edges, nodes });
        }

        if (snapshot.nodes.length > 0) {
          onNodesChange(
            snapshot.nodes.map((node) => ({
              item: node,
              type: "add" as const,
            })),
          );
        }

        if (snapshot.edges.length > 0) {
          onEdgesChange(
            snapshot.edges.map((edge) => ({
              item: edge,
              type: "add" as const,
            })),
          );
        }
      } finally {
        history.resume();
      }

      if (snapshot.nodes.length > 0) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            void reactFlowInstance.fitView({
              duration: viewportAnimationDuration,
              padding: 0.18,
            });
          });
        });
      }
    },
    [history, onEdgesChange, onNodesChange, reactFlowInstance, edges, nodes, onDelete],
  );

  const updateShapeDragPreviewPosition = useCallback(
    (position: DragPointerPosition) => {
      if (position.x === 0 && position.y === 0) {
        return;
      }

      setShapeDragPreview((currentPreview) =>
        currentPreview
          ? {
              ...currentPreview,
              position,
            }
          : currentPreview,
      );
    },
    [],
  );

  const handleShapeToolDragStart = useCallback(
    (payload: ShapeDragPayload, position: DragPointerPosition) => {
      setShapeDragPreview({
        ...payload,
        position,
      });
    },
    [],
  );

  const handleShapeToolDragEnd = useCallback(() => {
    setShapeDragPreview(null);
  }, []);

  const handleCanvasDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      updateShapeDragPreviewPosition(getDragPointerPosition(event));
    },
    [updateShapeDragPreviewPosition],
  );

  const handleCanvasDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setShapeDragPreview(null);

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

  useKeyboardShortcuts({
    reactFlowInstance,
    onRedo: handleRedo,
    onUndo: handleUndo,
  });

  const canvasSaveStatus = useCanvasAutosave({
    edges,
    manualSaveRequestId,
    nodes,
    onLoadCanvas: handleSavedCanvasLoad,
    projectId,
  });

  useEffect(() => {
    setSaveStatus(canvasSaveStatus);
  }, [canvasSaveStatus, setSaveStatus]);

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
        edgeTypes={canvasEdgeTypes}
        edges={renderedEdges}
        fitView
        nodeTypes={canvasNodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onDelete={onDelete}
        onEdgesChange={onEdgesChange}
        onMouseLeave={handleCanvasMouseLeave}
        onMouseMove={handleCanvasMouseMove}
        onNodesChange={onNodesChange}
      >
        <Background
          color="var(--border-default)"
          gap={24}
          size={1.25}
          variant={BackgroundVariant.Dots}
        />
        <LiveCursors currentUserId={currentUserId} />
      </ReactFlow>
      <PresenceAvatarGroup currentUserId={currentUserId} />
      <CanvasControlBar
        canRedo={canRedo}
        canUndo={canUndo}
        onFitView={handleFitView}
        onRedo={handleRedo}
        onUndo={handleUndo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
      <ShapePanel
        onShapeDragEnd={handleShapeToolDragEnd}
        onShapeDragMove={updateShapeDragPreviewPosition}
        onShapeDragStart={handleShapeToolDragStart}
      />
      <StarterTemplatesModal
        onImport={handleStarterTemplateImport}
        onOpenChange={setStarterTemplatesOpen}
        open={isStarterTemplatesOpen}
      />
      <ShapeDragPreview preview={shapeDragPreview} />
    </div>
  );
}

function PresenceAvatarGroup({ currentUserId }: CurrentUserPresenceProps) {
  const collaboratorEntries = useOthersMapped(
    (other) => ({
      avatarUrl: other.info.avatarUrl,
      cursorColor: other.info.cursorColor,
      displayName: other.info.displayName,
      userId: other.id,
    }),
    shallow,
  );
  const collaborators = useMemo(
    () =>
      filterCurrentUserParticipants<PresenceAvatarParticipantData>(
        collaboratorEntries,
        currentUserId,
      ),
    [collaboratorEntries, currentUserId],
  );
  const visibleCollaborators = collaborators.slice(
    0,
    maxVisibleCollaboratorAvatars,
  );
  const overflowCount =
    collaborators.length - maxVisibleCollaboratorAvatars;
  const hasCollaborators = collaborators.length > 0;

  return (
    <div
      aria-label="Room participants"
      className="pointer-events-auto absolute right-4 top-4 z-30 flex h-10 items-center gap-2 rounded-full border border-surface-border bg-surface/95 px-2 shadow-2xl backdrop-blur"
    >
      {hasCollaborators ? (
        <AvatarGroup
          aria-label="Active collaborators"
          className="-space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-[var(--bg-base)]"
        >
          {visibleCollaborators.map((collaborator, index) => (
            <Avatar
              className="border border-surface-border bg-elevated"
              key={collaborator.connectionId}
              style={{
                zIndex: visibleCollaborators.length - index,
              }}
            >
              {collaborator.avatarUrl ? (
                <AvatarImage
                  alt=""
                  src={collaborator.avatarUrl}
                />
              ) : null}
              <AvatarFallback
                className="text-xs font-semibold"
                style={{
                  backgroundColor: collaborator.cursorColor,
                  color: "var(--bg-base)",
                }}
              >
                {getInitials(collaborator.displayName)}
              </AvatarFallback>
            </Avatar>
          ))}
          {overflowCount > 0 ? (
            <AvatarGroupCount className="border border-surface-border bg-elevated text-xs font-semibold text-copy-secondary ring-2 ring-[var(--bg-base)]">
              +{overflowCount}
            </AvatarGroupCount>
          ) : null}
        </AvatarGroup>
      ) : null}
      {hasCollaborators ? (
        <div className="h-5 w-px bg-surface-border" />
      ) : null}
      <UserButton
        appearance={canvasUserButtonAppearance}
        userProfileProps={{ appearance: editorUserProfileAppearance }}
      />
    </div>
  );
}

function LiveCursors({ currentUserId }: CurrentUserPresenceProps) {
  const { zoom } = useViewport();
  const cursorEntries = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      cursorColor: other.info.cursorColor,
      displayName: other.info.displayName,
      userId: other.id,
    }),
    shallow,
  );
  const cursors = useMemo(
    () =>
      filterCurrentUserParticipants<PresenceCursorParticipantData>(
        cursorEntries,
        currentUserId,
      ),
    [cursorEntries, currentUserId],
  );
  const cursorScale = zoom > 0 ? 1 / zoom : 1;

  return (
    <ViewportPortal>
      <div className="pointer-events-none absolute left-0 top-0 z-30">
        {cursors.map((participant) =>
          participant.cursor ? (
            <LiveCursor
              key={participant.connectionId}
              participant={participant}
              scale={cursorScale}
            />
          ) : null,
        )}
      </div>
    </ViewportPortal>
  );
}

interface LiveCursorProps {
  participant: PresenceCursorParticipant;
  scale: number;
}

function LiveCursor({ participant, scale }: LiveCursorProps) {
  if (!participant.cursor) {
    return null;
  }

  return (
    <div
      className="absolute left-0 top-0"
      style={{
        transform: `translate3d(${participant.cursor.x}px, ${participant.cursor.y}px, 0)`,
      }}
    >
      <div
        className="flex origin-top-left items-start gap-1"
        style={{
          transform: `scale(${scale})`,
        }}
      >
        <MousePointer2
          aria-hidden="true"
          className="size-5 shrink-0 drop-shadow"
          style={{
            color: participant.cursorColor,
            fill: participant.cursorColor,
            stroke: participant.cursorColor,
          }}
        />
        <span
          className="mt-4 max-w-40 truncate rounded-full px-2 py-1 text-xs font-semibold leading-none shadow-xl ring-1 ring-[var(--bg-base)]"
          style={{
            backgroundColor: participant.cursorColor,
            color: "var(--bg-base)",
          }}
        >
          {participant.displayName}
        </span>
      </div>
    </div>
  );
}

interface ShapePanelProps {
  onShapeDragEnd: () => void;
  onShapeDragMove: (position: DragPointerPosition) => void;
  onShapeDragStart: (
    payload: ShapeDragPayload,
    position: DragPointerPosition,
  ) => void;
}

function ShapePanel({
  onShapeDragEnd,
  onShapeDragMove,
  onShapeDragStart,
}: ShapePanelProps) {
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
          onDrag={(event) => {
            onShapeDragMove(getDragPointerPosition(event));
          }}
          onDragEnd={onShapeDragEnd}
          onDragStart={(event) => {
            const payload = writeShapeDragPayload(event, shape);

            onShapeDragStart(payload, getDragPointerPosition(event));
          }}
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

interface ShapeDragPreviewProps {
  preview: ShapeDragPreviewState | null;
}

function ShapeDragPreview({ preview }: ShapeDragPreviewProps) {
  if (!preview) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-50 opacity-75"
      style={{
        height: preview.defaultSize.height,
        transform: `translate3d(${preview.position.x}px, ${preview.position.y}px, 0)`,
        width: preview.defaultSize.width,
      }}
    >
      <CanvasShapeFrame
        color={DEFAULT_NODE_COLOR}
        selected={false}
        shape={preview.shape}
      />
    </div>
  );
}

function CanvasEdgeRenderer({
  data,
  id,
  markerEnd,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeData } = useReactFlow<CanvasNode, CanvasEdge>();
  const inputRef = useRef<HTMLInputElement>(null);
  const savedLabel = getEdgeLabel(data);
  const [draftLabel, setDraftLabel] = useState(savedLabel);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    borderRadius: 8,
    offset: 24,
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });
  const trimmedLabel = savedLabel.trim();
  const hasLabel = trimmedLabel.length > 0;
  const isActive = selected || isHovered || isEditing;
  const shouldShowLabel = isEditing || hasLabel || isActive;
  const visibleEdgeStyle = {
    ...style,
    stroke: "var(--canvas-edge)",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.5,
  } satisfies CSSProperties;

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, [isEditing]);

  const openLabelEditor = useCallback(
    (event: MouseEvent<Element>) => {
      event.stopPropagation();
      setDraftLabel(savedLabel);
      setIsEditing(true);
    },
    [savedLabel],
  );

  const saveLabel = useCallback(() => {
    const nextLabel = draftLabel.trim();

    updateEdgeData(id, { label: nextLabel });
    setDraftLabel(nextLabel);
    setIsEditing(false);
  }, [draftLabel, id, updateEdgeData]);

  const handleLabelChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraftLabel(event.target.value);
    },
    [],
  );

  const handleLabelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();

      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        saveLabel();
        event.currentTarget.blur();
      }
    },
    [saveLabel],
  );

  return (
    <>
      <g
        className="transition-opacity duration-150"
        style={{ opacity: isActive ? 0.95 : 0.46 }}
      >
        <path
          className="react-flow__edge-path"
          d={edgePath}
          fill="none"
          markerEnd={markerEnd}
          pointerEvents="none"
          style={visibleEdgeStyle}
        />
      </g>
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        onDoubleClick={openLabelEditor}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        stroke="transparent"
        strokeWidth={edgeInteractionWidth}
        style={{ cursor: "pointer", pointerEvents: "stroke" }}
      />
      <EdgeLabelRenderer>
        {shouldShowLabel ? (
          <div
            className="nodrag nopan nowheel absolute"
            onClick={stopCanvasInteraction}
            onDoubleClick={openLabelEditor}
            onMouseDown={stopCanvasInteraction}
            onMouseEnter={() => {
              setIsHovered(true);
            }}
            onMouseLeave={() => {
              setIsHovered(false);
            }}
            onPointerDown={stopCanvasInteraction}
            onWheel={stopCanvasInteraction}
            style={{
              pointerEvents: "all",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {isEditing ? (
              <input
                aria-label="Edge label"
                className="nodrag nopan nowheel h-7 max-w-[18rem] rounded-full border border-surface-border bg-surface/95 px-3 text-center text-xs font-medium tracking-normal text-copy-primary shadow-xl outline-none transition-[border-color,box-shadow] placeholder:text-copy-faint focus:border-brand focus:shadow-[0_0_0_3px_var(--accent-primary-dim)]"
                onBlur={saveLabel}
                onChange={handleLabelChange}
                onClick={stopCanvasInteraction}
                onDoubleClick={stopCanvasInteraction}
                onKeyDown={handleLabelKeyDown}
                onMouseDown={stopCanvasInteraction}
                onPointerDown={stopCanvasInteraction}
                ref={inputRef}
                spellCheck={false}
                style={{
                  caretColor: "var(--accent-primary)",
                  width: getEdgeLabelInputWidth(draftLabel),
                }}
                value={draftLabel}
              />
            ) : (
              <span
                className={cn(
                  "block rounded-full border border-surface-border bg-surface/90 px-2.5 py-1 text-xs font-medium leading-none tracking-normal shadow-lg backdrop-blur",
                  hasLabel ? "text-copy-secondary" : "text-copy-faint/70",
                )}
              >
                {hasLabel ? trimmedLabel : edgeLabelHint}
              </span>
            )}
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}

function CanvasNodeRenderer({
  data,
  height,
  id,
  isConnectable,
  selected,
  width,
}: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow<CanvasNode, CanvasEdge>();
  const defaultSize = NODE_DEFAULT_SIZES[data.shape];
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const nodeStyle = {
    height: height ?? defaultSize.height,
    width: width ?? defaultSize.width,
  } satisfies CSSProperties;

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    textAreaRef.current?.focus({ preventScroll: true });
    textAreaRef.current?.select();
  }, [isEditing]);

  const handleLabelDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setIsEditing(true);
    },
    [],
  );

  const handleLabelChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { label: event.target.value });
    },
    [id, updateNodeData],
  );

  const handleColorSelect = useCallback(
    (color: CanvasNodeColor) => {
      updateNodeData(id, { color });
    },
    [id, updateNodeData],
  );

  const handleLabelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation();

      if (event.key === "Escape") {
        event.preventDefault();
        setIsEditing(false);
        event.currentTarget.blur();
      }
    },
    [],
  );

  const closeLabelEditor = useCallback(() => {
    setIsEditing(false);
  }, []);

  return (
    <div
      aria-label={`${data.shape} node`}
      className="group relative"
      style={nodeStyle}
    >
      <NodeColorToolbar
        nodeId={id}
        onColorSelect={handleColorSelect}
        selectedColor={data.color}
        visible={selected}
      />
      <NodeResizer
        color="var(--accent-primary)"
        handleClassName="!rounded-full !opacity-80 transition-opacity"
        handleStyle={nodeResizeHandleStyle}
        isVisible={selected}
        lineClassName="transition-opacity"
        lineStyle={nodeResizeLineStyle}
        minHeight={minimumNodeSize.height}
        minWidth={minimumNodeSize.width}
      />
      <CanvasShapeFrame
        color={data.color}
        selected={selected}
        shape={data.shape}
      >
        <CanvasNodeLabel
          isEditing={isEditing}
          label={data.label}
          onBlur={closeLabelEditor}
          onChange={handleLabelChange}
          onDoubleClick={handleLabelDoubleClick}
          onKeyDown={handleLabelKeyDown}
          textAreaRef={textAreaRef}
        />
      </CanvasShapeFrame>
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
    </div>
  );
}

interface NodeColorToolbarProps {
  nodeId: string;
  onColorSelect: (color: CanvasNodeColor) => void;
  selectedColor: CanvasNodeColor;
  visible: boolean;
}

function NodeColorToolbar({
  nodeId,
  onColorSelect,
  selectedColor,
  visible,
}: NodeColorToolbarProps) {
  return (
    <NodeToolbar
      className="nodrag nopan nowheel flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur"
      isVisible={visible}
      nodeId={nodeId}
      offset={14}
      onClick={stopCanvasInteraction}
      onDoubleClick={stopCanvasInteraction}
      onMouseDown={stopCanvasInteraction}
      onPointerDown={stopCanvasInteraction}
      onWheel={stopCanvasInteraction}
      position={Position.Top}
      role="toolbar"
    >
      {NODE_COLORS.map((color, index) => {
        const isActive = isSameNodeColor(color, selectedColor);

        return (
          <button
            aria-label={`Apply node color ${index + 1}`}
            aria-pressed={isActive}
            className="nodrag nopan nowheel relative flex size-6 items-center justify-center rounded-full border p-0 transition-[box-shadow,transform] duration-150 hover:scale-105 hover:shadow-[0_0_0_3px_var(--swatch-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--swatch-glow)] data-[active=true]:scale-105 data-[active=true]:shadow-[0_0_0_2px_var(--swatch-glow)]"
            data-active={isActive ? "true" : "false"}
            key={`${color.fill}-${color.text}`}
            onClick={(event) => {
              stopCanvasInteraction(event);
              onColorSelect(color);
            }}
            onDoubleClick={stopCanvasInteraction}
            onMouseDown={stopCanvasInteraction}
            onPointerDown={stopCanvasInteraction}
            style={getColorSwatchStyle(color)}
            title={`Apply node color ${index + 1}`}
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none size-1.5 rounded-full opacity-0 transition-opacity",
                isActive && "opacity-100",
              )}
              style={{ backgroundColor: color.text }}
            />
          </button>
        );
      })}
    </NodeToolbar>
  );
}

interface CanvasNodeLabelProps {
  isEditing: boolean;
  label: string;
  onBlur: () => void;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onDoubleClick: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
}

function CanvasNodeLabel({
  isEditing,
  label,
  onBlur,
  onChange,
  onDoubleClick,
  onKeyDown,
  textAreaRef,
}: CanvasNodeLabelProps) {
  const displayLabel = label.trim().length > 0 ? label : "Untitled node";

  return (
    <div
      className="relative flex min-h-5 w-full min-w-0 items-center justify-center"
      onDoubleClick={onDoubleClick}
    >
      <span
        className={cn(
          "block max-w-full truncate leading-5",
          label.trim().length === 0 && "opacity-55",
          isEditing && "opacity-0",
        )}
      >
        {displayLabel}
      </span>
      {isEditing ? (
        <textarea
          aria-label="Node label"
          className="nodrag nopan nowheel absolute inset-0 h-full w-full resize-none overflow-hidden border-none bg-transparent p-0 text-center text-sm font-medium leading-5 tracking-normal text-inherit outline-none placeholder:text-inherit placeholder:opacity-55"
          onBlur={onBlur}
          onChange={onChange}
          onClick={stopCanvasInteraction}
          onDoubleClick={stopCanvasInteraction}
          onKeyDown={onKeyDown}
          onMouseDown={stopCanvasInteraction}
          onPointerDown={stopCanvasInteraction}
          placeholder="Untitled node"
          ref={textAreaRef}
          rows={1}
          spellCheck={false}
          style={{
            caretColor: "var(--accent-primary)",
            color: "inherit",
          }}
          value={label}
        />
      ) : null}
    </div>
  );
}

interface CanvasShapeFrameProps {
  children?: ReactNode;
  color: CanvasNodeColor;
  selected: boolean;
  shape: CanvasNodeShape;
}

function CanvasShapeFrame({
  children,
  color,
  selected,
  shape,
}: CanvasShapeFrameProps) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden text-center text-sm font-medium tracking-normal"
      style={{ color: color.text }}
    >
      <CanvasShapeSurface color={color} selected={selected} shape={shape} />
      {children ? (
        <div
          className={cn(
            "relative z-10 flex w-full max-w-full items-center justify-center px-4 py-3",
            shape === "diamond" && "max-w-[68%]",
            shape === "circle" && "max-w-[78%]",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface CanvasShapeSurfaceProps {
  color: CanvasNodeColor;
  selected: boolean;
  shape: CanvasNodeShape;
}

function CanvasShapeSurface({
  color,
  selected,
  shape,
}: CanvasShapeSurfaceProps) {
  const borderColor = selected
    ? "var(--accent-primary)"
    : "var(--border-subtle)";

  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 border transition-colors",
          shape === "rectangle" ? "rounded-xl" : "rounded-full",
        )}
        style={{
          backgroundColor: color.fill,
          borderColor,
        }}
      />
    );
  }

  return (
    <CanvasSvgShape
      borderColor={borderColor}
      fillColor={color.fill}
      selected={selected}
      shape={shape}
    />
  );
}

interface CanvasSvgShapeProps {
  borderColor: string;
  fillColor: string;
  selected: boolean;
  shape: Extract<CanvasNodeShape, "diamond" | "hexagon" | "cylinder">;
}

function CanvasSvgShape({
  borderColor,
  fillColor,
  selected,
  shape,
}: CanvasSvgShapeProps) {
  const strokeWidth = selected ? 2 : 1.25;

  if (shape === "cylinder") {
    return (
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M8 18 C8 6 92 6 92 18 L92 82 C92 94 8 94 8 82 Z"
          fill={fillColor}
          stroke={borderColor}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M8 18 C8 30 92 30 92 18"
          fill="none"
          stroke={borderColor}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const points =
    shape === "diamond"
      ? "50 2 98 50 50 98 2 50"
      : "25 3 75 3 98 50 75 97 25 97 2 50";

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <polygon
        fill={fillColor}
        points={points}
        stroke={borderColor}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
      id={position}
      isConnectable={isConnectable}
      position={position}
      type="source"
    />
  );
}

function filterCurrentUserParticipants<T extends { userId: string }>(
  entries: ReadonlyArray<readonly [number, T]>,
  currentUserId: string | null | undefined,
) {
  return entries.reduce<Array<T & { connectionId: number }>>(
    (participants, [connectionId, participant]) => {
      if (currentUserId && participant.userId === currentUserId) {
        return participants;
      }

      participants.push({
        ...participant,
        connectionId,
      });

      return participants;
    },
    [],
  );
}

function getInitials(displayName: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

function stopCanvasInteraction(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function toRenderableCanvasEdge(edge: CanvasEdge): CanvasEdge {
  const data = edge.data ?? {};
  const label = getEdgeLabel(data);

  if (edge.type === CANVAS_EDGE_TYPE && data.label === label) {
    return edge;
  }

  return {
    ...edge,
    data: {
      ...data,
      label,
    },
    type: CANVAS_EDGE_TYPE,
  };
}

function getEdgeLabel(data: CanvasEdgeData | undefined) {
  return typeof data?.label === "string" ? data.label : "";
}

function getEdgeLabelInputWidth(label: string) {
  return `${Math.min(Math.max(label.length + 1, 7), 36)}ch`;
}

type ColorSwatchStyle = CSSProperties & {
  "--swatch-glow": string;
};

function getColorSwatchStyle(color: CanvasNodeColor): ColorSwatchStyle {
  return {
    "--swatch-glow": color.text,
    backgroundColor: color.fill,
    borderColor: color.text,
    color: color.text,
  };
}

function isSameNodeColor(
  firstColor: CanvasNodeColor,
  secondColor: CanvasNodeColor,
) {
  return (
    firstColor.fill === secondColor.fill && firstColor.text === secondColor.text
  );
}

function writeShapeDragPayload(
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
  hideNativeDragImage(event.dataTransfer);

  return payload;
}

function hideNativeDragImage(dataTransfer: DataTransfer) {
  const dragImage = document.createElement("div");

  dragImage.style.height = "1px";
  dragImage.style.left = "-1000px";
  dragImage.style.opacity = "0";
  dragImage.style.position = "fixed";
  dragImage.style.top = "-1000px";
  dragImage.style.width = "1px";

  document.body.appendChild(dragImage);
  dataTransfer.setDragImage(dragImage, 0, 0);
  requestAnimationFrame(() => {
    dragImage.remove();
  });
}

function getDragPointerPosition(
  event: DragEvent<HTMLElement>,
): DragPointerPosition {
  return {
    x: event.clientX,
    y: event.clientY,
  };
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
