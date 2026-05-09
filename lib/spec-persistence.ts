import { randomUUID } from "node:crypto";

import { deleteSpecMarkdown, uploadSpecMarkdown } from "@/lib/spec-storage";

export interface PersistGeneratedSpecResult {
  filePath: string;
  specId: string;
}

export async function persistGeneratedSpec(options: {
  markdown: string;
  projectId: string;
}): Promise<PersistGeneratedSpecResult> {
  const specId = randomUUID();
  const blob = await uploadSpecMarkdown({
    markdown: options.markdown,
    projectId: options.projectId,
    specId,
  });

  try {
    const prisma = await getPrismaClient();

    await prisma.projectSpec.create({
      data: {
        filePath: blob.filePath,
        id: specId,
        projectId: options.projectId,
      },
      select: { id: true },
    });
  } catch (error) {
    await safeDeleteSpecMarkdown(blob.filePath);
    throw error;
  }

  return {
    filePath: blob.filePath,
    specId,
  };
}

async function getPrismaClient() {
  const { prisma } = await import("@/lib/prisma");

  return prisma;
}

async function safeDeleteSpecMarkdown(filePath: string) {
  try {
    await deleteSpecMarkdown(filePath);
  } catch (error) {
    console.error("Generated spec cleanup failed.", error);
  }
}
