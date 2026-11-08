import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ADSENSE_CLIENT, ADSENSE_SCRIPT, WEEKLY_RSS, type EditorialDisplay } from "../types.ts";

const button = "inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-[14px] font-bold text-accent-contrast hover:opacity-90";
const link = "inline-flex min-h-11 items-center text-[14px] font-bold text-editorial-blue hover:underline";

export function WeeklySignup({ signupUrl, onWeeklyPage = false }: { signupUrl: string | null; onWeeklyPage?: boolean }) {
  return (
    <section aria-label="El boletín de Latido" className="mb-5 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line border-t-[3px] border-t-editorial-blue bg-surface px-4 py-4 lg:mt-0 lg:px-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-editorial-blue">El boletín de Latido</p>
        <h2 className="mt-1 text-[20px] font-bold leading-tight text-ink">{signupUrl ? "Lo importante de la semana, en tu correo." : "Lo importante de la semana, en contexto."}</h2>
        <p className="mt-1 text-[14px] text-ink-3">Qué pasó, por qué importa y qué conviene seguir.</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {signupUrl && <Link to={signupUrl} className={button}>Suscribirme por correo</Link>}
        {!onWeeklyPage && <Link to="/weekly" className={signupUrl ? link : button}>Leer el boletín semanal</Link>}
        <a href={WEEKLY_RSS} className={link}>Seguir vía RSS</a>
      </div>
    </section>
  );
}

const adLabel = "text-[11px] font-bold uppercase tracking-[0.12em] text-amber-ink";

function AdSenseSlot({ slot }: { slot: string }) {
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    const ads = window as Window & { adsbygoogle?: { push: (request: Record<string, never>) => unknown } };
    try { (ads.adsbygoogle ??= []).push({}); } catch { /* Ad delivery must not interrupt the page. */ }
  }, []);
  return (
    <aside aria-label="Publicidad" className="mb-5 min-w-0 rounded-card border border-line bg-surface px-4 py-4 lg:px-5">
      <p className={adLabel}>Publicidad</p>
      <script async src={ADSENSE_SCRIPT} crossOrigin="anonymous" />
      <ins className="adsbygoogle mt-2" style={{ display: "block" }} data-ad-client={ADSENSE_CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}

export function SponsorSlot({ ad }: { ad: EditorialDisplay["ad"] }) {
  if (!ad) return null;
  if (ad.mode === "adsense") return <AdSenseSlot key={ad.slot} slot={ad.slot} />;
  return (
    <aside aria-label="Publicidad" className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-card border border-line bg-surface px-4 py-4 lg:px-5">
      <div className="min-w-0">
        <p className={adLabel}>Publicidad</p>
        <p className="mt-1 break-words font-bold text-ink">{ad.advertiser}</p>
        <p className="mt-1 break-words text-[14px] text-ink-3">{ad.text}</p>
      </div>
      <a href={ad.url} rel="sponsored noreferrer" className={link}>{ad.action}</a>
    </aside>
  );
}
