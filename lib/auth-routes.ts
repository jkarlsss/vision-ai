const DEFAULT_SIGN_IN_PATH = "/sign-in";
const DEFAULT_SIGN_UP_PATH = "/sign-up";

function resolveClerkPath(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  try {
    return new URL(value).pathname || fallback;
  } catch {
    return value;
  }
}

export const signInPath = resolveClerkPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  DEFAULT_SIGN_IN_PATH,
);

export const signUpPath = resolveClerkPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  DEFAULT_SIGN_UP_PATH,
);

export const editorPath = "/editor";
