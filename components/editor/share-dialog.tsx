"use client";

import { Check, Copy, MailPlus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  ProjectAccess,
  ProjectListProject,
} from "@/hooks/use-project-actions";
import { getProjectWorkspacePath } from "@/lib/project-routes";

interface ShareDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: ProjectListProject | null;
}

interface ShareCollaborator {
  avatarUrl: string | null;
  createdAt: string;
  displayName: string | null;
  email: string;
  id: string;
}

interface CollaboratorsResponse {
  access: ProjectAccess;
  collaborators: ShareCollaborator[];
}

interface CollaboratorMutationResponse {
  collaborator: ShareCollaborator;
}

interface ApiErrorResponse {
  error: string;
}

const shareInputClassName =
  "text-copy-primary caret-copy-primary placeholder:text-copy-muted [&::placeholder]:[-webkit-text-fill-color:var(--text-muted)] [-webkit-text-fill-color:var(--text-primary)]";

export function ShareDialog({ onOpenChange, open, project }: ShareDialogProps) {
  const [access, setAccess] = useState<ProjectAccess>(
    project?.access ?? "collaborator",
  );
  const [collaborators, setCollaborators] = useState<ShareCollaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [hasLoadedCollaborators, setHasLoadedCollaborators] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<
    string | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const canManageAccess = access === "owner";
  const canSubmitInvite =
    canManageAccess && inviteEmail.trim().length > 0 && !isInviting;
  const isDialogOpen = Boolean(project) && open;
  const projectId = project?.id;
  const origin = useSyncExternalStore(
    subscribeToLocationOrigin,
    getBrowserLocationOrigin,
    getServerLocationOrigin,
  );
  const projectPath = projectId ? getProjectWorkspacePath(projectId) : "";
  const projectLink = projectPath ? `${origin}${projectPath}` : "";
  const isLoadingCollaborators =
    isDialogOpen && !hasLoadedCollaborators && !shareError;

  useEffect(() => {
    if (!isDialogOpen || !projectId) {
      return;
    }

    const abortController = new AbortController();

    requestCollaborators(projectId, abortController.signal)
      .then((response) => {
        setAccess(response.access);
        setCollaborators(response.collaborators);
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          setShareError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setHasLoadedCollaborators(true);
        }
      });

    return () => abortController.abort();
  }, [isDialogOpen, projectId]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1600);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const collaboratorCountLabel = useMemo(() => {
    if (collaborators.length === 1) {
      return "1 collaborator";
    }

    return `${collaborators.length} collaborators`;
  }, [collaborators.length]);

  async function inviteCollaborator() {
    if (!project || !canSubmitInvite) {
      return;
    }

    setIsInviting(true);
    setShareError(null);

    try {
      const { collaborator } = await requestInviteCollaborator(
        project.id,
        inviteEmail,
      );

      setCollaborators((currentCollaborators) => [
        ...currentCollaborators.filter(
          (currentCollaborator) => currentCollaborator.id !== collaborator.id,
        ),
        collaborator,
      ]);
      setInviteEmail("");
    } catch (error) {
      setShareError(getErrorMessage(error));
    } finally {
      setIsInviting(false);
    }
  }

  async function removeCollaborator(collaborator: ShareCollaborator) {
    if (!project || !canManageAccess || removingCollaboratorId) {
      return;
    }

    setRemovingCollaboratorId(collaborator.id);
    setShareError(null);

    try {
      await requestRemoveCollaborator(project.id, collaborator.id);
      setCollaborators((currentCollaborators) =>
        currentCollaborators.filter(
          (currentCollaborator) => currentCollaborator.id !== collaborator.id,
        ),
      );
    } catch (error) {
      setShareError(getErrorMessage(error));
    } finally {
      setRemovingCollaboratorId(null);
    }
  }

  async function copyProjectLink() {
    if (!projectLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        projectLink.startsWith("/")
          ? `${window.location.origin}${projectLink}`
          : projectLink,
      );
      setCopied(true);
      setShareError(null);
    } catch {
      setShareError("Could not copy the project link.");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCopied(false);
      setInviteEmail("");
      setShareError(null);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isDialogOpen}>
      <DialogContent className="max-h-[min(42rem,calc(100svh-2rem))] overflow-hidden rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-copy-primary">Share project</DialogTitle>
          <DialogDescription>
            {project?.name ?? "Workspace"} access and collaborators.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4">
          {canManageAccess && (
            <>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="share-project-link">
                    Project link
                  </FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      className={shareInputClassName}
                      id="share-project-link"
                      readOnly
                      value={projectLink}
                    />
                    <Button
                      className="sm:min-w-24"
                      disabled={!projectLink}
                      onClick={copyProjectLink}
                      type="button"
                      variant="outline"
                    >
                      {copied ? (
                        <Check data-icon="inline-start" />
                      ) : (
                        <Copy data-icon="inline-start" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </Field>
              </FieldGroup>

              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void inviteCollaborator();
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="share-collaborator-email">
                      Invite collaborator
                    </FieldLabel>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        autoComplete="email"
                        className={shareInputClassName}
                        id="share-collaborator-email"
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@example.com"
                        type="email"
                        value={inviteEmail}
                      />
                      <Button
                        className="sm:min-w-24"
                        disabled={!canSubmitInvite}
                        type="submit"
                      >
                        <MailPlus data-icon="inline-start" />
                        {isInviting ? "Inviting..." : "Invite"}
                      </Button>
                    </div>
                  </Field>
                </FieldGroup>
              </form>
            </>
          )}

          <Separator className="bg-surface-border" />

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-copy-primary">
              Collaborators
            </h3>
            <p className="text-xs text-copy-muted">{collaboratorCountLabel}</p>
          </div>

          {shareError && <FieldError>{shareError}</FieldError>}

          <ScrollArea className="max-h-72 min-h-0 pr-3">
            {isLoadingCollaborators ? (
              <div className="rounded-2xl border border-surface-border bg-elevated px-3 py-4 text-sm text-copy-secondary">
                Loading collaborators...
              </div>
            ) : collaborators.length === 0 ? (
              <Empty className="border border-surface-border bg-transparent py-8">
                <EmptyHeader>
                  <EmptyMedia
                    className="border border-surface-border bg-elevated text-brand"
                    variant="icon"
                  >
                    <Users aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle className="text-copy-primary">
                    No collaborators
                  </EmptyTitle>
                  <EmptyDescription className="text-copy-secondary">
                    {canManageAccess
                      ? "Invited collaborators will appear here."
                      : "No collaborators have been added."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {collaborators.map((collaborator) => (
                  <CollaboratorListItem
                    canRemove={canManageAccess}
                    collaborator={collaborator}
                    isRemoving={removingCollaboratorId === collaborator.id}
                    key={collaborator.id}
                    onRemove={() => void removeCollaborator(collaborator)}
                  />
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CollaboratorListItemProps {
  canRemove: boolean;
  collaborator: ShareCollaborator;
  isRemoving: boolean;
  onRemove: () => void;
}

function CollaboratorListItem({
  canRemove,
  collaborator,
  isRemoving,
  onRemove,
}: CollaboratorListItemProps) {
  const displayLabel = collaborator.displayName ?? collaborator.email;

  return (
    <li className="flex min-h-14 items-center gap-3 rounded-xl border border-surface-border bg-elevated px-3 py-2">
      <Avatar>
        {collaborator.avatarUrl && (
          <AvatarImage
            alt={`${displayLabel} avatar`}
            src={collaborator.avatarUrl}
          />
        )}
        <AvatarFallback className="bg-subtle text-copy-secondary">
          {getCollaboratorInitials(displayLabel)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-copy-primary">
          {displayLabel}
        </p>
        {collaborator.displayName && (
          <p className="truncate text-xs text-copy-muted">
            {collaborator.email}
          </p>
        )}
      </div>
      {canRemove && (
        <Button
          aria-label={`Remove ${displayLabel}`}
          disabled={isRemoving}
          onClick={onRemove}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}

async function requestCollaborators(
  projectId: string,
  signal: AbortSignal,
): Promise<CollaboratorsResponse> {
  const response = await fetch(getCollaboratorsUrl(projectId), { signal });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  if (!isCollaboratorsResponse(data)) {
    throw new Error("Collaborator response was invalid.");
  }

  return data;
}

async function requestInviteCollaborator(
  projectId: string,
  email: string,
): Promise<CollaboratorMutationResponse> {
  const response = await fetch(getCollaboratorsUrl(projectId), {
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  if (!isCollaboratorMutationResponse(data)) {
    throw new Error("Collaborator response was invalid.");
  }

  return data;
}

async function requestRemoveCollaborator(
  projectId: string,
  collaboratorId: string,
): Promise<CollaboratorMutationResponse> {
  const response = await fetch(
    `${getCollaboratorsUrl(projectId)}/${encodeURIComponent(collaboratorId)}`,
    { method: "DELETE" },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  if (!isCollaboratorMutationResponse(data)) {
    throw new Error("Collaborator response was invalid.");
  }

  return data;
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

function getCollaboratorsUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/collaborators`;
}

function getApiErrorMessage(data: unknown) {
  if (isApiErrorResponse(data)) {
    return data.error;
  }

  return "Collaborator request failed.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Collaborator request failed.";
}

function getCollaboratorInitials(label: string) {
  const initials = label
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "?";
}

function isCollaboratorsResponse(
  value: unknown,
): value is CollaboratorsResponse {
  return (
    isRecord(value) &&
    isProjectAccess(value.access) &&
    Array.isArray(value.collaborators) &&
    value.collaborators.every(isShareCollaborator)
  );
}

function isCollaboratorMutationResponse(
  value: unknown,
): value is CollaboratorMutationResponse {
  return isRecord(value) && isShareCollaborator(value.collaborator);
}

function isShareCollaborator(value: unknown): value is ShareCollaborator {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.createdAt === "string" &&
    isNullableString(value.displayName) &&
    isNullableString(value.avatarUrl)
  );
}

function isProjectAccess(value: unknown): value is ProjectAccess {
  return value === "owner" || value === "collaborator";
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
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

function subscribeToLocationOrigin() {
  return () => undefined;
}

function getBrowserLocationOrigin() {
  return window.location.origin;
}

function getServerLocationOrigin() {
  return "";
}
