import type { ReactNode } from "react";

interface AuthPageShellProps {
  children: ReactNode;
  eyebrow: string;
  heading: string;
  copy: string;
}

const featurePoints = [
  "Protected project workspaces for architecture design.",
  "Collaborative canvas sessions with identity-aware access.",
  "Persistent specs and artifacts linked to the right user.",
];

export function AuthPageShell({
  children,
  eyebrow,
  heading,
  copy,
}: AuthPageShellProps) {
  return (
    <div className="flex min-h-svh bg-base text-copy-primary">
      <section className="hidden w-[42%] min-w-[28rem] flex-col justify-between border-r border-surface-border bg-surface px-10 py-9 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand bg-accent-dim text-sm font-semibold text-brand">
            V
          </div>
          <span className="text-sm font-medium text-copy-primary">Vision AI</span>
        </div>

        <div className="max-w-md">
          <p className="mb-4 text-xs font-medium uppercase tracking-normal text-brand">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-copy-primary">
            {heading}
          </h1>
          <p className="mt-4 text-sm leading-6 text-copy-secondary">{copy}</p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-copy-secondary">
            {featurePoints.map((point) => (
              <li className="border-l border-border-subtle pl-3" key={point}>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-muted">
          System design workspace for authenticated teams.
        </p>
      </section>

      <main className="flex min-h-svh flex-1 items-center justify-center px-5 py-8">
        {children}
      </main>
    </div>
  );
}
