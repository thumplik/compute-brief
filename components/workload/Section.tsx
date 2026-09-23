import type { ReactNode } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-sm font-semibold">{title}</AccordionTrigger>
      <AccordionContent>
        <div className="divide-y">{items}</div>
      </AccordionContent>
    </AccordionItem>
  );
}
