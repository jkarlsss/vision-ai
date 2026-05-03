import type { ReactNode } from "react";

import { EditorLayoutShell } from "@/components/editor/editor-layout-shell";
import { getProjectListsForCurrentUser } from "@/lib/project-data";

interface EditorLayoutProps {
  children: ReactNode;
}

export default async function EditorLayout({ children }: EditorLayoutProps) {
  const projectLists = await getProjectListsForCurrentUser();

  return <EditorLayoutShell {...projectLists}>{children}</EditorLayoutShell>;
}
