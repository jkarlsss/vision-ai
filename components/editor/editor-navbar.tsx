"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Bot,
  CheckCircle2,
  LayoutTemplate,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Share2,
  TriangleAlert,
} from "lucide-react";

import {
  editorUserButtonAppearance,
  editorUserProfileAppearance,
} from "@/components/editor/clerk-user-button-appearance";
import type { CanvasSaveStatus } from "@/components/editor/canvas-save-status-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const workspaceActionButtonClassName =
  "gap-2 px-3 text-copy-secondary hover:bg-accent-dim hover:text-brand";

interface EditorNavbarProps {
  isAiSidebarOpen?: boolean;
  isSidebarOpen: boolean;
  onOpenStarterTemplates?: () => void;
  onSaveCanvas?: () => void;
  onShareProject?: () => void;
  onToggleAiSidebar?: () => void;
  onToggleSidebar: () => void;
  className?: string;
  projectName?: string;
  saveStatus?: CanvasSaveStatus;
  showWorkspaceActions?: boolean;
}

export function EditorNavbar({
  isAiSidebarOpen = true,
  isSidebarOpen,
  onOpenStarterTemplates,
  onSaveCanvas,
  onShareProject,
  onToggleAiSidebar,
  onToggleSidebar,
  className,
  projectName,
  saveStatus = "saved",
  showWorkspaceActions = false,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3",
        className,
      )}
    >
      <div className="flex flex-1 items-center justify-start">
        <Button
          aria-label={
            isSidebarOpen ? "Close project sidebar" : "Open project sidebar"
          }
          className={workspaceActionButtonClassName}
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Close projects" : "Open projects"}
          type="button"
          variant="ghost"
        >
          <SidebarIcon data-icon="inline-start" />
          <span className="hidden text-xs font-medium sm:inline">
            Projects
          </span>
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <span className="max-w-[min(22rem,50vw)] truncate text-sm font-medium text-copy-secondary">
          {projectName ?? "Vision AI"}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {showWorkspaceActions && (
          <>
            <SaveStatusButton
              onSaveCanvas={onSaveCanvas}
              saveStatus={saveStatus}
            />
            <Button
              aria-label="Import starter template"
              className={workspaceActionButtonClassName}
              disabled={!onOpenStarterTemplates}
              onClick={onOpenStarterTemplates}
              title="Templates"
              type="button"
              variant="ghost"
            >
              <LayoutTemplate data-icon="inline-start" />
              <span className="hidden text-xs font-medium sm:inline">
                Templates
              </span>
            </Button>
            <Button
              aria-label="Share project"
              className={workspaceActionButtonClassName}
              disabled={!onShareProject}
              onClick={onShareProject}
              title="Share project"
              type="button"
              variant="ghost"
            >
              <Share2 data-icon="inline-start" />
              <span className="hidden text-xs font-medium sm:inline">
                Share
              </span>
            </Button>
            <Button
              aria-label={
                isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
              }
              className={workspaceActionButtonClassName}
              onClick={onToggleAiSidebar}
              title={isAiSidebarOpen ? "Close AI panel" : "Open AI panel"}
              type="button"
              variant="ghost"
            >
              <Bot data-icon="inline-start" />
              <span className="hidden text-xs font-medium sm:inline">
                AI Panel
              </span>
            </Button>
          </>
        )}
        <UserButton
          appearance={editorUserButtonAppearance}
          userProfileProps={{ appearance: editorUserProfileAppearance }}
        />
      </div>
    </header>
  );
}

interface SaveStatusButtonProps {
  onSaveCanvas?: () => void;
  saveStatus: CanvasSaveStatus;
}

function SaveStatusButton({
  onSaveCanvas,
  saveStatus,
}: SaveStatusButtonProps) {
  const { Icon, label, statusClassName } = getSaveStatusDisplay(saveStatus);

  return (
    <Button
      aria-label={`Canvas save status: ${label}`}
      className={workspaceActionButtonClassName}
      disabled={!onSaveCanvas || saveStatus === "saving"}
      onClick={onSaveCanvas}
      title={`Canvas ${label.toLowerCase()}`}
      type="button"
      variant="ghost"
    >
      <Save data-icon="inline-start" />
      <span className="hidden text-xs font-medium sm:inline">{label}</span>
      <Icon
        aria-hidden="true"
        className={cn(
          "size-3.5",
          saveStatus === "saving" && "animate-spin",
          statusClassName,
        )}
      />
    </Button>
  );
}

function getSaveStatusDisplay(saveStatus: CanvasSaveStatus) {
  if (saveStatus === "saving") {
    return {
      Icon: LoaderCircle,
      label: "Saving",
      statusClassName: "text-brand",
    };
  }

  if (saveStatus === "error") {
    return {
      Icon: TriangleAlert,
      label: "Error",
      statusClassName: "text-state-error",
    };
  }

  return {
    Icon: CheckCircle2,
    label: "Saved",
    statusClassName: "text-state-success",
  };
}
