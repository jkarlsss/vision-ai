import { AccessDenied } from "@/components/editor/access-denied";
import { getProjectAccessForCurrentUser } from "@/lib/project-access";

interface EditorWorkspacePageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function EditorWorkspacePage({
  params,
}: EditorWorkspacePageProps) {
  const { roomId } = await params;
  const projectAccess = await getProjectAccessForCurrentUser(roomId);

  if (!projectAccess) {
    return <AccessDenied />;
  }

  const { project } = projectAccess;

  return (
    <section className="flex min-h-0 flex-1 bg-base">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 py-16">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <p className="font-mono text-xs uppercase tracking-normal text-copy-muted">
            Room {project.id}
          </p>
          <h1 className="text-xl font-semibold tracking-normal text-copy-primary">
            Canvas workspace
          </h1>
          <p className="text-sm leading-6 text-copy-secondary">
            The collaborative canvas will render here.
          </p>
        </div>
      </div>
    </section>
  );
}
