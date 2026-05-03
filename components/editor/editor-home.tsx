"use client";

import { Plus } from "lucide-react";

import { useProjectDialogsContext } from "@/components/editor/project-dialogs-provider";
import { Button } from "@/components/ui/button";

export function EditorHome() {
  const { openCreateDialog } = useProjectDialogsContext();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-normal text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="max-w-lg text-sm leading-6 text-copy-secondary">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
        <Button onClick={openCreateDialog} size="lg" type="button">
          <Plus data-icon="inline-start" />
          New Project
        </Button>
      </div>
    </div>
  );
}
