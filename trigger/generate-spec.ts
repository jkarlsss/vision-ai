import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { logger, metadata, task } from "@trigger.dev/sdk";
import { generateText } from "ai";
import { z } from "zod";

import { appendAiStatusMessage } from "@/lib/liveblocks-ai-status";
import {
  GENERATE_SPEC_TASK_ID,
  generateSpecPayloadSchema,
  type GenerateSpecPayload,
  type GenerateSpecResult,
} from "@/types/spec-generation";

const defaultGeminiModel = "gemini-3-flash-preview";

type SpecRunPhase = "start" | "processing" | "complete" | "error";

export const generateSpec = task({
  id: GENERATE_SPEC_TASK_ID,
  run: async (
    rawPayload: GenerateSpecPayload,
    { ctx },
  ): Promise<GenerateSpecResult> => {
    const runId = ctx.run.id;
    const payloadResult = generateSpecPayloadSchema.safeParse(rawPayload);

    if (!payloadResult.success) {
      const errorMessage = getZodErrorMessage(payloadResult.error);

      logger.error("Spec generation task received invalid input.", {
        error: errorMessage,
        runId,
      });
      await safeSetRunMetadata({
        message: "Spec generation input was invalid.",
        phase: "error",
        progress: 100,
        status: "failed",
      });

      throw new Error(errorMessage);
    }

    const payload = payloadResult.data;

    logger.info("Spec generation task started.", {
      chatMessageCount: payload.chatHistory.length,
      edgeCount: payload.edges.length,
      nodeCount: payload.nodes.length,
      projectId: payload.projectId,
      roomId: payload.roomId,
      runId,
    });

    try {
      await safeSetRunMetadata({
        message: "Spec generation started.",
        phase: "start",
        progress: 0,
        status: "starting",
      });
      await safeAppendStatus(payload.roomId, {
        level: "info",
        message: "Ghost AI started drafting the technical spec.",
        phase: "start",
        runId,
      });

      await safeSetRunMetadata({
        message: "Reading canvas and chat context.",
        phase: "processing",
        progress: 25,
        status: "processing",
      });
      await safeAppendStatus(payload.roomId, {
        level: "info",
        message: "Ghost AI is reading the canvas and chat context.",
        phase: "processing",
        runId,
      });

      const markdown = await generateMarkdownSpec(payload);

      await safeSetRunMetadata({
        markdownLength: markdown.length,
        message: "Spec generation completed.",
        phase: "complete",
        progress: 100,
        status: "completed",
      });
      await safeAppendStatus(payload.roomId, {
        level: "success",
        message: "Ghost AI drafted the technical spec.",
        phase: "complete",
        runId,
      });

      logger.info("Spec generation task completed.", {
        markdownLength: markdown.length,
        projectId: payload.projectId,
        roomId: payload.roomId,
        runId,
      });

      return markdown;
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      logger.error("Spec generation task failed.", {
        error: errorMessage,
        projectId: payload.projectId,
        roomId: payload.roomId,
        runId,
      });

      await safeSetRunMetadata({
        message: "Spec generation failed.",
        phase: "error",
        progress: 100,
        status: "failed",
      });
      await safeAppendStatus(payload.roomId, {
        level: "error",
        message: "Ghost AI could not draft the technical spec.",
        phase: "error",
        runId,
      });

      throw error;
    }
  },
});

async function generateMarkdownSpec(payload: GenerateSpecPayload) {
  await safeSetRunMetadata({
    message: "Writing Markdown technical spec.",
    phase: "processing",
    progress: 70,
    status: "processing",
  });

  const result = await generateText({
    maxOutputTokens: 6_000,
    model: getGeminiModel(),
    prompt: buildSpecPrompt(payload),
    system:
      "You are Ghost AI, a senior systems architect. Return only plain Markdown for a technical specification. Do not wrap the response in a code fence.",
    temperature: 0.2,
  });
  const markdown = normalizeMarkdown(result.text);

  if (!markdown) {
    throw new Error("Gemini returned an empty technical spec.");
  }

  return markdown;
}

function getGeminiModel() {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required for spec generation.");
  }

  const google = createGoogleGenerativeAI({ apiKey });

  return google(process.env.GEMINI_MODEL?.trim() || defaultGeminiModel);
}

function buildSpecPrompt(payload: GenerateSpecPayload) {
  return [
    "Vision AI project context:",
    `Project ID: ${payload.projectId}`,
    `Room ID: ${payload.roomId}`,
    "",
    "Canvas nodes:",
    JSON.stringify(payload.nodes.map(toPromptNode), null, 2),
    "",
    "Canvas edges:",
    JSON.stringify(payload.edges.map(toPromptEdge), null, 2),
    "",
    "Collaborative chat context:",
    formatChatHistory(payload.chatHistory),
    "",
    "Write a Markdown technical specification with these sections:",
    "# Technical Specification",
    "## Overview",
    "## Architecture",
    "## Components",
    "## Data Flow",
    "## External Interfaces",
    "## Operational Considerations",
    "## Risks And Open Questions",
    "",
    "Rules:",
    "- Use the canvas graph as the source of truth for components and connections.",
    "- Use chat history only as supporting context for intent, requirements, and constraints.",
    "- Include concise tables where they clarify components, responsibilities, or data flow.",
    "- Call out assumptions and open questions instead of inventing details that are not represented in the canvas or chat.",
    "- Keep the output as plain Markdown with no surrounding code fence.",
  ].join("\n");
}

function toPromptNode(node: GenerateSpecPayload["nodes"][number]) {
  return {
    id: node.id,
    label: node.data.label || "(unnamed)",
    position: node.position,
    shape: node.data.shape,
    size: {
      height: node.height ?? null,
      width: node.width ?? null,
    },
  };
}

function toPromptEdge(edge: GenerateSpecPayload["edges"][number]) {
  return {
    id: edge.id,
    label: edge.data.label || "",
    source: edge.source,
    sourceHandle: edge.sourceHandle ?? null,
    target: edge.target,
    targetHandle: edge.targetHandle ?? null,
  };
}

function formatChatHistory(chatHistory: GenerateSpecPayload["chatHistory"]) {
  if (chatHistory.length === 0) {
    return "No chat messages were provided.";
  }

  return chatHistory
    .map((message) => {
      const timestamp = new Date(message.timestamp).toISOString();

      return [
        `- ${message.role.toUpperCase()} (${message.sender.name}, ${timestamp}):`,
        message.content,
      ].join("\n  ");
    })
    .join("\n");
}

function normalizeMarkdown(text: string) {
  const trimmedText = text.trim();
  const fenceMatch = trimmedText.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);

  return (fenceMatch?.[1] ?? trimmedText).trim();
}

async function safeSetRunMetadata(options: {
  markdownLength?: number;
  message: string;
  phase: SpecRunPhase;
  progress: number;
  status: "starting" | "processing" | "completed" | "failed";
}) {
  try {
    metadata
      .set("scope", "spec")
      .set("status", options.status)
      .set("phase", options.phase)
      .set("progress", options.progress)
      .set("message", options.message);

    if (typeof options.markdownLength === "number") {
      metadata.set("markdownLength", options.markdownLength);
    }

    await metadata.flush();
  } catch (error) {
    logger.error("Spec generation metadata update failed.", {
      error: getErrorMessage(error),
    });
  }
}

async function safeAppendStatus(
  roomId: string,
  options: Omit<Parameters<typeof appendAiStatusMessage>[1], "scope">,
) {
  try {
    await appendAiStatusMessage(roomId, {
      ...options,
      scope: "spec",
    });
  } catch (error) {
    logger.error("Spec generation status update failed.", {
      error: getErrorMessage(error),
      roomId,
    });
  }
}

function getZodErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Spec generation payload is invalid.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown spec generation error.";
}
