"use client";

import { useState, useRef } from "react";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Send, Loader2, FileText, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Document = {
  content: string;
  source: string;
  page: number | null;
  score: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  documents?: Document[];
  error?: string;
  timestamp: Date;
  isGenerating?: boolean;
};

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: input.trim(),
          k: 4,
          mode: "generate",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to query documents");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || "No answer generated.",
        documents: data.results || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, there was an error processing your query.",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b bg-card px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-foreground">
            RAG Chat Interface
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask questions and retrieve relevant documents from your knowledge
            base
          </p>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <ChatContainerRoot className="h-full px-6 py-4">
          <ChatContainerContent className="mx-auto max-w-4xl space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                  Welcome to RAG Chat
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Start a conversation by asking a question. The system will
                  search through your documents and provide relevant
                  information.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <Message>
                    <MessageAvatar
                      src={
                        message.role === "user"
                          ? "/user-avatar.png"
                          : "/ai-avatar.png"
                      }
                      alt={message.role === "user" ? "User" : "AI Assistant"}
                      fallback={message.role === "user" ? "U" : "AI"}
                    />
                    <div className="flex-1 space-y-2">
                      <MessageContent markdown={message.role === "assistant"}>
                        {message.content}
                      </MessageContent>

                      {message.error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                          <p className="font-medium">Error:</p>
                          <p>{message.error}</p>
                        </div>
                      )}

                      {message.documents && message.documents.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <FileText className="h-4 w-4" />
                            <span>Retrieved Documents</span>
                          </div>
                          <div className="space-y-2">
                            {message.documents.map((doc, index) => (
                              <div
                                key={index}
                                className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium text-foreground">
                                      Source:
                                    </span>
                                    <span className="text-muted-foreground">
                                      {doc.source}
                                    </span>
                                    {doc.page && (
                                      <span className="text-muted-foreground">
                                        (Page {doc.page})
                                      </span>
                                    )}
                                  </div>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1">
                                          <Info className="h-3 w-3 text-primary" />
                                          <span className="text-xs font-medium text-primary">
                                            {(
                                              parseFloat(doc.score) * 100
                                            ).toFixed(1)}
                                            %
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Relevance Score</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <p className="text-sm leading-relaxed text-foreground">
                                  {doc.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Message>
                </div>
              ))
            )}

            {isLoading && (
              <Message>
                <MessageAvatar
                  src="/ai-avatar.png"
                  alt="AI Assistant"
                  fallback="AI"
                />
                <MessageContent>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching documents and generating response...</span>
                  </div>
                </MessageContent>
              </Message>
            )}

            <ChatContainerScrollAnchor />
          </ChatContainerContent>

          <div className="pointer-events-none absolute bottom-20 right-6">
            <ScrollButton />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="border-t bg-card px-6 py-4 shadow-lg">
        <div className="mx-auto max-w-4xl">
          <PromptInput
            value={input}
            onValueChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            disabled={isLoading}
            className="shadow-md"
          >
            <PromptInputTextarea
              placeholder="Ask a question about your documents..."
              className="min-h-[56px]"
            />
            <PromptInputActions>
              <PromptInputAction tooltip="Send message">
                <Button
                  size="icon-sm"
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="rounded-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
