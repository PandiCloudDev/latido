// Identidad del sitio y textos que ve el lector. Para adaptarlo a otro sector, empieza por este archivo.
// Lo leen la web y el backend; después de cambiarlo, reconstruye (docker compose up --build).
// El dominio no va aquí: se define al desplegar con la variable de entorno SITE_URL.

import type { Founder } from "@aihot/contracts/site-config";
import { LOCALE } from "./locale.ts";

/**
 * A qué hora salen los boletines (hora del sitio, site/locale.ts, HH:mm): el diario cubre las 24 horas anteriores a esa
 * hora, el semanal sale el lunes siguiente a cada semana y el mensual el día 1 de cada mes. Lo leen la programación, las
 * ventanas de cada número, las alertas de números faltantes y todos los textos que mencionan horarios (los archivos de
 * public/ usan {{dailyTime}}, {{weeklyTime}}, {{monthlyTime}}); la programación revisa cada media hora, así que usa horas o medias horas.
 */
export const EDITION_TIMES = { daily: "08:00", weekly: "10:00", monthly: "10:30" };

/** "todos los días a las 08:00", "los lunes a las 10:00", "el día 1 de cada mes a las 10:30": el horario dentro de una oración. */
export const EDITION_WHEN = {
  daily: `todos los días a las ${EDITION_TIMES.daily}`,
  weekly: `los lunes a las ${EDITION_TIMES.weekly}`,
  monthly: `el día 1 de cada mes a las ${EDITION_TIMES.monthly}`,
};

export const SITE = {
  /** Nombre del sitio: navegación, títulos, imágenes para compartir, RSS, MCP y panel. */
  name: "Latido",
  /** El tema del sitio; en español va implícito en la marca y casi no se antepone a los nombres. */
  subject: "tecnología, negocios, energía y electromovilidad",
  /** Título completo de la portada (pestaña del navegador, resultados de búsqueda). */
  homeTitle: "Latido: tecnología, negocios, energía y electromovilidad en México y Latinoamérica",
  /** Título del índice de temas (/topics). */
  topicsTitle: "Temas de Latido: empresas, tecnologías y tipos de noticia",
  /** Ejemplo dentro del campo del formulario de comentarios. */
  feedbackExample: "Por ejemplo: al buscar cierta palabra me pasó que… y lo que esperaba era…",
  /** Una línea bajo el título de la página de comentarios. */
  feedbackLead: "Cuéntanos de errores, funciones que te gustaría ver o cualquier cosa que no te convenza.",
  /** Indicación en el campo de correo del formulario de comentarios. */
  feedbackEmailHint: "Déjanos tu correo si quieres que te respondamos",
  /** Descripción de una línea: buscadores, tarjetas para compartir, RSS y llms.txt. */
  description: `Latido revisa noticias de tecnología, negocios, energía y electromovilidad, agrupa las notas que cuentan lo mismo y selecciona lo que vale la pena leer, con un boletín ${EDITION_WHEN.daily}.`,
  /** Presentación más larga bajo la descripción en llms.txt (opcional). */
  llmsIntro: "Latido es un radar de tecnología, negocios, energía y electromovilidad en español, con prioridad en México y Latinoamérica." as string | null,
  /** Una línea pequeña: imágenes para compartir y pósters. */
  tagline: "El pulso de la innovación en México y Latinoamérica",
  /** Palabras clave para buscadores (datos estructurados de la portada). */
  keywords: ["noticias de tecnología", "tecnología México", "tecnología Latinoamérica", "inteligencia artificial", "startups", "gadgets", "boletín de tecnología", "negocios", "energía", "electromovilidad"] as string[],
  /** Año en que el sitio empezó a reunir notas (datos estructurados, opcional). */
  since: "2026" as string | null,
  /** Idioma de la interfaz (HTML lang, og:locale). */
  locale: LOCALE.htmlLang,
  /** Dominio predeterminado, solo si no se define SITE_URL. */
  defaultUrl: "https://latido.news",
  /** Íconos adicionales en la raíz del sitio, aparte de los estándar (opcional). */
  rootIcons: [] as string[],
  /**
   * Prefijo de las herramientas MCP (minúsculas, números, guion bajo): latido_get_latest, latido_search…
   * Una vez que alguien se conecte, no lo cambies.
   */
  mcpPrefix: "latido",
  /**
   * Versión de las interfaces públicas (MCP, OpenAPI, llms.txt); solo sube.
   * Sube la versión mayor cuando cambie un campo o el sentido de uno existente, y anótalo en las notas de despliegue.
   */
  interfaceVersion: "4.0.0",
  /** Correo de contacto público (opcional): aparece en llms.txt y en las instrucciones para agentes. */
  contactEmail: "monitor@pandi.cloud" as string | null,
  /** Una línea pequeña al pie de la página "Acerca de" (opcional). */
  footerNote: "Un proyecto de Pandi.Cloud, desarrollador mexicano independiente, construido sobre el motor de código abierto AIHOT",
  /** Registro ICP de sitios en China continental (no aplica). */
  icp: null as string | null,
  /** Registro de seguridad pública de China continental (no aplica). */
  psb: null as string | null,
  /** Repositorio de GitHub del código (opcional): si se llena, aparece "Código abierto en GitHub" al pie del menú. */
  github: null as string | null,
  /** Operador del sitio en los datos estructurados (buscadores). */
  organization: {
    name: "Pandi.Cloud",
    /** Fundador (opcional). */
    founder: null as Founder | null,
  },
  /** Nombre y versión con que el sitio se identifica al leer fuentes (User-Agent); no uses el de otro sitio. */
  crawlerName: "LatidoBot/1.0 (+https://latido.news)",
} as const;

/** Las páginas de términos de uso y aviso de privacidad (el texto está en pages/). */
export const POLICY = {
  terms: {
    /** Nombre de la página: navegación, pie y título. */
    name: "Términos de uso",
    description: "Términos de uso del sitio, los RSS, la API pública y el MCP de Latido.",
    /** Una línea sobre esta página en llms.txt (opcional). */
    covers: null as string | null,
    /** Recordatorios de uso en las columnas de RSS y API de la página para agentes (opcional). */
    notes: null as null | { rss: string; api: string },
    /** Qué usos requieren autorización previa (opcional). */
    license: null as null | { llms: string; agent: string },
    /** Encabezados de respuesta que declaran los términos en la API, los RSS y el OpenAPI (opcional). */
    headers: null as null | Record<string, string>,
  },
  privacy: {
    description: "Cómo trata Latido los datos locales del navegador, los comentarios y los registros de acceso.",
    /** Una línea sobre esta página en llms.txt (opcional). */
    covers: null as string | null,
  },
  /**
   * Si el texto e imágenes de una publicación de X cuentan como texto completo: si cuentan, solo se muestran cuando esa nota
   * permite texto completo en el sitio; si no, se muestran siempre, como el título y el resumen.
   */
  xPostIsFullText: true,
} as const;

/** Navegación (menú lateral en computadora, barra inferior en el teléfono, página "Más"). */
export const NAV = {
  /** Entradas del motor que no van en la navegación; por ahora solo "/hot" y "/topics". Las páginas siguen abriendo. */
  hidden: [] as Array<"/hot" | "/topics">,
};

/** Algunas expresiones y opciones de las tarjetas y la página de cada nota. */
export const ITEM_COPY = {
  /** Cómo se llama la frase de valor que escribe el modelo: tarjetas, detalle, exportación, respuestas a agentes y avisos. */
  reasonLabel: "Por qué leerla",
  /** Si el lector ve la calificación de IA en la web y en las imágenes para compartir. Solo controla la visualización. */
  showScore: true,
};

/** Una tarjeta con código QR en la página "Acerca de". */
interface ContactCard {
  kind: string;
  title: string;
  note: string;
  /** Nombre de archivo en la raíz al que enlazan sitios externos (opcional). */
  alias?: string;
}

/** Textos de la página "Acerca de". Las cifras (fuentes, notas reunidas, destacadas, boletines) son estadísticas en vivo. */
export const ABOUT = {
  kicker: `Acerca de ${SITE.name}`,
  /** Descripción de la página (buscadores, tarjetas para compartir). */
  description: `Acerca de ${SITE.name}: ${SITE.description}`,
  /** Titular: la primera línea en color normal, la segunda en color de acento. */
  headline: ["Cada día pasan cientos de cosas.", "Las que importan son unas cuantas."] as [string, string],
  /** Párrafo bajo el titular. {sources} se cambia por el número de fuentes en vivo (con espacios automáticos); si no hay estadística, por sourcesFallback. */
  lead: `${SITE.name} sigue por ti{sources}fuentes: las lee, agrupa, califica y selecciona, y publica un boletín ${EDITION_WHEN.daily}. Gratis y sin registro. Latido es un proyecto de Pandi.Cloud, un desarrollador mexicano independiente que no tiene vínculos con ninguna empresa editorial.`,
  sourcesFallback: "decenas de",
  /** Los cuatro pasos bajo la animación del río de fuentes. */
  steps: {
    collect: "Lee los feeds de blogs oficiales, medios y portales especializados; las fuentes que publican más seguido se revisan más seguido, hasta cada 15 minutos.",
    store: "Guarda todo lo que encuentra y agrupa las notas que cuentan lo mismo; de ahí sale el ranking de lo más comentado.",
    select: `Un modelo revisa primero si la nota es del tema y si trae información real, y luego escribe el título, el resumen y el "${ITEM_COPY.reasonLabel}" en español; la publicidad y los reenvíos repetidos no pasan.`,
    publish: `El boletín diario sale ${EDITION_WHEN.daily}, el semanal ${EDITION_WHEN.weekly} y el mensual ${EDITION_WHEN.monthly}.`,
  },
  /** Bloque del autor (opcional); null no lo muestra. */
  maker: null as null | {
    name: string;
    avatarSourceId?: string | null;
    greeting: string[];
    wechat?: ContactCard;
    feishu?: ContactCard;
  },
  /** Aviso de derechos y retiro al pie de la página, con el enlace a la página de comentarios en medio. */
  copyright: [`${SITE.name} es un índice de lectura con resúmenes; los derechos de cada nota pertenecen a su fuente. Si representas a una fuente y quieres una corrección, el retiro de una nota o cambiar cómo se muestra, puedes`, "escribirnos."] as [string, string],
  /** Ancla del enlace a los términos al pie (opcional). */
  termsAnchor: null as string | null,
} as const;

/** Avisos para el administrador en el panel (opcional). */
export const ADMIN = {
  /** Una línea bajo el título de la página "Comentarios". */
  feedbackNote: null as string | null,
  /** Regla del sitio agregada al confirmar el bloqueo de quien envía comentarios. */
  banNote: null as string | null,
  /** Regla del sitio agregada al ajustar el límite de un servicio de pago. */
  budgetNote: null as string | null,
};

/** Ejemplos de la página para conectar agentes. */
export const AGENT = {
  /** La fila "buscar" de la tabla de herramientas MCP: qué se busca y cómo preguntar. */
  search: { scope: "busca por empresa, producto, persona o tema en los últimos 7 días", ask: "¿Qué anunció esta empresa últimamente?" },
};

/** Expresiones de los boletines diario, semanal y mensual. */
export const REPORTS = {
  /** La línea del editor bajo la cabecera. */
  imprint: SITE.name.toUpperCase(),
  /** Una palabra junto a la cabecera. */
  motto: "Noticias" as string,
  /** Descripción de cada tipo de boletín (buscadores, tarjetas), sin punto final; también la usa llms.txt. */
  descriptions: {
    daily: `El boletín diario de ${SITE.name} con lo más importante de los cuatro sectores, publicado ${EDITION_WHEN.daily} (${LOCALE.timeZoneLabel})`,
    weekly: "El repaso semanal de lo más importante en tecnología, negocios, energía y electromovilidad",
    monthly: "El balance mensual de tecnología, negocios, energía y electromovilidad",
  },
  /** Cómo se llama cada elemento de un número ("4 noticias clave"): títulos sin encabezado, conteos y descripciones. */
  entry: { measure: "", noun: "noticias clave" },
  /** Unidades de las demás cifras de la cabecera; también se usan en "Acerca de" y en los temas. */
  metricUnits: { sourcesCount: " fuentes", firstPartyEvents: " anuncios oficiales", selectedCount: " destacadas", reportsCovered: " boletines" },
  /** Cómo se dice "cuántas" en la imagen para compartir del boletín. */
  shareUnit: " noticias clave",
  /** Título y entrada cuando en el periodo se evaluaron notas pero ninguna fue noticia clave nueva. */
  quiet: { title: "Un día tranquilo, sin noticias clave", paragraph: `Entre {start} y {end} (${LOCALE.timeZoneLabel}) no hubo noticias clave nuevas.` },
};

/** Expresiones de las alertas de operación (solo para el administrador). */
export const ALERTS = {
  /** Minutos sin notas nuevas antes de alertar que el sitio dejó de recibir contenido (máximo un día); ALERT_QUIET_MINUTES tiene prioridad. */
  quietMinutes: 360,
  /** Minutos antes de alertar cuando las fuentes se leen bien pero no hay notas nuevas (máximo un día). */
  quietWhileFetchingMinutes: 720,
  /** Frase con el volumen habitual dentro de esa alerta; null no la escribe. */
  usualFlow: null as string | null,
  /** En la alerta de worker detenido, cómo ver sus registros. */
  workerLogs: "revisa los registros del worker (docker compose -p pandiradar logs worker)",
};

/** Opciones predeterminadas al crear una fuente en el panel. */
export const SOURCE_DEFAULTS = {
  /** Mostrar el texto completo en el sitio; con false solo se muestra el resumen y el enlace al original. */
  siteFulltext: false,
};

/** Fuentes de comunidades (id de fuente): para la popularidad cada cuenta cuenta como fuente independiente. dev es dev.to y hn es Hacker News. */
export const COMMUNITY_FEEDS: { dev: string[]; hn: string[] } = {
  dev: [],
  hn: [],
};

/** Texto de las imágenes para compartir de cada página (/og/pages/*.png). */
export const CARDS: Record<string, { kicker: string; title: string; subtitle: string; accent?: "hot" | "amber" }> = {
  site: { kicker: "Lo destacado del día", title: SITE.tagline, subtitle: "Lo que importa en los cuatro sectores, seleccionado y resumido en español cada día." },
  all: { kicker: "Todas las notas", title: "Lo último de todas las fuentes, en un solo lugar", subtitle: "Las notas de todas las fuentes por orden de llegada, con filtros por sección y etiqueta." },
  hot: { kicker: "Lo más comentado", title: "De qué se está hablando en las últimas 48 horas", subtitle: "Índice de popularidad, tendencia y las fuentes públicas que la forman.", accent: "hot" },
  daily: { kicker: "Boletín diario", title: `Cada día a las ${spokenTime(EDITION_TIMES.daily)}, un boletín que sí terminas de leer`, subtitle: "Lo que valió la pena del día anterior." },
  weekly: { kicker: "Boletín semanal", title: "Las noticias clave de la semana, de un vistazo", subtitle: "Las líneas principales, los lanzamientos importantes y lo que vale la pena volver a ver." },
  monthly: { kicker: "Boletín mensual", title: "Lo que cambió en el mes", subtitle: "Las líneas del mes y los eventos clave." },
  about: { kicker: "Acerca de", title: `Acerca de ${SITE.name}`, subtitle: SITE.description },
  terms: { kicker: "Términos de uso", title: `Términos de uso de ${SITE.name}`, subtitle: "Alcance de uso del sitio, la API, los RSS y el MCP." },
  privacy: { kicker: "Aviso de privacidad", title: `Aviso de privacidad de ${SITE.name}`, subtitle: "Registros de acceso, datos locales del navegador y comentarios." },
  changelog: { kicker: "Novedades", title: `Novedades de ${SITE.name}`, subtitle: "Funciones nuevas, mejoras, avisos y retiros." },
  feedback: { kicker: "Comentarios", title: "Dinos qué podemos mejorar", subtitle: "Contenido, funciones, integraciones, o correcciones y retiros para fuentes." },
  agent: { kicker: "Conecta tu agente", title: `Conecta ${SITE.name} a tu agente de IA`, subtitle: "MCP, RSS o API, anónimo y de solo lectura, sin API key." },
};

/** Condiciones de acceso a las interfaces públicas que cambian según el despliegue. */
export const ACCESS = {
  /** Solicitudes por minuto por IP antes de un 429 con Retry-After (opcional); null no limita. */
  ratePerMinute: null as number | null,
  /** User-Agent que se pide a quien sincronice datos por programa (opcional). */
  userAgent: null as string | null,
};

/** Ajustes propios de este despliegue (opcional). */
export const DEPLOYMENT = {
  /** Directorio predeterminado de los archivos de credenciales por grupo (models.env, collectors.env…), relativo a la raíz del repositorio; la variable AIHOT_CREDENTIALS_DIR tiene prioridad y, si no hay ninguno, solo se leen variables de entorno. */
  credentialsDir: null as string | null,
  /** Nombres de archivo de los grupos de credenciales (dentro del directorio de credenciales, opcional): los grupos no listados usan "grupo.env", por ejemplo models.env. */
  credentialFiles: {} as Partial<Record<string, string>>,
  /** Credenciales adicionales que exige este despliegue ([grupo, variable de entorno]); se verifican al arrancar la API de producción y de forma predeterminada no hay ninguna. */
  requiredSecrets: [] as const,
  /** Host que recibe la api en producción (el dominio con que la CDN consulta el origen, opcional); en desarrollo local, las peticiones que el servidor de desarrollo web pasa a la api también lo usan, igual que en producción. */
  originHost: null as string | null,
  /** Encabezado con el que el proxy inverso envía la dirección original al mandar a iniciar sesión un acceso al panel sin sesión (opcional; tras entrar se regresa ahí). */
  loginReturnHeader: null as string | null,
  /**
   * Límite de tráfico del proxy de imágenes hacia los sitios originales: al superarlo, las imágenes sin caché devuelven 503 hasta que pase ese minuto o ese día, y si se agota la cuota diaria aparece en el informe diario de operaciones;
   * null significa sin límite. Las variables IMGPROXY_UPSTREAM_MB_PER_MINUTE e IMGPROXY_UPSTREAM_GB_PER_DAY tienen prioridad.
   */
  imageUpstreamBudget: null as null | { mbPerMinute: number; gbPerDay: number },
  /**
   * Dominios que, según pruebas reales, el servidor debe leer directamente sin el proxy de salida (EGRESS_PROXY_URL); los comparten la recolección y las imágenes (opcional).
   * En cada redirección se vuelve a elegir la ruta según el dominio de destino, y la conexión directa sigue verificando la dirección real.
   */
  directFetchHosts: [] as string[],
  /**
   * Conjunto etiquetado que usa la evaluación de selección (scripts/eval-selection.ts) sin parámetros: archivo (relativo a la raíz), número de muestras, partición y rango de umbrales a explorar.
   * null usa todas las muestras de .data/gold.jsonl (hasta 200) y explora entre 40 y 90.
   */
  selectionGold: null as null | { file: string; sample: number; split: string; sweep: [number, number] },
};

/** Expresiones de las descripciones de los RSS. */
export const FEED_COPY = {
  /** Lo que además excluye el feed de todas las notas (opcional). */
  allLeavesOut: [] as string[],
};

/**
 * Categorías de las interfaces públicas (API, RSS, MCP) que difieren de la web (opcional). No se cambia una vez publicado: las key de categoría aparecen en parámetros y direcciones de feeds.
 * merge: categorías que se publican dentro de otra; la key es la categoría del paquete del sector y el valor, la categoría que la absorbe (cuando la interfaz pública tiene una categoría menos que la web);
 * feedLabels: nombres en el título del RSS por categoría, que sustituyen el feedLabel del paquete del sector (al absorber otra categoría, el nombre suele tener que cambiar también).
 */
export const PUBLIC_CATEGORIES = {
  merge: {},
  feedLabels: {},
} as const;

/** "Boletín diario" y similares: en español el tema va implícito en la marca y no se antepone. */
export function withSubject(noun: string): string {
  return noun;
}

/** Une un texto con un nombre ("Boletines anteriores"); sin nombre, agrega el tema. */
export function subjectAfter(text: string, noun?: string): string {
  return noun ? `${text} ${withSubject(noun)}`.trim() : `${text} ${SITE.subject}`.trim();
}

/** "8:00", "10:30": la hora dicha en una frase. */
function spokenTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  return `${hour}:${String(minute).padStart(2, "0")}`;
}
