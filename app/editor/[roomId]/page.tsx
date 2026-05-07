import { AccessDenied } from "@/components/editor/access-denied";
import { EditorCanvas } from "@/components/editor/editor-canvas";
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

  return <EditorCanvas roomId={project.id} />;
}
