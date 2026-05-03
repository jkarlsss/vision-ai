"use client";

import {
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectDialogsContext } from "@/components/editor/project-dialogs-provider";
import { cn } from "@/lib/utils";
import type { MockProject } from "@/hooks/use-project-dialogs";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface ProjectPlaceholderProps {
  description: string;
  icon: typeof FolderOpen;
  title: string;
}

interface ProjectListProps {
  description: string;
  icon: typeof FolderOpen;
  projects: MockProject[];
  title: string;
}

interface ProjectListItemProps {
  project: MockProject;
}

function ProjectPlaceholder({
  description,
  icon: Icon,
  title,
}: ProjectPlaceholderProps) {
  return (
    <Empty className="h-full border border-surface-border bg-transparent">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function ProjectListItem({ project }: ProjectListItemProps) {
  const { openDeleteDialog, openRenameDialog } = useProjectDialogsContext();
  const canManageProject = project.access === "owner";

  return (
    <li className="flex min-h-20 items-center gap-3 rounded-xl border border-sidebar-border bg-elevated px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-copy-primary">
          {project.name}
        </p>
        <p className="truncate font-mono text-xs text-copy-muted">
          {project.slug}
        </p>
        <p className="mt-1 text-xs text-copy-muted">{project.updatedLabel}</p>
      </div>
      {canManageProject && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Actions for ${project.name}`}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => openRenameDialog(project)}>
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => openDeleteDialog(project)}
                variant="destructive"
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

function ProjectList({
  description,
  icon,
  projects,
  title,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <ProjectPlaceholder description={description} icon={icon} title={title} />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {projects.map((project) => (
        <ProjectListItem key={project.id} project={project} />
      ))}
    </ul>
  );
}

export function ProjectSidebar({
  isOpen,
  onClose,
  className,
}: ProjectSidebarProps) {
  const { openCreateDialog, ownedProjects, sharedProjects } =
    useProjectDialogsContext();

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close project sidebar"
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed bottom-3 left-3 right-3 top-18 z-40 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-2xl shadow-background/40 backdrop-blur-md transition-[opacity,transform] duration-200 ease-out md:bottom-4 md:left-4 md:right-auto md:w-80",
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-[calc(100%+2rem)] opacity-0",
          className,
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
            <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
            <Button
              aria-label="Close project sidebar"
              onClick={onClose}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </div>

          <Tabs className="min-h-0 flex-1 gap-0" defaultValue="my-projects">
            <div className="shrink-0 border-b border-sidebar-border px-3 py-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-projects">My Projects</TabsTrigger>
                <TabsTrigger value="shared">Shared</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <TabsContent className="h-full p-3" value="my-projects">
                <ProjectList
                  description="Create a project to start mapping an architecture workspace."
                  icon={FolderOpen}
                  projects={ownedProjects}
                  title="No projects yet"
                />
              </TabsContent>
              <TabsContent className="h-full p-3" value="shared">
                <ProjectList
                  description="Projects shared with you will appear here."
                  icon={Users}
                  projects={sharedProjects}
                  title="No shared projects"
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="shrink-0 border-t border-sidebar-border p-3">
            <Button className="w-full" onClick={openCreateDialog} type="button">
              <Plus data-icon="inline-start" />
              New Project
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
