# ComputeBrief — Handoff (paused after Plan A, mid-research on Plan B)

**Where things stand:** Plan A (foundation) is fully implemented, tested, and pushed. Plan B (AI integration layer) has not been implemented yet — this session was mid-way through the mandatory "inspect the current SDK before writing code" step when the user asked to pause. This doc captures exactly what was found so the next session doesn't have to repeat the research.

## Done (Plan A — see `2026-09-23-compute-brief-a-foundation.md`)

- Next.js 16 (App Router, TS, Tailwind, Turbopack) scaffolded at repo root.
- Full `WorkloadSpec` / `ComputePlan` / `TurnResult` Zod schemas (`lib/schema/`), provenance model (`lib/schema/provenance.ts`), deep-merge patch logic (`lib/state/merge-patch.ts`).
- Deterministic `WorkloadPlanner` (`lib/planner/workload-planner.ts`).
- Export layer: canonical JSON, Markdown, ServiceNow extension point (`lib/export/`).
- Config: `config/model.ts`, `config/cluster-profile.ts`, `config/export.ts`.
- 38 Vitest tests passing, lint clean, `tsc --noEmit` clean, `next build` clean.
- **Zod resolved to v4.6.5**, which removed `.deepPartial()` and changed `z.record()`'s two-arg form. Documented in Plan A's "Execution note" section — `WorkloadSpecPatchSchema` is `z.record(z.string(), z.unknown())`, not a deep-partial of the full schema; the merged result is what gets strictly validated.
- GitHub repo: https://github.com/thumplik/compute-brief (public), pushed through commit `ee6f930`.
- Vercel project `compute-brief` linked (`thumplik-2699s-projects/compute-brief`) via GitHub integration — `main` auto-deploys. `TOGETHER_API_KEY` is set in **Production** env only so far.
- `.env.local` exists locally but is currently empty of the key (`vercel env pull` only pulls Development, which doesn't have it yet). **Before any real AI testing locally, either add the key to the Development environment in Vercel and re-run `vercel env pull .env.local`, or have the user paste it directly into `.env.local`.**

## In progress: Plan B API research (Vercel AI SDK v7 + `@ai-sdk/togetherai` v3)

Installed: `ai@7.0.112`, `@ai-sdk/togetherai@3.0.55` (committed in `ee6f930`). This is a much newer major version of the AI SDK than commonly-known older examples (v3/v4/v5-style code) — do **not** use `experimental_streamObject`, the old `StreamingTextResponse`, or `ai/react` patterns. Confirmed by reading `node_modules/ai/dist/index.d.ts` and `node_modules/@ai-sdk/togetherai/dist/index.d.ts` directly:

- **Provider**: `import { togetherai, createTogetherAI } from "@ai-sdk/togetherai"`. `togetherai(modelId: string)` returns a `LanguageModelV4` (the default singleton instance, reads `TOGETHER_API_KEY` from env automatically — see below). `createTogetherAI({ apiKey, baseURL, headers, fetch })` for an explicit instance (not needed for MVP; env-var-backed default is fine and matches the design doc's "server-only env var" requirement).
- **API key resolution** (from `node_modules/@ai-sdk/togetherai/dist/index.js` ~line 315-340): reads `process.env.TOGETHER_API_KEY` directly; falls back to the deprecated `TOGETHER_AI_API_KEY` with a console warning. So `lib/ai/provider.ts` does **not** need to manually read `process.env.TOGETHER_API_KEY` and pass it as `apiKey` — just call `togetherai(modelId)` and the provider picks it up. (`getTogetherModelId()` from `config/model.ts`, already built in Plan A, supplies the model id.)
- **Model id type**: `TogetherAIChatModelId` is a union of known literal strings `| (string & {})`, so an arbitrary string like `"zai-org/GLM-5.3-Flash"` (not in the known-literals list) is still accepted without a cast.
- **Structured output**: `generateObject({ model, schema, instructions, messages, ... })` from `"ai"`, returns `Promise<GenerateObjectResult<OBJECT>>` where `.object` is the typed, already-Zod-validated result. `schema` accepts a Zod schema directly (Zod v4 has native standard-schema support that `ai` consumes via `FlexibleSchema`).
  - Use `instructions: string` for the system prompt — **not** `system` (present but marked `@deprecated Use instructions instead` in `Prompt` type, `ai/dist/index.d.ts` ~line 797-812).
  - Use `messages: ModelMessage[]` for conversation history — **not** `prompt` (mutually exclusive with `messages`; `Prompt` type enforces this via a discriminated union).
  - `ModelMessage = SystemModelMessage | UserModelMessage | AssistantModelMessage | ToolModelMessage`. For this app only `{ role: "user", content: string }` and `{ role: "assistant", content: string }` are needed — `content` accepts a plain string (not just an array of parts).
- **For mocking in tests** (Plan A's design doc commitment: conversation-turn tests use mocked Together responses, no live network calls in CI): the cleanest seam is dependency-injecting the `generateObject` call itself, e.g. `runConversationTurn(history, spec, { generateObject: generateObjectFn })` defaulting to the real `generateObject` from `"ai"`, with tests passing a stub that returns a fixed `{ object: <TurnResult fixture> }` without touching the network. Do **not** try to mock at the HTTP/fetch level — the injectable-function seam is simpler and was the plan's original intent.

## Next steps (Plan B, not yet started)

Write and implement (TDD, one file at a time, same pattern as Plan A — RED, GREEN, commit):

1. **`lib/ai/provider.ts`** — `getChatModel()` / `getStructuredModel()`, both returning `togetherai(getTogetherModelId())` for the MVP (per design doc, "both can return the same Together model"). No test needed (thin wrapper); or a trivial smoke test that it returns a truthy object.
2. **`lib/ai/prompts/system.ts`** — the conversational system prompt (the "experienced ML requirements engineer" persona, the facts-vs-inference rule, "ask only the highest-value next question," don't ask about GPU count directly, willingness to say no training is needed, no hidden chain-of-thought in `reason` fields). Export as a plain string constant, e.g. `CONVERSATION_SYSTEM_PROMPT`. This is the single most important prompt in the app — write it carefully against the design doc's "Product philosophy" and "Core principle: facts versus inference" sections and the pasted original spec's example bad/good questions.
3. **`lib/ai/prompts/narrative.ts`** — the narrative-generation system prompt (synthesize, don't dump fields; sections listed in the original spec's "Final output" section).
4. **`lib/ai/conversation.ts`** — `runConversationTurn({ history, spec, generateObject? })` calling `generateObject` with `TurnResultSchema` (from Plan A) as `schema`, `CONVERSATION_SYSTEM_PROMPT` as `instructions`, and `messages` built from `history` plus the current spec serialized into context (the model needs to see the current `WorkloadSpec` state to patch it correctly — decide the exact serialization, e.g. a JSON block appended to the system instructions or the last user-turn context). Also `runNarrativeGeneration({ spec, plan, generateText? })` — likely `generateText` (plain string output) rather than `generateObject`, since the narrative is prose, not structured data; check `generateText`'s signature the same way (same `instructions`/`messages` shape) before using it.
5. **Tests** for both, using the injected-function seam with fixture `TurnResult`/narrative-string returns — no real network calls. Cover: a normal turn merges cleanly into the spec (via Plan A's `mergeSpecPatch`), a malformed/invalid model response is rejected and surfaced as a retry-once-then-error path (design doc's "malformed model output is retried once, then surfaced as a readable chat error").
6. **`app/api/chat/route.ts`** — POST handler: `{ messages, spec }` in, calls `runConversationTurn`, merges patch server-side (spec from the client is treated as advisory context only — the server-merged result is authoritative per the design doc), returns `{ turn, spec: updatedSpec }`. Validate the incoming request body (size limits, shape) before use.
7. **`app/api/narrative/route.ts`** — POST handler: `{ spec }` in (route computes `ComputePlan` itself via Plan A's `buildComputePlan`), calls `runNarrativeGeneration`, returns `{ narrative, plan }`.
8. Once the key is available locally (see the `.env.local` note above), do one real manual end-to-end check against the live Together API before moving to Plan C (UI) — the design doc calls for this ("a small `scripts/`-level manual-check note in the README covers exercising the real API locally").

Then **Plan C** (chat UI + live Workload Brief panel + brief/export screen + state provider) and **Plan D** (README, deployment verification, final quality gates) remain, matching the phase breakdown in the design doc (`docs/superpowers/specs/2026-09-23-compute-brief-design.md`, section "Explicit non-goals" / overall architecture).

## Resuming

Read this file, then `docs/superpowers/plans/2026-09-23-compute-brief-a-foundation.md` (for schema/type reference — everything Plan B imports comes from there) and `docs/superpowers/specs/2026-09-23-compute-brief-design.md` (for the product intent behind the prompts). No open questions block starting Plan B other than the local `.env.local` key gap noted above, which only blocks *live* testing, not writing the code with mocked tests.
