import "server-only";

import { jsonError } from "@/lib/project-api";
import { isValidProjectRoomId } from "@/lib/project-room-id";

interface ApiErrorResult {
  response: Response;
}

interface ProjectIdResult {
  projectId: string;
}

interface PromptResult {
  prompt: string;
}

interface RoomIdResult {
  roomId: string;
}

export interface DesignAgentRequest {
  projectId: string;
  prompt: string;
  roomId: string;
}

export interface DesignAgentTokenRequest {
  runId: string;
}

export function getDesignAgentRequest(
  input: Record<string, unknown>,
): DesignAgentRequest | ApiErrorResult {
  const projectIdResult = getProjectId(input.projectId);

  if ("response" in projectIdResult) {
    return projectIdResult;
  }

  const roomIdResult = getRoomId(input.roomId);

  if ("response" in roomIdResult) {
    return roomIdResult;
  }

  if (roomIdResult.roomId !== projectIdResult.projectId) {
    return {
      response: jsonError("Room ID must match the project ID.", 400),
    };
  }

  const promptResult = getPrompt(input.prompt);

  if ("response" in promptResult) {
    return promptResult;
  }

  return {
    projectId: projectIdResult.projectId,
    prompt: promptResult.prompt,
    roomId: roomIdResult.roomId,
  };
}

export function getDesignAgentTokenRequest(
  input: Record<string, unknown>,
): DesignAgentTokenRequest | ApiErrorResult {
  const value = input.runId;

  if (typeof value !== "string") {
    return { response: jsonError("Run ID must be a string.", 400) };
  }

  const runId = value.trim();

  if (!runId) {
    return { response: jsonError("Run ID is required.", 400) };
  }

  return { runId };
}

function getProjectId(value: unknown): ProjectIdResult | ApiErrorResult {
  if (typeof value !== "string") {
    return { response: jsonError("Project ID must be a string.", 400) };
  }

  const projectId = value.trim();

  if (!isValidProjectRoomId(projectId)) {
    return { response: jsonError("Project ID must be a valid room ID.", 400) };
  }

  return { projectId };
}

function getRoomId(value: unknown): RoomIdResult | ApiErrorResult {
  if (typeof value !== "string") {
    return { response: jsonError("Room ID must be a string.", 400) };
  }

  const roomId = value.trim();

  if (!isValidProjectRoomId(roomId)) {
    return { response: jsonError("Room ID must be a valid project ID.", 400) };
  }

  return { roomId };
}

function getPrompt(value: unknown): PromptResult | ApiErrorResult {
  if (typeof value !== "string") {
    return { response: jsonError("Prompt must be a string.", 400) };
  }

  const prompt = value.trim();

  if (!prompt) {
    return { response: jsonError("Prompt is required.", 400) };
  }

  return { prompt };
}
