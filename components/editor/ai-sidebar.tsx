"use client";

import {
  useCreateFeedMessage,
  useOthersMapped,
  useSelf,
} from "@liveblocks/react";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import type { RealtimeRun } from "@trigger.dev/core/v3";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
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
import ReactMarkdown, {
  type Components as MarkdownComponents,
} from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  getProjectSpecDownloadPath,
  getProjectSpecsApiPath,
  getSpecDownloadFilename,
} from "@/lib/spec-routes";
import { cn } from "@/lib/utils";
import type { designAgentTask } from "@/trigger/design-agent";
import type { generateSpec } from "@/trigger/generate-spec";
import {
  createCanvasSnapshot,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas";
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
  name: "Vision AI",
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

interface ActiveSpecRun {
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

interface SpecRunStartResult {
  publicToken: string;
  runId: string;
}

type DesignAgentRealtimeRun = RealtimeRun<typeof designAgentTask>;
type GenerateSpecRealtimeRun = RealtimeRun<typeof generateSpec>;

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
          `Vision AI realtime updates stopped: ${error.message}`,
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

    if (
      !trimmedContent ||
      isSending ||
      isStartingDesignRun ||
      activeDesignRun
    ) {
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
          "max-w-[calc(100vw-1.5rem)] md:max-w-80",
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

        <Tabs
          className="min-h-0 min-w-0 flex-1 overflow-hidden gap-0"
          defaultValue="architect"
        >
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
            className="min-h-0 min-w-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
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
            className="min-h-0 min-w-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            value="specs"
          >
            <SpecsPanel
              chatMessages={chatState.messages}
              isAiWorking={isDesignRunActive}
              latestStatus={aiActivity.latestStatus?.payload ?? null}
              projectId={projectId}
              roomId={roomId}
            />
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

interface SpecRunRealtimeSubscriberProps {
  activeRun: ActiveSpecRun;
  onComplete: (run: GenerateSpecRealtimeRun, error?: Error) => void;
  onError: (error: Error, runId: string) => void;
}

function SpecRunRealtimeSubscriber({
  activeRun,
  onComplete,
  onError,
}: SpecRunRealtimeSubscriberProps) {
  const reportedErrorRef = useRef(false);
  const { error } = useRealtimeRun<typeof generateSpec>(activeRun.runId, {
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
                  {latestStatus?.text ?? "Vision AI is working"}
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
          <AiSidebarStatusSummary isWorking={isWorking} status={latestStatus} />
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
                ? "Vision AI is updating the canvas..."
                : isComposerDisabled
                  ? "Connecting to room chat..."
                  : "Ask Vision AI to design or refine the architecture..."
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
    isWorking
      ? "animate-spin text-state-success"
      : getAiStatusIconColor(status),
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
    <div className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[88%] flex-col gap-1",
          isOwnMessage && "items-end",
        )}
      >
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
          <time
            className="shrink-0"
            dateTime={new Date(payload.timestamp).toISOString()}
          >
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

interface SpecsPanelProps {
  chatMessages: AiSidebarChatMessage[];
  isAiWorking: boolean;
  latestStatus: AiStatusFeedPayload | null;
  projectId: string;
  roomId: string;
}

interface ProjectSpecSummary {
  createdAt: string;
  filename: string;
  id: string;
}

interface ProjectSpecsState {
  error: string | null;
  isLoading: boolean;
  reload: () => void;
  specs: ProjectSpecSummary[];
}

interface StoredProjectSpecsState {
  error: string | null;
  isLoading: boolean;
  projectId: string;
  specs: ProjectSpecSummary[];
}

interface SpecPreviewState {
  content: string | null;
  error: string | null;
  isLoading: boolean;
}

const emptySpecPreviewState: SpecPreviewState = {
  content: null,
  error: null,
  isLoading: false,
};

function SpecsPanel({
  chatMessages,
  isAiWorking,
  latestStatus,
  projectId,
  roomId,
}: SpecsPanelProps) {
  const specsState = useProjectSpecs(projectId);
  const reloadSpecs = specsState.reload;
  const {
    edges,
    isLoading: isCanvasLoading,
    nodes,
  } = useLiveblocksFlow<CanvasNode, CanvasEdge>();
  const [isStartingSpecRun, setIsStartingSpecRun] = useState(false);
  const [activeSpecRun, setActiveSpecRun] = useState<ActiveSpecRun | null>(
    null,
  );
  const [specRunError, setSpecRunError] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<ProjectSpecSummary | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewState, setPreviewState] = useState<SpecPreviewState>(
    emptySpecPreviewState,
  );
  const selectedSpecId = selectedSpec?.id ?? null;
  const chatHistory = useMemo(
    () => chatMessages.slice(-100).map((message) => message.payload),
    [chatMessages],
  );
  const isSpecRunActive = isStartingSpecRun || activeSpecRun !== null;
  const isGenerateDisabled = isCanvasLoading || isSpecRunActive || isAiWorking;
  const specStatus =
    isSpecRunActive && latestStatus?.scope === "spec" ? latestStatus : null;

  useEffect(() => {
    if (!isPreviewOpen || !selectedSpecId) {
      return;
    }

    const abortController = new AbortController();

    fetchSpecContent({
      projectId,
      signal: abortController.signal,
      specId: selectedSpecId,
    })
      .then((content) => {
        setPreviewState({
          content,
          error: null,
          isLoading: false,
        });
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        setPreviewState({
          content: null,
          error: getUnknownErrorMessage(
            error,
            "Spec preview could not be loaded.",
          ),
          isLoading: false,
        });
      });

    return () => {
      abortController.abort();
    };
  }, [isPreviewOpen, projectId, selectedSpecId]);

  function handlePreviewOpenChange(open: boolean) {
    setIsPreviewOpen(open);

    if (!open) {
      setSelectedSpec(null);
      setPreviewState(emptySpecPreviewState);
    }
  }

  function handleSelectSpec(spec: ProjectSpecSummary) {
    setSelectedSpec(spec);
    setPreviewState({
      content: null,
      error: null,
      isLoading: true,
    });
    setIsPreviewOpen(true);
  }

  const handleGenerateSpec = useCallback(async () => {
    if (isCanvasLoading || !nodes || !edges) {
      setSpecRunError("Canvas is still connecting.");
      return;
    }

    if (isAiWorking && !activeSpecRun) {
      setSpecRunError("Vision AI is already working.");
      return;
    }

    if (isStartingSpecRun || activeSpecRun) {
      return;
    }

    const snapshot = createCanvasSnapshot(nodes, edges);

    setIsStartingSpecRun(true);
    setSpecRunError(null);

    try {
      const specRun = await startSpecRun({
        chatHistory,
        edges: snapshot.edges,
        nodes: snapshot.nodes,
        roomId,
      });

      setActiveSpecRun(specRun);
    } catch (error) {
      setSpecRunError(
        getUnknownErrorMessage(error, "Spec generation could not be started."),
      );
    } finally {
      setIsStartingSpecRun(false);
    }
  }, [
    activeSpecRun,
    chatHistory,
    edges,
    isAiWorking,
    isCanvasLoading,
    isStartingSpecRun,
    nodes,
    roomId,
  ]);

  const handleSpecRunComplete = useCallback(
    (run: GenerateSpecRealtimeRun, error?: Error) => {
      const runFailed = Boolean(error || run.isFailed || run.error);

      setActiveSpecRun((currentRun) =>
        currentRun?.runId === run.id ? null : currentRun,
      );

      if (runFailed) {
        setSpecRunError(getSpecRunFailureMessage(run, error));
        return;
      }

      setSpecRunError(null);
      reloadSpecs();
    },
    [reloadSpecs],
  );

  const handleSpecRunRealtimeError = useCallback(
    (error: Error, runId: string) => {
      setSpecRunError(`Spec realtime updates stopped: ${error.message}`);
      setActiveSpecRun((currentRun) =>
        currentRun?.runId === runId ? null : currentRun,
      );
      reloadSpecs();
    },
    [reloadSpecs],
  );

  return (
    <>
      {activeSpecRun ? (
        <SpecRunRealtimeSubscriber
          activeRun={activeSpecRun}
          key={activeSpecRun.runId}
          onComplete={handleSpecRunComplete}
          onError={handleSpecRunRealtimeError}
        />
      ) : null}
      <ScrollArea className="h-full w-full min-w-0 overflow-hidden">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden p-3">
          <Button
            className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-ai px-3 text-copy-primary hover:bg-ai/90"
            disabled={isGenerateDisabled}
            onClick={() => {
              void handleGenerateSpec();
            }}
            type="button"
          >
            {isSpecRunActive ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            <span className="min-w-0 max-w-full truncate">
              {isSpecRunActive ? "Generating Spec..." : "Generate Spec"}
            </span>
          </Button>

          {specStatus ? (
            <AiSidebarStatusSummary isWorking status={specStatus} />
          ) : null}

          {specRunError ? (
            <div className="rounded-2xl border border-surface-border bg-elevated p-3 text-sm text-state-error">
              {specRunError}
            </div>
          ) : null}

          {specsState.isLoading ? (
            <div className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-surface-border bg-transparent text-sm text-copy-muted">
              Loading specs...
            </div>
          ) : specsState.error ? (
            <div className="rounded-2xl border border-surface-border bg-elevated p-3">
              <p className="text-sm text-state-error">{specsState.error}</p>
              <Button
                className="mt-3"
                onClick={specsState.reload}
                size="sm"
                type="button"
                variant="secondary"
              >
                Try again
              </Button>
            </div>
          ) : specsState.specs.length === 0 ? (
            <Empty className="min-h-[14rem] border border-surface-border bg-transparent">
              <EmptyHeader>
                <EmptyMedia
                  className="border border-surface-border bg-elevated text-ai-text"
                  variant="icon"
                >
                  <FileText aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-copy-primary">
                  No specs yet
                </EmptyTitle>
                <EmptyDescription className="text-copy-secondary">
                  Generated Markdown specs will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden">
              {specsState.specs.map((spec) => (
                <SpecListItem
                  key={spec.id}
                  onSelect={handleSelectSpec}
                  projectId={projectId}
                  spec={spec}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <SpecPreviewDialog
        onOpenChange={handlePreviewOpenChange}
        open={isPreviewOpen}
        previewState={previewState}
        projectId={projectId}
        spec={selectedSpec}
      />
    </>
  );
}

interface SpecListItemProps {
  onSelect: (spec: ProjectSpecSummary) => void;
  projectId: string;
  spec: ProjectSpecSummary;
}

function SpecListItem({ onSelect, projectId, spec }: SpecListItemProps) {
  const downloadPath = getProjectSpecDownloadPath(projectId, spec.id);

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-2xl border border-surface-border bg-elevated p-2">
      <button
        className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-xl px-1.5 py-1 text-left outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand/40"
        onClick={() => onSelect(spec)}
        type="button"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-subtle text-ai-text [&_svg:not([class*='size-'])]:size-4">
          <FileText aria-hidden="true" />
        </span>
        <span className="min-w-0 overflow-hidden">
          <span
            className="block w-full min-w-0 truncate text-sm font-medium text-copy-primary"
            title={spec.filename}
          >
            {spec.filename}
          </span>
          <time
            className="block w-full min-w-0 truncate text-xs text-copy-muted"
            dateTime={spec.createdAt}
          >
            {formatSpecCreatedAt(spec.createdAt)}
          </time>
        </span>
      </button>
      <Button asChild className="shrink-0" size="icon-sm" variant="ghost">
        <a
          aria-label={`Download ${spec.filename}`}
          download={spec.filename}
          href={downloadPath}
        >
          <Download />
        </a>
      </Button>
    </div>
  );
}

interface SpecPreviewDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  previewState: SpecPreviewState;
  projectId: string;
  spec: ProjectSpecSummary | null;
}

function SpecPreviewDialog({
  onOpenChange,
  open,
  previewState,
  projectId,
  spec,
}: SpecPreviewDialogProps) {
  const downloadPath = spec
    ? getProjectSpecDownloadPath(projectId, spec.id)
    : "#";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="h-[min(48rem,calc(100vh-2rem))] max-w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-3xl border border-surface-border bg-elevated p-0 text-copy-primary sm:w-[min(56rem,calc(100vw-2rem))] sm:max-w-none">
        <DialogHeader className="min-w-0 border-b border-surface-border px-5 py-4 pr-12">
          <DialogTitle className="truncate text-copy-primary">
            {spec?.filename ?? "Spec preview"}
          </DialogTitle>
          <DialogDescription className="text-copy-muted">
            {spec ? formatSpecCreatedAt(spec.createdAt) : "Markdown preview"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 overflow-hidden">
          <div className="min-w-0 p-5">
            {previewState.isLoading ? (
              <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-surface-border bg-base/60 text-sm text-copy-muted">
                Loading preview...
              </div>
            ) : previewState.error ? (
              <div className="rounded-2xl border border-surface-border bg-base/60 p-4 text-sm text-state-error">
                {previewState.error}
              </div>
            ) : previewState.content ? (
              <MarkdownPreview content={previewState.content} />
            ) : (
              <div className="rounded-2xl border border-surface-border bg-base/60 p-4 text-sm text-copy-muted">
                No preview content.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="!m-0 flex-row justify-end rounded-none border-t border-surface-border bg-subtle/60 p-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          {spec ? (
            <Button asChild>
              <a download={spec.filename} href={downloadPath}>
                <Download data-icon="inline-start" />
                Download
              </a>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MarkdownPreviewProps {
  content: string;
}

const markdownComponents: MarkdownComponents = {
  a: ({ node, className, ...props }) => {
    void node;

    return (
      <a
        className={cn(
          "break-words text-brand underline underline-offset-4",
          className,
        )}
        rel="noreferrer"
        target="_blank"
        {...props}
      />
    );
  },
  blockquote: ({ node, className, ...props }) => {
    void node;

    return (
      <blockquote
        className={cn(
          "border-l-2 border-brand/60 pl-3 text-copy-secondary",
          className,
        )}
        {...props}
      />
    );
  },
  code: ({ node, className, ...props }) => {
    void node;

    return (
      <code
        className={cn(
          "break-words rounded-md bg-subtle px-1 py-0.5 font-mono text-[0.9em] text-copy-primary",
          className,
        )}
        {...props}
      />
    );
  },
  h1: ({ node, className, ...props }) => {
    void node;

    return (
      <h1
        className={cn("text-xl font-semibold text-copy-primary", className)}
        {...props}
      />
    );
  },
  h2: ({ node, className, ...props }) => {
    void node;

    return (
      <h2
        className={cn(
          "pt-2 text-lg font-semibold text-copy-primary",
          className,
        )}
        {...props}
      />
    );
  },
  h3: ({ node, className, ...props }) => {
    void node;

    return (
      <h3
        className={cn(
          "pt-1 text-base font-semibold text-copy-primary",
          className,
        )}
        {...props}
      />
    );
  },
  li: ({ node, className, ...props }) => {
    void node;

    return <li className={cn("pl-1", className)} {...props} />;
  },
  ol: ({ node, className, ...props }) => {
    void node;

    return (
      <ol
        className={cn("flex list-decimal flex-col gap-1 pl-5", className)}
        {...props}
      />
    );
  },
  p: ({ node, className, ...props }) => {
    void node;

    return <p className={cn("text-copy-secondary", className)} {...props} />;
  },
  pre: ({ node, className, ...props }) => {
    void node;

    return (
      <pre
        className={cn(
          "overflow-x-auto rounded-2xl border border-surface-border bg-base p-3 font-mono text-xs leading-5 text-copy-secondary",
          className,
        )}
        {...props}
      />
    );
  },
  table: ({ node, className, ...props }) => {
    void node;

    return (
      <div className="max-w-full overflow-x-auto rounded-2xl border border-surface-border">
        <table
          className={cn(
            "w-full min-w-[40rem] border-collapse text-left text-sm",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
  td: ({ node, className, ...props }) => {
    void node;

    return (
      <td
        className={cn(
          "break-words border-t border-surface-border px-3 py-2 align-top text-copy-secondary",
          className,
        )}
        {...props}
      />
    );
  },
  th: ({ node, className, ...props }) => {
    void node;

    return (
      <th
        className={cn(
          "border-b border-surface-border bg-subtle px-3 py-2 font-medium text-copy-primary",
          className,
        )}
        {...props}
      />
    );
  },
  ul: ({ node, className, ...props }) => {
    void node;

    return (
      <ul
        className={cn("flex list-disc flex-col gap-1 pl-5", className)}
        {...props}
      />
    );
  },
};

function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-surface-border bg-base/60 p-4 text-sm leading-6 text-copy-secondary">
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function useProjectSpecs(projectId: string): ProjectSpecsState {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<StoredProjectSpecsState>({
    error: null,
    isLoading: true,
    projectId,
    specs: [],
  });

  useEffect(() => {
    const abortController = new AbortController();

    fetchProjectSpecs(projectId, abortController.signal)
      .then((specs) => {
        setState({
          error: null,
          isLoading: false,
          projectId,
          specs,
        });
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        setState({
          error: getUnknownErrorMessage(error, "Specs could not be loaded."),
          isLoading: false,
          projectId,
          specs: [],
        });
      });

    return () => {
      abortController.abort();
    };
  }, [projectId, reloadKey]);

  const reload = useCallback(() => {
    setState({
      error: null,
      isLoading: true,
      projectId,
      specs: [],
    });
    setReloadKey((currentKey) => currentKey + 1);
  }, [projectId]);

  if (state.projectId !== projectId) {
    return {
      error: null,
      isLoading: true,
      reload,
      specs: [],
    };
  }

  return {
    error: state.error,
    isLoading: state.isLoading,
    reload,
    specs: state.specs,
  };
}

async function fetchProjectSpecs(
  projectId: string,
  signal: AbortSignal,
): Promise<ProjectSpecSummary[]> {
  const response = await fetch(getProjectSpecsApiPath(projectId), {
    cache: "no-store",
    signal,
  });
  const body = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Specs could not be loaded."));
  }

  const specs = getProjectSpecsFromBody(body, projectId);

  if (!specs) {
    throw new Error("Specs response was not valid.");
  }

  return specs;
}

async function fetchSpecContent({
  projectId,
  signal,
  specId,
}: {
  projectId: string;
  signal: AbortSignal;
  specId: string;
}) {
  const response = await fetch(getProjectSpecDownloadPath(projectId, specId), {
    cache: "no-store",
    headers: { Accept: "text/markdown" },
    signal,
  });

  if (!response.ok) {
    const body = await readResponseJson(response);

    throw new Error(
      getApiErrorMessage(body, "Spec preview could not be loaded."),
    );
  }

  return response.text();
}

function getProjectSpecsFromBody(
  body: unknown,
  projectId: string,
): ProjectSpecSummary[] | null {
  const specs = getArrayField(body, "specs");

  if (!specs) {
    return null;
  }

  return specs
    .map((spec) => getProjectSpecFromBody(spec, projectId))
    .filter((spec): spec is ProjectSpecSummary => Boolean(spec));
}

function getProjectSpecFromBody(
  value: unknown,
  projectId: string,
): ProjectSpecSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getStringField(value, "id");
  const createdAt = getStringField(value, "createdAt");

  if (!id || !createdAt || Number.isNaN(new Date(createdAt).getTime())) {
    return null;
  }

  return {
    createdAt,
    filename:
      getStringField(value, "filename") ??
      getSpecDownloadFilename(projectId, id),
    id,
  };
}

function formatSpecCreatedAt(value: string) {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "Created recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(createdAt);
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
    throw new Error(
      getApiErrorMessage(body, "Design generation could not be started."),
    );
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
    throw new Error(
      getApiErrorMessage(body, "Design run token could not be created."),
    );
  }

  const token =
    getStringField(body, "publicToken") ?? getStringField(body, "token");

  if (!token) {
    throw new Error(
      "Design run token response did not include a public token.",
    );
  }

  return token;
}

async function startSpecRun({
  chatHistory,
  edges,
  nodes,
  roomId,
}: {
  chatHistory: AiChatFeedPayload[];
  edges: CanvasEdge[];
  nodes: CanvasNode[];
  roomId: string;
}): Promise<SpecRunStartResult> {
  const response = await fetch("/api/ai/spec", {
    body: JSON.stringify({ chatHistory, edges, nodes, roomId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const body = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(body, "Spec generation could not be started."),
    );
  }

  const runId = getStringField(body, "runId");

  if (!runId) {
    throw new Error("Spec generation response did not include a run ID.");
  }

  const publicToken =
    getStringField(body, "publicToken") ??
    getStringField(body, "token") ??
    (await requestSpecRunToken(runId));

  return { publicToken, runId };
}

async function requestSpecRunToken(runId: string) {
  const response = await fetch("/api/ai/spec/token", {
    body: JSON.stringify({ runId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const body = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(body, "Spec run token could not be created."),
    );
  }

  const token =
    getStringField(body, "publicToken") ?? getStringField(body, "token");

  if (!token) {
    throw new Error("Spec run token response did not include a public token.");
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
  const hasThinkingParticipant = thinkingEntries.some(
    ([, thinking]) => thinking,
  );

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
  const latestMessage = messages.reduce<{
    createdAt: number;
    data: unknown;
    id: string;
  } | null>((latest, message) => {
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
    return "Vision AI finished.";
  }

  if (status.phase === "error") {
    return "Vision AI needs attention.";
  }

  if (status.phase === "start") {
    return "Vision AI started working.";
  }

  return "Vision AI is working.";
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
    return `Vision AI finished, but realtime reported an issue: ${error.message}`;
  }

  if (run.isFailed || run.error) {
    return `Vision AI could not update the canvas.${
      run.error?.message ? ` ${run.error.message}` : ""
    }`;
  }

  const output = parseDesignAgentOutput(run.output);

  if (!output) {
    return "Vision AI finished updating the canvas.";
  }

  if (output.status === "failed") {
    return output.summary
      ? `Vision AI could not update the canvas. ${output.summary}`
      : output.message;
  }

  return output.summary
    ? `${output.message}\n\n${output.summary}`
    : output.message;
}

function getSpecRunFailureMessage(run: GenerateSpecRealtimeRun, error?: Error) {
  if (error) {
    return `Spec generation finished, but realtime reported an issue: ${error.message}`;
  }

  return `Spec generation could not be completed.${
    run.error?.message ? ` ${run.error.message}` : ""
  }`;
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

function getArrayField(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];

  return Array.isArray(field) ? field : null;
}

function getChatSendErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Message could not be sent.";
}

function getUnknownErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
