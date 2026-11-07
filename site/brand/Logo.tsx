// La marca de Latido: el ícono del pulso y el nombre "latido.news" (size es la altura en píxeles).
// RingMark es la marca pequeña; al girar es la animación de carga.
import { SITE } from "../site.ts";

/** El ícono: un cuadro redondeado con el trazo de un latido. */
export function PulseMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="latido-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4d63" />
          <stop offset="1" stopColor="#c8213d" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#latido-mark)" />
      <path d="M76 280H170L202 226L236 330L280 136L326 374L360 280H436" fill="none" stroke="#ffffff" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  return (
    <span className={`inline-flex items-center leading-none ${className}`} style={{ fontSize: Math.round(size * 0.92) }} aria-label={title} role="img">
      <PulseMark size={Math.round(size * 1.08)} className="mr-[0.32em] shrink-0" />
      <span aria-hidden="true" className="font-black tracking-[-0.035em]">latido</span>
      <span aria-hidden="true" className="font-semibold tracking-[-0.02em] text-accent">.news</span>
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
