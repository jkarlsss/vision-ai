# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Wire editor home to project APIs

## Current Goal

- `context/feature-specs/07-wire-editor-home.md` is implemented and verified.

## Completed

- `context/feature-specs/01-design-system.md` - shadcn/ui initialized, required primitives added, `lucide-react` installed, `cn()` helper added, and dark-only theme tokens configured.
- `context/feature-specs/02-editor.md` - editor navbar and floating project sidebar components created, placeholder states composed with shadcn/ui, and the existing Dialog primitives remain ready for future title, description, and footer-action dialogs.
- `context/feature-specs/03-auth.md` - Clerk provider, dark themed auth pages, protected-first `proxy.ts`, `/` to `/editor` redirect behavior, and editor navbar `UserButton` implemented.
- `context/feature-specs/04-project-dialogs.md` - editor home content, shared project dialog controller hook, create/rename/delete dialogs, live slug previews, owned-project sidebar actions, hidden collaborator actions, mock project data, and mobile sidebar scrim behavior implemented.
- `context/feature-specs/05-prisma.md` - Project and ProjectCollaborator Prisma models, cached Prisma client singleton, first migration, and generated Prisma client implemented and verified.
- `context/feature-specs/06-project-apis.md` - backend-only project list/create/rename/delete REST routes implemented with Clerk authentication, Prisma persistence, create-name defaulting, owner-only rename/delete checks, and consistent `401`/`403` JSON errors.
- `context/feature-specs/07-wire-editor-home.md` - editor layout now server-loads owned/shared project lists, sidebar uses real project data and workspace links, project dialogs use real create/rename/delete API mutations, create previews and posts a room-aligned project ID, rename refreshes on success, delete redirects active workspaces to `/editor`, and `/editor/[projectId]` is available as the project workspace route.
- Editor layout integration - `/editor` now wraps route content with `components/editor/editor-layout-shell.tsx`, which coordinates the editor navbar and floating project sidebar state.

## In Progress

- None currently.

## Next Up

- Select and start the next feature unit.

## Open Questions

- None currently.

## Architecture Decisions

- Project API responses use `{ projects }` for list routes, `{ project }` for mutation routes, and `{ error }` for error responses.
- Project API route handlers use Clerk's authenticated `userId` as `Project.ownerId`; the editor sidebar uses a server-side project data helper to load owned projects by owner ID and shared projects by matching the signed-in user's Clerk email addresses against `ProjectCollaborator.email`.
- Client-created projects use a generated slug plus short suffix as the project ID so the project ID and future Liveblocks room ID stay aligned; `POST /api/projects` still falls back to Prisma's default ID when no ID is supplied.
- The protected-first Clerk proxy returns JSON `401` responses for unauthenticated API/TRPC requests while preserving auth-page redirects for protected UI routes; API route handlers still re-check authentication before accessing Prisma.
- shadcn/ui is configured with Radix primitives and lucide icons. Generated files in `components/ui/*` should remain unmodified after installation.
- Global styling is dark-only and maps shadcn tokens to the Vision AI theme tokens in `app/globals.css`.
- Dark-only form controls explicitly inherit `--foreground` for typed text, caret color, and WebKit autofill text so browser-native input styling cannot render black values on dark surfaces.
- `components/ui/empty.tsx` was added through the shadcn CLI so sidebar placeholder states use a generated primitive rather than custom empty-state markup.
- `components/ui/alert-dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/field.tsx`, `components/ui/label.tsx`, and `components/ui/separator.tsx` were added through the shadcn CLI for project dialogs and sidebar item actions.
- Root layout remains a Server Component and now owns the global Clerk provider; editor chrome is scoped to the protected `/editor` route layout, with sidebar open/close state in the client-only `EditorLayoutShell`.
- Project dialog state, form values, room ID previews, mutation loading/error state, and local project list overlays live in the client-only `useProjectActions()` hook and are shared across `/editor` routes through `ProjectDialogsProvider`.
- Prisma client output is generated to `app/generated/prisma`; application code imports the cached singleton from `lib/prisma.ts`, which uses Accelerate for `prisma+postgres://` URLs and `@prisma/adapter-pg` for direct Postgres URLs.

## Session Notes

- Started wire-editor-home implementation from `context/feature-specs/07-wire-editor-home.md` after reading the required project context, local Next.js Server/Client Component, data fetching, mutation, dynamic route, page, `useRouter`, and `usePathname` docs, plus shadcn composition guidance.
- Added `lib/project-data.ts` for server-only owned/shared project list loading, `lib/project-room-id.ts` and `lib/project-routes.ts` for room-aligned IDs and workspace URLs, and `lib/project-format.ts` for serializable project update labels.
- Replaced the mock `useProjectDialogs()` state with `hooks/use-project-actions.ts`, which manages dialog state, create room ID suffixes, create/rename/delete API mutations, optimistic local project list overlays, `router.push()` for created workspaces, `router.refresh()` for renames/non-active deletes, and `/editor` redirects for active workspace deletes.
- Wired `ProjectDialogsProvider`, `EditorLayoutShell`, `ProjectSidebar`, and `ProjectDialogs` to the real project action controller; `EditorHome` is now a Server Component with a small client create button island.
- Updated `POST /api/projects` to accept an optional validated project ID from the create dialog while preserving the existing default-name and default-ID behavior for callers that omit it.
- Added the dynamic `/editor/[projectId]` workspace route with authenticated project access lookup so create/sidebar navigation lands on a real route.
- Verified wire-editor-home with `npm.cmd run lint` and `npm.cmd run build`; an existing Next dev server is running for this project at `http://localhost:3000`, and signed-out `/editor` still redirects to `/sign-in`.
- Started backend project API implementation from `context/feature-specs/06-project-apis.md` after reading the required project context, local Next.js Route Handler docs, Clerk API-route guidance, and Prisma CRUD/query guidance.
- Added `lib/project-api.ts` with shared Clerk auth, JSON object parsing, project-name validation/defaulting, Prisma access, selected project fields, and owner verification helpers.
- Added `app/api/projects/route.ts` for authenticated `GET /api/projects` and `POST /api/projects`; list returns owned projects sorted newest first, and create stores the authenticated Clerk user ID as `ownerId` with `Untitled Project` as the missing/blank name fallback.
- Added `app/api/projects/[projectId]/route.ts` for authenticated owner-only `PATCH` rename and `DELETE`; unauthenticated requests return `401`, non-owner mutations return `403`, and missing projects return `404`.
- Updated `proxy.ts` so signed-out API/TRPC requests receive JSON `401` responses instead of sign-in redirects while protected UI routes keep redirect behavior.
- Verified backend project APIs with `npm.cmd run lint`, `npm.cmd run build`, and a built-app smoke check against `GET /api/projects`; the smoke check returned `HTTP/1.1 401 Unauthorized` with `{"error":"Unauthorized"}`, and the build reports `/api/projects` and `/api/projects/[projectId]` as dynamic server routes.
- Started Prisma persistence foundation from `context/feature-specs/05-prisma.md` after reading the required project context, local Next.js environment-variable docs, and Prisma CLI/driver-adapter guidance.
- Added `prisma/models/project.prisma` with `ProjectStatus`, `Project`, and `ProjectCollaborator` schema definitions, including ownership metadata, collaborator relation cascade delete, timestamps, uniqueness, and required indexes.
- Added `lib/prisma.ts` as a cached Prisma singleton that uses `accelerateUrl` for `prisma+postgres://` URLs, `@prisma/adapter-pg` for direct Postgres URLs, and development global caching for hot reloads.
- Created and applied Prisma migration `20260503034404_add_project_models`, then regenerated the Prisma client output in `app/generated/prisma`; validated the schema with `npx.cmd prisma validate`.
- Verified Prisma persistence foundation with `npm.cmd run lint` and `npm.cmd run build`.
- Started project dialogs implementation from `context/feature-specs/04-project-dialogs.md` after reading the required project context, local Next.js App Router page/client component docs, and shadcn/ui guidance.
- Added shadcn `field`, `dropdown-menu`, and `alert-dialog` primitives for form layout, project item menus, and destructive confirmation composition.
- Created `hooks/use-project-dialogs.ts`, `components/editor/project-dialogs-provider.tsx`, `components/editor/project-dialogs.tsx`, and `components/editor/editor-home.tsx`; wired editor home and sidebar create buttons to the create dialog, owned-project actions to rename/delete dialogs, and collaborator projects without actions.
- Updated `components/editor/project-sidebar.tsx` with mock project lists, owned-only action menus, and a mobile-only backdrop scrim that closes the sidebar when tapped outside.
- Verified project dialogs implementation with `npm.cmd run lint` and `npm.cmd run build`; local dev server at `http://localhost:3000` responds, and signed-out `/editor` still redirects through Clerk.
- Fixed dark dialog input readability by adding global `input`, `textarea`, and `select` foreground/caret rules in `app/globals.css`, including WebKit autofill text color, and replaced a raw `text-white` dialog title override with the `text-copy-primary` theme token; verified with `npm.cmd run lint` and `npm.cmd run build`.
- Reviewed `context/screenshots/input.png` and added explicit theme-token text, caret, placeholder, and WebKit text-fill classes directly to the Create/Rename project `Input` tags in `components/editor/project-dialogs.tsx`; verified with `npm.cmd run lint` and `npm.cmd run build`.
- Reviewed `context/screenshots/input-1.png` and scoped the Create project `Input` placeholder to the muted text token with a `::placeholder` WebKit text-fill override while keeping typed input text on the primary token; verified with `npm.cmd run lint` and `npm.cmd run build`.
- Reviewed `context/screenshots/dialog.png` and made project dialog titles use `text-copy-primary`; the Create and Rename project `Input` tags now share the same primary text/caret and muted placeholder styling so dark dialog values remain readable; verified with `npm.cmd run lint` and `npm.cmd run build`.
- Started authentication implementation from `context/feature-specs/03-auth.md` after reading the required project context, local Next.js 16 Proxy documentation, and Clerk setup/customization guidance.
- Installed `@clerk/ui` so Clerk's `dark` theme can be used from `@clerk/ui/themes` as required by the auth spec.
- Added shared Clerk auth route constants and appearance variables, wrapped the root layout in `ClerkProvider`, created minimal sign-in/sign-up pages, moved editor chrome to `/editor`, redirected `/` to `/editor` for authenticated requests, protected non-auth routes through root `proxy.ts`, and added Clerk's default `UserButton` to the editor navbar.
- Fixed Proxy redirects to use absolute URLs for `auth.protect()` while keeping public route matching based on the configured sign-in/sign-up paths.
- Verified auth implementation with `npm.cmd run lint`, `npm.cmd run build`, and local HTTP checks: `/` and `/editor` redirect signed-out requests to `/sign-in`, while `/sign-in` and `/sign-up` return 200.
- Reviewed `context/screenshots/Screenshot-ui.png` and polished the auth pages directly in `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`: desktop panels now split 50/50, the left section uses Lucide icons with larger typography, and Clerk social buttons have clearer themed contrast.
- Verified the auth page polish with `npm.cmd run lint`, `npm.cmd run build`, and a token scan for hardcoded colors in the auth route files.
- Reviewed `context/screenshots/auth-page.png` and fixed a Clerk hydration alignment shift by centering the mounted Clerk root/card in both auth page files; verified with `npm.cmd run lint`, `npm.cmd run build`, and the auth route color-token scan.
- Reviewed `context/screenshots/user-button.png` and improved the editor navbar Clerk `UserButton` popover readability with local appearance overrides for the card, identity text, action labels, icons, and footer; verified with `npm.cmd run lint`, `npm.cmd run build`, and a navbar color-token scan.
- Extended the editor navbar Clerk `UserButton` styling to the nested Manage account/UserProfile flow via `userProfileProps.appearance`, covering dark readable colors for profile navigation, sections, identity rows, form fields, menus, tables, and footer; verified with `npm.cmd run lint`, `npm.cmd run build`, and a navbar color-token scan.
- Reviewed `context/screenshots/accounts.png` and styled the Clerk UserProfile email `Primary` badge with readable dark-theme foreground, background, and border tokens; verified with `npm.cmd run lint`, `npm.cmd run build`, and a navbar color-token scan.
- Started design-system implementation after reading the required project context and the feature spec.
- Initialized shadcn/ui with Radix primitives and added Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea. `lucide-react` was installed by the shadcn setup.
- Reconciled generated styling with the existing dark theme tokens, fixed Tailwind v4 font token declarations to use literal Geist font names, and added the `dark` class to the root layout.
- Verified with `npm.cmd run lint` and `npm.cmd run build`.
- Started editor foundation implementation from `context/feature-specs/02-editor.md` after reading the required context, local Next.js docs, and shadcn component docs.
- Created `components/editor/editor-navbar.tsx` with fixed-height left/center/right navbar sections and a sidebar-state toggle using `PanelLeftOpen` / `PanelLeftClose`.
- Created `components/editor/project-sidebar.tsx` as a fixed floating left sidebar with shadcn Tabs, empty placeholder states, a close button, and a full-width `New Project` action.
- Verified the editor foundation with `npm.cmd run lint` and `npm.cmd run build`.
- Integrated the editor chrome into `app/layout.tsx` with a focused client shell for navbar/sidebar state.
- Verified layout integration with `npm.cmd run lint`, `npm.cmd run build`, and a local HTTP smoke check at `http://localhost:3000`.
