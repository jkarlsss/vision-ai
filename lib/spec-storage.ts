import { del, get, put } from "@vercel/blob";

const specBlobAccess = "private" as const;

export const specMarkdownContentType = "text/markdown; charset=utf-8";

export interface UploadedSpecMarkdown {
  filePath: string;
  pathname: string;
}

export interface StoredSpecMarkdown {
  contentType: string;
  size: number;
  stream: ReadableStream<Uint8Array>;
}

export async function uploadSpecMarkdown(options: {
  markdown: string;
  projectId: string;
  specId: string;
}): Promise<UploadedSpecMarkdown> {
  const blob = await put(
    getSpecBlobPath(options.projectId, options.specId),
    options.markdown,
    {
      access: specBlobAccess,
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: specMarkdownContentType,
    },
  );

  return {
    filePath: blob.url,
    pathname: blob.pathname,
  };
}

export async function fetchSpecMarkdown(
  filePath: string,
): Promise<StoredSpecMarkdown | null> {
  const blob = await get(getSpecBlobPathname(filePath), {
    access: specBlobAccess,
    useCache: false,
  });

  if (!blob || blob.statusCode !== 200) {
    return null;
  }

  return {
    contentType: blob.blob.contentType,
    size: blob.blob.size,
    stream: blob.stream,
  };
}

export async function deleteSpecMarkdown(filePath: string) {
  await del(getSpecBlobPathname(filePath));
}

function getSpecBlobPath(projectId: string, specId: string) {
  return `specs/${projectId}/${specId}.md`;
}

function getSpecBlobPathname(pathOrUrl: string) {
  try {
    return new URL(pathOrUrl).pathname.replace(/^\/+/, "");
  } catch {
    return pathOrUrl.replace(/^\/+/, "");
  }
}
