"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Send, Loader2, FileText, Lightbulb } from "lucide-react";

export default function Page() {
  const [inputText, setInputText] = useState("");

  const { messages, sendMessage, status,  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/query",
    }),
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || status === "streaming") return;

    const message = inputText;
    setInputText("");
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: message }],
    });
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: suggestion }],
    });
  };

  // Default suggestions for empty state
  const defaultSuggestions = [
    "What are the key topics covered?",
    "Summarize the main points",
    "What are the next steps?",
    "How does this relate to...",
  ];

  // Generate follow-up suggestions based on the last assistant message
  const getFollowUpSuggestions = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");

    if (!lastAssistantMessage) return [];

    return [
      "Tell me more about this",
      "How can I apply this?",
      "What are the next steps?",
      "Are there any examples?",
    ];
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

                {/* Initial Suggestions */}
                <div className="mt-8 w-full max-w-md">
                  <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Lightbulb className="h-3 w-3" />
                    Try one of these suggestions
                  </div>
                  <div className="space-y-2">
                    {defaultSuggestions.map((suggestion, idx) => (
                      <PromptSuggestion
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </PromptSuggestion>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
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
                          {message.parts
                            ?.map((part) =>
                              part.type === "text" ? part.text : "",
                            )
                            .join("") || ""}
                        </MessageContent>
                      </div>
                    </Message>
                  </div>
                ))}

                {/* Follow-up Suggestions - shown after assistant response and not streaming */}
                {!(status === "streaming") &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.role === "assistant" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="h-3 w-3" />
                        Follow-up questions
                      </div>
                      <div className="space-y-2">
                        {getFollowUpSuggestions().map((suggestion, idx) => (
                          <PromptSuggestion
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            size="sm"
                          >
                            {suggestion}
                          </PromptSuggestion>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            )}

            {status === "streaming" && (
              <Message>
                <MessageAvatar
                  src="/ai-avatar.png"
                  alt="AI Assistant"
                  fallback="AI"
                />
                <div className="flex items-center gap-2 rounded-lg p-2 text-foreground bg-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching documents and generating response...</span>
                </div>
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
            value={inputText}
            onValueChange={setInputText}
            onSubmit={handleSubmit}
            isLoading={status === "streaming"}
            disabled={status === "streaming"}
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
                  disabled={!inputText.trim() || status === "streaming"}
                  className="rounded-full"
                >
                  {status === "streaming" ? (
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
