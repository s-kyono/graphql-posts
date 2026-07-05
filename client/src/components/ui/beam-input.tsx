import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function BeamInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className={cn("beam-wrapper relative rounded-lg", className)}>
      <Input {...props} className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input" />
      <span className="beam-border" />
    </div>
  );
}
