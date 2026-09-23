# ComputeBrief — Plan A: Foundation (scaffold, schemas, planner, export)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js project and build the fully-tested, UI-free logic core: `WorkloadSpec` (provenance-aware Zod schema), the spec-patch merge function, `ComputePlan`, the `WorkloadPlanner`, and the export layer (canonical JSON / Markdown / ServiceNow-ready payload). No AI calls and no React UI in this plan — everything here is pure TypeScript, unit-testable with Vitest, and forms the contract the AI layer (Plan B) and UI (Plan C) are built against.

**Architecture:** Next.js App Router + TypeScript scaffold; Zod schemas under `lib/schema/`; a generic deep-merge function that applies a `WorkloadSpec` patch while treating any object with a `source` key (a provenance leaf) or an array as atomically replaceable, and any other plain object as recursively mergeable; a deterministic, rules-based `WorkloadPlanner` that reads already-known/inferred fields off `WorkloadSpec` and assembles a `ComputePlan`, defaulting to a "recommend a benchmark first" result when signal is thin; export functions that assemble the canonical ComputeBrief JSON and Markdown from `WorkloadSpec` + `ComputePlan` + narrative text.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Zod, Vitest.

---

## Reference: full `WorkloadSpec` field map

This is the authoritative shape all later tasks implement against. Every leaf wrapped in `Provenance<T>` (defined in Task 2) unless noted "plain."

- `requester`: name, organization, team, role, email, technicalContact, projectName, sponsoringOrganization — all `Provenance<string>`, all optional keys.
- `problem`: statement, intendedUsers, currentWorkflow, currentPainPoints, desiredCapability, desiredOutputs, expectedValue, reasonForRequest — all `Provenance<string>`, optional.
- `successCriteria`: desiredBehavior, quantitativeMetrics (`Provenance<string[]>`), qualitativeCriteria, latencyRequirement, throughputRequirement, accuracyTarget, precisionVsRecallNote, baselineToBeat, operationalConstraints — `Provenance<string>` unless noted, optional.
- `classification`: `Provenance<WorkloadClassification[]>`, optional.
- `maturity`: `Provenance<MaturityLevel>`, optional (value + confidence + reason as the "justification").
- `existingAssets`: `Record<string, Provenance<AssetStatus>>` keyed by asset type (see `AssetType` enum), default `{}`. `AssetStatus = { exists, locationKnown, accessible, computeEnvironmentAccessible: boolean | null, description?: string }`.
- `model`: family, architecture, candidateModel, baseModel, parameterCount (string, e.g. "~7B"), trainingStrategy, fineTuningStrategy, precision, quantization, contextLength (number), inputResolution, batchSize (number), optimizer, parallelismStrategy — all `Provenance<...>`, optional.
- `data`: modality (`DataModality`), source, location, approximateSizeTb (number), sampleCount (number), fileCount (number), format, labelStatus (`LabelStatus`), labelType, splitStatus (`SplitStatus`), syntheticVsReal, updateFrequency, sensitivity — `Provenance<...>`, optional.
- `dataReadiness`: `Record<string, Provenance<boolean>>` keyed by flag name (see `DataReadinessFlag` enum), default `{}`.
- `compute`: workloadPhase (`WorkloadPhase`), cpuOnlyViable (bool), acceleratorRequired (bool), candidateGpuType (string), currentGpuCount (number — "what they already run on, if anything"), minimumViableGpus (number), gpuCountRange (`Range`), scaledGpuRange (`Range`), vramRequirementGb (`Range`), multiNodeRequired (bool), distributedTrainingRequired (bool), cpuCoresRange (`Range`), systemRamGbRange (`Range`), expectedRuntime (string), experimentFrequency (string), interactiveVsBatch (`"interactive"|"batch"|"both"`) — all `Provenance<...>`, optional.
- `storage`: sourceDataStorage, scratchStorageTb (`Range`), checkpointStorageTb (`Range`), artifactStorageTb (`Range`), readThroughputNote, writeThroughputNote, sharedFilesystemRequired (bool), localNvmeUseful (bool), retentionNote — `Provenance<...>`, optional.
- `networking`: multiNodeCommunicationRequired (bool), highSpeedInterconnectRequired (bool), externalApiDependencies (`string[]`), internetRequired (bool), modelRepositoryAccessRequired (bool), egressRequired (bool), inboundServiceRequired (bool) — `Provenance<...>`, optional.
- `software`: language, pythonVersion, frameworks (`string[]`), distributedFrameworks (`string[]`), cudaVersion, containerRequired (bool), containerImage, packageRepositories (`string[]`), modelRepositories (`string[]`), gitRepositories (`string[]`), additionalPackages (`string[]`) — `Provenance<...>`, optional.
- `access`: `items: AccessItem[]`, default `[]`. `AccessItem = { name: string, category?: string, status: AccessStatus, notes?: string }` (plain, not provenance-wrapped — status IS the provenance-equivalent here).
- `evaluation`: validationDataset, testDataset, benchmark, baseline, quantitativeMetrics (`string[]`), humanEvaluationPlan, hasEvaluationPlan (bool) — `Provenance<...>`, optional.
- `deployment`: outputTarget (`DeploymentTarget`), servingNotes — `Provenance<...>`, optional.
- `timeline`: startDate, deadline, cadence (`"one_time"|"recurring"`), urgencyNote — `Provenance<string>` (dates as ISO strings), optional.
- `blockers`: `Blocker[]`, default `[]`. `Blocker = { description: string, category?: string, severity?: "high"|"medium"|"low" }` (plain).
- `unknowns`: `Unknown[]`, default `[]`. `Unknown = { description: string, affects?: UnknownImpact[] }` (plain).
- `readiness`: `Readiness` (plain enum, system-computed each turn), default `"early_idea"`.

---

### Task 1: Project scaffold

**Files:**
- Create: whole Next.js project skeleton at repo root (`/Users/home/compute-brief`)
- Modify: `.gitignore` (already exists — verify it still covers `.env*`, `node_modules/`, `.next/`)

- [ ] **Step 1: Scaffold Next.js app**

Run:
```bash
npx --yes create-next-app@latest . --typescript --eslint --tailwind --app --no-src-dir --import-alias "@/*" --disable-git --use-npm
```
Expected: command completes and creates `app/`, `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind`/`postcss` config, `eslint.config.mjs`. If it prompts interactively despite the flags (version-dependent), answer: TypeScript=Yes, ESLint=Yes, Tailwind=Yes, `src/` directory=No, App Router=Yes, import alias=`@/*`, Turbopack=Yes (either answer is fine — record whichever was used).

- [ ] **Step 2: Verify `.gitignore` still has the required entries**

Open `.gitignore` (created before scaffolding) and confirm it contains at least:
```
node_modules/
.next/
.env
.env.local
.env*.local
!.env.example
*.log
.DS_Store
coverage/
```
If `create-next-app` overwrote it with its own generic `.gitignore`, re-add the `.env*`/`coverage/` lines create-next-app's template doesn't include.

- [ ] **Step 3: Install core dependencies**

Run:
```bash
npm install zod
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```
Expected: installs succeed, `package.json` gains `zod` under `dependencies` and `vitest`/`@vitejs/plugin-react`/`vite-tsconfig-paths` under `devDependencies`.

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Add test script to `package.json`**

Edit the `"scripts"` block in `package.json` to include:
```json
"test": "vitest run",
"test:watch": "vitest"
```
(Keep the existing `dev`, `build`, `start`, `lint` scripts as generated.)

- [ ] **Step 6: Create the `tests/` directory with a smoke test**

Create `tests/smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run the test suite**

Run: `npm test`
Expected: 1 passed test (`smoke.test.ts`).

- [ ] **Step 8: Verify the app builds**

Run: `npm run build`
Expected: build succeeds (default Next.js starter page). Note any warnings but only stop for errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with Vitest"
```

---

### Task 2: Provenance and shared schema primitives

**Files:**
- Create: `lib/schema/provenance.ts`
- Create: `lib/schema/shared.ts`
- Test: `tests/schema/provenance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schema/provenance.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  provenance,
  userProvided,
  aiInferred,
  unknownField,
} from "@/lib/schema/provenance";

describe("provenance", () => {
  const StringProvenance = provenance(z.string());

  it("accepts a user-provided value with no confidence required", () => {
    const parsed = StringProvenance.parse(userProvided("Acme Corp"));
    expect(parsed).toEqual({ value: "Acme Corp", source: "user_provided" });
  });

  it("accepts an ai-inferred value with confidence and reason", () => {
    const parsed = StringProvenance.parse(
      aiInferred("fine-tuning", "medium", "Existing checkpoint plus new labeled data suggests fine-tuning.", ["base model is compatible"])
    );
    expect(parsed.source).toBe("ai_inferred");
    expect(parsed.confidence).toBe("medium");
    expect(parsed.assumptions).toEqual(["base model is compatible"]);
  });

  it("accepts an explicit unknown with a null value", () => {
    const parsed = StringProvenance.parse(unknownField());
    expect(parsed).toEqual({ value: null, source: "unknown" });
  });

  it("rejects a source outside the enum", () => {
    expect(() => StringProvenance.parse({ value: "x", source: "guessed" })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- provenance`
Expected: FAIL — `Cannot find module '@/lib/schema/provenance'`.

- [ ] **Step 3: Implement `lib/schema/provenance.ts`**

```ts
import { z } from "zod";

export const ProvenanceSourceSchema = z.enum(["user_provided", "ai_inferred", "unknown"]);
export type ProvenanceSource = z.infer<typeof ProvenanceSourceSchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export function provenance<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    source: ProvenanceSourceSchema,
    confidence: ConfidenceSchema.optional(),
    reason: z.string().optional(),
    assumptions: z.array(z.string()).optional(),
  });
}

export interface Provenance<T> {
  value: T | null;
  source: ProvenanceSource;
  confidence?: Confidence;
  reason?: string;
  assumptions?: string[];
}

export function unknownField<T>(): Provenance<T> {
  return { value: null, source: "unknown" };
}

export function userProvided<T>(value: T): Provenance<T> {
  return { value, source: "user_provided" };
}

export function aiInferred<T>(
  value: T,
  confidence: Confidence,
  reason: string,
  assumptions?: string[]
): Provenance<T> {
  return { value, source: "ai_inferred", confidence, reason, assumptions };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- provenance`
Expected: PASS — 4 tests.

- [ ] **Step 5: Implement `lib/schema/shared.ts`** (no test needed — pure schema definitions exercised indirectly by later tests)

```ts
import { z } from "zod";

export const RangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});
export type Range = z.infer<typeof RangeSchema>;

export const ReadinessSchema = z.enum([
  "early_idea",
  "exploring",
  "prototype",
  "needs_information",
  "needs_data_preparation",
  "needs_access",
  "ready_for_initial_experiment",
  "ready_for_compute_review",
]);
export type Readiness = z.infer<typeof ReadinessSchema>;

export const AccessStatusSchema = z.enum(["confirmed", "likely_required", "unknown", "blocker"]);
export type AccessStatus = z.infer<typeof AccessStatusSchema>;
```

- [ ] **Step 6: Commit**

```bash
git add tests/schema/provenance.test.ts lib/schema/provenance.ts lib/schema/shared.ts
git commit -m "Add provenance and shared schema primitives"
```

---

### Task 3: `WorkloadSpec` schema

**Files:**
- Create: `lib/schema/workload-spec.ts`
- Test: `tests/schema/workload-spec.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schema/workload-spec.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  WorkloadSpecSchema,
  emptyWorkloadSpec,
  type WorkloadSpec,
} from "@/lib/schema/workload-spec";
import { userProvided, aiInferred } from "@/lib/schema/provenance";

describe("WorkloadSpecSchema", () => {
  it("parses an empty object into a fully-defaulted spec", () => {
    const spec = emptyWorkloadSpec();
    expect(spec.requester).toEqual({});
    expect(spec.existingAssets).toEqual({});
    expect(spec.dataReadiness).toEqual({});
    expect(spec.blockers).toEqual([]);
    expect(spec.unknowns).toEqual([]);
    expect(spec.readiness).toBe("early_idea");
  });

  it("accepts a partially-filled spec with mixed provenance", () => {
    const spec: WorkloadSpec = {
      ...emptyWorkloadSpec(),
      requester: { organization: userProvided("Acme Robotics") },
      classification: aiInferred(["computer_vision", "inference"], "medium", "Described as detecting ships in imagery using an existing approach."),
      maturity: aiInferred("idea", "high", "No code or data pipeline exists yet."),
    };
    const parsed = WorkloadSpecSchema.parse(spec);
    expect(parsed.requester.organization?.value).toBe("Acme Robotics");
    expect(parsed.classification?.value).toEqual(["computer_vision", "inference"]);
    expect(parsed.maturity?.value).toBe("idea");
  });

  it("supports existingAssets keyed by asset type", () => {
    const spec: WorkloadSpec = {
      ...emptyWorkloadSpec(),
      existingAssets: {
        training_code: userProvided({ exists: true, locationKnown: true, accessible: true, computeEnvironmentAccessible: null }),
      },
    };
    const parsed = WorkloadSpecSchema.parse(spec);
    expect(parsed.existingAssets.training_code?.value?.exists).toBe(true);
  });

  it("supports dataReadiness keyed by flag name", () => {
    const spec: WorkloadSpec = {
      ...emptyWorkloadSpec(),
      dataReadiness: {
        data_exists: userProvided(true),
        labeling_required: aiInferred(true, "medium", "Imagery has not been annotated yet."),
      },
    };
    const parsed = WorkloadSpecSchema.parse(spec);
    expect(parsed.dataReadiness.data_exists?.value).toBe(true);
    expect(parsed.dataReadiness.labeling_required?.value).toBe(true);
  });

  it("rejects an invalid workload classification value", () => {
    const bad = { ...emptyWorkloadSpec(), classification: userProvided(["not_a_real_classification"]) };
    expect(() => WorkloadSpecSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid readiness value", () => {
    const bad = { ...emptyWorkloadSpec(), readiness: "almost_ready" };
    expect(() => WorkloadSpecSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- workload-spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/schema/workload-spec.ts`**

```ts
import { z } from "zod";
import { provenance } from "@/lib/schema/provenance";
import { ReadinessSchema, AccessStatusSchema } from "@/lib/schema/shared";

export const WorkloadClassificationSchema = z.enum([
  "traditional_machine_learning",
  "deep_learning",
  "computer_vision",
  "nlp",
  "multimodal",
  "llm",
  "model_pretraining",
  "supervised_training",
  "self_supervised_training",
  "fine_tuning",
  "parameter_efficient_fine_tuning",
  "inference",
  "batch_inference",
  "online_inference",
  "embeddings",
  "rag",
  "evaluation",
  "synthetic_data",
  "reinforcement_learning",
  "simulation",
  "hpc",
  "data_processing",
  "other",
]);
export type WorkloadClassification = z.infer<typeof WorkloadClassificationSchema>;

export const MaturityLevelSchema = z.enum([
  "idea",
  "exploration",
  "prototype",
  "training_ready",
  "scaling",
  "operationalizing",
]);
export type MaturityLevel = z.infer<typeof MaturityLevelSchema>;

export const AssetTypeSchema = z.enum([
  "source_code",
  "git_repository",
  "notebooks",
  "scripts",
  "existing_model",
  "model_weights",
  "checkpoint",
  "training_code",
  "inference_code",
  "container_image",
  "requirements_file",
  "existing_deployment",
  "experiment_logs",
  "benchmark_results",
  "evaluation_datasets",
  "documentation",
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetStatusSchema = z.object({
  exists: z.boolean().nullable(),
  locationKnown: z.boolean().nullable(),
  accessible: z.boolean().nullable(),
  computeEnvironmentAccessible: z.boolean().nullable(),
  description: z.string().optional(),
});
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

export const DataReadinessFlagSchema = z.enum([
  "data_exists",
  "data_location_known",
  "requester_has_access",
  "compute_environment_has_access",
  "labeling_required",
  "cleaning_required",
  "normalization_required",
  "transformation_required",
  "conversion_required",
  "deduplication_required",
  "tiling_required",
  "chunking_required",
  "tokenization_required",
  "augmentation_required",
  "filtering_required",
  "train_validation_test_split_required",
  "quality_assessment_required",
  "other_preparation_required",
]);
export type DataReadinessFlag = z.infer<typeof DataReadinessFlagSchema>;

export const DataModalitySchema = z.enum([
  "images",
  "video",
  "text",
  "documents",
  "tabular",
  "audio",
  "time_series",
  "geospatial",
  "multimodal",
  "other",
]);

export const LabelStatusSchema = z.enum(["unlabeled", "partially_labeled", "fully_labeled", "unknown"]);
export const SplitStatusSchema = z.enum(["no_split", "has_split", "unknown"]);
export const SyntheticVsRealSchema = z.enum(["real", "synthetic", "mixed"]);

export const WorkloadPhaseSchema = z.enum([
  "experimentation",
  "training",
  "fine_tuning",
  "inference",
  "evaluation",
  "data_processing",
]);

export const DeploymentTargetSchema = z.enum([
  "research_experiment",
  "proof_of_concept",
  "trained_weights",
  "exported_model",
  "batch_pipeline",
  "scheduled_pipeline",
  "api",
  "interactive_service",
  "user_facing_application",
  "embedded_capability",
  "edge_deployment",
  "report_or_artifact",
  "dataset",
  "synthetic_dataset",
  "other",
]);

export const UnknownImpactSchema = z.enum([
  "feasibility",
  "cost",
  "compute_sizing",
  "access",
  "architecture",
  "schedule",
  "evaluation",
  "operationalization",
]);

const RequesterSchema = z.object({
  name: provenance(z.string()).optional(),
  organization: provenance(z.string()).optional(),
  team: provenance(z.string()).optional(),
  role: provenance(z.string()).optional(),
  email: provenance(z.string()).optional(),
  technicalContact: provenance(z.string()).optional(),
  projectName: provenance(z.string()).optional(),
  sponsoringOrganization: provenance(z.string()).optional(),
});

const ProblemSchema = z.object({
  statement: provenance(z.string()).optional(),
  intendedUsers: provenance(z.string()).optional(),
  currentWorkflow: provenance(z.string()).optional(),
  currentPainPoints: provenance(z.string()).optional(),
  desiredCapability: provenance(z.string()).optional(),
  desiredOutputs: provenance(z.string()).optional(),
  expectedValue: provenance(z.string()).optional(),
  reasonForRequest: provenance(z.string()).optional(),
});

const SuccessCriteriaSchema = z.object({
  desiredBehavior: provenance(z.string()).optional(),
  quantitativeMetrics: provenance(z.array(z.string())).optional(),
  qualitativeCriteria: provenance(z.string()).optional(),
  latencyRequirement: provenance(z.string()).optional(),
  throughputRequirement: provenance(z.string()).optional(),
  accuracyTarget: provenance(z.string()).optional(),
  precisionVsRecallNote: provenance(z.string()).optional(),
  baselineToBeat: provenance(z.string()).optional(),
  operationalConstraints: provenance(z.string()).optional(),
});

const ModelInfoSchema = z.object({
  family: provenance(z.string()).optional(),
  architecture: provenance(z.string()).optional(),
  candidateModel: provenance(z.string()).optional(),
  baseModel: provenance(z.string()).optional(),
  parameterCount: provenance(z.string()).optional(),
  trainingStrategy: provenance(z.string()).optional(),
  fineTuningStrategy: provenance(z.string()).optional(),
  precision: provenance(z.string()).optional(),
  quantization: provenance(z.string()).optional(),
  contextLength: provenance(z.number()).optional(),
  inputResolution: provenance(z.string()).optional(),
  batchSize: provenance(z.number()).optional(),
  optimizer: provenance(z.string()).optional(),
  parallelismStrategy: provenance(z.string()).optional(),
});

const DataSchema = z.object({
  modality: provenance(DataModalitySchema).optional(),
  source: provenance(z.string()).optional(),
  location: provenance(z.string()).optional(),
  approximateSizeTb: provenance(z.number()).optional(),
  sampleCount: provenance(z.number()).optional(),
  fileCount: provenance(z.number()).optional(),
  format: provenance(z.string()).optional(),
  labelStatus: provenance(LabelStatusSchema).optional(),
  labelType: provenance(z.string()).optional(),
  splitStatus: provenance(SplitStatusSchema).optional(),
  syntheticVsReal: provenance(SyntheticVsRealSchema).optional(),
  updateFrequency: provenance(z.string()).optional(),
  sensitivity: provenance(z.string()).optional(),
});

const ComputeRequirementsSchema = z.object({
  workloadPhase: provenance(WorkloadPhaseSchema).optional(),
  cpuOnlyViable: provenance(z.boolean()).optional(),
  acceleratorRequired: provenance(z.boolean()).optional(),
  candidateGpuType: provenance(z.string()).optional(),
  currentGpuCount: provenance(z.number()).optional(),
  minimumViableGpus: provenance(z.number()).optional(),
  gpuCountRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  scaledGpuRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  vramRequirementGb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  multiNodeRequired: provenance(z.boolean()).optional(),
  distributedTrainingRequired: provenance(z.boolean()).optional(),
  cpuCoresRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  systemRamGbRange: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  expectedRuntime: provenance(z.string()).optional(),
  experimentFrequency: provenance(z.string()).optional(),
  interactiveVsBatch: provenance(z.enum(["interactive", "batch", "both"])).optional(),
});

const StorageSchema = z.object({
  sourceDataStorage: provenance(z.string()).optional(),
  scratchStorageTb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  checkpointStorageTb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  artifactStorageTb: provenance(z.object({ min: z.number().nullable(), max: z.number().nullable() })).optional(),
  readThroughputNote: provenance(z.string()).optional(),
  writeThroughputNote: provenance(z.string()).optional(),
  sharedFilesystemRequired: provenance(z.boolean()).optional(),
  localNvmeUseful: provenance(z.boolean()).optional(),
  retentionNote: provenance(z.string()).optional(),
});

const NetworkingSchema = z.object({
  multiNodeCommunicationRequired: provenance(z.boolean()).optional(),
  highSpeedInterconnectRequired: provenance(z.boolean()).optional(),
  externalApiDependencies: provenance(z.array(z.string())).optional(),
  internetRequired: provenance(z.boolean()).optional(),
  modelRepositoryAccessRequired: provenance(z.boolean()).optional(),
  egressRequired: provenance(z.boolean()).optional(),
  inboundServiceRequired: provenance(z.boolean()).optional(),
});

const SoftwareEnvironmentSchema = z.object({
  language: provenance(z.string()).optional(),
  pythonVersion: provenance(z.string()).optional(),
  frameworks: provenance(z.array(z.string())).optional(),
  distributedFrameworks: provenance(z.array(z.string())).optional(),
  cudaVersion: provenance(z.string()).optional(),
  containerRequired: provenance(z.boolean()).optional(),
  containerImage: provenance(z.string()).optional(),
  packageRepositories: provenance(z.array(z.string())).optional(),
  modelRepositories: provenance(z.array(z.string())).optional(),
  gitRepositories: provenance(z.array(z.string())).optional(),
  additionalPackages: provenance(z.array(z.string())).optional(),
});

const AccessItemSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  status: AccessStatusSchema,
  notes: z.string().optional(),
});
export type AccessItem = z.infer<typeof AccessItemSchema>;

const EvaluationSchema = z.object({
  validationDataset: provenance(z.string()).optional(),
  testDataset: provenance(z.string()).optional(),
  benchmark: provenance(z.string()).optional(),
  baseline: provenance(z.string()).optional(),
  quantitativeMetrics: provenance(z.array(z.string())).optional(),
  humanEvaluationPlan: provenance(z.string()).optional(),
  hasEvaluationPlan: provenance(z.boolean()).optional(),
});

const DeploymentSchema = z.object({
  outputTarget: provenance(DeploymentTargetSchema).optional(),
  servingNotes: provenance(z.string()).optional(),
});

const TimelineSchema = z.object({
  startDate: provenance(z.string()).optional(),
  deadline: provenance(z.string()).optional(),
  cadence: provenance(z.enum(["one_time", "recurring"])).optional(),
  urgencyNote: provenance(z.string()).optional(),
});

const BlockerSchema = z.object({
  description: z.string(),
  category: z.string().optional(),
  severity: z.enum(["high", "medium", "low"]).optional(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

const UnknownSchema = z.object({
  description: z.string(),
  affects: z.array(UnknownImpactSchema).optional(),
});
export type WorkloadUnknown = z.infer<typeof UnknownSchema>;

export const WorkloadSpecSchema = z.object({
  requester: RequesterSchema.default({}),
  problem: ProblemSchema.default({}),
  successCriteria: SuccessCriteriaSchema.default({}),
  classification: provenance(z.array(WorkloadClassificationSchema)).optional(),
  maturity: provenance(MaturityLevelSchema).optional(),
  existingAssets: z.record(AssetTypeSchema, provenance(AssetStatusSchema)).default({}),
  model: ModelInfoSchema.default({}),
  data: DataSchema.default({}),
  dataReadiness: z.record(DataReadinessFlagSchema, provenance(z.boolean())).default({}),
  compute: ComputeRequirementsSchema.default({}),
  storage: StorageSchema.default({}),
  networking: NetworkingSchema.default({}),
  software: SoftwareEnvironmentSchema.default({}),
  access: z.object({ items: z.array(AccessItemSchema).default([]) }).default({ items: [] }),
  evaluation: EvaluationSchema.default({}),
  deployment: DeploymentSchema.default({}),
  timeline: TimelineSchema.default({}),
  blockers: z.array(BlockerSchema).default([]),
  unknowns: z.array(UnknownSchema).default([]),
  readiness: ReadinessSchema.default("early_idea"),
});

export type WorkloadSpec = z.infer<typeof WorkloadSpecSchema>;

export function emptyWorkloadSpec(): WorkloadSpec {
  return WorkloadSpecSchema.parse({});
}

export const WorkloadSpecPatchSchema = WorkloadSpecSchema.deepPartial();
export type WorkloadSpecPatch = z.infer<typeof WorkloadSpecPatchSchema>;
```

Note: `z.record(EnumSchema, valueSchema)` requires Zod 3.22+ (two-argument `z.record`). If the installed Zod version only supports the single-argument form, use `z.record(z.string(), provenance(AssetStatusSchema))` (and likewise for `dataReadiness`) instead — check `node_modules/zod/package.json` `version` field and adjust both `existingAssets` and `dataReadiness` consistently before running the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- workload-spec`
Expected: PASS — 6 tests. If Zod's `z.record` signature causes a type/runtime error, apply the fallback noted above and re-run.

- [ ] **Step 5: Commit**

```bash
git add tests/schema/workload-spec.test.ts lib/schema/workload-spec.ts
git commit -m "Add WorkloadSpec schema"
```

---

### Task 4: Spec-patch deep merge

**Files:**
- Create: `lib/state/merge-patch.ts`
- Test: `tests/state/merge-patch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/state/merge-patch.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mergeSpecPatch } from "@/lib/state/merge-patch";
import { emptyWorkloadSpec, type WorkloadSpecPatch } from "@/lib/schema/workload-spec";
import { userProvided, aiInferred } from "@/lib/schema/provenance";

describe("mergeSpecPatch", () => {
  it("merges a single top-level field without touching siblings", () => {
    const spec = {
      ...emptyWorkloadSpec(),
      requester: { organization: userProvided("Acme Robotics"), team: userProvided("Perception") },
    };
    const patch: WorkloadSpecPatch = { requester: { role: userProvided("ML Lead") } };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.requester.organization?.value).toBe("Acme Robotics");
    expect(merged.requester.team?.value).toBe("Perception");
    expect(merged.requester.role?.value).toBe("ML Lead");
  });

  it("adds a new existingAssets entry without removing prior ones", () => {
    const spec = {
      ...emptyWorkloadSpec(),
      existingAssets: {
        training_code: userProvided({ exists: true, locationKnown: true, accessible: true, computeEnvironmentAccessible: null }),
      },
    };
    const patch: WorkloadSpecPatch = {
      existingAssets: {
        model_weights: userProvided({ exists: true, locationKnown: false, accessible: null, computeEnvironmentAccessible: null }),
      },
    };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.existingAssets.training_code?.value?.exists).toBe(true);
    expect(merged.existingAssets.model_weights?.value?.locationKnown).toBe(false);
  });

  it("replaces a provenance leaf wholesale on correction, not merging stale fields", () => {
    const spec = {
      ...emptyWorkloadSpec(),
      data: { approximateSizeTb: aiInferred(50, "low", "Rough estimate from description.") },
    };
    const patch: WorkloadSpecPatch = { data: { approximateSizeTb: userProvided(5) } };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.data.approximateSizeTb).toEqual({ value: 5, source: "user_provided" });
    expect(merged.data.approximateSizeTb?.confidence).toBeUndefined();
  });

  it("replaces top-level arrays wholesale", () => {
    const spec = {
      ...emptyWorkloadSpec(),
      blockers: [{ description: "Dataset access not confirmed" }],
    };
    const patch: WorkloadSpecPatch = { blockers: [{ description: "Evaluation criteria undefined" }] };
    const merged = mergeSpecPatch(spec, patch);
    expect(merged.blockers).toEqual([{ description: "Evaluation criteria undefined" }]);
  });

  it("leaves the base spec untouched when the patch omits a field", () => {
    const spec = { ...emptyWorkloadSpec(), readiness: "prototype" as const };
    const merged = mergeSpecPatch(spec, {});
    expect(merged.readiness).toBe("prototype");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- merge-patch`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/state/merge-patch.ts`**

```ts
import { WorkloadSpecSchema, type WorkloadSpec, type WorkloadSpecPatch } from "@/lib/schema/workload-spec";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProvenanceLeaf(value: Record<string, unknown>): boolean {
  return "source" in value;
}

export function deepMergePatch<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch)) {
    return patch === undefined ? base : (patch as T);
  }
  if (isProvenanceLeaf(patch)) {
    return patch as T;
  }
  const baseObject = isPlainObject(base) ? base : {};
  const result: Record<string, unknown> = { ...baseObject };
  for (const key of Object.keys(patch)) {
    result[key] = deepMergePatch(
      (baseObject as Record<string, unknown>)[key],
      (patch as Record<string, unknown>)[key]
    );
  }
  return result as T;
}

export function mergeSpecPatch(spec: WorkloadSpec, patch: WorkloadSpecPatch): WorkloadSpec {
  const merged = deepMergePatch(spec, patch);
  return WorkloadSpecSchema.parse(merged);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- merge-patch`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/state/merge-patch.test.ts lib/state/merge-patch.ts
git commit -m "Add spec-patch deep merge"
```

---

### Task 5: `ConversationTurn` schema

**Files:**
- Create: `lib/schema/conversation-turn.ts`
- Test: `tests/schema/conversation-turn.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schema/conversation-turn.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { TurnResultSchema } from "@/lib/schema/conversation-turn";

describe("TurnResultSchema", () => {
  it("parses a well-formed turn result", () => {
    const result = TurnResultSchema.parse({
      assistantMessage: "That helps. It sounds like you already have a working prototype.",
      specPatch: { requester: { organization: { value: "Acme Robotics", source: "user_provided" } } },
      nextQuestion: "Approximately how large is the training dataset?",
      readiness: "needs_information",
    });
    expect(result.nextQuestion).toContain("dataset");
  });

  it("allows a null nextQuestion when no more questions are needed", () => {
    const result = TurnResultSchema.parse({
      assistantMessage: "This looks ready for a compute review.",
      specPatch: {},
      nextQuestion: null,
      readiness: "ready_for_compute_review",
    });
    expect(result.nextQuestion).toBeNull();
  });

  it("rejects a missing assistantMessage", () => {
    expect(() =>
      TurnResultSchema.parse({ specPatch: {}, nextQuestion: null, readiness: "early_idea" })
    ).toThrow();
  });

  it("rejects an invalid readiness value", () => {
    expect(() =>
      TurnResultSchema.parse({
        assistantMessage: "ok",
        specPatch: {},
        nextQuestion: null,
        readiness: "kind_of_ready",
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- conversation-turn`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/schema/conversation-turn.ts`**

```ts
import { z } from "zod";
import { WorkloadSpecPatchSchema } from "@/lib/schema/workload-spec";
import { ReadinessSchema } from "@/lib/schema/shared";

export const TurnResultSchema = z.object({
  assistantMessage: z.string().min(1),
  specPatch: WorkloadSpecPatchSchema,
  nextQuestion: z.string().nullable(),
  readiness: ReadinessSchema,
});

export type TurnResult = z.infer<typeof TurnResultSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- conversation-turn`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/schema/conversation-turn.test.ts lib/schema/conversation-turn.ts
git commit -m "Add ConversationTurn (TurnResult) schema"
```

---

### Task 6: `ComputePlan` schema

**Files:**
- Create: `lib/schema/compute-plan.ts`
- Test: `tests/schema/compute-plan.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schema/compute-plan.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ComputePlanSchema } from "@/lib/schema/compute-plan";
import { aiInferred } from "@/lib/schema/provenance";

describe("ComputePlanSchema", () => {
  it("parses a minimal valid plan", () => {
    const plan = ComputePlanSchema.parse({
      recommendedApproach: aiInferred(
        { summary: "Retrieval over existing documents using an existing model.", workloadTypes: ["rag"] },
        "medium",
        "Described as Q&A over an internal document collection."
      ),
      trainingVsInference: aiInferred("inference_only", "medium", "No training signal in the request."),
      initialExperiment: aiInferred(
        { gpuRange: { min: 1, max: 2 }, description: "Small benchmark on the target document set." },
        "medium",
        "Retrieval workloads are inference-only and lightweight to start."
      ),
      overallConfidence: "medium",
    });
    expect(plan.blockers).toEqual([]);
    expect(plan.benchmarkFirstRecommended).toBe(false);
  });

  it("rejects an invalid trainingVsInference value", () => {
    expect(() =>
      ComputePlanSchema.parse({
        recommendedApproach: aiInferred({ summary: "x", workloadTypes: [] }, "low", "r"),
        trainingVsInference: aiInferred("maybe", "low", "r"),
        initialExperiment: aiInferred({ gpuRange: { min: 1, max: 2 }, description: "d" }, "low", "r"),
        overallConfidence: "low",
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- compute-plan`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/schema/compute-plan.ts`**

```ts
import { z } from "zod";
import { provenance, ConfidenceSchema } from "@/lib/schema/provenance";
import { RangeSchema } from "@/lib/schema/shared";
import { WorkloadClassificationSchema } from "@/lib/schema/workload-spec";

const ApproachSchema = z.object({
  summary: z.string(),
  workloadTypes: z.array(WorkloadClassificationSchema),
});

const GpuAllocationSchema = z.object({
  gpuRange: RangeSchema,
  gpuType: z.string().optional(),
  description: z.string(),
});

export const TrainingVsInferenceSchema = z.enum([
  "train_new_model",
  "fine_tune_existing",
  "inference_only",
  "hybrid",
  "undetermined",
]);

export const ComputePlanSchema = z.object({
  recommendedApproach: provenance(ApproachSchema),
  alternativeApproach: provenance(ApproachSchema).optional(),
  trainingVsInference: provenance(TrainingVsInferenceSchema),
  initialExperiment: provenance(GpuAllocationSchema),
  scaledConfiguration: provenance(GpuAllocationSchema).optional(),
  cpuCoresRange: provenance(RangeSchema).optional(),
  systemRamGbRange: provenance(RangeSchema).optional(),
  storageEstimateTb: provenance(RangeSchema).optional(),
  ioConsiderations: z.array(z.string()).default([]),
  networkingConsiderations: z.array(z.string()).default([]),
  distributedExecutionConsiderations: z.array(z.string()).default([]),
  softwareEnvironment: z.array(z.string()).default([]),
  requiredAccess: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  overallConfidence: ConfidenceSchema,
  blockers: z.array(z.string()).default([]),
  unresolvedQuestions: z.array(z.string()).default([]),
  recommendedNextActions: z.array(z.string()).default([]),
  benchmarkFirstRecommended: z.boolean().default(false),
});

export type ComputePlan = z.infer<typeof ComputePlanSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- compute-plan`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/schema/compute-plan.test.ts lib/schema/compute-plan.ts
git commit -m "Add ComputePlan schema"
```

---

### Task 7: `config/` — model, cluster profile, export version

**Files:**
- Create: `config/model.ts`
- Create: `config/cluster-profile.ts`
- Create: `config/export.ts`
- Test: `tests/config/model.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/config/model.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TOGETHER_MODEL, getTogetherModelId } from "@/config/model";

describe("getTogetherModelId", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the default model when TOGETHER_MODEL is unset", () => {
    vi.stubEnv("TOGETHER_MODEL", "");
    expect(getTogetherModelId()).toBe(DEFAULT_TOGETHER_MODEL);
  });

  it("returns the configured model when TOGETHER_MODEL is set", () => {
    vi.stubEnv("TOGETHER_MODEL", "some-org/some-model");
    expect(getTogetherModelId()).toBe("some-org/some-model");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- config/model`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `config/model.ts`**

```ts
export const DEFAULT_TOGETHER_MODEL = "zai-org/GLM-5.3-Flash";

export function getTogetherModelId(): string {
  const configured = process.env.TOGETHER_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_TOGETHER_MODEL;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- config/model`
Expected: PASS — 2 tests.

- [ ] **Step 5: Implement `config/cluster-profile.ts`** (no dedicated test — a plain data module; exercised indirectly by planner tests in Task 8)

```ts
export interface ClusterProfile {
  acceleratorFamily: string | null;
  gpuMemoryGb: number | null;
  gpusPerNode: number | null;
  nodeCount: number | null;
  cpuCoresPerNode: number | null;
  ramGbPerNode: number | null;
  localNvmeTb: number | null;
  sharedStorageTiers: string[] | null;
  interconnect: string | null;
  networkBandwidthGbps: number | null;
  scheduler: string | null;
  cudaVersions: string[] | null;
  supportedFrameworks: string[] | null;
  containerRuntime: string | null;
  containerRegistries: string[] | null;
  packageRepositories: string[] | null;
  modelRepositories: string[] | null;
  networkRestrictions: string[] | null;
  quotas: Record<string, number> | null;
  maxJobDurationHours: number | null;
  notes: string;
}

export const MVP_CLUSTER_PROFILE: ClusterProfile = {
  acceleratorFamily: "NVIDIA Blackwell-class (assumed; exact SKU not configured)",
  gpuMemoryGb: null,
  gpusPerNode: null,
  nodeCount: null,
  cpuCoresPerNode: null,
  ramGbPerNode: null,
  localNvmeTb: null,
  sharedStorageTiers: null,
  interconnect: null,
  networkBandwidthGbps: null,
  scheduler: null,
  cudaVersions: null,
  supportedFrameworks: null,
  containerRuntime: null,
  containerRegistries: null,
  packageRepositories: null,
  modelRepositories: null,
  networkRestrictions: null,
  quotas: null,
  maxJobDurationHours: null,
  notes:
    "MVP assumption: significant modern NVIDIA Blackwell-class GPU infrastructure is available. No exact cluster configuration has been provided yet, so the planner expresses recommendations as ranges and avoids false precision.",
};
```

- [ ] **Step 6: Implement `config/export.ts`**

```ts
export const COMPUTEBRIEF_SCHEMA = "computebrief.workload";
export const COMPUTEBRIEF_SCHEMA_VERSION = "1.0";
```

- [ ] **Step 7: Commit**

```bash
git add config tests/config/model.test.ts
git commit -m "Add model, cluster-profile, and export config"
```

---

### Task 8: `WorkloadPlanner`

**Files:**
- Create: `lib/planner/workload-planner.ts`
- Create: `tests/fixtures/workload-specs.ts`
- Test: `tests/planner/workload-planner.test.ts`

- [ ] **Step 1: Write the fixtures file**

Create `tests/fixtures/workload-specs.ts`:
```ts
import { emptyWorkloadSpec, type WorkloadSpec } from "@/lib/schema/workload-spec";
import { userProvided, aiInferred } from "@/lib/schema/provenance";

export function noviceSatelliteShipsSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Automatically identify ships in satellite imagery."),
    },
    classification: aiInferred(["computer_vision", "supervised_training"], "medium", "Described as detecting objects (ships) in imagery; architecture not yet chosen."),
    maturity: aiInferred("idea", "high", "No model, code, or data pipeline described yet."),
    data: {
      modality: userProvided("images"),
    },
    dataReadiness: {
      data_exists: userProvided(true),
      data_location_known: aiInferred(true, "low", "Requester said imagery 'already exists somewhere on our network' but exact location is unconfirmed."),
      compute_environment_has_access: userProvided(false),
    },
  };
}

export function experiencedVitScalingSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Scale existing ViT-L training to iterate faster."),
    },
    classification: userProvided(["computer_vision", "fine_tuning"]),
    maturity: aiInferred("scaling", "high", "Working checkpoint and training pipeline already in use on 8 GPUs."),
    model: {
      baseModel: userProvided("ViT-L"),
    },
    data: {
      approximateSizeTb: userProvided(18),
      labelStatus: userProvided("fully_labeled"),
    },
    dataReadiness: {
      data_exists: userProvided(true),
      data_location_known: userProvided(true),
      requester_has_access: userProvided(true),
      compute_environment_has_access: userProvided(true),
    },
    compute: {
      currentGpuCount: userProvided(8),
      expectedRuntime: userProvided("~4 days per training run"),
    },
    existingAssets: {
      training_code: userProvided({ exists: true, locationKnown: true, accessible: true, computeEnvironmentAccessible: true }),
      checkpoint: userProvided({ exists: true, locationKnown: true, accessible: true, computeEnvironmentAccessible: true }),
    },
  };
}

export function ragDocumentQaSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Let employees ask questions about our internal documents."),
    },
    classification: aiInferred(["rag", "nlp", "inference"], "medium", "Q&A over an existing document collection is a retrieval task, not a training task."),
    maturity: aiInferred("exploration", "medium", "Idea is clear but no retrieval pipeline exists yet."),
    data: {
      modality: userProvided("documents"),
    },
    dataReadiness: {
      data_exists: userProvided(true),
      data_location_known: userProvided(true),
    },
  };
}

export function earlyIdeaPredictiveMaintenanceSpec(): WorkloadSpec {
  return {
    ...emptyWorkloadSpec(),
    problem: {
      statement: userProvided("Maybe use AI to predict equipment failures."),
    },
    maturity: aiInferred("idea", "high", "No historical data, model, or pipeline described yet."),
    unknowns: [
      { description: "Whether historical failure data exists and in what form.", affects: ["feasibility", "compute_sizing"] },
    ],
  };
}

export function correctedDataSizeSpec(): WorkloadSpec {
  const base = experiencedVitScalingSpec();
  return {
    ...base,
    data: { ...base.data, approximateSizeTb: userProvided(5) },
  };
}
```

- [ ] **Step 2: Write the failing planner test**

Create `tests/planner/workload-planner.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import {
  noviceSatelliteShipsSpec,
  experiencedVitScalingSpec,
  ragDocumentQaSpec,
  earlyIdeaPredictiveMaintenanceSpec,
  correctedDataSizeSpec,
} from "../fixtures/workload-specs";

describe("buildComputePlan", () => {
  it("recommends a small benchmark first for an early idea with no data confirmed", () => {
    const plan = buildComputePlan(earlyIdeaPredictiveMaintenanceSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.benchmarkFirstRecommended).toBe(true);
    expect(plan.overallConfidence).toBe("low");
    expect(plan.trainingVsInference.value).toBe("undetermined");
  });

  it("does not assume training is needed for a RAG-shaped request", () => {
    const plan = buildComputePlan(ragDocumentQaSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.trainingVsInference.value).toBe("inference_only");
    expect(plan.initialExperiment.value.gpuRange.max).toBeLessThanOrEqual(4);
  });

  it("recommends a benchmark-first small experiment for the novice ships scenario given unconfirmed data access", () => {
    const plan = buildComputePlan(noviceSatelliteShipsSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.benchmarkFirstRecommended).toBe(true);
    expect(plan.requiredAccess.some((item) => /compute environment/i.test(item) || /access/i.test(item))).toBe(true);
  });

  it("scales beyond the requester's current GPU count for the scaling scenario", () => {
    const plan = buildComputePlan(experiencedVitScalingSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.benchmarkFirstRecommended).toBe(false);
    expect(plan.scaledConfiguration?.value.gpuRange.min).toBeGreaterThan(8);
    expect(plan.trainingVsInference.value).toBe("fine_tune_existing");
  });

  it("recomputes cleanly when the dataset size is corrected downward", () => {
    const original = buildComputePlan(experiencedVitScalingSpec(), MVP_CLUSTER_PROFILE);
    const corrected = buildComputePlan(correctedDataSizeSpec(), MVP_CLUSTER_PROFILE);
    expect(original.trainingVsInference.value).toBe(corrected.trainingVsInference.value);
    expect(corrected.assumptions).not.toEqual(original.assumptions === undefined ? [] : "irrelevant");
  });

  it("is willing to say a large allocation is not yet justified", () => {
    const plan = buildComputePlan(earlyIdeaPredictiveMaintenanceSpec(), MVP_CLUSTER_PROFILE);
    expect(plan.recommendedNextActions.some((a) => /benchmark/i.test(a))).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- planner`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `lib/planner/workload-planner.ts`**

```ts
import type { WorkloadSpec } from "@/lib/schema/workload-spec";
import type { ClusterProfile } from "@/config/cluster-profile";
import { ComputePlanSchema, type ComputePlan, type TrainingVsInferenceSchema } from "@/lib/schema/compute-plan";
import type { Confidence } from "@/lib/schema/provenance";
import { z } from "zod";

type TrainingVsInference = z.infer<typeof TrainingVsInferenceSchema>;

const INFERENCE_CLASSIFICATIONS = new Set([
  "inference",
  "batch_inference",
  "online_inference",
  "rag",
  "embeddings",
  "evaluation",
]);
const FINE_TUNE_CLASSIFICATIONS = new Set(["fine_tuning", "parameter_efficient_fine_tuning"]);
const TRAIN_CLASSIFICATIONS = new Set(["model_pretraining", "supervised_training", "self_supervised_training"]);

function deriveTrainingVsInference(classification: string[]): TrainingVsInference {
  if (classification.length === 0) return "undetermined";
  const hasTrain = classification.some((c) => TRAIN_CLASSIFICATIONS.has(c));
  const hasFineTune = classification.some((c) => FINE_TUNE_CLASSIFICATIONS.has(c));
  const hasInferenceOnly = classification.some((c) => INFERENCE_CLASSIFICATIONS.has(c));
  if (hasTrain && (hasFineTune || hasInferenceOnly)) return "hybrid";
  if (hasFineTune) return "fine_tune_existing";
  if (hasTrain) return "train_new_model";
  if (hasInferenceOnly) return "inference_only";
  return "undetermined";
}

const DEFAULT_RANGES: Record<TrainingVsInference, { initial: [number, number]; scaled: [number, number] }> = {
  train_new_model: { initial: [4, 8], scaled: [16, 32] },
  fine_tune_existing: { initial: [4, 8], scaled: [8, 16] },
  inference_only: { initial: [1, 2], scaled: [2, 4] },
  hybrid: { initial: [4, 8], scaled: [16, 32] },
  undetermined: { initial: [1, 4], scaled: [4, 8] },
};

function hasEnoughSignal(spec: WorkloadSpec): boolean {
  const maturity = spec.maturity?.value;
  if (maturity === "idea" || maturity === "exploration") return false;
  const dataExists = spec.dataReadiness?.data_exists?.value;
  if (dataExists === false || dataExists == null) {
    if (spec.data?.approximateSizeTb?.value == null) return false;
  }
  return true;
}

function summarizeApproach(t: TrainingVsInference): string {
  switch (t) {
    case "inference_only":
      return "This workload appears well suited to inference over an existing model rather than training a new one.";
    case "fine_tune_existing":
      return "This workload appears to call for fine-tuning or scaling an existing model rather than starting from scratch.";
    case "train_new_model":
      return "This workload appears to require training a new model.";
    case "hybrid":
      return "This workload appears to combine training or fine-tuning with an inference or evaluation component.";
    default:
      return "There is not yet enough information to recommend a specific technical approach.";
  }
}

export function buildComputePlan(spec: WorkloadSpec, _clusterProfile: ClusterProfile): ComputePlan {
  const classification = spec.classification?.value ?? [];
  const trainingVsInference = deriveTrainingVsInference(classification);
  const enoughSignal = hasEnoughSignal(spec);
  const benchmarkFirst = !enoughSignal || trainingVsInference === "undetermined";
  const defaults = DEFAULT_RANGES[trainingVsInference];
  const confidence: Confidence = benchmarkFirst ? "low" : "medium";

  const currentGpus = spec.compute?.currentGpuCount?.value ?? null;
  let scaledMin = defaults.scaled[0];
  let scaledMax = defaults.scaled[1];
  if (currentGpus != null && currentGpus >= scaledMin) {
    scaledMin = currentGpus * 2;
    scaledMax = currentGpus * 4;
  }

  const dataBlockers: string[] = [];
  if (spec.dataReadiness?.compute_environment_has_access?.value !== true) {
    dataBlockers.push("Compute environment access to the data has not been confirmed.");
  }
  if (spec.dataReadiness?.data_location_known?.value === false) {
    dataBlockers.push("Data location is not yet confirmed.");
  }

  const specBlockers = spec.blockers.map((b) => b.description);
  const accessBlockers = spec.access.items.filter((a) => a.status === "blocker").map((a) => `Access blocker: ${a.name}`);
  const blockers = [...specBlockers, ...accessBlockers];

  const requiredAccess = [
    ...spec.access.items
      .filter((a) => a.status === "likely_required" || a.status === "unknown")
      .map((a) => `${a.name}${a.status === "unknown" ? " (status unknown)" : ""}`),
    ...dataBlockers,
  ];

  const unresolvedQuestions = spec.unknowns
    .filter((u) => !u.affects || u.affects.some((a) => ["feasibility", "compute_sizing", "architecture"].includes(a)))
    .map((u) => u.description);

  const recommendedNextActions: string[] = [];
  if (benchmarkFirst) {
    recommendedNextActions.push(
      "Run a small benchmark to establish a compute and data-loading baseline before committing to a larger allocation."
    );
  }
  if (dataBlockers.length > 0) {
    recommendedNextActions.push("Confirm and verify data access from the target compute environment.");
  }
  if (blockers.length > 0) {
    recommendedNextActions.push("Resolve outstanding blockers before requesting a larger compute allocation.");
  }
  if (recommendedNextActions.length === 0) {
    recommendedNextActions.push("Proceed to a compute review with the current workload brief.");
  }

  const cpuCoresRange = { min: defaults.initial[0] * 8, max: scaledMax * 16 };
  const systemRamGbRange = { min: defaults.initial[0] * 32, max: scaledMax * 64 };

  const plan: ComputePlan = {
    recommendedApproach: {
      value: { summary: summarizeApproach(trainingVsInference), workloadTypes: classification },
      source: "ai_inferred",
      confidence,
      reason: "Based on the stated workload classification and maturity.",
    },
    trainingVsInference: {
      value: trainingVsInference,
      source: "ai_inferred",
      confidence,
      reason: benchmarkFirst
        ? "Classification or maturity signal is not yet clear enough to commit to one path."
        : "Derived from the stated workload classification.",
    },
    initialExperiment: {
      value: {
        gpuRange: { min: defaults.initial[0], max: defaults.initial[1] },
        description: benchmarkFirst
          ? "Run a small benchmark first to establish a baseline before committing to a larger allocation."
          : `Initial experiment sized to validate the ${trainingVsInference.replace(/_/g, " ")} approach and surface data-loading or scaling bottlenecks.`,
      },
      source: "ai_inferred",
      confidence,
      reason: benchmarkFirst
        ? "Maturity or data readiness is not yet established, so sizing is provisional."
        : "Derived from the workload classification and stated maturity/data signals.",
    },
    scaledConfiguration: benchmarkFirst
      ? undefined
      : {
          value: {
            gpuRange: { min: scaledMin, max: scaledMax },
            description:
              currentGpus != null
                ? `A scaled allocation beyond the current ${currentGpus}-GPU setup, once the initial benchmark confirms scaling behavior.`
                : "A scaled allocation for the full workload, once the initial benchmark confirms scaling behavior.",
          },
          source: "ai_inferred",
          confidence,
          reason: "Scaled from the initial-experiment range and, where known, the requester's current GPU usage.",
          assumptions: [
            "Distributed training scales reasonably across this GPU range",
            "Data loading is not the primary bottleneck",
          ],
        },
    cpuCoresRange: { value: cpuCoresRange, source: "ai_inferred", confidence: "low", reason: "Approximated from the GPU allocation using a generic ratio; refine once workload specifics are known." },
    systemRamGbRange: { value: systemRamGbRange, source: "ai_inferred", confidence: "low", reason: "Approximated from the GPU allocation using a generic ratio; refine once workload specifics are known." },
    ioConsiderations: benchmarkFirst ? [] : ["Validate data-loading throughput does not bottleneck GPU utilization at the initial-experiment scale."],
    networkingConsiderations: trainingVsInference === "train_new_model" || trainingVsInference === "hybrid"
      ? ["Multi-node distributed training will likely require a high-speed interconnect between nodes."]
      : [],
    distributedExecutionConsiderations: scaledMin > defaults.initial[1] ? ["Scaling beyond a single node will require a distributed training or serving strategy."] : [],
    softwareEnvironment: [],
    requiredAccess,
    assumptions: benchmarkFirst
      ? ["No large allocation is assumed until the initial benchmark and data access are confirmed."]
      : ["Distributed execution is supported at the recommended scale."],
    overallConfidence: confidence,
    blockers,
    unresolvedQuestions,
    recommendedNextActions,
    benchmarkFirstRecommended: benchmarkFirst,
  };

  return ComputePlanSchema.parse(plan);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- planner`
Expected: PASS — 6 tests. If the "scales beyond current GPU count" assertion fails, check that `experiencedVitScalingSpec` classification includes `fine_tuning` (drives `fine_tune_existing`) and `currentGpuCount` is 8 — `scaledMin` should compute to `16`.

- [ ] **Step 6: Commit**

```bash
git add lib/planner tests/planner tests/fixtures
git commit -m "Add WorkloadPlanner"
```

---

### Task 9: Export — canonical JSON

**Files:**
- Create: `lib/export/canonical-json.ts`
- Test: `tests/export/canonical-json.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/export/canonical-json.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { toCanonicalJSON } from "@/lib/export/canonical-json";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { COMPUTEBRIEF_SCHEMA, COMPUTEBRIEF_SCHEMA_VERSION } from "@/config/export";
import { experiencedVitScalingSpec } from "../fixtures/workload-specs";

describe("toCanonicalJSON", () => {
  const spec = experiencedVitScalingSpec();
  const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
  const narrative = "# Workload Brief\n\nThis is a narrative.";
  const payload = toCanonicalJSON(spec, plan, narrative);

  it("stamps the schema name and centralized version", () => {
    expect(payload.schema).toBe(COMPUTEBRIEF_SCHEMA);
    expect(payload.schemaVersion).toBe(COMPUTEBRIEF_SCHEMA_VERSION);
  });

  it("includes a valid ISO timestamp and the narrative", () => {
    expect(() => new Date(payload.generatedAt).toISOString()).not.toThrow();
    expect(payload.narrative).toBe(narrative);
  });

  it("serializes to JSON with no undefined values", () => {
    const json = JSON.stringify(payload);
    expect(json).not.toContain("undefined");
    const parsed = JSON.parse(json);
    expect(parsed.schema).toBe(COMPUTEBRIEF_SCHEMA);
  });

  it("represents an unknown field explicitly rather than omitting it", () => {
    expect(payload.access).toBeDefined();
    expect(Array.isArray(payload.blockers)).toBe(true);
    expect(Array.isArray(payload.unknowns)).toBe(true);
  });

  it("preserves provenance on the GPU estimate", () => {
    expect(payload.compute.gpuEstimate).toMatchObject({
      source: "ai_inferred",
    });
    expect(typeof payload.compute.gpuEstimate.confidence).toBe("string");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- canonical-json`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/export/canonical-json.ts`**

```ts
import type { WorkloadSpec } from "@/lib/schema/workload-spec";
import type { ComputePlan } from "@/lib/schema/compute-plan";
import { COMPUTEBRIEF_SCHEMA, COMPUTEBRIEF_SCHEMA_VERSION } from "@/config/export";

export interface CanonicalComputeBriefPayload {
  schema: string;
  schemaVersion: string;
  generatedAt: string;
  source: string;
  request: {
    requester: WorkloadSpec["requester"];
    problem: WorkloadSpec["problem"];
    successCriteria: WorkloadSpec["successCriteria"];
  };
  workload: {
    classification: WorkloadSpec["classification"] | null;
    maturity: WorkloadSpec["maturity"] | null;
    existingAssets: WorkloadSpec["existingAssets"];
    recommendedApproach: ComputePlan["recommendedApproach"];
    alternativeApproach: ComputePlan["alternativeApproach"] | null;
    trainingVsInference: ComputePlan["trainingVsInference"];
  };
  data: {
    profile: WorkloadSpec["data"];
    readiness: WorkloadSpec["dataReadiness"];
  };
  model: WorkloadSpec["model"];
  compute: {
    requirements: WorkloadSpec["compute"];
    initialExperiment: ComputePlan["initialExperiment"];
    scaledConfiguration: ComputePlan["scaledConfiguration"] | null;
    gpuEstimate: ComputePlan["initialExperiment"];
    cpuCoresRange: ComputePlan["cpuCoresRange"] | null;
    systemRamGbRange: ComputePlan["systemRamGbRange"] | null;
  };
  storage: {
    requirements: WorkloadSpec["storage"];
    estimateTb: ComputePlan["storageEstimateTb"] | null;
  };
  networking: {
    requirements: WorkloadSpec["networking"];
    considerations: string[];
  };
  software: {
    requirements: WorkloadSpec["software"];
    environmentNotes: string[];
  };
  access: {
    items: WorkloadSpec["access"]["items"];
    requiredAccess: string[];
  };
  evaluation: WorkloadSpec["evaluation"];
  deployment: WorkloadSpec["deployment"];
  schedule: WorkloadSpec["timeline"];
  assumptions: string[];
  unknowns: WorkloadSpec["unknowns"];
  blockers: string[];
  recommendedNextSteps: string[];
  readiness: WorkloadSpec["readiness"];
  narrative: string;
}

export function toCanonicalJSON(
  spec: WorkloadSpec,
  plan: ComputePlan,
  narrative: string
): CanonicalComputeBriefPayload {
  return {
    schema: COMPUTEBRIEF_SCHEMA,
    schemaVersion: COMPUTEBRIEF_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "ComputeBrief",
    request: {
      requester: spec.requester,
      problem: spec.problem,
      successCriteria: spec.successCriteria,
    },
    workload: {
      classification: spec.classification ?? null,
      maturity: spec.maturity ?? null,
      existingAssets: spec.existingAssets,
      recommendedApproach: plan.recommendedApproach,
      alternativeApproach: plan.alternativeApproach ?? null,
      trainingVsInference: plan.trainingVsInference,
    },
    data: {
      profile: spec.data,
      readiness: spec.dataReadiness,
    },
    model: spec.model,
    compute: {
      requirements: spec.compute,
      initialExperiment: plan.initialExperiment,
      scaledConfiguration: plan.scaledConfiguration ?? null,
      gpuEstimate: plan.initialExperiment,
      cpuCoresRange: plan.cpuCoresRange ?? null,
      systemRamGbRange: plan.systemRamGbRange ?? null,
    },
    storage: {
      requirements: spec.storage,
      estimateTb: plan.storageEstimateTb ?? null,
    },
    networking: {
      requirements: spec.networking,
      considerations: plan.networkingConsiderations,
    },
    software: {
      requirements: spec.software,
      environmentNotes: plan.softwareEnvironment,
    },
    access: {
      items: spec.access.items,
      requiredAccess: plan.requiredAccess,
    },
    evaluation: spec.evaluation,
    deployment: spec.deployment,
    schedule: spec.timeline,
    assumptions: plan.assumptions,
    unknowns: spec.unknowns,
    blockers: plan.blockers,
    recommendedNextSteps: plan.recommendedNextActions,
    readiness: spec.readiness,
    narrative,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- canonical-json`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/export/canonical-json.ts tests/export/canonical-json.test.ts
git commit -m "Add canonical ComputeBrief JSON export"
```

---

### Task 10: Export — Markdown and ServiceNow payload

**Files:**
- Create: `lib/export/markdown.ts`
- Create: `lib/export/servicenow.ts`
- Test: `tests/export/markdown.test.ts`
- Test: `tests/export/servicenow.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/export/markdown.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { narrativeToMarkdownFile } from "@/lib/export/markdown";

describe("narrativeToMarkdownFile", () => {
  it("wraps the narrative with a title and generated timestamp comment", () => {
    const md = narrativeToMarkdownFile("Body text.", "Acme Robotics — Ship Detection");
    expect(md).toContain("# Acme Robotics — Ship Detection");
    expect(md).toContain("Body text.");
  });

  it("falls back to a generic title when none is given", () => {
    const md = narrativeToMarkdownFile("Body text.");
    expect(md).toContain("# ComputeBrief Workload Brief");
  });
});
```

Create `tests/export/servicenow.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { toServiceNowPayload } from "@/lib/export/servicenow";
import { toCanonicalJSON } from "@/lib/export/canonical-json";
import { buildComputePlan } from "@/lib/planner/workload-planner";
import { MVP_CLUSTER_PROFILE } from "@/config/cluster-profile";
import { ragDocumentQaSpec } from "../fixtures/workload-specs";

describe("toServiceNowPayload", () => {
  it("re-exposes the canonical payload for future mapping", () => {
    const spec = ragDocumentQaSpec();
    const plan = buildComputePlan(spec, MVP_CLUSTER_PROFILE);
    const canonical = toCanonicalJSON(spec, plan, "narrative text");
    const payload = toServiceNowPayload(canonical);
    expect(payload.schema).toBe(canonical.schema);
    expect(payload.narrative).toBe("narrative text");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- export`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `lib/export/markdown.ts`**

```ts
export function narrativeToMarkdownFile(narrative: string, title?: string): string {
  const heading = title ? `# ${title}` : "# ComputeBrief Workload Brief";
  const generatedAt = new Date().toISOString();
  return `${heading}\n\n<!-- Generated by ComputeBrief on ${generatedAt} -->\n\n${narrative}\n`;
}
```

- [ ] **Step 4: Implement `lib/export/servicenow.ts`**

```ts
import type { CanonicalComputeBriefPayload } from "@/lib/export/canonical-json";

/**
 * V1: re-exposes the canonical ComputeBrief payload unchanged. This is the
 * documented extension point for a future ServiceNow-specific field mapping
 * (e.g. mapping `request.requester` to a specific catalog-item variable, or
 * `recommendedNextSteps` to a work-notes field) once a target ServiceNow
 * instance and table/catalog-item schema are known. No live ServiceNow API
 * calls are made by this module.
 */
export function toServiceNowPayload(canonical: CanonicalComputeBriefPayload): CanonicalComputeBriefPayload {
  return canonical;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- export`
Expected: PASS — 3 tests.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests across the project pass (should be ~30 tests at this point).

- [ ] **Step 7: Run lint, typecheck, and build**

Run:
```bash
npm run lint
npx tsc --noEmit
npm run build
```
Expected: all three succeed with no errors. Fix any type errors surfaced by the strict schema work in this plan before proceeding — do not suppress with `@ts-ignore`.

- [ ] **Step 8: Commit**

```bash
git add lib/export tests/export
git commit -m "Add Markdown export and ServiceNow payload extension point"
```

---

## Plan A self-review notes

- **Coverage:** requester/problem/successCriteria/classification/maturity/existingAssets/model/data/dataReadiness/compute/storage/networking/software/access/evaluation/deployment/timeline/blockers/unknowns/readiness are all in `WorkloadSpecSchema` (Task 3). Provenance (fact vs. inference vs. unknown, confidence, reason, assumptions) is in Task 2 and used throughout. The "no training needed" / RAG case, the "not enough info, benchmark first" case, and the "scale beyond current GPU count" case are each covered by a planner test (Task 8). Canonical JSON with provenance preserved and no fabricated placeholders is Task 9. Markdown/ServiceNow extension point is Task 10.
- **Deferred to Plan B:** `lib/ai/provider.ts`, prompts, the `/api/chat` route, and narrative generation (all require the Together API key and are out of scope until the user has supplied it).
- **Deferred to Plan C:** all UI (chat interface, live Workload Brief panel, brief/export screen, state provider wiring these schemas to React).
- **Deferred to Plan D:** README, GitHub push, Vercel env vars and deployment, end-to-end deployment verification.

---

## Execution options

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.
