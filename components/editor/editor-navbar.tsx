"use client";

import { UserButton } from "@clerk/nextjs";
import {
  CheckCircle2,
  LayoutTemplate,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
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
  const AiSidebarIcon = isAiSidebarOpen ? PanelRightClose : PanelRightOpen;

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3",
        className,
      )}
    >
      <div className="flex flex-1 items-center justify-start">
        <Button
          aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          onClick={onToggleSidebar}
          size="icon"
          type="button"
          variant="ghost"
        >
          <SidebarIcon />
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
              disabled={!onOpenStarterTemplates}
              onClick={onOpenStarterTemplates}
              size="icon"
              type="button"
              variant="ghost"
            >
              <LayoutTemplate />
            </Button>
            <Button
              aria-label="Share project"
              disabled={!onShareProject}
              onClick={onShareProject}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Share2 />
            </Button>
            <Button
              aria-label={
                isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
              }
              onClick={onToggleAiSidebar}
              size="icon"
              type="button"
              variant="ghost"
            >
              <AiSidebarIcon />
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
      className="gap-2 px-3 text-copy-secondary hover:bg-accent-dim hover:text-brand"
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
