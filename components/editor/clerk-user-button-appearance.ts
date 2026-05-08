import type { UserButton } from "@clerk/nextjs";
import type { ComponentProps } from "react";

export const editorUserButtonAppearance: ComponentProps<
  typeof UserButton
>["appearance"] = {
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

export const editorUserProfileAppearance: NonNullable<
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
