"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/state/workload-context";
import { cn } from "@/lib/utils";

export function MessageList({ messages, isSending }: { messages: ChatMessage[]; isSending: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const lastMessage = messages[messages.length - 1];
  const showThinking = isSending && (!lastMessage || lastMessage.role !== "assistant" || lastMessage.content === "");

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {messages.map((message, index) => {
        if (message.role === "assistant" && message.content === "") return null;
        return (
          <div
            key={index}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {message.content}
            </div>
          </div>
        );
      })}
      {showThinking && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">
            Thinking&hellip;
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
