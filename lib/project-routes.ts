import { editorPath } from "@/lib/auth-routes";

export function getProjectWorkspacePath(projectId: string) {
  return `${editorPath}/${encodeURIComponent(projectId)}`;
}

export function isProjectWorkspacePath(pathname: string, projectId: string) {
  const projectPath = getProjectWorkspacePath(projectId);

  return pathname === projectPath || pathname.startsWith(`${projectPath}/`);
}
