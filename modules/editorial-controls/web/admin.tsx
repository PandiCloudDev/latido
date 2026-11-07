import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { SITE } from "@aihot/site";
import { adminGet } from "@aihot/web/lib/admin.server";
import { useAdminAction } from "@aihot/web/features/admin/action";
import { AdminPage, Badge, Button, ButtonLink, Card, Field, Input, Select, Textarea } from "@aihot/web/features/admin/ui";
import { type AdSettings, type EditorialSettings, type ManagedTopic } from "../types.ts";

export function loader({ request }: { request: Request }) {
  return adminGet<EditorialSettings>(request, "/api/admin/editorial");
}

export const meta = () => [{ title: `Configuración editorial · ${SITE.name} Panel` }];

function NewsletterForm({ value }: { value: EditorialSettings["newsletter"] }) {
  const [enabled, setEnabled] = useState(value.enabled);
  const [verified, setVerified] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const { run, busy } = useAdminAction();
  const active = value.enabled && value.smtpConfigured;
  return (
    <Card title="Boletín semanal por correo" right={<Badge tone={active ? "ok" : undefined}>{active ? "Activo" : "Oculto"}</Badge>}>
      {value.smtpConfigured && <form className="mb-4 flex flex-wrap items-end gap-2 border-b border-line pb-4" onSubmit={(e) => {
        e.preventDefault();
        void run("POST", "/api/admin/editorial/newsletter/test", { email: testEmail }, { success: "Prueba aceptada por el servidor de correo. Revisa la bandeja de entrada." });
      }}>
        <Field label="Correo para la prueba">
          <Input type="email" maxLength={254} required value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
        </Field>
        <Button type="submit" busy={busy}>Enviar prueba</Button>
      </form>}
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        void run("PUT", "/api/admin/editorial/newsletter", { enabled, verified }, { success: "Configuración del boletín guardada" });
      }}>
        <p className="text-[13px] text-ink-3">La lista se guarda en este servidor. Cada persona confirma su correo y puede darse de baja desde cualquier edición.</p>
        <p className="text-[13px] text-ink">{value.smtpConfigured ? "Remitente configurado. Comprueba la entrega antes de activar." : "Falta configurar el remitente de correo del servidor."}</p>
        <dl className="grid grid-cols-2 gap-2 text-[13px] text-ink sm:grid-cols-4">
          <div><dt className="text-ink-3">Confirmadas</dt><dd>{value.counts.active}</dd></div>
          <div><dt className="text-ink-3">Pendientes</dt><dd>{value.counts.pending}</dd></div>
          <div><dt className="text-ink-3">Envíos en 30 días</dt><dd>{value.counts.sent}</dd></div>
          <div><dt className="text-ink-3">Fallos en 30 días</dt><dd>{value.counts.failed}</dd></div>
        </dl>
        <label className="flex items-start gap-2 text-[13px] text-ink">
          <input className="mt-0.5 size-4 shrink-0" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!value.smtpConfigured && !enabled} />
          Habilitar el formulario y los envíos semanales.
        </label>
        {enabled && <label className="flex items-start gap-2 text-[13px] text-ink">
          <input className="mt-0.5 size-4 shrink-0" type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
          Probé la entrega y revisé la información del boletín en el aviso de privacidad.
        </label>}
        <Button type="submit" tone="primary" busy={busy} disabled={enabled && (!value.smtpConfigured || !verified)}>Guardar boletín</Button>
      </form>
    </Card>
  );
}

function AdForm({ value }: { value: AdSettings }) {
  const [draft, set] = useState(value);
  const { run, busy } = useAdminAction();
  return (
    <Card title="Publicidad en la portada" right={<Badge tone={value.enabled ? "ok" : undefined}>{value.enabled ? "Visible" : "Oculta"}</Badge>}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        void run("PUT", "/api/admin/editorial/ad", draft, { success: "Espacio publicitario guardado" });
      }}>
        <p className="text-[13px] text-ink-3">Coloca un anuncio identificado como “Publicidad” debajo del boletín en la portada. Cuando lo desactivas, el espacio deja de aparecer.</p>
        <Field label="Nombre del anunciante"><Input value={draft.advertiser} maxLength={80} onChange={(e) => set({ ...draft, advertiser: e.target.value })} /></Field>
        <Field label="Mensaje del anuncio"><Textarea rows={2} maxLength={220} value={draft.text} onChange={(e) => set({ ...draft, text: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destino del enlace"><Input type="url" placeholder="https://…" value={draft.url} maxLength={1000} onChange={(e) => set({ ...draft, url: e.target.value })} /></Field>
          <Field label="Texto del enlace"><Input placeholder="Conoce más" value={draft.action} maxLength={45} onChange={(e) => set({ ...draft, action: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input className="size-4" type="checkbox" checked={draft.enabled} onChange={(e) => set({ ...draft, enabled: e.target.checked })} />
          Mostrar anuncio
        </label>
        <Button type="submit" tone="primary" busy={busy}>Guardar publicidad</Button>
      </form>
    </Card>
  );
}

const blankTopic: ManagedTopic = { slug: "", name: "", group: "field", definition: "", tags: [], enabled: false };
const slugFrom = (name: string) => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64).replace(/-$/g, "");

function TopicEditor({ topics, tags }: Pick<EditorialSettings, "topics" | "tags">) {
  const [draft, set] = useState(blankTopic);
  const [editing, setEditing] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const { run, busy } = useAdminAction();
  const reset = () => { set(blankTopic); setEditing(false); setSlugTouched(false); };
  return (
    <Card title="Temas del sitio">
      <p className="mb-4 text-[13px] text-ink-3">Un tema agrupa las notas que tienen cualquiera de las etiquetas elegidas. Aquí puedes crear o pausar temas nuevos; el catálogo original conserva sus direcciones.</p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form className="min-w-0 space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const result = await run(editing ? "PUT" : "POST", editing ? `/api/admin/editorial/topics/${encodeURIComponent(draft.slug)}` : "/api/admin/editorial/topics", draft, { success: editing ? "Tema actualizado" : "Tema creado" });
          if (result) reset();
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><Input required maxLength={80} value={draft.name} onChange={(e) => set({ ...draft, name: e.target.value, slug: editing || slugTouched ? draft.slug : slugFrom(e.target.value) })} /></Field>
            <Field label="Dirección del tema" hint="Ejemplo: /topics/redes-electricas. La dirección se conserva al editar."><Input required maxLength={64} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" readOnly={editing} value={draft.slug} onChange={(e) => { setSlugTouched(true); set({ ...draft, slug: e.target.value }); }} /></Field>
          </div>
          <Field label="Grupo"><Select value={draft.group} onChange={(e) => set({ ...draft, group: e.target.value === "genre" ? "genre" : "field" })}><option value="field">Área de cobertura</option><option value="genre">Tipo de contenido</option></Select></Field>
          <Field label="Descripción"><Textarea required maxLength={260} rows={2} value={draft.definition} onChange={(e) => set({ ...draft, definition: e.target.value })} /></Field>
          <Field label="Agregar etiqueta">
            <Select value="" onChange={(e) => { if (e.target.value) set({ ...draft, tags: [...draft.tags, e.target.value] }); }} disabled={draft.tags.length >= 12}>
              <option value="">Elige una etiqueta existente</option>
              {tags.filter((tag) => !draft.tags.includes(tag)).map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-2">
            {draft.tags.map((tag) => <button key={tag} type="button" className="rounded-full bg-editorial-blue-soft px-3 py-1.5 text-[13px] text-editorial-blue" aria-label={`Quitar etiqueta ${tag}`} onClick={() => set({ ...draft, tags: draft.tags.filter((t) => t !== tag) })}>{tag} ×</button>)}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input className="size-4" type="checkbox" checked={draft.enabled} onChange={(e) => set({ ...draft, enabled: e.target.checked })} />
            Publicar el tema en el sitio
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" tone="primary" busy={busy} disabled={!draft.tags.length}>{editing ? "Guardar cambios" : "Crear tema"}</Button>
            {editing && <Button type="button" onClick={reset}>Nuevo tema</Button>}
          </div>
        </form>
        <div className="min-w-0">
          <h2 className="mb-2 text-[14px] font-bold text-ink">Creados desde el panel</h2>
          {topics.length === 0 ? <p className="text-[13px] text-ink-3">Todavía no hay temas agregados.</p> : (
            <ul className="divide-y divide-line">
              {topics.map((t) => (
                <li key={t.slug} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]">
                  <div className="min-w-0">
                    {t.enabled ? <Link className="break-words font-bold text-editorial-blue hover:underline" to={`/topics/${t.slug}`}>{t.name}</Link> : <p className="break-words font-bold text-ink">{t.name}</p>}
                    <p className="break-words text-ink-3">{t.tags.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={t.enabled ? "ok" : undefined}>{t.enabled ? "Publicado" : "Oculto"}</Badge>
                    <Button type="button" size="sm" onClick={() => { set(t); setEditing(true); }}>Editar</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function EditorialAdmin() {
  const settings = useLoaderData<typeof loader>();
  return (
    <AdminPage title="Configuración editorial" subtitle="Gestiona fuentes, temas, el boletín semanal y la publicidad sin editar código.">
      <div className="space-y-5">
        <Card title="Fuentes de noticias">
          <p className="mb-3 text-[13px] text-ink-3">Agrega un RSS, previsualiza lo que se puede leer y revisa cómo quedó la fuente.</p>
          <div className="flex flex-wrap gap-2"><ButtonLink to="/admin/sources/new" tone="primary">Agregar fuente</ButtonLink><ButtonLink to="/admin/sources">Ver fuentes</ButtonLink></div>
        </Card>
        <div className="grid items-start gap-5 xl:grid-cols-2"><NewsletterForm value={settings.newsletter} /><AdForm value={settings.ad} /></div>
        <TopicEditor topics={settings.topics} tags={settings.tags} />
      </div>
    </AdminPage>
  );
}
