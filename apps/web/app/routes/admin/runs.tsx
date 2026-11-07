import { useState } from "react";
import { SITE } from "@aihot/site";
import { Link, useFetcher } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/runs";
import type { AdminDeliveryIssue, AdminReceiptIssue, AdminRuns } from "@aihot/contracts/admin";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { ago, bj, duration, num } from "../../features/admin/format";
import { AdminPage, Badge, Button, Card, DataTable, Dot, Empty, Field, Json, ReasonDialog, Select, Stat, Time } from "../../features/admin/ui";


export async function loader({ request }: Route.LoaderArgs) {
  return adminGet<AdminRuns>(request, "/api/admin/runs");
}

export const meta: Route.MetaFunction = () => [{ title: `Operación · ${SITE.name} Panel` }];

const STATE_LABEL: Record<string, string> = { created: "En cola", retry: "Esperando reintento", active: "En ejecución" };

export default function RunsAdmin({ loaderData }: Route.ComponentProps) {
  const refresh = useFetcher<typeof loader>();
  const r = refresh.data ?? loaderData;
  const { run, pending } = useAdminAction();
  const [receipt, setReceipt] = useState<AdminReceiptIssue | null>(null);
  const [billed, setBilled] = useState("false");
  const [delivery, setDelivery] = useState<AdminDeliveryIssue | null>(null);
  const [outcome, setOutcome] = useState<"sent" | "drop" | "resend">("sent");
  // Failure group to put back into processing ("" = every failure of the last 30 days).
  const [requeue, setRequeue] = useState<string | null>(null);

  // Live view: refresh every 20 s while visible.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && refresh.state === "idle" && refresh.load("/admin/runs"), 20_000);
    return () => clearInterval(t);
  }, [refresh]);

  const backlog = new Map<string, Record<string, { n: number; oldest: string }>>();
  for (const q of r.queues) backlog.set(q.name, { ...(backlog.get(q.name) ?? {}), [q.state]: { n: q.n, oldest: q.oldest } });
  const queued = r.queues.filter((q) => q.state !== "active").reduce((a, q) => a + q.n, 0);
  const worker = r.processes.find((p) => p.role === "worker");
  const failing = r.jobs.filter((j) => j.status === "failed");

  return (
    <AdminPage title="Operación" subtitle={<>Tareas, colas, retrasos de fuentes y recibos o envíos que requieren revisión. Se actualiza cada 20 segundos · última revisión {bj(r.checkedAt)}</>}>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="worker"
          value={<span className="inline-flex items-center gap-2 text-[18px]"><Dot tone={worker?.alive ? "ok" : "bad"} />{worker ? (worker.alive ? "En marcha" : "Latido interrumpido") : "Sin latido"}</span>}
          hint={worker ? `${worker.host} · latido ${ago(worker.at)}` : "worker Sin latido reportado"}
        />
        <Stat label="Cola acumulada" value={num(queued)} tone={queued > 500 ? "warn" : undefined} hint="En cola y esperando reintento" />
        <Stat label="Tareas programadas con falla" value={num(failing.length)} tone={failing.length ? "bad" : "ok"} hint="La última ejecución falló" />
        <Stat label="Recibos con resultado desconocido" value={num(r.receipts.issues.filter((x) => x.status === "unknown").length)} tone={r.receipts.issues.some((x) => x.status === "unknown") ? "bad" : "ok"} hint={`7 días ${num(Object.values(r.receipts.counts).reduce((a, b) => a + b, 0))} solicitudes de pago`} />
        <Stat label="Envíos por verificar" value={num(r.deliveries.filter((d) => d.status === "unknown").length)} tone={r.deliveries.some((d) => d.status === "unknown") ? "bad" : "ok"} />
      </div>

      {r.grouping.waiting > 0 && (
        <Card className="mb-5" title="Destacadas esperando revisión de duplicados" right={<span>{num(r.grouping.waiting)} en espera · {num(r.grouping.needsAttention)} con más de 10 minutos</span>} pad={false} scrollable>
          <p className="px-4 py-3 text-[13px] text-ink-3">Estas notas ya cumplen el criterio de destacadas y entran cuando se confirma que no son duplicadas. Se muestran las 30 que más llevan esperando.</p>
          <DataTable dense rows={r.grouping.items} rowKey={(item) => item.articleId} columns={[
            { key: "title", label: "Nota", render: (item) => <Link className="text-accent" to={`/admin/content/${item.articleId}`}>{item.title}</Link> },
            { key: "since", label: "Espera desde", render: (item) => <Time at={item.since} /> },
            { key: "recovery", label: "Siguiente paso", render: (item) => <Badge tone={item.recovery === "manual" ? "bad" : "warn"}>{item.recovery === "manual" ? "Requiere acción para continuar" : item.recovery === "receipt" ? "Esperando el resultado de pago para continuar" : "Procesando en automático"}</Badge> },
            { key: "error", label: "Motivo", render: (item) => <span className="line-clamp-2 text-[12px] text-ink-3">{item.receiptId ? `Recibo #${item.receiptId} · ` : ""}{item.error ?? "Esperando confirmación de identidad"}</span> },
          ]} />
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Cola" pad={false} scrollable>
          <DataTable
            dense
            rows={[...backlog.entries()]}
            rowKey={([name]) => name}
            empty="La cola está vacía"
            columns={[
              { key: "n", label: "Cola", render: ([name]) => <span className="font-mono text-[12.5px]">{name}</span> },
              ...(["created", "retry", "active"] as const).map((st) => ({
                key: st,
                label: STATE_LABEL[st],
                align: "right" as const,
                render: ([, v]: [string, Record<string, { n: number; oldest: string }>]) => (v[st] ? <span title={`Más antigua ${bj(v[st]!.oldest, true)}`}>{num(v[st]!.n)}</span> : <span className="text-ink-4">0</span>),
              })),
              { key: "old", label: "En cola desde", render: ([, v]) => <Time at={v.created?.oldest ?? v.retry?.oldest ?? null} /> },
            ]}
          />
        </Card>
        <Card title="Tareas programadas" pad={false} scrollable>
          <DataTable
            dense
            rows={r.jobs}
            rowKey={(j) => j.job}
            columns={[
              { key: "j", label: "Tarea", render: (j) => <span className="font-mono text-[12.5px]">{j.job}</span> },
              { key: "s", label: "Última", render: (j) => <Badge tone={j.status === "ok" ? "ok" : j.status === "failed" ? "bad" : "muted"} title={j.error ?? undefined}>{j.status ?? "En marcha"}</Badge> },
              { key: "at", label: "Hora", render: (j) => <Time at={j.started_at} /> },
              { key: "d", label: "Tiempo", align: "right", render: (j) => duration(j.started_at, j.finished_at) },
              { key: "f", label: "24h Falla", align: "right", render: (j) => (j.failed_24h ? <span className="text-hot">{j.failed_24h}/{j.runs_24h}</span> : `0/${j.runs_24h}`) },
            ]}
          />
        </Card>
      </div>

      {r.failedJobs.length > 0 && (
        <Card className="mt-5" title="24 horas: tareas de cola con falla" pad={false} scrollable>
          <DataTable
            dense
            rows={r.failedJobs}
            rowKey={(j) => j.name}
            columns={[
              { key: "n", label: "Cola", render: (j) => <span className="font-mono text-[12.5px]">{j.name}</span> },
              { key: "c", label: "Falla", align: "right", render: (j) => num(j.failed) },
              { key: "l", label: "Reciente", render: (j) => <Time at={j.last} /> },
              { key: "o", label: "Último error", render: (j) => <span className="line-clamp-2 font-mono text-[11.5px] text-ink-3">{j.last_output}</span> },
            ]}
          />
        </Card>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Recibos de pago por revisar" right={<span>{Object.entries(r.receipts.counts).map(([k, v]) => `${k} ${v}`).join(" · ")}</span>} pad={false} scrollable>
          <DataTable
            dense
            rows={r.receipts.issues}
            rowKey={(x) => x.id}
            empty="No hay recibos pendientes"
            columns={[
              { key: "id", label: "Recibo", render: (x) => <span className="num">#{x.id}</span> },
              { key: "s", label: "Estado", render: (x) => <Badge tone={x.status === "unknown" ? "bad" : "warn"}>{x.status}</Badge> },
              { key: "w", label: "Servicio", render: (x) => <span className="whitespace-nowrap">{x.service}{x.model ? ` · ${x.model}` : ""}</span> },
              { key: "p", label: "Uso", render: (x) => (x.subject && /^[\w-]{10,}$/.test(x.subject) && x.purpose.includes("analy") ? <Link className="text-accent" to={`/admin/content/${x.subject}`}>{x.purpose}</Link> : x.purpose) },
              { key: "e", label: "Error", render: (x) => <span className="line-clamp-2 text-[12px] text-ink-3" title={x.error ?? ""}>{x.error}</span> },
              { key: "a", label: "", render: (x) => (x.status === "unknown" ? <Button size="sm" onClick={() => setReceipt(x)}>Revisar</Button> : null) },
            ]}
          />
        </Card>
        <Card title="Envíos por verificar" pad={false} scrollable>
          <DataTable
            dense
            rows={r.deliveries}
            rowKey={(d) => d.id}
            empty="No hay envíos pendientes"
            columns={[
              { key: "t", label: "Destino", render: (d) => d.target_key },
              { key: "s", label: "Estado", render: (d) => <Badge tone={d.status === "unknown" ? "bad" : "warn"}>{d.status}</Badge> },
              { key: "sub", label: "Contenido", render: (d) => (d.subject_kind === "selected" ? <Link className="text-accent" to={`/admin/content/${d.subject_id}`}>{d.subject_id}</Link> : `${d.subject_kind} ${d.subject_id}`) },
              { key: "at", label: "Hora", render: (d) => <Time at={d.updated_at} /> },
              { key: "a", label: "", render: (d) => <Button size="sm" onClick={() => setDelivery(d)}>Procesamiento</Button> },
            ]}
          />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Fuentes con retraso o falla" right={<Link className="text-accent" to="/admin/sources?health=failing">Todas las fuentes con falla</Link>} pad={false} scrollable>
          <DataTable
            dense
            rows={r.lagging}
            rowKey={(s) => s.id}
            empty="Todas las fuentes se recolectan a tiempo"
            columns={[
              { key: "n", label: "Fuentes", render: (s) => <Link className="text-ink hover:text-accent" to={`/admin/sources/${encodeURIComponent(s.id)}`}>{s.name}</Link> },
              { key: "h", label: "Salud", render: (s) => <Badge tone={s.health === "failing" ? "bad" : s.health === "degraded" ? "warn" : "muted"}>{s.health}</Badge> },
              { key: "ok", label: "Último éxito", render: (s) => <Time at={s.last_ok_at} /> },
              { key: "nx", label: "Siguiente prevista", render: (s) => <Time at={s.next_fetch_at} /> },
              { key: "e", label: "Error", render: (s) => <span className="line-clamp-1 text-[12px] text-ink-3" title={s.last_error ?? ""}>{s.last_error}</span> },
            ]}
          />
        </Card>
        <Card
          title="Fallas de procesamiento (30 días, por tipo de error)"
          right={
            <span className="flex items-center gap-3">
              {r.retrying.count > 0 && <span>Esperando reintento {num(r.retrying.count)} notas · siguiente <Time at={r.retrying.next} /></span>}
              {r.errors.length > 0 && <Button size="sm" onClick={() => setRequeue("")}>Reprocesar todo</Button>}
            </span>
          }
          pad={false} scrollable
        >
          <DataTable
            dense
            rows={r.errors}
            rowKey={(e) => e.error}
            empty="Sin fallas de procesamiento"
            columns={[
              { key: "e", label: "Error", render: (e) => <span className="font-mono text-[11.5px] text-ink-2">{e.error}</span> },
              { key: "n", label: "Notas", align: "right", render: (e) => num(e.n) },
              { key: "x", label: "Ejemplo", render: (e) => <Link className="text-accent" to={`/admin/content/${e.example}`}>Ver</Link> },
              { key: "l", label: "Reciente", render: (e) => <Time at={e.last} /> },
              { key: "a", label: "", align: "right", render: (e) => <Button size="sm" onClick={() => setRequeue(e.error)}>Reprocesar</Button> },
            ]}
          />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Línea de tiempo de tareas" pad={false} scrollable>
          <DataTable
            dense
            rows={r.timeline}
            rowKey={(t) => t.id}
            columns={[
              { key: "at", label: "Inicio", render: (t) => <span className="num whitespace-nowrap">{bj(t.started_at)}</span> },
              { key: "j", label: "Tarea", render: (t) => <span className="font-mono text-[12px]">{t.job}</span> },
              { key: "s", label: "Resultado", render: (t) => <Badge tone={t.status === "ok" ? "ok" : t.status === "failed" ? "bad" : "muted"} title={t.error ?? undefined}>{t.status ?? "En marcha"}</Badge> },
              { key: "d", label: "Tiempo", align: "right", render: (t) => duration(t.started_at, t.finished_at) },
            ]}
          />
        </Card>
        <Card title="Reporte externo" pad={false} scrollable>
          {r.ingest.length ? (
            <DataTable
              dense
              rows={r.ingest}
              rowKey={(e) => `${e.client}-${e.created_at}`}
              columns={[
                { key: "at", label: "Hora", render: (e) => <Time at={e.created_at} /> },
                { key: "c", label: "Cliente", render: (e) => e.client },
                { key: "k", label: "Tipo", render: (e) => e.kind },
                { key: "s", label: "Resultado", render: (e) => <Badge tone={e.status === "ok" ? "ok" : e.status === "error" ? "bad" : "muted"} title={e.error ?? undefined}>{e.status}</Badge> },
                { key: "x", label: "Resumen", render: (e) => <Json value={e.summary} label="Resumen" /> },
              ]}
            />
          ) : (
            <Empty>Aún no hay reportes externos (scripts de recolección)</Empty>
          )}
        </Card>
      </div>

      {r.processes.length > 0 && (
        <Card className="mt-5" title="Proceso">
          <ul className="grid gap-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
            {r.processes.map((p) => (
              <li key={p.role} className="flex items-center gap-2">
                <Dot tone={p.alive ? "ok" : "bad"} />
                <span className="font-medium">{p.role}</span>
                <span className="text-ink-3">{p.host} · pid {p.pid} · {p.release} · iniciado {bj(p.startedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ReasonDialog
        open={!!receipt}
        title={`Revisar recibo #${receipt?.id ?? ""}`}
        description={"Las solicitudes que siguen desconocidas tras la recuperación automática requieren liberación manual. Revisa el cobro; si no puedes verificarlo pero ya está autorizado, elige \"cobro desconocido\" y anota la autorización. Al liberar se vuelve a llamar y podría cobrarse dos veces."}
        confirmLabel="Registrar y liberar"
        busy={pending === "release"}
        onClose={() => setReceipt(null)}
        onSubmit={async (note) => (await run("POST", `/api/admin/receipts/${receipt!.id}/release`, { billed: billed === "unknown" ? null : billed === "true", note }, { label: "release", success: "Liberado" })) !== null}
      >
        <Field label="¿El proveedor cobró?">
          <Select value={billed} onChange={(e) => setBilled(e.target.value)}>
            <option value="false">No cobró (la solicitud no fue aceptada)</option>
            <option value="true">Cobró (no se recuperó el resultado)</option>
            <option value="unknown">Cobro desconocido (recuperación autorizada)</option>
          </Select>
        </Field>
      </ReasonDialog>
      <ReasonDialog
        open={requeue !== null}
        title={requeue ? "Reprocesar este tipo de falla" : "Reprocesar todas las fallas"}
        description="Estas notas vuelven a la cola de procesamiento (texto, evaluación, publicación). Las llamadas al modelo se cobran de nuevo; lo que el proveedor rechazó puede volver a fallar."
        confirmLabel="Reprocesar"
        busy={pending === "requeue"}
        onClose={() => setRequeue(null)}
        onSubmit={async (reason) => (await run("POST", "/api/admin/processing/requeue", { group: requeue || null, reason }, { label: "requeue", success: "De vuelta en cola" })) !== null}
      />
      <ReasonDialog
        open={!!delivery}
        title="Atender envío"
        description="Confirma primero en el grupo de Feishu si llegó. Reenvía solo si no llegó; en desarrollo no se envía de verdad."
        confirmLabel="Confirmar"
        danger={outcome === "resend"}
        busy={pending === "delivery"}
        onClose={() => setDelivery(null)}
        onSubmit={async (note) => (await run("POST", `/api/admin/deliveries/${delivery!.id}/resolve`, { outcome, note }, { label: "delivery", success: "Atendido" })) !== null}
      >
        <Field label="Resultado">
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            <option value="sent">Llegó al grupo; marcar como entregado</option>
            <option value="drop">No volver a enviar</option>
            <option value="resend">No llegó; reenviar</option>
          </Select>
        </Field>
      </ReasonDialog>
    </AdminPage>
  );
}
