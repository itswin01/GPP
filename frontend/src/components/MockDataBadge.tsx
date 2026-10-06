import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marks any surface rendering lib/mock-analytics data.
 *
 * The dashboard numbers are illustrative, not measured — the backend stores
 * no student attempts. Showing them unlabelled next to the solver's real,
 * verified output would blur the line between the two, so every mock surface
 * carries this.
 */
export function MockDataBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10",
          "px-2 py-0.5 text-[11px] font-medium text-amber-700",
          className,
        )}
        title="Illustrative data — the backend does not store student attempts yet"
      >
        <Info className="h-3 w-3" />
        Sample data
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="text-sm text-amber-800">
        <span className="font-semibold">Sample data.</span> These analytics are illustrative.
        Attempt history is not yet persisted, so no figure here was measured from a real student.
        The solver's answers, by contrast, are computed and verified live.
      </p>
    </div>
  );
}
