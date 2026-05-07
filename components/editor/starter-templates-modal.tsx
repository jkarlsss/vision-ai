"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";

import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NODE_DEFAULT_SIZES, type CanvasNode } from "@/types/canvas";

interface StarterTemplatesModalProps {
  onImport: (template: CanvasTemplate) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

interface PreviewBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface PreviewNodeBox extends PreviewBounds {
  centerX: number;
  centerY: number;
  id: string;
}

const previewPadding = 80;
const fallbackPreviewBounds = {
  height: 240,
  width: 420,
  x: 0,
  y: 0,
} satisfies PreviewBounds;

export function StarterTemplatesModal({
  onImport,
  onOpenChange,
  open,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template);
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[min(48rem,calc(100svh-2rem))] overflow-hidden rounded-3xl sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-copy-primary">
            Starter templates
          </DialogTitle>
          <DialogDescription>
            Import a pre-built architecture into the current canvas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(38rem,calc(100svh-9rem))] min-h-0 pr-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                onImport={() => handleImport(template)}
                template={template}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  onImport: () => void;
  template: CanvasTemplate;
}

function TemplateCard({ onImport, template }: TemplateCardProps) {
  return (
    <Card
      className="rounded-2xl border border-surface-border bg-elevated text-copy-primary ring-0"
      size="sm"
    >
      <CardHeader>
        <CardTitle className="truncate text-copy-primary">
          {template.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 min-h-10 text-copy-secondary">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TemplatePreview template={template} />
      </CardContent>
      <CardFooter className="border-surface-border bg-surface/70 p-3">
        <Button className="w-full" onClick={onImport} type="button">
          <Download data-icon="inline-start" />
          Import
        </Button>
      </CardFooter>
    </Card>
  );
}

interface TemplatePreviewProps {
  template: CanvasTemplate;
}

function TemplatePreview({ template }: TemplatePreviewProps) {
  const nodeBoxes = useMemo(
    () => template.nodes.map(getPreviewNodeBox),
    [template.nodes],
  );
  const nodeBoxById = useMemo(
    () => new Map(nodeBoxes.map((nodeBox) => [nodeBox.id, nodeBox])),
    [nodeBoxes],
  );
  const bounds = useMemo(() => getPreviewBounds(nodeBoxes), [nodeBoxes]);

  return (
    <div className="aspect-[16/9] overflow-hidden rounded-xl border border-surface-border bg-base">
      <svg
        aria-hidden="true"
        className="size-full"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      >
        {template.edges.map((edge) => {
          const source = nodeBoxById.get(edge.source);
          const target = nodeBoxById.get(edge.target);

          if (!source || !target) {
            return null;
          }

          return (
            <line
              key={edge.id}
              opacity="0.5"
              stroke="var(--canvas-edge)"
              strokeLinecap="round"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              x1={source.centerX}
              x2={target.centerX}
              y1={source.centerY}
              y2={target.centerY}
            />
          );
        })}

        {template.nodes.map((node) => (
          <PreviewNode key={node.id} node={node} />
        ))}
      </svg>
    </div>
  );
}

interface PreviewNodeProps {
  node: CanvasNode;
}

function PreviewNode({ node }: PreviewNodeProps) {
  const { height, width, x, y } = getPreviewNodeBox(node);
  const fillColor = node.data.color.fill;
  const strokeColor = "var(--border-subtle)";

  if (node.data.shape === "rectangle" || node.data.shape === "pill") {
    return (
      <rect
        fill={fillColor}
        height={height}
        rx={node.data.shape === "pill" ? height / 2 : 14}
        stroke={strokeColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        width={width}
        x={x}
        y={y}
      />
    );
  }

  if (node.data.shape === "circle") {
    return (
      <ellipse
        cx={x + width / 2}
        cy={y + height / 2}
        fill={fillColor}
        rx={width / 2}
        ry={height / 2}
        stroke={strokeColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (node.data.shape === "diamond") {
    return (
      <polygon
        fill={fillColor}
        points={`${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`}
        stroke={strokeColor}
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  if (node.data.shape === "hexagon") {
    return (
      <polygon
        fill={fillColor}
        points={`${x + width * 0.22},${y} ${x + width * 0.78},${y} ${x + width},${y + height / 2} ${x + width * 0.78},${y + height} ${x + width * 0.22},${y + height} ${x},${y + height / 2}`}
        stroke={strokeColor}
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={height}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      width={width}
      x={x}
      y={y}
    >
      <path
        d="M8 18 C8 6 92 6 92 18 L92 82 C92 94 8 94 8 82 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M8 18 C8 30 92 30 92 18"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function getPreviewBounds(nodeBoxes: readonly PreviewNodeBox[]): PreviewBounds {
  if (nodeBoxes.length === 0) {
    return fallbackPreviewBounds;
  }

  const minX = Math.min(...nodeBoxes.map((nodeBox) => nodeBox.x));
  const minY = Math.min(...nodeBoxes.map((nodeBox) => nodeBox.y));
  const maxX = Math.max(
    ...nodeBoxes.map((nodeBox) => nodeBox.x + nodeBox.width),
  );
  const maxY = Math.max(
    ...nodeBoxes.map((nodeBox) => nodeBox.y + nodeBox.height),
  );

  return {
    height: maxY - minY + previewPadding * 2,
    width: maxX - minX + previewPadding * 2,
    x: minX - previewPadding,
    y: minY - previewPadding,
  };
}

function getPreviewNodeBox(node: CanvasNode): PreviewNodeBox {
  const size = getCanvasNodeSize(node);
  const { x, y } = node.position;

  return {
    centerX: x + size.width / 2,
    centerY: y + size.height / 2,
    height: size.height,
    id: node.id,
    width: size.width,
    x,
    y,
  };
}

function getCanvasNodeSize(node: CanvasNode) {
  const styleWidth =
    typeof node.style?.width === "number" ? node.style.width : undefined;
  const styleHeight =
    typeof node.style?.height === "number" ? node.style.height : undefined;
  const defaultSize = NODE_DEFAULT_SIZES[node.data.shape];

  return {
    height: node.height ?? styleHeight ?? defaultSize.height,
    width: node.width ?? styleWidth ?? defaultSize.width,
  };
}
