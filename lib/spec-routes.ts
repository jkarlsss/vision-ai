export function getProjectSpecsApiPath(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/specs`;
}

export function getProjectSpecDownloadPath(projectId: string, specId: string) {
  return `${getProjectSpecsApiPath(projectId)}/${encodeURIComponent(
    specId,
  )}/download`;
}

export function getSpecDownloadFilename(projectId: string, specId: string) {
  return `vision-ai-${sanitizeFilenamePart(projectId)}-${sanitizeFilenamePart(
    specId,
  )}.md`;
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "spec";
}
