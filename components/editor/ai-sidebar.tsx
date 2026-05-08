"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { RealtimeRun } from "@trigger.dev/core/v3";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  useCreateFeedMessage,
  useOthersMapped,
  useSelf,
} from "@liveblocks/react";
import {
  Bot,
  CheckCircle2,
  CircleX,
  Download,
  FileText,
  LoaderCircle,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRetriableFeedMessages } from "@/hooks/use-liveblocks-feed-messages";
import { cn } from "@/lib/utils";
import type { designAgentTask } from "@/trigger/design-agent";
import { NODE_COLORS } from "@/types/canvas";
import type { DesignAgentResult } from "@/types/design-agent";
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  parseAiChatFeedPayload,
  parseAiStatusFeedPayload,
  type AiChatFeedPayload,
  type AiStatusFeedPayload,
} from "@/types/tasks";

const starterPrompts = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

const designGreen = NODE_COLORS[6].text;
const designGreenActionStyle = {
  backgroundColor: designGreen,
  color: "var(--bg-base)",
} satisfies CSSProperties;
const designAgentChatSender: AiChatFeedPayload["sender"] = {
  avatarUrl: null,
  id: "vision-ai-design-agent",
  name: "Ghost AI",
};

interface AiSidebarChatMessage {
  createdAt: number;
  id: string;
  payload: AiChatFeedPayload;
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  roomId: string;
  className?: string;
}

interface AiActivityState {
  isWorking: boolean;
  latestStatus: AiSidebarStatusMessage | null;
}

interface ActiveDesignRun {
  publicToken: string;
  runId: string;
}

interface AiChatState {
  error: string | null;
  isLoading: boolean;
  messages: AiSidebarChatMessage[];
}

interface AiSidebarStatusMessage {
  id: string;
  payload: AiStatusFeedPayload;
}

interface DesignRunStartResult {
  publicToken: string;
  runId: string;
}

type DesignAgentRealtimeRun = RealtimeRun<typeof designAgentTask>;

export function AiSidebar(props: AiSidebarProps) {
  return <AiSidebarContent {...props} />;
}

function AiSidebarContent({
  isOpen,
  onClose,
  className,
  projectId,
  roomId,
}: AiSidebarProps) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStartingDesignRun, setIsStartingDesignRun] = useState(false);
  const [activeDesignRun, setActiveDesignRun] =
    useState<ActiveDesignRun | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const aiActivity = useAiActivityState();
  const chatState = useAiChatState();
  const createFeedMessage = useCreateFeedMessage();
  const self = useSelf();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDesignRunActive =
    isStartingDesignRun || activeDesignRun !== null || aiActivity.isWorking;
  const isComposerDisabled = isSending || isDesignRunActive || !self;
  const visibleStatus =
    isDesignRunActive && aiActivity.latestStatus
      ? aiActivity.latestStatus.payload
      : null;

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [draft]);

  const appendAssistantChatMessage = useCallback(
    async (content: string) => {
      const timestamp = Date.now();
      const payload: AiChatFeedPayload = {
        content,
        role: "assistant",
        sender: designAgentChatSender,
        timestamp,
      };

      await createFeedMessage(AI_CHAT_FEED_ID, payload, {
        createdAt: timestamp,
      });
    },
    [createFeedMessage],
  );

  const handleDesignRunComplete = useCallback(
    async (run: DesignAgentRealtimeRun, error?: Error) => {
      try {
        await appendAssistantChatMessage(
          getDesignRunCompletionMessage(run, error),
        );
        setSendError(null);
      } catch (messageError) {
        setSendError(getChatSendErrorMessage(messageError));
      } finally {
        setActiveDesignRun((currentRun) =>
          currentRun?.runId === run.id ? null : currentRun,
        );
      }
    },
    [appendAssistantChatMessage],
  );

  const handleDesignRunRealtimeError = useCallback(
    async (error: Error, runId: string) => {
      try {
        await appendAssistantChatMessage(
          `Ghost AI realtime updates stopped: ${error.message}`,
        );
      } catch (messageError) {
        setSendError(getChatSendErrorMessage(messageError));
      } finally {
        setActiveDesignRun((currentRun) =>
          currentRun?.runId === runId ? null : currentRun,
        );
      }
    },
    [appendAssistantChatMessage],
  );

  async function submitDesignPrompt(content = draft) {
    const trimmedContent = content.trim();

    if (!trimmedContent || isSending || isStartingDesignRun || activeDesignRun) {
      return;
    }

    if (!self) {
      setSendError("Live chat is still connecting.");
      return;
    }

    const timestamp = Date.now();
    const payload: AiChatFeedPayload = {
      content: trimmedContent,
      role: "user",
      sender: {
        avatarUrl: self.info.avatarUrl,
        id: self.id,
        name: self.info.displayName,
      },
      timestamp,
    };

    setIsSending(true);
    setIsStartingDesignRun(true);
    setSendError(null);
    try {
      await createFeedMessage(AI_CHAT_FEED_ID, payload, {
        createdAt: timestamp,
      });
      setDraft("");
      const designRun = await startDesignRun({
        projectId,
        prompt: trimmedContent,
        roomId,
      });
      setActiveDesignRun(designRun);
    } catch (error) {
      const message = getChatSendErrorMessage(error);

      try {
        await appendAssistantChatMessage(message);
      } catch {
        setSendError(message);
      }
    } finally {
      setIsStartingDesignRun(false);
      setIsSending(false);
    }
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitDesignPrompt();
  }

  return (
    <>
      {activeDesignRun ? (
        <DesignRunRealtimeSubscriber
          activeRun={activeDesignRun}
          key={activeDesignRun.runId}
          onComplete={handleDesignRunComplete}
          onError={handleDesignRunRealtimeError}
        />
      ) : null}
      <aside
        aria-hidden={!isOpen}
        aria-label="AI Workspace"
        className={cn(
          "fixed bottom-3 left-3 right-3 top-18 z-40 flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-base/95 shadow-2xl shadow-background/40 backdrop-blur-md transition-[opacity,transform] duration-200 ease-out md:bottom-4 md:left-auto md:right-4 md:w-80",
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0",
          className,
        )}
      >
        <AiSidebarHeader
          isWorking={isDesignRunActive}
          latestStatus={visibleStatus}
          onClose={onClose}
        />

        <Tabs className="min-h-0 flex-1 gap-0" defaultValue="architect">
          <div className="shrink-0 border-b border-surface-border px-3 py-3">
            <TabsList className="grid w-full grid-cols-2 bg-subtle">
              <TabsTrigger
                className="text-copy-muted data-active:!border-brand/50 data-active:!bg-accent data-active:!text-accent-foreground"
                value="architect"
              >
                AI Architect
              </TabsTrigger>
              <TabsTrigger
                className="text-copy-muted data-active:!border-brand/50 data-active:!bg-accent data-active:!text-accent-foreground"
                value="specs"
              >
                Specs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            className="min-h-0 flex-1 data-[state=inactive]:hidden"
            value="architect"
          >
            <AiArchitectPanel
              chatError={chatState.error}
              currentUserId={self?.id ?? null}
              draft={draft}
              isChatLoading={chatState.isLoading}
              isComposerDisabled={isComposerDisabled}
              isRunActive={isDesignRunActive}
              isSending={isSending || isDesignRunActive}
              isWorking={isDesignRunActive}
              latestStatus={visibleStatus}
              messages={chatState.messages}
              onDraftChange={setDraft}
              onStarterPrompt={(prompt) => {
                void submitDesignPrompt(prompt);
              }}
              onSubmit={() => {
                void submitDesignPrompt();
              }}
              sendError={sendError}
              onTextareaKeyDown={handleTextareaKeyDown}
              textareaRef={textareaRef}
            />
          </TabsContent>

          <TabsContent
            className="min-h-0 flex-1 data-[state=inactive]:hidden"
            value="specs"
          >
            <SpecsPanel />
          </TabsContent>
        </Tabs>
      </aside>
    </>
  );
}

interface DesignRunRealtimeSubscriberProps {
  activeRun: ActiveDesignRun;
  onComplete: (run: DesignAgentRealtimeRun, error?: Error) => void;
  onError: (error: Error, runId: string) => void;
}

function DesignRunRealtimeSubscriber({
  activeRun,
  onComplete,
  onError,
}: DesignRunRealtimeSubscriberProps) {
  const reportedErrorRef = useRef(false);
  const { error } = useRealtimeRun<typeof designAgentTask>(activeRun.runId, {
    accessToken: activeRun.publicToken,
    enabled: Boolean(activeRun.publicToken),
    onComplete: (run, runError) => {
      onComplete(run, runError);
    },
  });

  useEffect(() => {
    if (!error || reportedErrorRef.current) {
      return;
    }

    reportedErrorRef.current = true;
    onError(error, activeRun.runId);
  }, [activeRun.runId, error, onError]);

  return null;
}

interface AiSidebarHeaderProps {
  isWorking: boolean;
  latestStatus: AiStatusFeedPayload | null;
  onClose: () => void;
}

function AiSidebarHeader({
  isWorking,
  latestStatus,
  onClose,
}: AiSidebarHeaderProps) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-surface-border px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-elevated text-ai-text [&_svg:not([class*='size-'])]:size-4">
          <Bot aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-copy-primary">
            AI Workspace
          </h2>
          <p className="truncate text-xs text-copy-muted">
            {isWorking ? (
              <span className="inline-flex max-w-full items-center gap-1">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-3 shrink-0 animate-spin text-ai-text"
                />
                <span className="truncate">
                  {latestStatus?.text ?? "Ghost AI is working"}
                </span>
              </span>
            ) : (
              "Room chat ready"
            )}
          </p>
        </div>
      </div>
      <Button
        aria-label="Close AI sidebar"
        onClick={onClose}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  );
}

interface AiArchitectPanelProps {
  chatError: string | null;
  currentUserId: string | null;
  draft: string;
  isChatLoading: boolean;
  isComposerDisabled: boolean;
  isRunActive: boolean;
  isSending: boolean;
  isWorking: boolean;
  latestStatus: AiStatusFeedPayload | null;
  messages: AiSidebarChatMessage[];
  onDraftChange: (value: string) => void;
  onStarterPrompt: (prompt: string) => void;
  onSubmit: () => void;
  sendError: string | null;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

function AiArchitectPanel({
  chatError,
  currentUserId,
  draft,
  isChatLoading,
  isComposerDisabled,
  isRunActive,
  isSending,
  isWorking,
  latestStatus,
  messages,
  onDraftChange,
  onStarterPrompt,
  onSubmit,
  sendError,
  onTextareaKeyDown,
  textareaRef,
}: AiArchitectPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-3 p-3">
          {isChatLoading ? (
            <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-surface-border bg-transparent text-sm text-copy-muted">
              Loading room chat...
            </div>
          ) : messages.length === 0 ? (
            <Empty className="min-h-[22rem] border border-surface-border bg-transparent">
              <EmptyHeader>
                <EmptyMedia
                  className="border border-surface-border bg-elevated text-ai-text"
                  variant="icon"
                >
                  <Bot aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-copy-primary">
                  Start the room chat
                </EmptyTitle>
                <EmptyDescription className="text-copy-secondary">
                  Share design notes with collaborators in this workspace.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap justify-center gap-2">
                  {starterPrompts.map((prompt) => (
                    <Button
                      className="h-auto rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text hover:bg-accent-dim hover:text-brand"
                      disabled={isComposerDisabled}
                      key={prompt}
                      onClick={() => onStarterPrompt(prompt)}
                      type="button"
                      variant="secondary"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </EmptyContent>
            </Empty>
          ) : (
            messages.map((message) => (
              <ChatBubble
                currentUserId={currentUserId}
                key={message.id}
                message={message}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <form
        className="shrink-0 border-t border-surface-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {isRunActive && latestStatus ? (
          <AiSidebarStatusSummary
            isWorking={isWorking}
            status={latestStatus}
          />
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Prompt the design agent"
            className="max-h-40 min-h-[72px] resize-none border-surface-border bg-elevated text-copy-primary placeholder:text-copy-muted focus-visible:border-brand focus-visible:ring-brand/20"
            disabled={isComposerDisabled}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={onTextareaKeyDown}
            placeholder={
              isRunActive
                ? "Ghost AI is updating the canvas..."
                : isComposerDisabled
                  ? "Connecting to room chat..."
                  : "Ask Ghost AI to design or refine the architecture..."
            }
            ref={textareaRef}
            value={draft}
          />
          <Button
            aria-label="Submit design prompt"
            className="bg-subtle text-copy-muted hover:bg-subtle disabled:opacity-70"
            disabled={!draft.trim() || isComposerDisabled}
            size="icon-lg"
            style={
              !draft.trim() || isComposerDisabled
                ? undefined
                : designGreenActionStyle
            }
            type="submit"
          >
            {isSending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <SendHorizontal />
            )}
          </Button>
        </div>
        {sendError || chatError ? (
          <p className="mt-2 text-xs text-state-error">
            {sendError ?? chatError}
          </p>
        ) : null}
      </form>
    </div>
  );
}

interface AiSidebarStatusSummaryProps {
  isWorking: boolean;
  status: AiStatusFeedPayload;
}

function AiSidebarStatusSummary({
  isWorking,
  status,
}: AiSidebarStatusSummaryProps) {
  return (
    <div className="mb-2 shrink-0">
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-state-success/40 bg-base px-3 py-2 text-xs text-copy-secondary">
        <AiStatusSummaryIcon isWorking={isWorking} status={status} />
        <span className="min-w-0 truncate">{getAiStatusText(status)}</span>
      </div>
    </div>
  );
}

function AiStatusSummaryIcon({
  isWorking,
  status,
}: AiSidebarStatusSummaryProps) {
  const className = cn(
    "size-3.5 shrink-0",
    isWorking ? "animate-spin text-state-success" : getAiStatusIconColor(status),
  );

  if (isWorking) {
    return <LoaderCircle aria-hidden="true" className={className} />;
  }

  if (status.level === "success") {
    return <CheckCircle2 aria-hidden="true" className={className} />;
  }

  if (status.level === "error") {
    return <CircleX aria-hidden="true" className={className} />;
  }

  return <Bot aria-hidden="true" className={className} />;
}

interface ChatBubbleProps {
  currentUserId: string | null;
  message: AiSidebarChatMessage;
}

function ChatBubble({ currentUserId, message }: ChatBubbleProps) {
  const { payload } = message;
  const isOwnMessage = currentUserId === payload.sender.id;
  const isAssistantMessage = payload.role === "assistant";
  const isUserMessage = payload.role === "user";

  return (
    <div
      className={cn(
        "flex",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
    >
      <div className={cn("flex max-w-[88%] flex-col gap-1", isOwnMessage && "items-end")}>
        <div
          className={cn(
            "flex max-w-full items-center gap-2 px-1 text-[11px] leading-4 text-copy-muted",
            isOwnMessage && "justify-end",
          )}
        >
          <span className="min-w-0 truncate">
            {isOwnMessage ? "You" : payload.sender.name}
          </span>
          <span className="shrink-0 text-copy-faint" aria-hidden="true">
            /
          </span>
          <time className="shrink-0" dateTime={new Date(payload.timestamp).toISOString()}>
            {formatChatTimestamp(payload.timestamp)}
          </time>
        </div>
        <div
          className={cn(
            "max-w-full whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-6",
            isUserMessage
              ? cn(
                  "border border-transparent",
                  isOwnMessage ? "rounded-br-xl" : "rounded-bl-xl",
                )
              : isAssistantMessage
                ? "rounded-bl-xl border border-surface-border bg-elevated text-copy-primary"
                : "rounded-bl-xl border border-surface-border bg-elevated text-copy-primary",
          )}
          style={isUserMessage ? designGreenActionStyle : undefined}
        >
          {payload.content}
        </div>
      </div>
    </div>
  );
}

function SpecsPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-3">
        <Button
          className="w-full bg-ai text-copy-primary hover:bg-ai/90"
          type="button"
        >
          <Sparkles data-icon="inline-start" />
          Generate Spec
        </Button>

        <Card className="border border-surface-border bg-elevated ring-0">
          <CardHeader>
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-subtle text-ai-text [&_svg:not([class*='size-'])]:size-4">
                <FileText aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-copy-primary">
                  System Architecture Spec
                </CardTitle>
                <CardDescription className="text-copy-secondary">
                  Draft markdown generated from the current canvas.
                </CardDescription>
              </div>
              <CardAction>
                <Button
                  aria-label="Download spec"
                  disabled
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Download />
                </Button>
              </CardAction>
            </div>
          </CardHeader>
          <CardContent>
            <p className="rounded-xl border border-surface-border bg-base/60 p-3 font-mono text-xs leading-5 text-copy-muted">
              # System Architecture
              <br />
              This demo spec will be replaced by persisted AI-generated
              markdown in a later unit.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

async function startDesignRun({
  projectId,
  prompt,
  roomId,
}: {
  projectId: string;
  prompt: string;
  roomId: string;
}): Promise<DesignRunStartResult> {
  const response = await fetch("/api/ai/design", {
    body: JSON.stringify({ projectId, prompt, roomId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const body = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Design generation could not be started."));
  }

  const runId = getStringField(body, "runId");

  if (!runId) {
    throw new Error("Design generation response did not include a run ID.");
  }

  const publicToken =
    getStringField(body, "publicToken") ??
    getStringField(body, "token") ??
    (await requestDesignRunToken(runId));

  return { publicToken, runId };
}

async function requestDesignRunToken(runId: string) {
  const response = await fetch("/api/ai/design/token", {
    body: JSON.stringify({ runId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const body = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Design run token could not be created."));
  }

  const token = getStringField(body, "publicToken") ?? getStringField(body, "token");

  if (!token) {
    throw new Error("Design run token response did not include a public token.");
  }

  return token;
}

function useAiChatState(): AiChatState {
  const feedMessagesResult = useRetriableFeedMessages(AI_CHAT_FEED_ID, {
    limit: 100,
  });
  const messages = useMemo(() => {
    if (feedMessagesResult.isLoading || feedMessagesResult.error) {
      return [];
    }

    return getAiChatFeedMessages(feedMessagesResult.messages);
  }, [
    feedMessagesResult.error,
    feedMessagesResult.isLoading,
    feedMessagesResult.messages,
  ]);

  return {
    error:
      feedMessagesResult.error && !feedMessagesResult.isRetrying
        ? "Room chat could not be loaded."
        : null,
    isLoading: feedMessagesResult.isLoading || feedMessagesResult.isRetrying,
    messages,
  };
}

function useAiActivityState(): AiActivityState {
  const feedMessagesResult = useRetriableFeedMessages(AI_STATUS_FEED_ID, {
    limit: 1,
  });
  const thinkingEntries = useOthersMapped((other) =>
    Boolean(other.presence.thinking),
  );
  const latestStatus =
    feedMessagesResult.isLoading || feedMessagesResult.error
      ? null
      : getLatestAiStatusFeedMessage(feedMessagesResult.messages);
  const hasThinkingParticipant = thinkingEntries.some(([, thinking]) => thinking);

  return {
    isWorking:
      hasThinkingParticipant ||
      (latestStatus ? isAiStatusActive(latestStatus.payload) : false),
    latestStatus,
  };
}

function getAiChatFeedMessages(
  messages: ReadonlyArray<{
    createdAt: number;
    data: unknown;
    id: string;
  }>,
): AiSidebarChatMessage[] {
  return messages
    .map((message) => {
      const payload = parseAiChatFeedPayload(message.data);

      return payload
        ? {
            createdAt: getMessageTimestamp(message),
            id: message.id,
            payload,
          }
        : null;
    })
    .filter((message): message is AiSidebarChatMessage => Boolean(message))
    .sort((left, right) => {
      const leftTimestamp = getChatMessageTimestamp(left);
      const rightTimestamp = getChatMessageTimestamp(right);

      if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
      }

      return left.createdAt - right.createdAt;
    });
}

function getChatMessageTimestamp(message: AiSidebarChatMessage) {
  return Number.isFinite(message.payload.timestamp)
    ? message.payload.timestamp
    : message.createdAt;
}

function getLatestAiStatusFeedMessage(
  messages: ReadonlyArray<{
    createdAt: number;
    data: unknown;
    id: string;
  }>,
): AiSidebarStatusMessage | null {
  const latestMessage = messages.reduce<
    | {
        createdAt: number;
        data: unknown;
        id: string;
      }
    | null
  >((latest, message) => {
    if (!latest) {
      return message;
    }

    return getMessageTimestamp(message) > getMessageTimestamp(latest)
      ? message
      : latest;
  }, null);

  if (!latestMessage) {
    return null;
  }

  const payload = parseAiStatusFeedPayload(latestMessage.data);

  return payload
    ? {
        id: latestMessage.id,
        payload,
      }
    : null;
}

function getMessageTimestamp(message: { createdAt: number }) {
  return Number.isFinite(message.createdAt) ? message.createdAt : 0;
}

function isAiStatusActive(status: AiStatusFeedPayload) {
  return status.phase === "start" || status.phase === "processing";
}

function getAiStatusText(status: AiStatusFeedPayload) {
  if (status.text) {
    return status.text;
  }

  if (status.phase === "complete") {
    return "Ghost AI finished.";
  }

  if (status.phase === "error") {
    return "Ghost AI needs attention.";
  }

  if (status.phase === "start") {
    return "Ghost AI started working.";
  }

  return "Ghost AI is working.";
}

function getAiStatusIconColor(status: AiStatusFeedPayload) {
  if (status.level === "success") {
    return "text-state-success";
  }

  if (status.level === "error") {
    return "text-state-error";
  }

  return "text-ai-text";
}

function getDesignRunCompletionMessage(
  run: DesignAgentRealtimeRun,
  error?: Error,
) {
  if (error) {
    return `Ghost AI finished, but realtime reported an issue: ${error.message}`;
  }

  if (run.isFailed || run.error) {
    return `Ghost AI could not update the canvas.${
      run.error?.message ? ` ${run.error.message}` : ""
    }`;
  }

  const output = parseDesignAgentOutput(run.output);

  if (!output) {
    return "Ghost AI finished updating the canvas.";
  }

  if (output.status === "failed") {
    return output.summary
      ? `Ghost AI could not update the canvas. ${output.summary}`
      : output.message;
  }

  return output.summary
    ? `${output.message}\n\n${output.summary}`
    : output.message;
}

function parseDesignAgentOutput(
  output: DesignAgentResult | undefined,
): DesignAgentResult | null {
  if (!output || typeof output !== "object") {
    return null;
  }

  return output;
}

function formatChatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

async function readResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getApiErrorMessage(body: unknown, fallback: string) {
  const error = getStringField(body, "error");

  return error ?? fallback;
}

function getStringField(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];

  return typeof field === "string" && field.trim() ? field.trim() : null;
}

function getChatSendErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Message could not be sent.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
