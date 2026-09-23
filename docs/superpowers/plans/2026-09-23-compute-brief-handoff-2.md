# ComputeBrief — Handoff #2 (paused for user request, mobile/streaming polish queued)

**Where things stand:** Plans A, B, and C are fully implemented, tested, and deployed. The app is
live and functional end-to-end at https://compute-brief.vercel.app (verified with real Together AI
calls, both locally and in production). Full quality gate green: 65 tests, lint, typecheck,
production build. This session paused before starting Plan D (README is actually already done —
see `README.md`; what's left of "Plan D" is really just final deployment-verification polish, now
largely folded into this handoff).

## New work requested this session, not yet started

The user asked for three things right before stopping (heading to an airport, will resume from a
lounge):

1. **Mobile layout is "super ugly"** — needs a real redesign pass, not just "it doesn't crash on a
   narrow viewport." Current mobile behavior: `app/page.tsx` uses
   `grid-rows-[55vh_1fr] ... md:grid-cols-[...] md:grid-rows-1` to stack `ChatPanel` above
   `WorkloadBriefPanel` on narrow screens. This was a first pass, never actually opened in a mobile
   viewport in this session (only desktop 800×600 was tested via the browser tool). **Before
   redesigning, use `mcp__Claude_Browser__resize_window` with `preset: "mobile"` to actually see
   the current state first** — don't guess at what's wrong from reading the code.
2. **Let the user hide the Live Workload Brief panel.** Currently `WorkloadBriefPanel` always
   renders (`components/workload/WorkloadBriefPanel.tsx`, mounted unconditionally in
   `app/page.tsx`). Needs a toggle — likely a button in `Header` or `ChatPanel` that collapses/hides
   the aside, probably defaulting to hidden on mobile (ties into item 1) and available to toggle on
   desktop too per the request ("you can hide the live workload brief as well" reads as a general
   ask, not mobile-only). Simplest approach: a boolean in `WorkloadProvider` or a separate small
   local UI-state context (doesn't need to persist to sessionStorage — it's a view preference, not
   conversation data), defaulting based on viewport width.
3. **Streaming responses.** Currently `/api/chat` uses `generateObject` (non-streaming) from `lib/ai/conversation.ts`,
   and the whole turn — often 10–60s, see the README's "A note on latency and structured outputs"
   section — returns as one blocking response with a "Thinking…" indicator. The user wants this
   streamed instead. Two real options, and the choice matters:
   - **`streamObject`** (from `"ai"`, same package) streams the *structured* `TurnResult` object
     incrementally as it's generated (partial JSON deltas) — this would let the UI show
     `assistantMessage` filling in progressively, which is the most direct answer to "streaming."
     Needs: `app/api/chat/route.ts` to stream a response (Next.js route handlers support
     `ReadableStream`/`Response` directly), and the client (`lib/state/workload-context.tsx`'s
     `sendMessage`) to consume the stream incrementally instead of one `await fetch().json()`. The
     merge-into-spec logic (`mergeSpecPatch`) should almost certainly only run once at the *end* of
     the stream (on the final complete object), not on every partial delta — partial JSON mid-stream
     won't be a valid `WorkloadSpecPatch` shape yet.
   - **Given the provider warning already in the README** (`supportsStructuredOutputs: false` for
     `zai-org/GLM-5.3-Flash` on Together, meaning `generateObject`/`streamObject` already falls back
     to a JSON-via-prompt strategy) — verify `streamObject` actually streams usefully for this
     model/provider combination before assuming it'll fix the perceived latency; it's possible the
     underlying non-streaming Together completion is what's slow (model generates the whole
     response server-side, then AI SDK streams the already-complete text to the client in one deltas
     immediately), in which case perceived latency may not improve much even though *technically*
     streaming is enabled. Test this for real (a live turn, timed) before declaring it fixed — don't
     assume streaming automatically fixes the 10–60s wait.
   - Vercel AI SDK version installed: `ai@7.0.112`, `@ai-sdk/togetherai@3.0.55` (same as documented
     in the Plan B handoff — `docs/superpowers/plans/2026-09-23-compute-brief-handoff.md` — re-check
     `streamObject`'s exact signature in `node_modules/ai/dist/index.d.ts` the same way that doc
     describes doing for `generateObject`, since this is a notably newer AI SDK major version than
     commonly-cached examples use.
   - The narrative-generation call (`/api/narrative`, `runNarrativeGeneration` using `generateText`)
     could also stream (`streamText`) for the same reason, though the user's ask was specifically
     about the conversational turns — confirm scope with them if ambiguous, but streaming both would
     be consistent.

## Suggested order when resuming

1. Open the current deployed/local app at mobile width first (`resize_window` to mobile preset),
   screenshot it, and actually look at what's broken before touching code.
2. Do the hide/show Live Workload Brief toggle — it's small, unblocks a cleaner mobile layout (the
   grid-rows mobile stacking becomes unnecessary if the panel can just be hidden), and item 1's
   redesign should probably be done *after* this toggle exists so the "mobile" layout is really just
   "chat, full width, brief panel hidden by default with a button to reveal it" rather than a
   cramped stacked view.
3. Streaming is the biggest, most separable piece of work — do it last, as its own task, with a real
   timed before/after comparison of a live turn's perceived latency.

No automated tests exist for the UI layer (deliberate scope decision, documented in the design doc
and `README.md`'s Tests section) — verify all three changes by hand in the browser, including a real
mobile-width viewport and at least one real conversation turn against the live Together API, same as
the rest of this session's verification approach.

## Everything else (context for a fresh session)

Read, in order: this file, `docs/superpowers/plans/2026-09-23-compute-brief-handoff.md` (Plan B AI-
SDK API research — provider usage, `generateObject` shape, message format), then `README.md` (now
complete and accurate — architecture, env vars, schema/provenance model, planner, export, deployment,
known limitations). The design doc (`docs/superpowers/specs/2026-09-23-compute-brief-design.md`) has
the original product intent if any of these three requests raise a design question the user hasn't
already answered.

Live deployment: https://compute-brief.vercel.app (public, no SSO gate — that had to be manually
disabled in Vercel project settings, and the Framework Preset had to be manually changed from
"Other" to "Next.js" earlier in this session since the project was `vercel link`'d before any app
code existed; both are already fixed and confirmed working). GitHub: https://github.com/thumplik/compute-brief.
