import "server-only";

import { z } from "zod";

import { jsonError } from "@/lib/project-api";
import {
  generateSpecRequestSchema,
  type GenerateSpecRequest,
} from "@/types/spec-generation";

interface ApiErrorResult {
  response: Response;
}

export interface GenerateSpecTokenRequest {
  runId: string;
}

const generateSpecTokenRequestSchema = z
  .object({
    runId: z.string().trim().min(1, "Run ID is required."),
  })
  .strict();

export function getGenerateSpecRequest(
  input: Record<string, unknown>,
): GenerateSpecRequest | ApiErrorResult {
  const result = generateSpecRequestSchema.safeParse(input);

  if (!result.success) {
    return {
      response: jsonError(getZodErrorMessage(result.error), 400),
    };
  }

  return result.data;
}

export function getGenerateSpecTokenRequest(
  input: Record<string, unknown>,
): GenerateSpecTokenRequest | ApiErrorResult {
  const result = generateSpecTokenRequestSchema.safeParse(input);

  if (!result.success) {
    return {
      response: jsonError(getZodErrorMessage(result.error), 400),
    };
  }

  return result.data;
}

function getZodErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Spec generation request is invalid.";
}
