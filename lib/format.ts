import type { Range } from "@/lib/schema/shared";

export function formatRange(range: Range | null | undefined, unit: string): string | null {
  if (!range || (range.min == null && range.max == null)) return null;
  if (range.min != null && range.max != null) {
    return range.min === range.max ? `${range.min} ${unit}` : `${range.min}–${range.max} ${unit}`;
  }
  const value = range.min ?? range.max;
  return `${value}+ ${unit}`;
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
