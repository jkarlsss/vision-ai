"use client";

import { Plus } from "lucide-react";

import { useProjectDialogsContext } from "@/components/editor/project-dialogs-provider";
import { Button } from "@/components/ui/button";

export function EditorHomeCreateButton() {
  const { openCreateDialog } = useProjectDialogsContext();

  return (
    <Button onClick={openCreateDialog} size="lg" type="button">
      <Plus data-icon="inline-start" />
      New Project
    </Button>
  );
}
