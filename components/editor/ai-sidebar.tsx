"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  Bot,
  Download,
  FileText,
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
import { cn } from "@/lib/utils";

const starterPrompts = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

interface ChatMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function AiSidebar({ isOpen, onClose, className }: AiSidebarProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messageIdRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [draft]);

  function submitPrompt(prompt = draft) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const nextMessageId = messageIdRef.current + 1;
    messageIdRef.current = nextMessageId;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        content: trimmedPrompt,
        id: `user-${nextMessageId}`,
        role: "user",
      },
      {
        content:
          "Ghost AI is ready to turn this into canvas changes once generation is connected.",
        id: `assistant-${nextMessageId}`,
        role: "assistant",
      },
    ]);
    setDraft("");
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitPrompt();
  }

  return (
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
      <AiSidebarHeader onClose={onClose} />

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
            draft={draft}
            messages={messages}
            onDraftChange={setDraft}
            onStarterPrompt={submitPrompt}
            onSubmit={() => submitPrompt()}
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
  );
}

interface AiSidebarHeaderProps {
  onClose: () => void;
}

function AiSidebarHeader({ onClose }: AiSidebarHeaderProps) {
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
            Collaborate with Ghost AI
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
  draft: string;
  messages: ChatMessage[];
  onDraftChange: (value: string) => void;
  onStarterPrompt: (prompt: string) => void;
  onSubmit: () => void;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

function AiArchitectPanel({
  draft,
  messages,
  onDraftChange,
  onStarterPrompt,
  onSubmit,
  onTextareaKeyDown,
  textareaRef,
}: AiArchitectPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-3 p-3">
          {messages.length === 0 ? (
            <Empty className="min-h-[22rem] border border-surface-border bg-transparent">
              <EmptyHeader>
                <EmptyMedia
                  className="border border-surface-border bg-elevated text-ai-text"
                  variant="icon"
                >
                  <Bot aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-copy-primary">
                  Start with a system prompt
                </EmptyTitle>
                <EmptyDescription className="text-copy-secondary">
                  Ask Ghost AI to draft, extend, or refine an architecture.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap justify-center gap-2">
                  {starterPrompts.map((prompt) => (
                    <Button
                      className="h-auto rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text hover:bg-accent-dim hover:text-brand"
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
              <ChatBubble key={message.id} message={message} />
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
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Message Ghost AI"
            className="max-h-40 min-h-[72px] resize-none border-surface-border bg-elevated text-copy-primary placeholder:text-copy-muted focus-visible:border-brand focus-visible:ring-brand/20"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={onTextareaKeyDown}
            placeholder="Ask Ghost AI to design or refine this system..."
            ref={textareaRef}
            value={draft}
          />
          <Button
            aria-label="Send message"
            className="bg-ai text-copy-primary hover:bg-ai/90"
            disabled={!draft.trim()}
            size="icon-lg"
            type="submit"
          >
            <SendHorizontal />
          </Button>
        </div>
      </form>
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
}

function ChatBubble({ message }: ChatBubbleProps) {
  const isUserMessage = message.role === "user";

  return (
    <div
      className={cn(
        "flex",
        isUserMessage ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6",
          isUserMessage
            ? "rounded-br-xl border-2 border-brand/50 bg-accent-dim text-copy-primary"
            : "rounded-bl-xl border border-surface-border bg-elevated text-ai-text",
        )}
      >
        {message.content}
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
