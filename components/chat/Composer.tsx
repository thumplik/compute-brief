"use client";

import { useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Textarea
        aria-label="Describe what you want to build"
        placeholder="Describe what you want to build, or answer the question above..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={2}
        className="max-h-48 min-h-[2.5rem] flex-1 resize-none"
      />
      <Button onClick={submit} disabled={disabled || value.trim().length === 0}>
        Send
      </Button>
    </div>
  );
}
