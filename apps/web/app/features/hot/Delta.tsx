import type { HotEntryView } from "@aihot/contracts/site";

/** Change against six hours before the ranking: up in the hot tone, down quiet, new stories marked new, none while sources are behind. */
export function Delta({ trend, pct, className = "" }: { trend: HotEntryView["trend"]; pct: number | null; className?: string }) {
  const base = `inline-flex h-[22px] shrink-0 items-center gap-0.5 rounded-full px-2 text-[11.5px] font-medium tabular-nums ${className}`;
  if (trend === "unknown") return <span className={`${base} bg-well text-ink-4`} title="Algunas fuentes van atrasadas; por ahora no se compara con hace 6 horas">Sin comparación</span>;
  if (trend === "new" || pct === null) return <span className={`${base} bg-accent-soft text-accent`}>Nuevo en el ranking</span>;
  if (trend === "flat") return <span className={`${base} bg-well text-ink-4`} title="Frente a hace 6 horas">Igual</span>;
  const up = trend === "up";
  return (
    <span className={`${base} ${up ? "bg-hot-soft text-hot" : "bg-well text-ink-4"}`} title="Frente a hace 6 horas">
      {up ? "↑" : "↓"} {Math.abs(Math.round(pct))}%
    </span>
  );
}
