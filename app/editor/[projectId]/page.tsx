import { notFound } from "next/navigation";

import { getProjectForCurrentUser } from "@/lib/project-data";

interface ProjectWorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectWorkspacePage({
  params,
}: ProjectWorkspacePageProps) {
  const { projectId } = await params;
  const project = await getProjectForCurrentUser(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-xl flex-col items-center gap-3 text-center">
        <p className="font-mono text-xs uppercase tracking-normal text-copy-muted">
          Room {project.id}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-copy-primary">
          {project.name}
        </h1>
      </div>
    </div>
  );
}
