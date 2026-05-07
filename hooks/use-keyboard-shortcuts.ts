"use client";

import { useEffect } from "react";
import type { ReactFlowInstance } from "@xyflow/react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface UseKeyboardShortcutsOptions {
  reactFlowInstance: ReactFlowInstance<CanvasNode, CanvasEdge> | null;
  onRedo: () => void;
  onUndo: () => void;
}

const shortcutViewportAnimationDuration = 150;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, [contenteditable='true'], [role='textbox']",
    ),
  );
}

export function useKeyboardShortcuts({
  reactFlowInstance,
  onRedo,
  onUndo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isMod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (key === "+" || key === "=") {
        event.preventDefault();
        void reactFlowInstance?.zoomIn({
          duration: shortcutViewportAnimationDuration,
        });
        return;
      }

      if (key === "-") {
        event.preventDefault();
        void reactFlowInstance?.zoomOut({
          duration: shortcutViewportAnimationDuration,
        });
        return;
      }

      if (isMod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (isMod && key === "z" && event.shiftKey) {
        event.preventDefault();
        onRedo();
        return;
      }

      if (isMod && key === "y") {
        event.preventDefault();
        onRedo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reactFlowInstance, onRedo, onUndo]);
}
