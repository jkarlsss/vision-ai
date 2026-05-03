const ROOM_ID_FALLBACK_BASE = "untitled-project";
const ROOM_ID_MAX_LENGTH = 80;
const ROOM_ID_SUFFIX_LENGTH = 6;
const ROOM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyProjectName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || ROOM_ID_FALLBACK_BASE;
}

export function createProjectRoomId(name: string, suffix: string) {
  const normalizedSuffix = normalizeRoomIdSuffix(suffix);
  const maxBaseLength = ROOM_ID_MAX_LENGTH - normalizedSuffix.length - 1;
  const base = slugifyProjectName(name).slice(0, maxBaseLength);

  return `${base.replace(/-+$/g, "") || ROOM_ID_FALLBACK_BASE}-${normalizedSuffix}`;
}

export function createShortProjectRoomSuffix() {
  const bytes = new Uint8Array(4);
  const cryptoSource = globalThis.crypto;

  if (cryptoSource?.getRandomValues) {
    cryptoSource.getRandomValues(bytes);

    let value = 0;

    for (const byte of bytes) {
      value = value * 256 + byte;
    }

    return value
      .toString(36)
      .padStart(ROOM_ID_SUFFIX_LENGTH, "0")
      .slice(0, ROOM_ID_SUFFIX_LENGTH);
  }

  return Math.random()
    .toString(36)
    .slice(2, 2 + ROOM_ID_SUFFIX_LENGTH)
    .padEnd(ROOM_ID_SUFFIX_LENGTH, "0");
}

export function isValidProjectRoomId(value: string) {
  return (
    value.length > 0 &&
    value.length <= ROOM_ID_MAX_LENGTH &&
    ROOM_ID_PATTERN.test(value)
  );
}

function normalizeRoomIdSuffix(suffix: string) {
  const normalizedSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, ROOM_ID_SUFFIX_LENGTH);

  return normalizedSuffix.padEnd(ROOM_ID_SUFFIX_LENGTH, "0");
}
