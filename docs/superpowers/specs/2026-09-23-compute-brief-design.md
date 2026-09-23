# ComputeBrief — Design Spec

**Date:** 2026-09-23
**Status:** Approved (source: user-authored product spec, condensed here into an implementation-ready design)

## 1. Purpose

ComputeBrief is a conversational intake tool that turns a natural-language description of an ML/AI/compute idea into a structured, provenance-tagged `WorkloadSpec`, a derived `ComputePlan`, and a narrative "Workload Brief" a human can act on or forward to a compute-review team. It behaves like an experienced ML requirements engineer, not a questionnaire: it asks only the highest-value next question, tolerates "I don't know," and is willing to conclude that no training is needed at all.

Tagline: *"Describe what you want to build. We'll figure out what it takes."*

## 2. Architecture

```
User conversation
  -> Conversation + current WorkloadSpec
  -> Together AI (single structured turn per message)
  -> { assistantMessage, specPatch, nextQuestion, readiness }
  -> WorkloadSpec updated (Zod-validated merge)
  -> WorkloadPlanner(WorkloadSpec, ClusterProfile) -> ComputePlan
  -> Live Workload Brief (right pane)
  -> "Generate Workload Brief" -> Narrative (Together AI, one request)
  -> Export: Copy / Download Markdown / Export JSON for ServiceNow (canonical schema)
```

- Next.js App Router, TypeScript, Tailwind, shadcn/ui, Vercel AI SDK, Together AI provider (`@ai-sdk/togetherai`), Zod, Vitest.
- One Together model for everything (`TOGETHER_MODEL`, default `zai-org/GLM-5.3-Flash`), accessed only through `lib/ai/provider.ts` (`getChatModel()` / `getStructuredModel()`), so swapping models later is a config change, not an app-logic change.
- The chat API route (`app/api/chat/route.ts`) is the only place that calls Together. It receives `{ messages, spec }`, asks the model for one structured turn (`assistantMessage`, `specPatch`, `nextQuestion`, `readiness`), Zod-validates the result, merges the patch into `WorkloadSpec` server-side, and returns the updated turn + spec to the client. The client never talks to Together directly and never trusts client-side spec mutations as authoritative — the server-merged spec is the source of truth for that turn.
- State lives client-side only for the MVP: React context holds the conversation + `WorkloadSpec`, persisted to `sessionStorage` so a refresh doesn't lose progress; "Start New Intake" clears it. No database.

## 3. WorkloadSpec (Zod schema)

A deeply partial, provenance-aware schema (`lib/schema/workload-spec.ts`) covering: requester info, problem definition, success criteria, workload classification (multi-select enum), maturity (with confidence + justification), existing assets (with exists/location-known/accessible/compute-accessible flags per asset), model info, data (modality/scale/format/labels/etc.), data readiness (data-exists vs. data-usable are tracked as separate booleans, never conflated), compute requirements, storage/IO, networking, software environment, access & permissions (confirmed / likely-required / unknown / blocker), evaluation, deployment/output target, timeline, blockers, unknowns.

Every field that represents a judgment call (not a plain user-stated fact) is wrapped in a shared `Provenance<T>` shape:

```ts
{
  value: T | null,
  source: "user_provided" | "ai_inferred" | "unknown",
  confidence?: "high" | "medium" | "low",   // only meaningful for ai_inferred
  reason?: string,                          // short, user-facing, no chain-of-thought
  assumptions?: string[],
}
```

Plain identifying fields the user states directly (name, org, a stated dataset size) are stored as `source: "user_provided"` without needing confidence. Nothing is silently promoted from `ai_inferred` to `user_provided`. A correction (e.g., "actually it's 5TB not 50TB") overwrites the value and source, and the server recomputes anything downstream (ComputePlan, narrative) from the corrected spec rather than patching stale text.

Unknown fields are represented by `source: "unknown"`, not by omission-implies-unknown — this keeps the schema self-describing when serialized (important for the ServiceNow export and for tests).

## 4. WorkloadPlanner / ComputePlan

`lib/planner/workload-planner.ts` is a pure function: `(WorkloadSpec, ClusterProfile) => ComputePlan`. It is deterministic *scaffolding* (ranges, heuristics, assumption lists) around values that arrive already-inferred in the spec via the model's `specPatch` — the planner's job is to assemble a coherent plan object and enforce the "ranges, not fake precision" rule, not to re-derive GPU counts from scratch with its own ML logic. It must be able to output "not enough information to justify a large allocation; recommend a small benchmark first" as a valid, first-class result.

`ComputePlan` fields mirror the spec doc: recommended approach + alternative, training-vs-inference recommendation, initial experiment / scaled configuration (as ranges), GPU/CPU/RAM/storage estimates (each a `Provenance`-shaped range), I/O and networking considerations, software environment, required access, assumptions, confidence, blockers, unresolved questions, recommended next actions.

`config/cluster-profile.ts` (`ClusterProfile`) is an abstraction that for the MVP only asserts "significant modern NVIDIA Blackwell-class GPU infrastructure is available," with typed fields for accelerator model, GPUs/node, node count, CPU/RAM, storage tiers, interconnect, scheduler, etc. left `null`/unset — shaped so a real cluster profile can be dropped in later without touching the planner's call signature.

## 5. UX

Two-pane desktop layout (~60/65% conversation, ~35/40% live Workload Brief), stacked on mobile. Landing state is the composer itself ("What are you trying to build?") with a few example prompts — no marketing page. Chat supports streaming assistant text, multiline input (Enter to send, Shift+Enter for newline), retry on failure, and disabled-send states.

The Live Workload Brief renders only sections that have content (no empty-field clutter), with each value visually tagged by provenance: user-provided (plain/confirmed styling), AI-inferred (labeled with confidence), unknown (explicitly shown as unknown, not hidden), blocker (flagged distinctly). Readiness is a small enum-based status chip (Early Idea / Exploring / Prototype / Needs Information / Needs Data Preparation / Needs Access / Ready for Initial Experiment / Ready for Compute Review) — never a numeric score.

"Generate Workload Brief" produces the narrative (a separate Together request, synthesized prose per the spec's section list — not a field dump), editable by continuing the conversation (regenerates from updated state, spec remains source of truth). Export actions (Copy Narrative, Download Markdown, Export JSON for ServiceNow) live on the brief screen; JSON export opens a preview modal before download.

## 6. ServiceNow export

`lib/export/canonical-json.ts` builds a versioned canonical payload (`schema: "computebrief.workload"`, `schemaVersion` centralized in `config/export.ts`) from `WorkloadSpec` + `ComputePlan` + narrative. `lib/export/servicenow.ts` re-exports/documents the canonical payload as the ServiceNow-ready shape with clear extension-point comments for a future mapping adapter — no live ServiceNow API calls in the MVP. Unknown values serialize as explicit `{ value: null, source: "unknown" }`, never fabricated placeholders.

## 7. Testing scope (Vitest)

- Schema: complete/partial specs, provenance fields, corrections overwriting prior values, export-schema round-trip (no `undefined`, valid JSON, stable field names).
- Planner: given representative `WorkloadSpec` fixtures (novice/satellite-ships, experienced/ViT-scaling, no-training-needed/RAG, early-idea/predictive-maintenance, correction scenario), assert the `ComputePlan` shape and key judgment calls (e.g., RAG chosen over pretraining; small-benchmark-first when data is thin).
- Conversation-turn handling: the API route's merge/validation logic tested against **mocked** Together responses (fixed JSON fixtures), not live network calls — keeps CI deterministic, fast, and free. A small `scripts/`-level manual-check note in the README covers exercising the real API locally.
- Export: canonical JSON + Markdown generation against fixture specs.

## 8. Security & environment

`TOGETHER_API_KEY` and `TOGETHER_MODEL` are server-only env vars, read only inside `lib/ai/provider.ts` and the API route; never sent to client bundles. `.env*` (except `.env.example`) is gitignored. Model output is Zod-validated before being trusted; malformed structured output is retried once, then surfaced as a readable chat error rather than crashing the turn. Rendered Markdown (narrative preview) is sanitized.

## 9. Explicit non-goals for this MVP

Kubernetes/scheduler integration, live ServiceNow API calls, accounts/auth, approval workflows, a real database, multi-model routing, RBAC, actual GPU reservation, enterprise SSO, precise compute-estimation formulas. The architecture leaves clear seams for all of these later (per the product-direction diagram in the original spec) but none are implemented now.

## 10. Deployment

GitHub repo `compute-brief` (public), Vercel project linked via GitHub integration (`main` = production, feature branches get previews), `TOGETHER_API_KEY` / `TOGETHER_MODEL` set as Vercel production env vars (added by the user directly, not pasted into this session). Quality gates before calling the MVP done: install, lint, typecheck, test, production build — all green — plus a manual pass through the deployed URL covering the flows listed in the original spec's "Deployment verification" section.
