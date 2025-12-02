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
import { ScrollButton } from "@/components/ui/scroll-button";
import { Send, Loader2, FileText } from "lucide-react";

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
                        {message.parts
                          ?.map((part) =>
                            part.type === "text" ? part.text : "",
                          )
                          .join("") || ""}
                      </MessageContent>
                    </div>
                  </Message>
                </div>
              ))
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
