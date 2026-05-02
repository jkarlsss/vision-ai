import type { ReactNode } from "react";

import { EditorLayoutShell } from "@/components/editor/editor-layout-shell";

interface EditorLayoutProps {
  children: ReactNode;
}

export default function EditorLayout({ children }: EditorLayoutProps) {
  return <EditorLayoutShell>{children}</EditorLayoutShell>;
}
