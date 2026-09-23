import type { Provenance } from "@/lib/schema/provenance";
import { Badge } from "@/components/ui/badge";

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null);
    if (entries.length === 0) return "";
    return entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(", ");
  }
  return String(value);
}

export function ProvenanceRow<T>({ label, field }: { label: string; field?: Provenance<T> | null }) {
  if (!field) return null;

  if (field.source === "unknown" || field.value == null) {
    return (
      <div className="flex items-start justify-between gap-3 py-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-xs italic text-muted-foreground">Unknown</span>
      </div>
    );
  }

  return (
    <div className="py-1.5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right font-medium">{formatValue(field.value)}</span>
      </div>
      <div className="mt-1 flex items-center justify-end gap-1.5">
        {field.source === "user_provided" ? (
          <Badge variant="secondary" className="text-[10px]">
            User provided
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            AI inferred{field.confidence ? ` · ${field.confidence} confidence` : ""}
          </Badge>
        )}
      </div>
      {field.reason && <p className="mt-1 text-xs text-muted-foreground">{field.reason}</p>}
      {field.assumptions && field.assumptions.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          {field.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
