# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Project dialogs and editor home

## Current Goal

- Project dialogs and sidebar actions from `context/feature-specs/04-project-dialogs.md` are implemented and verified.

## Completed

- `context/feature-specs/01-design-system.md` - shadcn/ui initialized, required primitives added, `lucide-react` installed, `cn()` helper added, and dark-only theme tokens configured.
- `context/feature-specs/02-editor.md` - editor navbar and floating project sidebar components created, placeholder states composed with shadcn/ui, and the existing Dialog primitives remain ready for future title, description, and footer-action dialogs.
- `context/feature-specs/03-auth.md` - Clerk provider, dark themed auth pages, protected-first `proxy.ts`, `/` to `/editor` redirect behavior, and editor navbar `UserButton` implemented.
- `context/feature-specs/04-project-dialogs.md` - editor home content, shared project dialog controller hook, create/rename/delete dialogs, live slug previews, owned-project sidebar actions, hidden collaborator actions, mock project data, and mobile sidebar scrim behavior implemented.
- Editor layout integration - `/editor` now wraps route content with `components/editor/editor-layout-shell.tsx`, which coordinates the editor navbar and floating project sidebar state.

## In Progress

- None currently.

## Next Up

- Select and start the next feature unit.

## Open Questions

- None currently.

## Architecture Decisions

- shadcn/ui is configured with Radix primitives and lucide icons. Generated files in `components/ui/*` should remain unmodified after installation.
- Global styling is dark-only and maps shadcn tokens to the Vision AI theme tokens in `app/globals.css`.
- Dark-only form controls explicitly inherit `--foreground` for typed text, caret color, and WebKit autofill text so browser-native input styling cannot render black values on dark surfaces.
- `components/ui/empty.tsx` was added through the shadcn CLI so sidebar placeholder states use a generated primitive rather than custom empty-state markup.
- `components/ui/alert-dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/field.tsx`, `components/ui/label.tsx`, and `components/ui/separator.tsx` were added through the shadcn CLI for project dialogs and sidebar item actions.
- Root layout remains a Server Component and now owns the global Clerk provider; editor chrome is scoped to the protected `/editor` route layout, with sidebar open/close state in the client-only `EditorLayoutShell`.
- Project dialog state, mock project data, form values, slug previews, and loading state live in the client-only `useProjectDialogs()` hook and are shared across `/editor` home and sidebar through `ProjectDialogsProvider`.

## Session Notes

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
