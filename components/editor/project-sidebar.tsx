"use client";

import { FolderOpen, Plus, Users, X } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

export function ProjectSidebar({
  isOpen,
  onClose,
  className,
}: ProjectSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "fixed bottom-4 left-4 top-18 z-40 w-80 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-2xl shadow-background/40 backdrop-blur-md transition-[opacity,transform] duration-200 ease-out",
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
              <ProjectPlaceholder
                description="Create a project to start mapping an architecture workspace."
                icon={FolderOpen}
                title="No projects yet"
              />
            </TabsContent>
            <TabsContent className="h-full p-3" value="shared">
              <ProjectPlaceholder
                description="Projects shared with you will appear here."
                icon={Users}
                title="No shared projects"
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <Button className="w-full" type="button">
            <Plus data-icon="inline-start" />
            New Project
          </Button>
        </div>
      </div>
    </aside>
  );
}
