"use client";

import { useRef } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useProjectDialogsContext } from "@/components/editor/project-dialogs-provider";

const projectInputClassName =
  "text-copy-primary caret-copy-primary placeholder:text-copy-muted [&::placeholder]:[-webkit-text-fill-color:var(--text-muted)] [-webkit-text-fill-color:var(--text-primary)]";

export function ProjectDialogs() {
  const renameInputRef = useRef<HTMLInputElement>(null);
  const {
    canSubmitCreate,
    canSubmitRename,
    closeDialog,
    confirmDeleteProject,
    createProjectName,
    createProjectSlug,
    dialogState,
    isLoading,
    renameProjectName,
    renameProjectSlug,
    setCreateProjectName,
    setRenameProjectName,
    submitCreateProject,
    submitRenameProject,
  } = useProjectDialogsContext();

  const selectedProject = dialogState.project;

  return (
    <>
      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialog();
          }
        }}
        open={dialogState.type === "create"}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCreateProject();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-copy-primary">
                Create project
              </DialogTitle>
              <DialogDescription>
                Name the architecture workspace you want to start.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="create-project-name">
                  Project name
                </FieldLabel>
                <Input
                  autoComplete="off"
                  className={projectInputClassName}
                  id="create-project-name"
                  onChange={(event) => setCreateProjectName(event.target.value)}
                  placeholder="Realtime order platform"
                  value={createProjectName}
                />
                <FieldDescription aria-live="polite">
                  Slug preview:{" "}
                  <span className="font-mono text-copy-secondary">
                    {createProjectSlug}
                  </span>
                </FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={isLoading} type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={!canSubmitCreate || isLoading} type="submit">
                {isLoading ? "Creating..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialog();
          }
        }}
        open={dialogState.type === "rename"}
      >
        <DialogContent
          className="rounded-3xl sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            renameInputRef.current?.focus();
            renameInputRef.current?.select();
          }}
        >
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              void submitRenameProject();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-copy-primary">
                Rename project
              </DialogTitle>
              <DialogDescription>
                Current project name: {selectedProject?.name ?? "Untitled"}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="rename-project-name">
                  Project name
                </FieldLabel>
                <Input
                  autoComplete="off"
                  className={projectInputClassName}
                  id="rename-project-name"
                  onChange={(event) => setRenameProjectName(event.target.value)}
                  ref={renameInputRef}
                  value={renameProjectName}
                />
                <FieldDescription aria-live="polite">
                  Slug preview:{" "}
                  <span className="font-mono text-copy-secondary">
                    {renameProjectSlug}
                  </span>
                </FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={isLoading} type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={!canSubmitRename || isLoading} type="submit">
                {isLoading ? "Renaming..." : "Rename project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialog();
          }
        }}
        open={dialogState.type === "delete"}
      >
        <AlertDialogContent className="rounded-3xl" size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-copy-primary">
              Delete project?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedProject?.name ?? "this project"}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} variant="outline">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteProject();
              }}
              variant="destructive"
            >
              {isLoading ? "Deleting..." : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
