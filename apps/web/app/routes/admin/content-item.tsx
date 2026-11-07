import { SITE } from "@aihot/site";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import type { Route } from "./+types/content-item";
import type { AdminContentChain, AdminPresentationRefresh } from "@aihot/contracts/admin";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { bj, money } from "../../features/admin/format";
import { KIND_LABEL, MODE_LABEL, VISIBILITY_LABEL } from "../../features/admin/labels";
import { AdminPage, Badge, Button, Card, Empty, Field, Input, Json, KV, ReasonDialog, Select, Textarea } from "../../features/admin/ui";


export async function loader({ request, params }: Route.LoaderArgs) {
  return adminGet<AdminContentChain>(request, `/api/admin/content/${encodeURIComponent(params.id)}`);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [{ title: `${loaderData?.publication?.title ?? loaderData?.article.title ?? "Contenido"} · ${SITE.name} Panel` }];

function Step({ title, meta, children, tone = "accent", last }: { title: ReactNode; meta?: ReactNode; children: ReactNode; tone?: "accent" | "muted" | "bad"; last?: boolean }) {
  const dot = tone === "bad" ? "bg-hot" : tone === "muted" ? "bg-ink-4" : "bg-accent";
  return (
    <li className="relative pl-7">
      {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-line-strong" aria-hidden />}
      <span className={`absolute left-[3px] top-[7px] size-[9px] rounded-full ring-4 ring-bg ${dot}`} aria-hidden />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-[13.5px] font-semibold text-ink">{title}</h3>
        {meta && <div className="text-[12px] text-ink-4">{meta}</div>}
      </div>
      <div className="mt-2 pb-6 text-[13px] text-ink-2">{children}</div>
    </li>
  );
}

type Dialog = null | "visibility" | "seo" | "override" | "analyze" | "extract" | "presentation" | "group" | "detach" | "merge";

export default function ContentItem({ loaderData }: Route.ComponentProps) {
  const c = loaderData;
  const a = c.article;
  const p = c.publication;
  const { run, pending } = useAdminAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [presentation, setPresentation] = useState<AdminPresentationRefresh | null>(null);
  const [visibility, setVisibility] = useState<string>(p?.visibility ?? "public");
  const [fields, setFields] = useState({ title: "", summary: "", reason: "", category: "", tags: "", scoreMode: "", score: "", selected: "", silent: "" });
  const [mergeInto, setMergeInto] = useState("");
  const version = c.override?.version ?? 0;
  const base = `/api/admin/content/${encodeURIComponent(a.id)}`;
  const story = c.membership[0];
  const title = p?.title ?? a.title;

  const openOverride = () => {
    const f = (c.override?.fields ?? {}) as Record<string, unknown>;
    setFields({
      title: String(f.title ?? ""),
      summary: String(f.summary ?? ""),
      reason: String(f.reason ?? ""),
      category: String(f.category ?? ""),
      tags: Array.isArray(f.tags) ? (f.tags as string[]).join(", ") : "",
      scoreMode: f.score === null ? "none" : typeof f.score === "number" ? "value" : "",
      score: typeof f.score === "number" ? String(f.score) : "",
      selected: f.selected === undefined ? "" : String(f.selected),
      silent: f.silent === undefined ? "" : String(f.silent),
    });
    setDialog("override");
  };

  return (
    <AdminPage
      title={<span className="line-clamp-2">{title}</span>}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[12px]">{a.id}</span>
          <span>·</span>
          <Link className="hover:text-accent" to={`/admin/sources/${encodeURIComponent(a.source_id)}`}>{a.source_name}</Link>
          <span>·</span>
          <a className="max-w-[420px] truncate hover:text-accent" href={a.url} target="_blank" rel="noreferrer">{a.url}</a>
          {p?.visibility !== "withdrawn" && p && (
            <>
              <span>·</span>
              <a className="text-accent" href={`/items/${a.id}`} target="_blank" rel="noreferrer">Página pública</a>
            </>
          )}
        </span>
      }
      actions={
        <>
          <Button onClick={() => setDialog("visibility")}>Visibilidad</Button>
          {p && <Button onClick={() => setDialog("seo")}>{p.indexable ? "Quitar indexación" : "Marcar para indexar"}</Button>}
          <Button onClick={openOverride}>Corrección manual</Button>
          <Button onClick={() => { setPresentation(null); setDialog("presentation"); }}>Actualizar el texto</Button>
          <Button onClick={() => setDialog("analyze")}>Reevaluar</Button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-1.5">
        {p ? <Badge tone={p.visibility === "public" ? "ok" : "warn"}>{VISIBILITY_LABEL[p.visibility] ?? p.visibility}</Badge> : <Badge>No pública</Badge>}
        {p?.selected && <Badge tone="accent">Destacadas</Badge>}
        {p?.eligible === false && <Badge>Fuera de lo público</Badge>}
        {a.backfill && <Badge tone="warn">Carga histórica</Badge>}
        <Badge>Procesamiento {a.processing_state}</Badge>
        {c.override && <Badge tone="info" title={c.override.reason ?? undefined}>Con ajustes manuales v{c.override.version}</Badge>}
      </div>
      {a.processing_error && <div className="mb-5 rounded-card bg-hot-soft px-4 py-3 text-[13px] text-hot ring-1 ring-hot/20">{a.processing_error}</div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card title="Cadena de procesamiento">
          <ol className="pt-1">
            <Step title="Fuentes" meta={`${KIND_LABEL[a.source_kind] ?? a.source_kind} · ${String(a.tier).replace("_", ".")} · ${MODE_LABEL[a.participation_mode] ?? a.participation_mode}`}>
              <Link className="text-ink hover:text-accent" to={`/admin/sources/${encodeURIComponent(a.source_id)}`}>{a.source_name}</Link>
              <span className="text-ink-4"> · texto completo en el sitio {a.site_fulltext ? "permitido" : "no permitido"} · texto completo externo {a.syndicate_fulltext ? "permitido" : "no permitido"}</span>
            </Step>
            <Step title="Detección" meta={`${c.discoveries.length} veces`}>
              <ul className="space-y-1">
                {c.discoveries.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="num text-ink-4">{bj(d.discovered_at, true)}</span>
                    <span>{d.via}</span>
                    {d.source_id !== a.source_id && <span className="text-ink-3">vía {d.source_id}</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 text-[12px] text-ink-4">
                Fecha del original {a.published_at ? bj(a.published_at, true) : "desconocida"}{a.published_at_claim && !a.published_at ? ` (declara ${a.published_at_claim}, no aceptada)` : ""} · línea de tiempo {bj(a.timeline_at, true)}
              </div>
            </Step>
            <Step title="Texto y revisiones" meta={` ${a.revision} versiones · texto ${a.body_status} · ${a.body_chars ?? 0} caracteres`}>
              {c.revisions.length ? (
                <ul className="space-y-1">
                  {c.revisions.map((r) => (
                    <li key={r.revision} className="flex gap-2">
                      <span className="num text-ink-4">v{r.revision}</span>
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                      <span className="num shrink-0 text-ink-4">{bj(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">Solo la versión inicial</span>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => setDialog("extract")}>Volver a extraer el texto</Button>
              </div>
            </Step>
            <Step title="Evaluación del modelo" meta={`${c.analyses.length} veces`} tone={c.analyses.length ? "accent" : "muted"}>
              {c.analyses.length ? (
                <div className="space-y-3">
                  {c.analyses.map((an) => (
                    <div key={an.id} className="rounded-control bg-bg-sunk/60 p-3 ring-1 ring-line">
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <Badge tone={an.relevance === "pass" ? "ok" : "muted"}>{an.relevance}</Badge>
                        {an.selected && <Badge tone="accent">Seleccionada</Badge>}
                        <Badge tone="info">Puntaje {an.score}</Badge>
                        {an.category && <Badge>{CATEGORY_LABELS[an.category as keyof typeof CATEGORY_LABELS] ?? an.category}</Badge>}
                        <span className="text-ink-4">{an.model} · {an.prompt_version} · entrada v{an.input_revision} · {an.origin} · {bj(an.created_at)}</span>
                      </div>
                      {an.title_zh && <div className="mt-2 font-medium text-ink">{an.title_zh}</div>}
                      {an.reason_zh && <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{an.reason_zh}</div>}
                      {an.receipts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                          {an.receipts.map((r) => (
                            <span key={r.id} className="num rounded-mark bg-surface px-1.5 py-0.5 text-ink-3 ring-1 ring-line">
                              Recibo #{r.id} · {r.status} · {r.model ?? r.service}{r.cost !== null ? ` · ${money(r.cost)}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-ink-4">{a.participation_mode === "editorial" ? "Aún sin evaluación (en cola o con falla)" : "Las fuentes de ambiente no reciben evaluación editorial"}</span>
              )}
            </Step>
            <Step title="Pública" tone={p ? (p.visibility === "withdrawn" ? "bad" : "accent") : "muted"} meta={p ? `Actualizado ${bj(p.updated_at, true)}` : undefined}>
              {p ? (
                <KV
                  items={[
                    ["Alcance", VISIBILITY_LABEL[p.visibility] ?? p.visibility],
                    ["Destacadas", p.selected ? `sí · visible desde ${p.visible_after ? bj(p.visible_after, true) : "ya"}` : "no"],
                    ["Sección", p.category ? CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS] ?? p.category : null],
                    ["Etiquetas", (p.tags as string[] | null)?.join(", ")],
                    ["Resumen", p.summary],
                    ["Por qué leerla", p.reason],
                    [
                      "Texto mostrado",
                      `${p.body_mode}${p.syndicate ? " · texto completo externo permitido" : ""}${
                        p.indexable ? (p.seo_indexed_at ? " · indexable (marcada a mano)" : " · indexable (automático por destacada)") : p.seo_excluded_at ? " · no indexable (excluida a mano)" : " · no indexable"
                      }`,
                    ],
                  ]}
                />
              ) : (
                <span className="text-ink-4">Sin versión pública (no pasó el filtro de relevancia o sigue en proceso)</span>
              )}
              {c.override && (
                <div className="mt-3 rounded-control bg-accent-softer p-3 ring-1 ring-accent/15">
                  <div className="text-[12px] text-ink-3">Ajustes manuales v{c.override.version} · {c.override.updated_by} · {bj(c.override.updated_at, true)}{c.override.reason ? ` · ${c.override.reason}` : ""}</div>
                  <Json value={{ visibility: c.override.visibility, ...c.override.fields }} label="Campos sobrescritos" collapsed={false} />
                </div>
              )}
            </Step>
            <Step title="Registro de sincronización de destacadas" meta={`${c.ledger.length} notas`} tone={c.ledger.length ? "accent" : "muted"}>
              {c.ledger.length ? (
                <ul className="space-y-1">
                  {c.ledger.map((l) => (
                    <li key={l.seq} className="flex gap-2">
                      <span className="num text-ink-4">#{l.seq}</span>
                      <Badge tone={l.op === "remove" ? "warn" : "ok"}>{l.op}</Badge>
                      <span className="num text-ink-4">visible {bj(l.visible_at)} · escrita {bj(l.changed_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">Nunca entró a la sincronización de destacadas</span>
              )}
            </Step>
            <Step title="Agrupación en eventos" tone={story ? "accent" : "muted"} meta={a.grouped_at ? `Agrupada en ${bj(a.grouped_at, true)}` : "Sin agrupar"}>
              {c.membership.map((m) => (
                <div key={m.fact_id} className="mb-2">
                  <div>
                    Hecho <span className="font-mono text-[12px]">#{m.fact_id}</span> {m.fact_title} <Badge>{m.role}</Badge> {m.manual && <Badge tone="info">Manual</Badge>}
                  </div>
                  {m.story_public_id && (
                    <div className="mt-0.5">
                      Evento <a className="text-accent" href={`/story/${m.story_public_id}`} target="_blank" rel="noreferrer">{m.story_title}</a> <span className="font-mono text-[12px] text-ink-4">#{m.story_id}</span>
                    </div>
                  )}
                </div>
              ))}
              {c.decisions.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12.5px]">
                  {c.decisions.map((d, i) => (
                    <li key={i} className="flex flex-wrap gap-2">
                      <span className="num text-ink-4">{bj(d.created_at)}</span>
                      <Badge>{d.verdict}</Badge>
                      {d.fact_id && <span>Hecho #{d.fact_id}</span>}
                      {d.receipt_id && <span className="text-ink-4">Recibo #{d.receipt_id}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setDialog("group")}>Reagrupar</Button>
                {c.membership.length > 0 && <Button size="sm" onClick={() => setDialog("detach")}>Sacar del evento</Button>}
                {story?.story_id && <Button size="sm" onClick={() => setDialog("merge")}>Fusionar este evento con…</Button>}
              </div>
            </Step>
            <Step title="Envíos" last meta={`${c.deliveries.length} notas`} tone={c.deliveries.some((d) => d.status === "unknown") ? "bad" : c.deliveries.length ? "accent" : "muted"}>
              {c.deliveries.length ? (
                <ul className="space-y-1">
                  {c.deliveries.map((d, i) => (
                    <li key={i} className="flex flex-wrap gap-2">
                      <span>{d.target_key}</span>
                      <Badge tone={d.status === "sent" ? "ok" : d.status === "unknown" ? "bad" : "muted"}>{d.status}</Badge>
                      <span className="num text-ink-4">{bj(d.created_at)}{d.sent_at ? ` → ${bj(d.sent_at)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">Sin envíos registrados</span>
              )}
            </Step>
          </ol>
        </Card>

        <div className="space-y-5">
          <Card title="Información original">
            <KV
              items={[
                ["Título original", a.title],
                ["Autor", a.author],
                ["Idioma", a.language],
                ["Clave de identidad", <span className="break-all font-mono text-[11.5px]">{a.identity_key}</span>],
              ]}
            />
          </Card>
          <Card title="Historial de cambios">
            {c.history.length ? (
              <ul className="space-y-3 text-[12.5px]">
                {c.history.map((h, i) => (
                  <li key={i}>
                    <div className="text-ink-2"><span className="font-medium">{h.action}</span> · {h.actor} · {bj(h.created_at)}</div>
                    {h.reason && <div className="text-ink-3">{h.reason}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Sin acciones manuales</Empty>
            )}
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={dialog === "seo"}
        title={p?.indexable ? "Quitar de buscadores" : "Marcar como indexable"}
        description={
          p?.indexable
            ? "La página vuelve a noindex y sale del sitemap; aunque sea destacada, no se indexará de nuevo hasta volver a marcarla."
            : "Las páginas de nota son noindex por omisión y las destacadas se indexan solas. Al marcarla (solo si es pública) pasa a index, entra al sitemap y se envía en el siguiente IndexNow. Úsalo para notas con valor propio, resumen y texto completos."
        }
        confirmLabel={p?.indexable ? "Quitar indexación" : "Marcar para indexar"}
        busy={pending === "seo"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/seo`, { indexed: !p?.indexable, reason }, { label: "seo", success: p?.indexable ? "Indexación retirada" : "Marcada como indexable" })) !== null}
      />

      <ReasonDialog
        open={dialog === "visibility"}
        title="Visibilidad"
        description="El cambio aplica a la web, la API, RSS, MCP, la sincronización y el índice de búsqueda, y limpia la caché. Si la fuente pide retirar algo, verifica primero su identidad y el alcance."
        danger={visibility === "withdrawn"}
        confirmLabel="Aplicar"
        busy={pending === "visibility"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/visibility`, { visibility, reason, version }, { label: "visibility", success: "Visibilidad actualizada" })) !== null}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ["public", "Pública", "Mostrar normal"],
            ["summary-only", "Solo resumen", "Sin texto; conserva título y resumen"],
            ["withdrawn", "Retirar", "Se quita de todas las salidas; el enlace 404"],
          ] as const).map(([v, label, hint]) => (
            <label key={v} className={`cursor-pointer rounded-card p-3 ring-1 transition-colors ${visibility === v ? "bg-accent-soft ring-accent" : "ring-line-strong hover:bg-bg-sunk"}`}>
              <input type="radio" name="visibility" className="sr-only" checked={visibility === v} onChange={() => setVisibility(v)} />
              <div className="text-[13.5px] font-medium text-ink">{label}</div>
              <div className="mt-0.5 text-[12px] text-ink-3">{hint}</div>
            </label>
          ))}
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "override"}
        title="Corrección manual"
        description="Los valores manuales tienen prioridad sobre el modelo y no se sobrescriben al reprocesar; los campos vacíos no se corrigen y dejar vacío uno ya corregido borra la corrección."
        confirmLabel="Guardar corrección"
        busy={pending === "override"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => {
          const next: Record<string, unknown> = {};
          const clear: string[] = [];
          for (const k of ["title", "summary", "reason"] as const) {
            if (fields[k].trim()) next[k] = fields[k].trim();
            else if (c.override?.fields[k] !== undefined) clear.push(k);
          }
          if (fields.category) next.category = fields.category;
          else if (c.override?.fields.category !== undefined) clear.push("category");
          if (fields.tags.trim()) next.tags = fields.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
          else if (c.override?.fields.tags !== undefined) clear.push("tags");
          if (fields.scoreMode === "none") next.score = null;
          else if (fields.scoreMode === "value") next.score = Number(fields.score);
          else if (c.override?.fields.score !== undefined) clear.push("score");
          for (const k of ["selected", "silent"] as const) {
            if (fields[k] === "true" || fields[k] === "false") next[k] = fields[k] === "true";
            else if (c.override?.fields[k] !== undefined) clear.push(k);
          }
          return (await run("POST", `${base}/override`, { fields: next, clear, reason, version }, { label: "override", success: "Corrección guardada y republicada" })) !== null;
        }}
      >
        <Field label="Título"><Input value={fields.title} placeholder={p?.title ?? ""} onChange={(e) => setFields({ ...fields, title: e.target.value })} /></Field>
        <Field label="Resumen"><Textarea rows={3} value={fields.summary} placeholder={p?.summary ?? ""} onChange={(e) => setFields({ ...fields, summary: e.target.value })} /></Field>
        <Field label="Por qué leerla"><Textarea rows={2} value={fields.reason} placeholder={p?.reason ?? ""} onChange={(e) => setFields({ ...fields, reason: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sección">
            <Select value={fields.category} onChange={(e) => setFields({ ...fields, category: e.target.value })}>
              <option value="">Sin corregir</option>
              {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
            </Select>
          </Field>
          <Field label="Etiquetas (separadas por comas)"><Input value={fields.tags} onChange={(e) => setFields({ ...fields, tags: e.target.value })} /></Field>
          <Field label="Puntaje">
            <Select value={fields.scoreMode} onChange={(e) => setFields({ ...fields, scoreMode: e.target.value })}>
              <option value="">Según el modelo</option>
              <option value="none">Quitar puntaje</option>
              <option value="value">Puntaje manual</option>
            </Select>
          </Field>
          {fields.scoreMode === "value" && <Field label="Puntaje (0–100)"><Input type="number" min={0} max={100} step="any" required value={fields.score} onChange={(e) => setFields({ ...fields, score: e.target.value })} /></Field>}
          <Field label="Destacadas">
            <Select value={fields.selected} onChange={(e) => setFields({ ...fields, selected: e.target.value })}>
              <option value="">Según el modelo</option>
              <option value="true">Forzar selección</option>
              <option value="false">Forzar exclusión</option>
            </Select>
          </Field>
          <Field label="Envío">
            <Select value={fields.silent} onChange={(e) => setFields({ ...fields, silent: e.target.value })}>
              <option value="">Normal</option>
              <option value="true">Silenciar (no enviar aunque sea seleccionada)</option>
              <option value="false">Quitar silencio</option>
            </Select>
          </Field>
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "analyze"}
        title="Reevaluar la revisión actual"
        description="Hace una nueva llamada al modelo (con costo y recibo). Repetir el clic en el mismo envío no cobra dos veces."
        requireReason={false}
        confirmLabel="Reevaluar"
        busy={pending === "analyze"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "analyze" }, { label: "analyze", success: "En cola de evaluación" })) !== null}
      />
      <ReasonDialog
        open={dialog === "presentation"}
        title="Actualizar el texto"
        description="Revisa primero cambios en imágenes, enlaces y formato del original. Si el texto es igual, se conservan resumen, traducción, selección y evento."
        requireReason={false}
        confirmLabel={presentation?.ready && presentation.changed ? "Aplicar actualización" : "Ver cambios"}
        busy={pending === "presentation"}
        onClose={() => setDialog(null)}
        onSubmit={async () => {
          const apply = presentation?.ready && presentation.changed;
          const result = await run<AdminPresentationRefresh>("POST", `${base}/rerun`,
            { step: "presentation", ...(apply ? { version: presentation.version } : { preview: true }) },
            { label: "presentation", revalidate: !!apply, ...(apply ? { success: "Texto actualizado" } : {}) });
          if (!result) { setPresentation(null); return false; }
          setPresentation(result);
          return result.applied;
        }}
      >
        {presentation && <div className="space-y-2 text-[13px] text-ink-2">
          <p>Imágenes {presentation.images.before} → {presentation.images.after}, enlaces {presentation.links.before} → {presentation.links.after}.</p>
          <p>{presentation.reason ?? (presentation.changed ? "Puedes aplicar esta actualización." : "El texto actual no necesita actualización.")}</p>
          {presentation.translation === "reused" && <p>La traducción conserva su texto y sincroniza imágenes y enlaces.</p>}
        </div>}
      </ReasonDialog>
      <ReasonDialog
        open={dialog === "extract"}
        title="Volver a extraer el texto"
        requireReason={false}
        confirmLabel="Volver a extraer"
        busy={pending === "extract"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "extract" }, { label: "extract", success: "En cola de extracción" })) !== null}
      />
      <ReasonDialog
        open={dialog === "group"}
        title="Reagrupar"
        description="Las agrupaciones manuales no se sobrescriben."
        requireReason={false}
        confirmLabel="Reagrupar"
        busy={pending === "group"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "group" }, { label: "group", success: "En cola de agrupación" })) !== null}
      />
      <ReasonDialog
        open={dialog === "detach"}
        title="Sacar del evento"
        description="La nota se mostrará sola y la página del evento se actualizará."
        danger
        confirmLabel="Sacar"
        busy={pending === "detach"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/detach`, { reason }, { label: "detach", success: "Fuera del evento" })) !== null}
      />
      <ReasonDialog
        open={dialog === "merge"}
        title="Fusionar eventos"
        description={`Fusionar el evento #${story?.story_id} (${story?.story_title ?? ""}) con otro; los enlaces anteriores redirigirán al nuevo evento.`}
        danger
        confirmLabel="Fusionar"
        busy={pending === "merge"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => {
          if (!/^\d+$/.test(mergeInto.trim())) return false;
          return (await run("POST", "/api/admin/stories/merge", { from: story!.story_id, into: Number(mergeInto), reason }, { label: "merge", success: "Eventos fusionados" })) !== null;
        }}
      >
        <Field label="Número del evento destino" hint="Aparece en el diagnóstico de cualquier nota del evento destino #Número">
          <Input inputMode="numeric" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} placeholder="p. ej. 1234" />
        </Field>
      </ReasonDialog>
    </AdminPage>
  );
}
