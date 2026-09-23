"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { useWorkload } from "@/lib/state/workload-context";

export function ChatPanel() {
  const { messages, sendMessage, isSendingMessage, error, generateBrief, isGeneratingBrief } = useWorkload();
  const router = useRouter();

  async function handleGenerateBrief() {
    await generateBrief();
    router.push("/brief");
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-lg font-semibold">What are you trying to build?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Describe the problem however you&apos;d normally explain it to a colleague. You
              don&apos;t need to know what model, GPUs, software, or infrastructure you need.
            </p>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} isSending={isSendingMessage} />
      )}

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex justify-end border-t px-4 pt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateBrief}
            disabled={isGeneratingBrief || isSendingMessage}
          >
            {isGeneratingBrief ? "Generating Workload Brief…" : "Generate Workload Brief"}
          </Button>
        </div>
      )}

      <Composer onSend={(text) => sendMessage(text)} disabled={isSendingMessage} />
    </section>
  );
}
