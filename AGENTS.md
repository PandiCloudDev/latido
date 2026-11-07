# Instrucciones para agentes

Este repositorio es Latido, un radar de noticias de tecnología en español para México y Latinoamérica, construido sobre el motor de código abierto AIHOT: recoge fuentes, filtra y redacta con modelos, agrupa eventos, publica boletines diario, semanal y mensual, y lo ofrece por web, RSS, API pública, Markdown para agentes y MCP. Lee primero el README y después, según la tarea, el documento correspondiente de `docs/`.

## Particularidades de Latido

- Todo lo que el sitio escribe y muestra está en español de México. El idioma, la zona horaria (`America/Mexico_City`, `-06:00`) y el factor de longitud de los textos generados viven en `site/locale.ts`; el motor los consulta en lugar de suponer chino y hora de Pekín.
- El perfil `zh` de `site/locale.ts` conserva el comportamiento original de AIHOT. Las pruebas heredadas que usan datos en chino se corren con `SITE_LOCALE=zh`; no traduzcas esos datos de prueba ni los patrones que reconocen texto chino (fechas, unidades, puntuación), porque prueban comportamiento real del motor.
- En títulos, resúmenes y textos públicos se usan solo comillas rectas dobles ("), nunca comillas angulares.
- Pandi.Cloud opera Latido como desarrollador independiente; no lo vincules en textos ni metadatos con otras empresas o medios.

## La tarea más común: adaptarlo a otro sector

Sigue el orden de `docs/customize.md`. Lo propio del sitio está en `site/`: nombre y textos (`site.ts`), idioma y zona horaria (`locale.ts`), modelo de cada paso (`models.ts`), marca y logotipo (`brand/`), páginas de términos (`pages/`), archivos fijos de la raíz del sitio (`public/`, publicados tras sustituir sus marcadores) y registro de cambios (`changelog.json`). El conocimiento del sector está en `industry/`: categorías y etiquetas (`taxonomy.ts`), temas (`topics.json`), fuentes (`sources.json`), prompts (`prompts/`) y umbrales (`selection.ts`). Normalmente no hace falta tocar `apps/` ni `packages/`; lo que el framework no tiene y solo necesita este sitio se hace como módulo en `modules/` ("Módulos" en `docs/architecture.md`).

Estas decisiones son del usuario y hay que preguntárselas, no tomarlas por él: el nombre del sitio, qué fuentes seguir, qué noticia importa y qué es ruido, cómo se dividen las categorías, y el contenido de los términos y el aviso de privacidad (`site/pages/` son plantillas que él debe confirmar antes de publicar).

Al cambiar la rúbrica conserva su estructura (tipos de contenido, cinco dimensiones ponderadas, contención de ruido, límites de seguridad) y sustituye los ejemplos de qué es importante y qué es ruido. Los umbrales se recalibran con muestras etiquetadas por el usuario (`docs/selection.md`); no cambies números por intuición.

## Ejecución y revisión

- Node.js 24 ejecuta TypeScript directamente y el backend no tiene paso de construcción. Workspaces de npm: `apps/*`, `packages/*`, `industry`, `site` y `modules/*`.
- La ejecución local y con Docker está en `docs/deploy.md`.
- Después de un cambio corre como mínimo:
  ```bash
  npm run typecheck
  DATABASE_URL=postgres://127.0.0.1:5432/<nombre>_test npm test   # el nombre debe terminar en _test o _ci; si no existe se crea y migra, y la cuenta debe poder crear bases
  npm run build -w @aihot/web && npm run test:web
  node scripts/smoke.ts --base http://localhost:3000             # con el sitio en marcha
  ```
- Algunas pruebas de `tests/` usan categorías, etiquetas y empresas del sector de ejemplo; si cambias `industry/taxonomy.ts`, sustituye esos ejemplos por sus equivalentes.

## Reglas que hay que respetar

- El frontend (`apps/web`) solo lee `apps/api` por HTTP; la base de datos, las llamadas al modelo y las claves viven solo en el backend.
- Todas las salidas públicas leen de una sola capa, `packages/backend/src/publication/`, y cualquier salida nueva también.
- Abrir una página no dispara llamadas al modelo; el modelo solo se llama dentro de tareas del worker.
- Todas las peticiones de pago pasan por comprobantes (`providers/receipts.ts`) y límites de presupuesto; no los evites.
- Las válvulas de seguridad solo se abren con `true`. Durante el desarrollo mantenlas cerradas: `COLLECT_ENABLED`, `MODEL_CALLS_ENABLED`, `FEISHU_*_ENABLED` e `INDEXNOW_SUBMIT_ENABLED`. En las pruebas los envíos están siempre cerrados y la recolección y el modelo solo hablan con servicios falsos locales, sin acceder a ningún servicio externo.
- De forma predeterminada las fuentes solo muestran resumen y enlace al original (`site_fulltext` apagado); el texto completo se activa únicamente cuando la fuente lo permite de forma explícita.
- El contenido público es anónimo y administradores y visitantes ven lo mismo; el panel es solo para administradores.
- Al retirar o reemplazar una función o mecanismo, el mismo cambio borra su código, pruebas, documentación y estado guardado (tablas y columnas, tareas programadas, settings, variables de entorno y sus entradas en `.env.example`); si se borran datos existentes del usuario, se documenta en las notas de actualización de `docs/deploy.md`. Los bloqueos, reintentos, compatibilidad con formatos viejos, interruptores y respaldos requieren evidencia previa: que haya ocurrido en un despliegue real o que la semántica de la plataforma lo haga inevitable.
- Las migraciones van en `database/migrations/` (las tablas de un solo módulo, en su `migrations/`) y se ejecutan y registran por nombre completo de archivo; dos archivos con el mismo número se ejecutan por separado, las migraciones nuevas usan un nombre nuevo y las ya publicadas no se modifican. Desde `0055` cada archivo contiene una sola sentencia apta para ejecutarse en línea, y el PR lo verifica; los índices usan `CONCURRENTLY IF NOT EXISTS` y los rellenos masivos no van en migraciones publicadas. La validación de restricciones y los cambios destructivos se diseñan según la [convención de migraciones](docs/architecture.md#migraciones-de-base-de-datos), sin modificar archivos históricos ni apagar la revisión.
- No subas `.env`, claves ni `.data/`.
- No uses el nombre ni el logotipo de AIHOT.

## Cómo escribir código

Sigue el estilo, los nombres y la densidad de comentarios del código cercano. Elige la solución sencilla que resuelva el problema con claridad y define solo las abstracciones que se usan. Verifica el comportamiento importante que toca el cambio y no escribas pruebas para cambios de estilo simples.

## Contribuir al motor original

Si un cambio sirve a cualquier sitio y se quiere proponer a `KKKKhazix/AIHOT`, lee antes su `CONTRIBUTING.md`. Estos son los motivos más comunes de rechazo o retrabajo en su revisión:

- **Solo se aceptan mejoras válidas para todos los sitios.** Interruptores nuevos, puntos de configuración nuevos y funciones nuevas, por pequeños que sean, son comportamiento del producto: primero se abre un issue que explique el caso, porque cada interruptor obliga a todos los sitios a mantenerlo. Las reglas, cifras y ejemplos propios de Latido se quedan en su `industry/` y su `site/`, no en plantillas de prompts, comentarios ni pruebas compartidas.
- **Busca primero lo que ya existe.** Antes de agregar funciones, conexiones o configuración, busca: la mayoría de las capacidades comunes ya existen una vez. Un módulo envía sus archivos con `sendFile` de `apps/api/src/routes/static.ts`, y un servicio intermediario se conecta con `LLM_BASE_URL`. Una segunda copia terminará divergiendo.
- **Las pruebas solo demuestran los casos que imaginaste.** Si tocas recolección, fechas, limpieza del cuerpo, selección o agrupación, corre un lote de feeds y páginas públicas reales antes y después del cambio, e indica en el PR cuántos resultados cambiaron y si todos los cambios son correctos. Las páginas chinas a menudo publican horas sin zona horaria, que se leen con la zona de la fuente (en el motor original, `+08:00` por defecto), y "CST" en ellas suele significar hora de Pekín; los resultados de las pruebas no deben depender de la zona horaria de la máquina.
- **Las pruebas protegen comportamiento, no la forma de escribirlo.** Las pruebas que reproducen un problema se agregan al archivo de pruebas existente de esa función, sin abrir un archivo nuevo por cada corrección; no verifican constantes privadas, clases CSS, posiciones en píxeles ni el comportamiento propio del navegador, ni fijan como prueba permanente la salida previa a una refactorización.
- **El motor original no acepta PR externos sobre estos archivos:** dependencias y lockfiles (las versiones las sube dependabot), `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, las reglas de `.agents/` y `.claude/`, y archivos binarios (las muestras que necesiten las pruebas se generan con código). Si hace falta cambiarlos, abre antes un issue para que lo haga el mantenedor.
- **Cambia todo lo relacionado.** Las variables de entorno nuevas van en `.env.example` y la configuración nueva del sitio en `site/`; si cambia el significado de un campo de configuración, actualiza los ejemplos para que los sitios desplegados mantengan su comportamiento al actualizar (por ejemplo, si solo los modelos que declaran `vision` reciben imágenes, los preajustes que ya veían imágenes deben declararlo); si cambia un nombre o una entrada que ve el lector, cámbialos en todos los lugares donde aparecen. Al agregar o cambiar la configuración de navegación, revisa con la configuración predeterminada y con otras la barra lateral de escritorio, la barra inferior móvil, el regreso y la entrada "Mi espacio", y revisa en el navegador cómo quedan las pestañas cuando hay menos entradas; que el valor predeterminado no cambie solo demuestra el comportamiento original, no que la configuración funcione.
