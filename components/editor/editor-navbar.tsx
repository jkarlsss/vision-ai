"use client";

import { UserButton } from "@clerk/nextjs";
import {
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Share2,
} from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const userButtonAppearance: ComponentProps<typeof UserButton>["appearance"] = {
  elements: {
    userButtonPopoverCard: {
      backgroundColor: "var(--bg-surface)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
      boxShadow: "none",
    },
    userButtonPopoverMain: {
      backgroundColor: "var(--bg-surface)",
    },
    userPreviewMainIdentifierText: {
      color: "var(--text-primary)",
      fontWeight: "600",
    },
    userPreviewSecondaryIdentifier: {
      color: "var(--text-secondary)",
    },
    userButtonPopoverActionButton: {
      color: "var(--text-secondary)",
      opacity: "1",
      "&:hover": {
        backgroundColor: "var(--bg-subtle)",
        color: "var(--text-primary)",
      },
      "&:focus-visible": {
        backgroundColor: "var(--bg-subtle)",
        color: "var(--text-primary)",
      },
    },
    userButtonPopoverActionButtonIconBox: {
      color: "var(--text-secondary)",
      opacity: "1",
    },
    userButtonPopoverActionButtonIcon: {
      color: "var(--text-secondary)",
      opacity: "1",
    },
    userButtonPopoverFooter: {
      color: "var(--text-secondary)",
    },
  },
};

const userProfileAppearance: NonNullable<
  ComponentProps<typeof UserButton>["userProfileProps"]
>["appearance"] = {
  variables: {
    colorBackground: "var(--bg-surface)",
    colorForeground: "var(--text-primary)",
    colorMuted: "var(--bg-subtle)",
    colorMutedForeground: "var(--text-secondary)",
    colorBorder: "var(--border-default)",
    colorInput: "var(--bg-elevated)",
    colorInputForeground: "var(--text-primary)",
    colorPrimary: "var(--accent-primary)",
    colorPrimaryForeground: "var(--bg-base)",
    colorRing: "var(--accent-primary)",
  },
  elements: {
    cardBox: {
      backgroundColor: "var(--bg-surface)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
      boxShadow: "none",
    },
    modalContent: {
      backgroundColor: "var(--bg-surface)",
      color: "var(--text-primary)",
    },
    page: {
      backgroundColor: "var(--bg-surface)",
      color: "var(--text-primary)",
    },
    pageScrollBox: {
      backgroundColor: "var(--bg-surface)",
    },
    navbar: {
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border-default)",
      color: "var(--text-secondary)",
    },
    navbarButton: {
      color: "var(--text-secondary)",
      opacity: "1",
      "&:hover": {
        backgroundColor: "var(--bg-subtle)",
        color: "var(--text-primary)",
      },
    },
    navbarButton__active: {
      backgroundColor: "var(--bg-subtle)",
      color: "var(--text-primary)",
    },
    navbarButtonIcon: {
      color: "var(--text-secondary)",
      opacity: "1",
    },
    navbarButtonIcon__active: {
      color: "var(--text-primary)",
    },
    navbarButtonText: {
      color: "var(--text-secondary)",
      opacity: "1",
    },
    navbarButtonText__active: {
      color: "var(--text-primary)",
      fontWeight: "600",
    },
    headerTitle: {
      color: "var(--text-primary)",
    },
    headerSubtitle: {
      color: "var(--text-secondary)",
    },
    profileSection: {
      backgroundColor: "var(--bg-surface)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
    profileSectionTitleText: {
      color: "var(--text-primary)",
    },
    profileSectionSubtitleText: {
      color: "var(--text-secondary)",
    },
    profileSectionItem: {
      color: "var(--text-primary)",
      borderColor: "var(--border-default)",
    },
    profileSectionContent: {
      color: "var(--text-primary)",
    },
    identityPreview: {
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
    identityPreviewText: {
      color: "var(--text-primary)",
    },
    lineItemsTitle: {
      color: "var(--text-primary)",
    },
    lineItemsTitleDescription: {
      color: "var(--text-secondary)",
    },
    lineItemsDescription: {
      color: "var(--text-secondary)",
    },
    lineItemsDescriptionText: {
      color: "var(--text-secondary)",
    },
    badge: {
      backgroundColor: "var(--bg-subtle)",
      borderColor: "var(--border-subtle)",
      color: "var(--text-primary)",
      fontWeight: "600",
    },
    badge__primary: {
      backgroundColor: "var(--accent-primary-dim)",
      borderColor: "var(--accent-primary)",
      color: "var(--accent-primary)",
      fontWeight: "600",
    },
    formFieldLabel: {
      color: "var(--text-primary)",
    },
    formFieldInput: {
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
    formFieldHintText: {
      color: "var(--text-secondary)",
    },
    formButtonReset: {
      color: "var(--text-secondary)",
    },
    menuList: {
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
    },
    menuItem: {
      color: "var(--text-primary)",
      "&:hover": {
        backgroundColor: "var(--bg-subtle)",
      },
    },
    tableHead: {
      color: "var(--text-secondary)",
    },
    tableBodyCell: {
      color: "var(--text-primary)",
    },
    footer: {
      backgroundColor: "var(--bg-elevated)",
      color: "var(--text-secondary)",
    },
  },
};

interface EditorNavbarProps {
  isAiSidebarOpen?: boolean;
  isSidebarOpen: boolean;
  onOpenStarterTemplates?: () => void;
  onShareProject?: () => void;
  onToggleAiSidebar?: () => void;
  onToggleSidebar: () => void;
  className?: string;
  projectName?: string;
  showWorkspaceActions?: boolean;
}

export function EditorNavbar({
  isAiSidebarOpen = true,
  isSidebarOpen,
  onOpenStarterTemplates,
  onShareProject,
  onToggleAiSidebar,
  onToggleSidebar,
  className,
  projectName,
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
          appearance={userButtonAppearance}
          userProfileProps={{ appearance: userProfileAppearance }}
        />
      </div>
    </header>
  );
}
