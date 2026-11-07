// The engine's ways in, one panel each: what it is for, the steps to connect, then the details folded away.
// Addresses are the site's configured public address (`base`); what visitors copy carries the site's tag
// (CopyTag) when it has one.
import { Fragment, useState } from "react";
import { Link } from "react-router";
import { PUBLIC_INTERFACE_VERSION } from "@aihot/contracts/http-policy";
import { MCP_TOOL_NAMES as T, MCP_TOOLS } from "@aihot/contracts/mcp";
import { feedCategoryLabel, PUBLIC_API_CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import { ACCESS, AGENT, EDITION_WHEN, POLICY, REPORTS, SITE, subjectAfter, withSubject } from "@aihot/site";
import { CodeBlock, CopyButton } from "./CodeBlock";
import { PillTabs } from "../../components/ui/Tabs";
import type { AgentPanelProps } from "../../modules";
import { AGENT_PARTS, GUIDE_CLIENTS, TAG } from "./module-parts";
import { Address, Ask, Block, Bullets, Details, Mono, PanelHead, Step, Steps, Table, Tips } from "./parts";

const V = PUBLIC_INTERFACE_VERSION;

/** Every MCP tool: the engine's and the modules'. */
export const mcpToolCount = () => MCP_TOOLS.length + AGENT_PARTS.reduce((n, a) => n + (a.tools?.length ?? 0), 0);
const link = "text-accent hover:underline";

/** An address on this site as the copy buttons copy it, with the tag. */
function addressOf({ base, tag }: AgentPanelProps, path: string): string {
  return TAG && tag ? `${base}${path}?${TAG.query}=${tag}` : `${base}${path}`;
}

const MCP_CLIENTS = [
  { key: "claude", label: "Claude Code" },
  { key: "codex", label: "Codex" },
  { key: "json", label: "Configuración JSON" },
  { key: "other", label: "Otros clientes" },
] as const;

export function McpPanel(props: AgentPanelProps) {
  const url = addressOf(props, "/api/mcp");
  const name = SITE.mcpPrefix;
  const [client, setClient] = useState<string>("claude");
  return (
    <>
      <PanelHead label={`MCP · ${V}`} title={`Agrega una dirección y tu agente obtiene ${mcpToolCount()} herramientas`}>
        Streamable HTTP estándar, anónimo y de solo lectura, sin token y sin leer tu sesión. Funciona con clientes que admiten MCP remoto, como Claude Desktop, Cursor o Cherry Studio.
      </PanelHead>
      <Steps>
        <Step n={1} title="Copia la dirección del servicio">
          <Address url={url} />
          {TAG && <p className="mt-2 text-[13px] text-ink-3">{TAG.mcp}</p>}
        </Step>
        <Step n={2} title="Agrégala a tu cliente">
          <PillTabs className="mt-3" size="xs" layoutId="agent-mcp-client" label="Cliente" active={client} onSelect={setClient} items={MCP_CLIENTS.map((c) => ({ key: c.key, label: c.label }))} />
          {client === "claude" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`claude mcp add --transport http ${name} '${url}'`} />}
          {client === "codex" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`codex mcp add ${name} --url '${url}'`} />}
          {client === "json" && <CodeBlock className="mb-0 mt-3" title="Cursor, Cherry Studio y otros clientes que se configuran con JSON" lang="json" code={JSON.stringify({ mcpServers: { [name]: { type: "http", url } } }, null, 2)} />}
          {client === "other" && <p className="mt-3">{`En la configuración de MCP o de conectores de tu cliente crea una entrada nueva: nombre ${name}, dirección la de arriba, autenticación "ninguna" y sin API key. Si tu cliente solo admite comandos locales, usa primero su proxy de MCP remoto.`}</p>}
        </Step>
        <Step n={3} title="Pide a tu agente que lo use una vez">
          <Ask text={`Usa ${T.latest} y dime las 5 notas más importantes de las últimas 24 horas, con sus enlaces de ${SITE.name}.`} />
          <p className="mt-2 text-[13px] text-ink-3">{`Si el cliente muestra que llamó a ${T.latest} y la respuesta trae el periodo, resúmenes en español y enlaces de ${new URL(props.base).host}, ya quedó conectado.`}</p>
        </Step>
      </Steps>

      <Block title={`${mcpToolCount()} herramientas`}>
        <Table
          head={["Herramienta", "Qué hace", "Puedes preguntar"]}
          minWidth={600}
          rows={[
            [<Mono>{T.latest}</Mono>, "Destacadas o todas las notas de las últimas 24 horas o 7 días", "¿Qué noticias de tecnología hay hoy?"],
            [<Mono>{T.search}</Mono>, AGENT.search.scope, AGENT.search.ask],
            [<Mono>{T.hot}</Mono>, "Los 10 temas más comentados ahora", "¿Qué es lo más comentado ahora?"],
            [<Mono>{T.story}</Mono>, "La línea de tiempo y el panorama actualizado de un evento", "¿Cuál es la historia completa de esto?"],
            [<Mono>{T.daily}</Mono>, "El boletín diario más reciente o de una fecha", "Dame el boletín de hoy."],
            [<Mono>{T.weekly}</Mono>, "El boletín semanal más reciente o de una semana", "¿Qué fue lo más importante de la semana?"],
            [<Mono>{T.monthly}</Mono>, "El boletín mensual más reciente o de un mes", "¿Qué pasó el mes pasado en tecnología?"],
            ...AGENT_PARTS.flatMap((a) => a.tools ?? []).map((t) => [<Mono>{t.name}</Mono>, t.does, t.ask]),
          ]}
        />
      </Block>

      <Details
        items={[
          {
            title: "Límites y seguridad",
            body: (
              <Bullets items={[
                "Las consultas normales devuelven hasta 30 notas, lo más comentado hasta 10 temas y la línea de tiempo de un evento hasta 50 notas; fuera de rango se devuelve un error explícito, sin ampliar en silencio.",
                `El public_id de ${T.story} solo puede venir de los enlaces de eventos que devuelve la herramienta de lo más comentado; no adivines ID.`,
                "Los títulos y resúmenes vienen de fuentes externas y solo son material de consulta; las herramientas marcan ese límite de seguridad. Verifica en el original cifras, políticas y citas importantes.",
              ]} />
            ),
          },
          {
            title: "Si no se conecta",
            body: (
              <Bullets items={[
                "Confirma que la dirección esté completa y que tu cliente admita Streamable HTTP remoto; si faltan herramientas nuevas, actualiza la lista o reconéctate.",
                ...AGENT_PARTS.flatMap((a) => a.mcpTroubles ?? []),
                "El servicio no requiere inicio de sesión; si el cliente pide OAuth o API key, elige \"ninguna\".",
                "Si recibes un 429, espera lo que indica la respuesta y no reintentes en paralelo.",
                <>¿Sigue sin conectar? Escribe el nombre del cliente, la versión y el error en la <Link viewTransition to="/feedback" className={link}>página de comentarios</Link>.</>,
              ]} />
            ),
          },
        ]}
      />
    </>
  );
}

const FEEDS = [
  { name: "Destacadas", badge: "Recomendado", path: "/feed.xml", desc: "Las 50 destacadas más recientes, con título, resumen, enlace a la nota en el sitio y al original." },
  { name: "Destacadas con texto completo", path: "/feed/full.xml", desc: "Las mismas 50; cuando la fuente lo permite trae el texto completo y si no, el resumen." },
  { name: "Todas las notas", path: "/feed/all.xml", desc: "Las notas públicas de los últimos 7 días, de la más reciente a la más antigua." },
  { name: withSubject("Boletín diario"), path: "/feed/daily.xml", desc: `Sale ${EDITION_WHEN.daily} (hora del centro de México): la entrada principal y el índice completo; conserva los últimos 30 números.` },
  { name: withSubject("Boletín semanal"), path: "/feed/weekly.xml", desc: `Sale ${EDITION_WHEN.weekly} (hora del centro de México): un panorama y las ${REPORTS.entry.noun} por sección; conserva los últimos 12 números.` },
  { name: withSubject("Boletín mensual"), path: "/feed/monthly.xml", desc: `Sale ${EDITION_WHEN.monthly} (hora del centro de México): un panorama y las ${REPORTS.entry.noun} por sección; conserva los últimos 12 números.` },
];

/** The category feeds, under the names the feeds themselves use. */
const FEED_CATEGORIES = PUBLIC_API_CATEGORY_KEYS.map((key) => [key, feedCategoryLabel(key)] as const);

export function RssPanel(props: AgentPanelProps) {
  const { base } = props;
  const lead = `${["Compatible con los lectores RSS 2.0 más comunes y con herramientas de automatización como n8n o Zapier. Las direcciones no cambian", ...AGENT_PARTS.flatMap((a) => a.rssLead ?? [])].join("; ")}.`;
  return (
    <>
      <PanelHead label="RSS" title="Copia la dirección y suscríbete con tu lector de RSS">
        {lead}
      </PanelHead>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEEDS.map((f) => (
          <div key={f.path} className="card flex flex-col p-4">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{f.name}</span>
              {f.badge && <span className="inline-flex h-[18px] items-center rounded-full bg-accent-soft px-2 text-[11px] font-medium text-accent">{f.badge}</span>}
            </div>
            <p className="mt-1 flex-1 text-[13px] leading-[1.7] text-ink-3">{f.desc}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line-soft pt-3">
              <code className="mono min-w-0 flex-1 truncate text-[12px] text-ink-4">{base}{f.path}</code>
              <CopyButton text={addressOf(props, f.path)} label="Copiar dirección" className="shrink-0" />
            </div>
          </div>
        ))}
      </div>
      {TAG && <p className="mt-3 text-[12.5px] text-ink-4">{TAG.rss}</p>}

      <Block title="Suscripción por sección">
        <Table
          head={["Sección", "Resumen", "Texto completo"]}
          minWidth={420}
          rows={FEED_CATEGORIES.map(([slug, label]) => [
            <span className="font-medium text-ink">{label}</span>,
            <span className="inline-flex items-center gap-2"><Mono>{`/feed/category/${slug}.xml`}</Mono><CopyButton text={addressOf(props, `/feed/category/${slug}.xml`)} className="!h-6 !px-1.5" /></span>,
            <span className="inline-flex items-center gap-2"><Mono>{`/feed/full/category/${slug}.xml`}</Mono><CopyButton text={addressOf(props, `/feed/full/category/${slug}.xml`)} className="!h-6 !px-1.5" /></span>,
          ])}
        />
      </Block>

      <Block title="Cada cuánto actualizar">
        <p>El lector pregunta con el ETag anterior y, si nada cambió, recibe un 304 muy pequeño sin volver a descargar. Basta con actualizar cada 30 minutos; más seguido no trae contenido nuevo.</p>
        <p className="mt-3 text-[13px] text-ink-3">{`Los enlaces llevan a la nota en el sitio y el enlace al original va en el resumen. Poder suscribirse de forma anónima no autoriza cualquier uso${POLICY.terms.notes ? `: ${POLICY.terms.notes.rss}` : ""}; consulta los `}<Link viewTransition to="/terms" className={link}>{POLICY.terms.name}</Link>。</p>
      </Block>
    </>
  );
}

const RECIPES = [
  { key: "latest", label: "Seguir lo más reciente" },
  { key: "sync", label: "Sincronizar todas las destacadas" },
];

export function ApiPanel(props: AgentPanelProps) {
  const { base, tag } = props;
  const userAgent = [ACCESS.userAgent, TAG && tag ? TAG.userAgent(tag) : null].filter(Boolean).join(" ");
  const curl = `curl --compressed${userAgent ? ` -A '${userAgent}'` : ""}`;
  let pace = `Cada cuánto cambia: las notas nuevas llegan todo el día, las destacadas cambian de varias a decenas de veces al día, y los boletines salen ${EDITION_WHEN.daily} (diario), ${EDITION_WHEN.weekly} (semanal) y ${EDITION_WHEN.monthly} (mensual), en hora del centro de México.`;
  if (ACCESS.ratePerMinute) pace += ` Una misma IP que pase de unas ${ACCESS.ratePerMinute} solicitudes por minuto recibe un 429; espera lo que indique Retry-After y no reintentes en paralelo.`;
  const [recipe, setRecipe] = useState<string>("latest");
  const recipes = AGENT_PARTS.flatMap((a) => a.recipes ?? []);
  const items = `${base}/api/v1/items?mode=selected&window=24h&limit=20`;
  return (
    <>
      <PanelHead label={`REST API · ${V}`} title="GET anónimo, listo para usar">
        Sin token; funciona directo desde el navegador con CORS, con curl y con el cliente HTTP de cualquier lenguaje. La ruta es /api/v1 y los campos y códigos de error se definen en el <a href="/openapi-v1.json" className={link}>OpenAPI</a>.
      </PanelHead>
      <CodeBlock className="mt-6" title="Primera solicitud" lang="bash" code={`${curl} '${items}'`} />

      <Block title="Filtrar por sección">
        <p>Agrega <Mono>category</Mono> a la solicitud para traer solo esa sección; sin él se incluyen todas. El campo <Mono>category</Mono> de cada nota usa los mismos valores de esta tabla.</p>
        <Table head={["Sección", "Parámetro"]} rows={FEED_CATEGORIES.map(([key, name]) => [name, <Mono>{`category=${key}`}</Mono>])} />
      </Block>

      <Block title="Más rápido y con menos datos">
        <Tips
          items={[
            { title: "Usa compresión", text: <>Agrega <Mono>--compressed</Mono> a curl o activa gzip o br en tu cliente. El JSON comprimido pesa entre 1/4 y 1/8 del original.</> },
            { title: "Envía el ETag", text: <>Guarda el ETag de la respuesta y mándalo después en <Mono>If-None-Match</Mono>; si nada cambió recibes un 304 sin cuerpo.</> },
            { title: "Consulta con ritmo", text: `Notas y lo más comentado como máximo cada minuto; el boletín diario una vez después de que sale ${EDITION_WHEN.daily}, y los boletines semanal y mensual una vez al publicarse; al paginar hacia atrás, detente en la primera nota que ya tengas.` },
          ]}
        />
        <p className="mt-3 text-[13px] leading-[1.75] text-ink-3">{pace}</p>
      </Block>

      <Block title="Rutas disponibles">
        <Table
          head={["Ruta", "Para qué sirve", "Cada cuánto"]}
          minWidth={640}
          rows={[
            { group: "Notas" },
            [<Mono>/api/v1/items</Mono>, "Destacadas o todas las notas de los últimos 7 días, con filtros por sección, periodo y palabra clave", "Máximo cada minuto"],
            { group: "Lo más comentado y eventos" },
            [<Mono>/api/v1/hot-topics</Mono>, "Los 10 temas más comentados ahora", "Máximo cada minuto"],
            [<Mono>{"/api/v1/stories/{publicId}"}</Mono>, "La línea de tiempo, el panorama por IA y los eventos relacionados de un evento", "Cuando se necesite"],
            { group: "Boletín diario" },
            [<Mono>/api/v1/dailies/latest</Mono>, "El boletín diario más reciente", `Una vez, después de que sale ${EDITION_WHEN.daily}`],
            [<Mono>{"/api/v1/dailies/{date}"}</Mono>, "El boletín de una fecha; las notas retiradas se quitan", "Valida el ETag cuando expire la caché"],
            [<Mono>/api/v1/dailies</Mono>, "Índice de fechas de boletines diarios", "Una vez al día"],
            { group: "Boletines semanal y mensual" },
            [<Mono>/api/v1/weeklies/latest</Mono>, "El boletín semanal más reciente: principal, panorama y lo clave de la semana por sección", `Una vez, después de que sale ${EDITION_WHEN.weekly}`],
            [<Mono>{"/api/v1/weeklies/{week}"}</Mono>, "Una semana específica en formato ISO, como 2026-W39; las notas retiradas se quitan", "Valida el ETag cuando expire la caché"],
            [<Mono>/api/v1/weeklies</Mono>, "Índice de boletines semanales", "Una vez a la semana"],
            [<Mono>/api/v1/monthlies/latest</Mono>, "El boletín mensual más reciente", `Una vez, después de que sale ${EDITION_WHEN.monthly}`],
            [<Mono>{"/api/v1/monthlies/{month}"}</Mono>, "Un mes específico, como 2026-09", "Valida el ETag cuando expire la caché"],
            [<Mono>/api/v1/monthlies</Mono>, "Índice de boletines mensuales", "Una vez al mes"],
            ...AGENT_PARTS.flatMap((a) => (a.api ? [{ group: a.api.group }, ...a.api.rows.map(([path, does, often]) => [<Mono>{path}</Mono>, does, often])] : [])),
            { group: "Para asistentes de IA" },
            [<Mono>/api/v1/agent</Mono>, `Instrucciones para agentes; las direcciones listadas devuelven Markdown en español listo para usar${GUIDE_CLIENTS ? `; ${GUIDE_CLIENTS} las usa` : ""}`, "Cuando se necesite"],
            { group: "Sincronización completa de destacadas" },
            [<Mono>/api/v1/selected/snapshot</Mono>, "Todas las destacadas actuales, completas por páginas", "Solo la primera vez"],
            [<Mono>/api/v1/selected/changes</Mono>, "Lo agregado, modificado o retirado desde entonces", "Cada pocos minutos"],
          ]}
        />
      </Block>

      <Block title="Usos comunes">
        <PillTabs size="xs" layoutId="agent-api-recipe" label="Uso" active={recipe} onSelect={setRecipe} items={[...RECIPES, ...recipes].map((r) => ({ key: r.key, label: r.label }))} />
        {recipe === "latest" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={`# La primera vez: guarda el ETag del encabezado de la respuesta\n${curl} -i '${items}'\n# Después, máximo cada minuto y con el ETag; un 304 significa que no hubo cambios\n${curl} -i -H 'If-None-Match: <ETag anterior>' '${items}'`} />
            <p>Para paginar hacia atrás, envía <Mono>page.nextCursor</Mono> como cursor y detente en la primera nota que ya tengas; no recorras los 7 días cada vez.</p>
          </>
        )}
        {recipe === "sync" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={`# La primera vez: trae todo por páginas y guarda el cursor de la primera respuesta (es el mismo en todas)\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500'\n# Mientras hasMore sea true, sigue con nextPage hasta terminar\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500&page=<nextPage anterior>'\n# Después: envía el cursor tal cual y recibe solo lo agregado, modificado o retirado\n${curl} '${base}/api/v1/selected/changes?cursor=<cursor de la primera página>&limit=100'`} />
            <p>Guarda el nuevo cursor solo después de escribir cada página en tu sistema. El cursor marca tu posición y no caduca; si recibes 409 <Mono>snapshot_required</Mono>, vuelve a traer la copia completa y no perderás datos.</p>
          </>
        )}
        {recipes.map((r) => recipe === r.key && <r.Body key={r.key} base={base} curl={curl} />)}
      </Block>

      <Block title="Si algo falla" id="agent-api-recovery">
        <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-2.5">
          <dt className="mono text-[13px] text-ink">400</dt>
          <dd>Parámetros incorrectos: corrígelos según el OpenAPI y el code devuelto, sin cambiar a una consulta más amplia. Si el cursor no es válido o salió del periodo recibes invalid_cursor; empieza otra vez desde la primera página.</dd>
          <dt className="mono text-[13px] text-ink">409</dt>
          <dd>snapshot_required: no se puede continuar con seguridad; vuelve a traer la copia completa.</dd>
          <dt className="mono text-[13px] text-ink">429</dt>
          <dd>Demasiadas solicitudes: espera lo que indique Retry-After y no reintentes en paralelo.</dd>
          <dt className="mono text-[13px] text-ink">5xx</dt>
          <dd>Reintenta con espera exponencial y usa mientras tanto el último resultado válido; el servicio público no garantiza SLA.</dd>
          {AGENT_PARTS.flatMap((a) => a.apiErrors ?? []).map(([status, what]) => (
            <Fragment key={status}>
              <dt className="mono text-[13px] text-ink">{status}</dt>
              <dd>{what}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-4 text-[13px] text-ink-3">{`Poder usarlo de forma anónima no autoriza cualquier uso${POLICY.terms.notes ? `: ${POLICY.terms.notes.api}` : ""}; consulta los `}<Link viewTransition to="/terms" className={link}>{POLICY.terms.name}</Link>。</p>
      </Block>

    </>
  );
}
