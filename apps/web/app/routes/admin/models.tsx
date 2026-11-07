import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/models";
import type { AdminModels } from "@aihot/contracts/admin";
import { SITE } from "@aihot/site";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { bj, money, num } from "../../features/admin/format";
import { AdminPage, Badge, Button, Card, DataTable, Empty, Field, FilterChips, ReasonDialog, Select } from "../../features/admin/ui";



export async function loader({ request }: Route.LoaderArgs) {
  const days = new URL(request.url).searchParams.get("days") ?? "7";
  return adminGet<AdminModels>(request, `/api/admin/models?days=${encodeURIComponent(days)}`);
}

export const meta: Route.MetaFunction = () => [{ title: `Modelos y evaluación · ${SITE.name} Panel` }];

const SOURCE_LABEL = { admin: "Cambio en el panel", env: "Variable de entorno", default: "Predeterminado del código" } as const;

/** A cost the provider did not report and no price covers. */
function Unpriced() {
  return <span className="whitespace-nowrap text-ink-4" title="El proveedor no reporta costo; se estima con los tokens y tu precio por modelo">Sin precio</span>;
}
const secs = (ms: number | null) => (ms == null ? "—" : ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);

export default function ModelsAdmin({ loaderData: m }: Route.ComponentProps) {
  const { run, pending } = useAdminAction();
  const [target, setTarget] = useState<AdminModels["capabilities"][number] | null>(null);
  const [choice, setChoice] = useState<string>("");
  const labelOf = (key: string) => m.capabilities.find((c) => `capability:${c.key}` === key)?.label ?? key;

  return (
    <AdminPage
      title="Modelos y evaluación"
      subtitle="Qué modelo usa cada función y de dónde viene (cambio en el panel > Variable de entorno > predeterminado del código), con su tasa de éxito, tiempos y costos recientes. Un cambio solo afecta tareas nuevas; los resultados existentes no se recalculan. Antes de cambiar el modelo de selección revisa la comparación de SelectBench."
      actions={<FilterChips param="days" options={[{ value: "1", label: "24 horas" }, { value: "", label: "7 días" }, { value: "30", label: "30 días" }]} />}
    >
      <div className="grid grid-cols-1 gap-5">
        {m.capabilities.map((c) => {
          const total = c.usage.reduce((a, u) => a + u.calls, 0);
          return (
            <Card
              key={c.key}
              title={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {c.label}
                  <span className="font-mono text-[12px] font-normal text-ink-3 [overflow-wrap:anywhere]">{c.current.model}</span>
                  <Badge tone={c.current.source === "admin" ? "accent" : "muted"}>{SOURCE_LABEL[c.current.source]}</Badge>
                  {c.current.invalid && <Badge tone="bad">El configurado {c.current.invalid} no existe; sin efecto</Badge>}
                  {c.fallback && <span className="text-xs font-normal text-ink-3">
                    Respaldo {c.fallback.model} · {c.fallback.primaryPaused
                      ? c.fallback.backupPaused ? "Principal y respaldo en pausa; esperando recuperación" : "Cubriendo"
                      : c.fallback.backupPaused ? "No disponible" : "Listo"}
                    {c.fallback.nextProbeAt && ` · ${bj(c.fallback.nextProbeAt)} después se vuelve a probar el principal con nuevas solicitudes`}
                  </span>}
                </span>
              }
              right={
                <Button
                  size="sm"
                  onClick={() => {
                    setTarget(c);
                    setChoice(c.current.model);
                  }}
                >
                  Cambiar
                </Button>
              }
              pad={false}
            >
              {c.usage.length ? (
                <DataTable
                  dense
                  rows={c.usage}
                  rowKey={(u) => `${u.purpose}|${u.model}|${u.promptVersion}`}
                  columns={[
                    { key: "m", label: "Modelo", render: (u) => <span className="whitespace-nowrap font-mono text-[12px]">{u.model}</span> },
                    { key: "v", label: "Versión del prompt", render: (u) => <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-3">{u.promptVersion ?? "—"}</span> },
                    { key: "p", label: "Uso", render: (u) => <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-3">{u.purpose}</span> },
                    { key: "c", label: "Llamadas", align: "right", render: (u) => num(u.calls) },
                    {
                      key: "ok",
                      label: "Éxito",
                      align: "right",
                      render: (u) => {
                        const rate = u.calls ? u.ok / u.calls : 0;
                        return <span className={rate < 0.95 ? "text-hot" : ""} title={`Falla ${u.failed} · resultado desconocido ${u.unknown}`}>{`${Math.round(rate * 1000) / 10}%`}</span>;
                      },
                    },
                    { key: "l", label: "Tiempo p50 / p95", align: "right", render: (u) => <span className="whitespace-nowrap">{`${secs(u.p50)} / ${secs(u.p95)}`}</span> },
                    { key: "t", label: "Entrada / salida token", align: "right", render: (u) => <span className="whitespace-nowrap">{`${num(u.tokensIn)} / ${num(u.tokensOut)}`}</span> },
                    {
                      key: "$",
                      label: "Costo",
                      align: "right",
                      render: (u) =>
                        u.actualCost !== null ? (
                          `${money(u.actualCost)}${u.currency && u.currency !== "CNY" ? ` ${u.currency}` : ""}`
                        ) : u.estimate ? (
                          <span title="según uso × estimado por precio">≈ {money(u.estimate.amount)}{u.estimate.currency !== "CNY" ? ` ${u.estimate.currency}` : ""}</span>
                        ) : (
                          <Unpriced />
                        ),
                    },
                  ]}
                />
              ) : (
                <Empty>{m.days} días sin llamadas{total === 0 && c.vision ? " (solo con imágenes)" : ""}</Empty>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Historial de cambios" pad={false}>
          {m.history.length ? (
            <DataTable
              dense
              rows={m.history}
              rowKey={(h) => `${h.at}|${h.subject}`}
              columns={[
                { key: "at", label: "Hora", render: (h) => <span className="num whitespace-nowrap">{bj(h.at)}</span> },
                { key: "c", label: "Función", render: (h) => labelOf(h.subject) },
                { key: "m", label: "Cambios", render: (h) => <span className="font-mono text-[12px]">{h.before?.model ?? "—"} → {h.after?.model ?? "—"}</span> },
                { key: "r", label: "Motivo", render: (h) => <span className="text-ink-3">{h.reason}</span> },
                { key: "a", label: "Responsable", render: (h) => h.actor },
              ]}
            />
          ) : (
            <Empty>Aún no se ha cambiado ningún modelo desde el panel</Empty>
          )}
        </Card>
        <Card title="Comparación con la misma muestra (SelectBench)" right={<Link to="/admin/selectbench" className="text-accent">Todas las corridas</Link>} pad={false}>
          {m.benches.length ? (
            <DataTable
              dense
              rows={m.benches}
              rowKey={(b) => b.id}
              columns={[
                { key: "l", label: "Operación", render: (b) => <Link to={`/admin/selectbench/${b.id}`} className="text-ink hover:text-accent">{b.label}</Link> },
                { key: "m", label: "Modelo", render: (b) => <span className="font-mono text-[11.5px] text-ink-3">{b.models.join(", ")}</span> },
                { key: "n", label: "Muestra", align: "right", render: (b) => num(b.sample_size) },
                { key: "at", label: "Hora", render: (b) => <span className="num whitespace-nowrap">{bj(b.created_at)}</span> },
              ]}
            />
          ) : (
            <Empty>Aún no hay corridas importadas</Empty>
          )}
        </Card>
      </div>

      <ReasonDialog
        open={!!target}
        title={`Cambiar modelo: ${target?.label ?? ""}`}
        description={"Solo afecta tareas nuevas. \"Restablecer\" vuelve a la variable de entorno o al predeterminado del código."}
        confirmLabel="Cambiar"
        busy={pending === "switch"}
        onClose={() => setTarget(null)}
        onSubmit={async (reason) =>
         (await run("POST", `/api/admin/models/${target!.key}`, { model: choice === "__default" ? null : choice, reason }, { label: "switch", success: "Cambiado; aplica desde la siguiente llamada" })) !== null
        }
      >
        <Field label="Modelo">
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            {m.choices
              .filter((x) => !target?.vision || x.vision)
              .map((x) => (
                <option key={x.key} value={x.key}>
                  {x.key} ({x.service})
                </option>
              ))}
            <option value="__default">Restablecer ({target?.env} o {target?.defaultModel})</option>
          </Select>
        </Field>
      </ReasonDialog>
    </AdminPage>
  );
}
