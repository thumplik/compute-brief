const EXAMPLES = [
  "I have thousands of satellite images and want to automatically identify ships.",
  "We already have a model running on 8 GPUs and want to make experiments much faster.",
  "I have a large collection of internal documents and want employees to ask questions about them.",
  "I have an idea for an AI capability but don't know what model I need.",
];

export function ExamplePrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-center">
      <h1 className="text-lg font-semibold">What are you trying to build?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Describe the problem however you&apos;d normally explain it to a colleague. You don&apos;t need to
        know what model, GPUs, software, or infrastructure you need.
      </p>
      <div className="mt-6 space-y-2 text-left">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPick(example)}
            className="w-full rounded-lg border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
