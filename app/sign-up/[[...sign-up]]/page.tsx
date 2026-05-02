import { SignUp } from "@clerk/nextjs";
import { Database, Network, ShieldCheck, UsersRound } from "lucide-react";

import { editorPath, signInPath, signUpPath } from "@/lib/auth-routes";

const featurePoints = [
  {
    icon: ShieldCheck,
    text: "Protected ownership from the moment a project is created.",
  },
  {
    icon: UsersRound,
    text: "Invite collaborators into identity-aware workspaces.",
  },
  {
    icon: Database,
    text: "Keep project metadata and generated artifacts connected.",
  },
];

const signUpAppearance = {
  options: {
    socialButtonsVariant: "blockButton" as const,
  },
  elements: {
    rootBox: {
      display: "flex",
      justifyContent: "center",
      width: "100%",
    },
    cardBox: {
      flex: "0 1 28rem",
      marginInline: "auto",
      width: "100%",
      maxWidth: "28rem",
      backgroundColor: "var(--bg-surface)",
      borderColor: "var(--border-default)",
      boxShadow: "none",
    },
    socialButtonsBlockButton: {
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border-subtle)",
      color: "var(--text-primary)",
      boxShadow: "none",
    },
    socialButtonsBlockButtonText: {
      color: "var(--text-primary)",
      fontWeight: "500",
    },
    socialButtonsProviderIcon: {
      opacity: "1",
    },
    formFieldInput: {
      backgroundColor: "var(--bg-elevated)",
      color: "var(--text-primary)",
    },
  },
};

export default function SignUpPage() {
  return (
    <div className="min-h-svh bg-base text-copy-primary lg:grid lg:grid-cols-2">
      <section className="hidden min-h-svh flex-col justify-between border-r border-surface-border bg-surface px-12 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand bg-accent-dim text-brand">
            <Network className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold text-copy-primary">
            Vision AI
          </span>
        </div>

        <div className="max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-normal text-brand">
            Create account
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-copy-primary">
            Start a protected architecture workspace.
          </h1>
          <p className="mt-5 text-base leading-7 text-copy-secondary">
            Create an account to keep project metadata, collaborator access,
            canvas snapshots, and generated specs attached to your workspace.
          </p>

          <ul className="mt-10 space-y-5">
            {featurePoints.map(({ icon: Icon, text }) => (
              <li className="flex items-center gap-4 text-base text-copy-secondary" key={text}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-elevated text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-copy-muted">
          System design workspace for authenticated teams.
        </p>
      </section>

      <main className="flex min-h-svh items-center justify-center px-5 py-8">
        <div className="flex w-full justify-center">
          <SignUp
            appearance={signUpAppearance}
            fallbackRedirectUrl={editorPath}
            path={signUpPath}
            routing="path"
            signInUrl={signInPath}
          />
        </div>
      </main>
    </div>
  );
}
