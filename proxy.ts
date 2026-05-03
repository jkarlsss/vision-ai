import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { editorPath, signInPath, signUpPath } from "@/lib/auth-routes";

const isPublicRoute = createRouteMatcher([
  `${signInPath}(.*)`,
  `${signUpPath}(.*)`,
]);

const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

function toAbsoluteUrl(path: string, requestUrl: string) {
  return new URL(path, requestUrl).toString();
}

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      if (isApiRoute(request)) {
        const { isAuthenticated } = await auth();

        if (!isAuthenticated) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        return;
      }

      await auth.protect({
        unauthenticatedUrl: toAbsoluteUrl(signInPath, request.url),
      });
    }
  },
  (request) => ({
    afterSignInUrl: editorPath,
    afterSignUpUrl: editorPath,
    signInUrl: toAbsoluteUrl(signInPath, request.url),
    signUpUrl: toAbsoluteUrl(signUpPath, request.url),
  }),
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
