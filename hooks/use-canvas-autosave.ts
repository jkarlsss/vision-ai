"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CanvasSaveStatus } from "@/components/editor/canvas-save-status-context";
import {
  createCanvasSnapshot,
  parseCanvasSnapshot,
  serializeCanvasSnapshot,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSnapshot,
} from "@/types/canvas";

interface UseCanvasAutosaveOptions {
  edges: readonly CanvasEdge[];
  manualSaveRequestId: number;
  nodes: readonly CanvasNode[];
  onLoadCanvas: (snapshot: CanvasSnapshot) => void;
  projectId: string;
}

interface CanvasResponse {
  canvas: CanvasSnapshot | null;
}

interface ApiErrorResponse {
  error: string;
}

const autosaveDebounceMs = 1200;

export function useCanvasAutosave({
  edges,
  manualSaveRequestId,
  nodes,
  onLoadCanvas,
  projectId,
}: UseCanvasAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("saved");
  const [initialLoadState, setInitialLoadState] = useState({
    isCompleted: false,
    projectId,
  });
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const latestCanvasRef = useRef({ edges, nodes });
  const activeSaveAbortControllerRef = useRef<AbortController | null>(null);
  const activeSaveIdRef = useRef(0);
  const loadedProjectIdRef = useRef<string | null>(null);
  const snapshot = useMemo(
    () => createCanvasSnapshot(nodes, edges),
    [edges, nodes],
  );
  const serializedSnapshot = useMemo(
    () => serializeCanvasSnapshot(snapshot),
    [snapshot],
  );
  const hasLocalCanvasContent = nodes.length > 0 || edges.length > 0;
  const hasInitialLoadCompleted =
    initialLoadState.projectId === projectId && initialLoadState.isCompleted;
  const canSave = hasInitialLoadCompleted || hasLocalCanvasContent;

  useEffect(() => {
    latestCanvasRef.current = { edges, nodes };
  }, [edges, nodes]);

  useEffect(() => {
    if (loadedProjectIdRef.current === projectId) {
      return;
    }

    loadedProjectIdRef.current = projectId;
    lastSavedSnapshotRef.current = null;
    activeSaveAbortControllerRef.current?.abort();
    activeSaveAbortControllerRef.current = null;

    if (hasCurrentCanvasContent(latestCanvasRef.current)) {
      lastSavedSnapshotRef.current = serializeCanvasSnapshot(
        createCanvasSnapshot(
          latestCanvasRef.current.nodes,
          latestCanvasRef.current.edges,
        ),
      );
      queueMicrotask(() => {
        setInitialLoadState({ isCompleted: true, projectId });
        setSaveStatus("saved");
      });
      return;
    }

    const abortController = new AbortController();

    requestSavedCanvas(projectId, abortController.signal)
      .then((savedCanvas) => {
        if (abortController.signal.aborted) {
          return;
        }

        if (!savedCanvas) {
          lastSavedSnapshotRef.current = serializeCanvasSnapshot(
            createCanvasSnapshot(
              latestCanvasRef.current.nodes,
              latestCanvasRef.current.edges,
            ),
          );
          setInitialLoadState({ isCompleted: true, projectId });
          setSaveStatus("saved");
          return;
        }

        if (hasCurrentCanvasContent(latestCanvasRef.current)) {
          lastSavedSnapshotRef.current = serializeCanvasSnapshot(
            createCanvasSnapshot(
              latestCanvasRef.current.nodes,
              latestCanvasRef.current.edges,
            ),
          );
          setInitialLoadState({ isCompleted: true, projectId });
          setSaveStatus("saved");
          return;
        }

        lastSavedSnapshotRef.current = serializeCanvasSnapshot(savedCanvas);
        onLoadCanvas(savedCanvas);
        setInitialLoadState({ isCompleted: true, projectId });
        setSaveStatus("saved");
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          setSaveStatus("error");
        }
      });

    return () => abortController.abort();
  }, [onLoadCanvas, projectId]);

  const saveSnapshot = useCallback(
    async (nextSnapshot: CanvasSnapshot, serializedNextSnapshot: string) => {
      if (serializedNextSnapshot === lastSavedSnapshotRef.current) {
        setSaveStatus("saved");
        return;
      }

      activeSaveAbortControllerRef.current?.abort();

      const abortController = new AbortController();
      const saveId = activeSaveIdRef.current + 1;

      activeSaveIdRef.current = saveId;
      activeSaveAbortControllerRef.current = abortController;
      setSaveStatus("saving");

      try {
        await requestSaveCanvas(projectId, nextSnapshot, abortController.signal);

        if (
          !abortController.signal.aborted &&
          saveId === activeSaveIdRef.current
        ) {
          lastSavedSnapshotRef.current = serializedNextSnapshot;
          setSaveStatus("saved");
        }
      } catch (error) {
        if (
          !isAbortError(error) &&
          !abortController.signal.aborted &&
          saveId === activeSaveIdRef.current
        ) {
          setSaveStatus("error");
        }
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (!canSave) {
      return;
    }

    if (serializedSnapshot === lastSavedSnapshotRef.current) {
      setSaveStatus("saved");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveSnapshot(snapshot, serializedSnapshot);
    }, autosaveDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [canSave, saveSnapshot, serializedSnapshot, snapshot]);

  useEffect(() => {
    if (manualSaveRequestId === 0 || !canSave) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveSnapshot(snapshot, serializedSnapshot);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    canSave,
    manualSaveRequestId,
    saveSnapshot,
    serializedSnapshot,
    snapshot,
  ]);

  useEffect(
    () => () => {
      activeSaveAbortControllerRef.current?.abort();
    },
    [],
  );

  return saveStatus;
}

async function requestSavedCanvas(
  projectId: string,
  signal: AbortSignal,
): Promise<CanvasSnapshot | null> {
  const response = await fetch(getCanvasApiUrl(projectId), { signal });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  if (!isCanvasResponse(data)) {
    throw new Error("Canvas response was invalid.");
  }

  return data.canvas;
}

async function requestSaveCanvas(
  projectId: string,
  canvas: CanvasSnapshot,
  signal: AbortSignal,
) {
  const response = await fetch(getCanvasApiUrl(projectId), {
    body: serializeCanvasSnapshot(canvas),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
    signal,
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  if (!isCanvasResponse(data) || !data.canvas) {
    throw new Error("Canvas response was invalid.");
  }
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function getCanvasApiUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/canvas`;
}

function hasCurrentCanvasContent(canvas: {
  edges: readonly CanvasEdge[];
  nodes: readonly CanvasNode[];
}) {
  return canvas.nodes.length > 0 || canvas.edges.length > 0;
}

function isCanvasResponse(value: unknown): value is CanvasResponse {
  return (
    isRecord(value) &&
    (value.canvas === null || parseCanvasSnapshot(value.canvas) !== null)
  );
}

function getApiErrorMessage(data: unknown) {
  if (isApiErrorResponse(data)) {
    return data.error;
  }

  return "Canvas save request failed.";
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
