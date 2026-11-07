import { SITE } from "@aihot/site";
import { Form, Link, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/sources";
import type { AdminSources } from "@aihot/contracts/admin";
import { SELECTION } from "@aihot/industry/selection";
import { adminGet } from "../../lib/admin.server";
import { num } from "../../features/admin/format";
import { HEALTH_LABEL, KIND_LABEL, MODE_LABEL } from "../../features/admin/labels";
import { AdminPage, Badge, ButtonLink, Card, DataTable, Dot, FilterChips, healthTone, Input, Pager, Select, Stat, Time } from "../../features/admin/ui";



export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return adminGet<AdminSources>(request, `/api/admin/sources${url.search}`);
}

export const meta: Route.MetaFunction = () => [{ title: `Fuentes · ${SITE.name} Panel` }];

export default function Sources({ loaderData }: Route.ComponentProps) {
  const { rows, totals, page, useLabels } = loaderData;
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const pick = (param: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(param, value);
    else next.delete(param);
    next.delete("page");
    navigate(`?${next}`, { preventScrollReset: true });
  };
  return (
    <AdminPage
      title="Fuentes"
      subtitle="Ordenadas por salud: las que fallan van primero. En el detalle puedes previsualizar, recolectar a mano y ajustar frecuencia y participación."
      actions={<ButtonLink to="/admin/sources/new" tone="primary">Nueva fuente</ButtonLink>}
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Todo" value={num(totals.total)} />
        <Stat label="Activar" value={num(totals.enabled)} />
        <Stat label="Falla" value={num(totals.failing)} tone={totals.failing ? "bad" : "ok"} />
        <Stat label="Inestable" value={num(totals.degraded)} tone={totals.degraded ? "warn" : undefined} />
      </div>
      <Card pad={false}>
        <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <Form method="get" className="flex w-full max-w-md gap-2" preventScrollReset>
            {["kind", "health", "mode", "use"].map((k) => sp.get(k) && <input key={k} type="hidden" name={k} value={sp.get(k)!} />)}
            <Input name="q" defaultValue={sp.get("q") ?? ""} placeholder="Nombre, ID o dirección" aria-label="Buscar fuentes" />
          </Form>
          <div className="flex flex-wrap items-center gap-3">
            <FilterChips param="health" options={[{ value: "", label: "Todo" }, { value: "failing", label: "Falla" }, { value: "degraded", label: "Inestable" }, { value: "paused", label: "Pausar" }]} />
            <Select aria-label="Tipo" className="!w-auto" value={sp.get("kind") ?? ""} onChange={(e) => pick("kind", e.target.value)}>
              <option value="">Todos los tipos</option>
              {Object.entries(KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            {Object.keys(useLabels).length > 0 && (
              <Select aria-label="Uso" className="!w-auto" value={sp.get("use") ?? ""} onChange={(e) => pick("use", e.target.value)}>
                <option value="">Todos los usos</option>
                {Object.entries(useLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            )}
          </div>
        </div>
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/admin/sources/${encodeURIComponent(r.id)}`)}
          columns={[
            {
              key: "name",
              label: "Fuentes",
              render: (r) => (
                <div className="min-w-[220px]">
                  <Link to={`/admin/sources/${encodeURIComponent(r.id)}`} className="font-medium text-ink hover:text-accent" onClick={(e) => e.stopPropagation()}>
                    {r.name}
                  </Link>
                  <div className="font-mono text-[11.5px] text-ink-4">{r.id}</div>
                  {r.health === "failing" && r.last_error && <div className="mt-1 line-clamp-1 text-[12px] text-hot">{r.last_error}</div>}
                </div>
              ),
            },
            { key: "kind", label: "Tipo", render: (r) => <Badge>{KIND_LABEL[r.kind] ?? r.kind}</Badge> },
            {
              key: "mode",
              label: "Participación",
              render: (r) => (
                <div className="flex gap-1">
                  <Badge tone={r.participation_mode === "editorial" ? "accent" : "muted"}>{MODE_LABEL[r.participation_mode] ?? r.participation_mode}</Badge>
                  {r.uses.map((u) => <Badge key={u} tone="info">{useLabels[u] ?? u}</Badge>)}
                  <Badge tone="info">{r.tier.replace("_", ".")}</Badge>
                  {r.selection_class && <Badge tone="muted">{SELECTION.classes[r.selection_class]?.label ?? r.selection_class}</Badge>}
                  {r.first_party && <Badge tone="ok">Oficial</Badge>}
                </div>
              ),
            },
            {
              key: "health",
              label: "Salud",
              render: (r) => (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Dot tone={r.enabled ? healthTone(r.health) : "muted"} />
                  {r.enabled ? HEALTH_LABEL[r.health] ?? r.health : "En pausa"}
                  {r.fail_count > 0 && <span className="num text-[11.5px] text-ink-4">×{r.fail_count}</span>}
                </span>
              ),
            },
            { key: "ok", label: "Último éxito", render: (r) => <Time at={r.last_ok_at} /> },
            { key: "interval", label: "Frecuencia", align: "right", render: (r) => `${r.interval_minutes} min` },
            { key: "items", label: "7 días: notas", align: "right", render: (r) => num(r.items_7d) },
            { key: "sel", label: "30 días: destacadas", align: "right", render: (r) => num(r.selected_30d) },
          ]}
        />
      </Card>
      <Pager page={page} hasMore={rows.length === 100} />
    </AdminPage>
  );
}
