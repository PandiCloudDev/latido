import { SITE, SOURCE_DEFAULTS } from "@aihot/site";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/source-new";
import type { AdminSourceCreated, AdminSourcePreview } from "@aihot/contracts/admin";
import { useAdminAction } from "../../features/admin/action";
import { bj, slugFrom } from "../../features/admin/format";
import { KIND_LABEL, MODE_LABEL, SELECTION_CLASS_LABEL, TIER_LABEL } from "../../features/admin/labels";
import { AdminPage, Button, Card, Empty, Field, Input, Select, Textarea } from "../../features/admin/ui";

export const meta: Route.MetaFunction = () => [{ title: `Nueva fuente · ${SITE.name} Panel` }];

const TEMPLATES: Record<string, Record<string, unknown>> = {
  rss: {},
  web_list: { url: "https://example.com/blog", baseUrl: "https://example.com", itemSelector: "article", linkSelector: "a", titleSelector: "h2", allowUrlPrefixes: ["https://example.com/blog/"] },
  json_list: { url: "https://example.com/api/posts", mode: "json_api", method: "GET", itemsPath: "data.items", titlePaths: ["title"], urlTemplate: "{raw:url}", summaryPaths: ["summary"] },
  x_search: { query: "from:handle -filter:replies", searchType: "Latest" },
  mp_account: { ghid: "gh_", nickname: "" },
  external: {},
};


export default function NewSource() {
  const navigate = useNavigate();
  const { run, pending } = useAdminAction();
  const [form, setForm] = useState({ id: "", name: "", kind: "rss", tier: "T2", selection_class: "", participation_mode: "editorial", interval_minutes: 30, first_party: false, site_fulltext: SOURCE_DEFAULTS.siteFulltext, syndicate_fulltext: false, tags: "" });
  const [idEdited, setIdEdited] = useState(false);
  const [rssUrl, setRssUrl] = useState("");
  const [config, setConfig] = useState(JSON.stringify(TEMPLATES.rss, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminSourcePreview | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  const parsed = () => {
    try {
      setError(null);
      const options: unknown = JSON.parse(config);
      if (!options || typeof options !== "object" || Array.isArray(options)) throw new Error("Usa un objeto de configuración.");
      if (form.kind !== "rss") return options as Record<string, unknown>;
      try {
        const url = new URL(rssUrl.trim());
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
        return { ...options, feedUrl: url.href };
      } catch {
        setError("Pega una URL de RSS válida (HTTP o HTTPS, sin credenciales).");
        return null;
      }
    } catch (e) {
      setError(`La configuración no es JSON válido: ${(e as Error).message}`);
      return null;
    }
  };

  return (
    <AdminPage title="Nueva fuente" subtitle="Para añadir un RSS, escribe el nombre del medio y pega el enlace. Usa Previsualizar para comprobar qué notas trae antes de guardarlo.">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card title="Definición de la fuente">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <Input value={form.name} maxLength={200} onChange={(e) => setForm({ ...form, name: e.target.value, id: idEdited ? form.id : slugFrom(e.target.value, 80) })} placeholder="Nombre del medio" />
            </Field>
            <Field label="ID" hint="Se propone con el nombre. Usa 3 a 80 caracteres: minúsculas, números o guiones.">
              <Input value={form.id} maxLength={80} onChange={(e) => { setIdEdited(true); setForm({ ...form, id: e.target.value.toLowerCase() }); }} placeholder="nombre-del-medio" />
            </Field>
            {form.kind === "rss" && (
              <Field label="URL del RSS">
                <Input type="url" value={rssUrl} onChange={(e) => { setRssUrl(e.target.value); setPreview(null); }} placeholder="https://medio.mx/feed.xml" />
              </Field>
            )}
            <Field label="Tipo">
              <Select
                value={form.kind}
                onChange={(e) => {
                  setForm({ ...form, kind: e.target.value });
                  setConfig(JSON.stringify(TEMPLATES[e.target.value] ?? {}, null, 2));
                  setPreview(null);
                }}
              >
                {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Intervalo de recolección (minutos)">
              <Input type="number" min={1} max={1440} value={form.interval_minutes} onChange={(e) => setForm({ ...form, interval_minutes: Number(e.target.value) })} />
            </Field>
            <Field label="Participación">
              <Select value={form.participation_mode} onChange={(e) => setForm({ ...form, participation_mode: e.target.value })}>
                {Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Nivel" hint="Usa T1 solo si puedes comprobar quién opera la fuente o enlazar su sitio oficial.">
              <Select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                {Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Clase" hint="Sube el umbral de selección; no cambia la condición de fuente directa">
              <Select value={form.selection_class} onChange={(e) => setForm({ ...form, selection_class: e.target.value })}>
                <option value="">Ninguna (según nivel)</option>
                {Object.entries(SELECTION_CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Etiquetas (separadas por comas)">
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </Field>
            <div className="flex flex-col justify-end gap-2 text-[13px] text-ink-2">
              {([
                ["site_fulltext", "Texto completo en el sitio"],
                ["syndicate_fulltext", "Texto completo en la API"],
              ] as const).map(([k, label]) => (
                <label key={k} className="inline-flex items-center gap-2">
                  <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4">
            {form.kind === "rss" ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-[13px] text-ink-3">Opciones avanzadas de RSS</summary>
                <div className="mt-2">
                  <Field label="Opciones adicionales (JSON)" hint="La URL se toma del campo de arriba.">
                    <Textarea className="font-mono !text-[12px]" rows={5} value={config} onChange={(e) => setConfig(e.target.value)} spellCheck={false} />
                  </Field>
                </div>
              </details>
            ) : (
              <Field label="Configuración de recolección (JSON)">
                <Textarea className="font-mono !text-[12px]" rows={10} value={config} onChange={(e) => setConfig(e.target.value)} spellCheck={false} />
              </Field>
            )}
            {error && <div className="mt-1 text-[12.5px] text-hot">{error}</div>}
          </div>
          {duplicate && (
            <div className="mt-4 rounded-card bg-amber/10 px-4 py-3 text-[13px] text-ink-2 ring-1 ring-amber/25">
              Esta dirección ya se monitorea: <Link className="font-medium text-accent" to={`/admin/sources/${encodeURIComponent(duplicate.id)}`}>{duplicate.name}</Link> ({duplicate.id}). No se creó otra.
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              busy={pending === "preview"}
              onClick={async () => {
                const c = parsed();
                if (!c) return;
                const r = await run<AdminSourcePreview>("POST", "/api/admin/sources/preview", { id: form.id || "draft", kind: form.kind, config: c }, { label: "preview", revalidate: false });
                if (r) setPreview(r);
              }}
            >
              Previsualizar
            </Button>
            <Button
              tone="primary"
              busy={pending === "create"}
              disabled={!/^[a-z0-9][a-z0-9-]{2,79}$/.test(form.id) || !form.name.trim()}
              onClick={async () => {
                const c = parsed();
                if (!c) return;
                const r = await run<AdminSourceCreated>(
                  "POST",
                  "/api/admin/sources",
                  { ...form, selection_class: form.selection_class || null, tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean), config: c },
                  { label: "create", revalidate: false },
                );
                if (!r) return;
                if (r.created) navigate(`/admin/sources/${encodeURIComponent(r.source.id)}`);
                else setDuplicate(r.duplicate);
              }}
            >
              Crear
            </Button>
          </div>
        </Card>
        <Card title={preview ? `Vista previa: ${preview.count} notas (${preview.ms}ms)` : "Vista previa"}>
          {!preview ? (
            <Empty>Completa la configuración y pulsa "Previsualizar"; aquí verás las notas que se recolectarían (sin guardarlas).</Empty>
          ) : preview.items.length ? (
            <ul className="space-y-3">
              {preview.items.map((i) => (
                <li key={i.url} className="text-[13px]">
                  <a href={i.url} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-accent">{i.title}</a>
                  <div className="text-[12px] text-ink-4">{i.publishedAt ? bj(i.publishedAt, true) : "Sin fecha"}</div>
                  {i.excerpt && <div className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{i.excerpt}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No se obtuvieron notas.</Empty>
          )}
        </Card>
      </div>
    </AdminPage>
  );
}
