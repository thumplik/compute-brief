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
