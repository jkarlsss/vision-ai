import { LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { editorPath } from "@/lib/auth-routes";

export function AccessDenied() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-base px-6 py-16">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-surface-border bg-elevated text-copy-secondary">
          <LockKeyhole className="h-8 w-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-normal text-copy-primary">
            Access denied
          </h1>
          <p className="text-sm leading-6 text-copy-secondary">
            This project is unavailable or has not been shared with you.
          </p>
        </div>
        <Button asChild>
          <Link href={editorPath}>Back to editor</Link>
        </Button>
      </div>
    </div>
  );
}
