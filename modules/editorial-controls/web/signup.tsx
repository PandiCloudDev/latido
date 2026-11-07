import { useEffect, useState } from "react";
import { data, Form, Link, useActionData, useLoaderData, useLocation, useNavigation, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { API_BASE_URL, apiGet } from "@aihot/web/lib/api.server";
import { pageMeta } from "@aihot/web/lib/seo";
import { WEEKLY_RSS, type EditorialDisplay } from "../types.ts";

export const headers = () => ({
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
});
export const meta = () => pageMeta({
  title: "Boletín por correo", description: "Suscríbete al boletín semanal de Latido.", path: "/boletin", noindex: true,
});

function intentOf(value: string | undefined) {
  if (value === undefined) return "signup";
  if (value === "confirmar") return "confirm";
  if (value === "baja") return "unsubscribe";
  throw data(null, { status: 404 });
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const intent = intentOf(params.intent);
  const open = intent !== "signup" || !!(await apiGet<EditorialDisplay>("/api/site/editorial-display", { signal: request.signal }).catch(() => null))?.signupUrl;
  return { intent, open };
}

const button = "inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-4 text-[14px] font-bold text-accent-contrast hover:opacity-90 disabled:opacity-50";
const inlineLink = "font-bold text-editorial-blue underline underline-offset-4";

export async function action({ params, request }: ActionFunctionArgs) {
  const intent = intentOf(params.intent);
  const allowed = request.headers.get("sec-fetch-site") !== "cross-site" &&
    (!request.headers.has("origin") || request.headers.get("origin") === new URL(request.url).origin);
  if (!allowed) return data({ ok: false, message: "Abre el formulario directamente desde Latido." }, { status: 403 });
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded") || Number(request.headers.get("content-length")) > 2048) {
    return data({ ok: false, message: "El formulario no es válido." }, { status: 400 });
  }
  const form = await request.formData();
  const payload = intent === "signup"
    ? { email: String(form.get("email") ?? ""), website: String(form.get("website") ?? "") }
    : { token: String(form.get("token") ?? "") };
  const res = await fetch(`${API_BASE_URL}/api/site/newsletter/${intent}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!res || res.status >= 500) {
    return data({ ok: false, message: "No pudimos procesar la solicitud. Vuelve a intentarlo más tarde." }, { status: 503 });
  }
  const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
  if (!res.ok || !body?.ok) {
    const message = intent === "signup" ? "Revisa que la dirección de correo esté bien escrita."
      : intent === "confirm" ? "El enlace ya se usó o venció. Si aún no confirmaste, vuelve a solicitar el boletín."
        : "El enlace de baja no está completo. Ábrelo de nuevo desde el boletín.";
    return data({ ok: false, message }, { status: 400 });
  }
  const message = intent === "signup" ? "Si la dirección es nueva, revisa tu bandeja y confirma con el enlace que te enviamos. También puedes buscarlo en correo no deseado."
    : intent === "confirm" ? "Tu suscripción está confirmada. Recibirás la próxima edición semanal."
      : "La baja está lista. Puedes volver a suscribirte cuando quieras.";
  return { ok: true, message };
}

export default function NewsletterSignup() {
  const { intent, open } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== "idle";
  const { pathname } = useLocation();
  const [token, setToken] = useState("");
  useEffect(() => {
    setToken(window.location.hash.slice(1));
  }, [pathname]);
  const title = intent === "signup" ? "Recibe el boletín de Latido"
    : intent === "confirm" ? "Confirma tu suscripción" : "Cancela tu suscripción";
  return (
    <main className="mx-auto min-h-[55vh] w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="rounded-card border border-line border-t-[3px] border-t-editorial-blue bg-surface p-5 sm:p-8">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-editorial-blue">Latido semanal</p>
        <h1 className="text-[28px] font-bold leading-tight text-ink sm:text-[34px]">{title}</h1>
        {result && <p role={result.ok ? "status" : "alert"} className="mt-4 rounded-control border border-line p-3 text-[14px] text-ink">{result.message}</p>}
        {intent === "signup" && (open ? !result?.ok && (
          <Form method="post" className="mt-4 space-y-4">
            <p className="text-[15px] leading-relaxed text-ink-3">Cada semana, una selección de noticias y contexto. Te enviaremos un enlace para confirmar tu correo.</p>
            <label className="block text-[14px] font-bold text-ink" htmlFor="newsletter-email">Tu correo electrónico</label>
            <input id="newsletter-email" name="email" type="email" autoComplete="email" maxLength={254} required className="block min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink" />
            <div className="hidden" aria-hidden="true"><label>Deja este campo vacío<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <p className="text-[13px] leading-relaxed text-ink-3">Puedes darte de baja desde cualquier edición. Consulta el <Link className={inlineLink} to="/privacy">aviso de privacidad</Link>.</p>
            <button className={button} disabled={busy}>{busy ? "Enviando…" : "Enviarme el enlace"}</button>
          </Form>
        ) : <p className="mt-4 text-[15px] text-ink-3">La suscripción por correo todavía no está disponible. Ya puedes leer la edición semanal o seguirla por RSS.</p>)}
        {intent !== "signup" && !result?.ok && (
          <Form method="post" className="mt-4 space-y-4">
            <p className="text-[15px] text-ink-3">{intent === "confirm" ? "Confirma que quieres recibir una edición por semana." : "Confirma que quieres dejar de recibir el boletín."}</p>
            <input type="hidden" name="token" value={token} />
            <button className={button} disabled={busy || !token}>{intent === "confirm" ? "Confirmar suscripción" : "Dar de baja mi correo"}</button>
            <noscript><p>Activa JavaScript y vuelve a abrir el enlace del correo.</p></noscript>
            {intent === "confirm" && result && <p><Link to="/boletin" className={inlineLink}>Solicitar un enlace nuevo</Link></p>}
          </Form>
        )}
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-[14px]">
          <Link className={inlineLink} to="/weekly">Leer el boletín semanal</Link>
          <a className={inlineLink} href={WEEKLY_RSS}>Seguir vía RSS</a>
        </div>
      </section>
    </main>
  );
}
