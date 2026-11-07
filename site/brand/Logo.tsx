// La marca editorial de Latido; size es la altura en píxeles.
import { SITE } from "../site.ts";
import { EDITORIAL_MARK_PATH } from "./identity.ts";

export function EditorialMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d={EDITORIAL_MARK_PATH} fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  return (
    <span className={`inline-flex items-baseline font-brand leading-none ${className}`} style={{ fontSize: Math.round(size * 0.92) }} aria-label={title} role="img">
      <EditorialMark size={Math.round(size * 1.08)} className="mr-[0.32em] shrink-0 self-center text-accent" />
      <span aria-hidden="true" className="font-black tracking-[-0.035em]">Latido</span>
      <span aria-hidden="true" className="text-[0.69em] font-bold tracking-[-0.02em] text-accent">.news</span>
    </span>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}
