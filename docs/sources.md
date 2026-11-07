# Fuentes

Las fuentes se administran en la página "Fuentes" del panel: se crean, se prueban para ver qué se obtiene, se ajusta la frecuencia, se activan o pausan y se revisan los motivos de error y las notas recientes. En el primer arranque se importan las fuentes de `industry/sources.json`.

## Tipos de fuente

| Tipo | Para qué sirve | Qué necesita |
|---|---|---|
| `rss` | Blogs, medios, Substack o servicios que convierten otras plataformas a RSS/Atom | Nada |
| `web_list` | Páginas de listado sin RSS (noticias, blogs, registros de cambios) | Selectores; opcionalmente renderizado con Jina Reader (cobro por petición) |
| `json_list` | APIs que devuelven JSON (GitHub Releases, por ejemplo) | Rutas de los campos |
| `x_search` | Cuentas de X (Twitter) | Clave de SocialData, cobro por petición |
| `mp_account` | Cuentas públicas de WeChat (heredado del motor) | Clave de Dajiala, cobro por petición |
| `external` | Contenido que envían tus propios scripts | `INGEST_TOKEN`, ver abajo |

La dirección o la configuración de `json_list` puede llevar credenciales, así que solo sigue redirecciones al mismo origen (mismo protocolo, host y puerto). Si la API se muda a otro origen, actualiza la dirección de la fuente en lugar de depender de un salto entre orígenes para pasar la autenticación.

De forma predeterminada no se leen direcciones de red interna. Si un feed o un listado apunta a un servicio propio en tu red interna (por ejemplo, RSSHub dentro de la misma red de Docker, con la dirección `http://rsshub:1200/...`), define en `.env` `PRIVATE_FEED_HOSTS=rsshub` (nombres de host completos separados por comas, sin distinguir mayúsculas) y reinicia la API y el worker. El permiso solo aplica al `feedUrl` de `rss` y al `url` de `web_list` y `json_list`, y esos hosts se leen directamente, sin pasar por `EGRESS_PROXY_URL`; las redirecciones a otros hosts, el cuerpo de los artículos, las páginas de detalle, las imágenes y los íconos siguen rechazando direcciones internas, y las direcciones de enlace local y de metadatos de nube (`169.254.0.0/16`, `100.100.100.200`, etc.) se rechazan siempre.

Las opciones que acepta cada tipo están en [`config-keys.ts`](../packages/backend/src/sources/config-keys.ts). Si escribes una opción desconocida, el guardado se rechaza y la lectura falla mostrando el motivo en el panel, en lugar de volver en silencio al análisis genérico.

## Primero previsualiza, después crea

Entra a `/admin/sources/new`, escribe el ID y el nombre, elige el tipo y pega en "Configuración de recolección (JSON)" el JSON correspondiente de la [sección siguiente](#cómo-se-configura-cada-tipo). Lo que va ahí es el objeto de configuración, sin envolverlo en `kind` o `config`. Cambiar de tipo reinicia la configuración, así que primero elige el tipo y después pega.

Las notas entre paréntesis de ancho completo en el nombre (por ejemplo "Un medio（RSS de tendencias）") solo se ven en el panel; en la web, el RSS, el Markdown para agentes, el MCP y la búsqueda, el lector ve el nombre sin esa nota. En las cuentas de X escritas como `X：Nombre visible (@usuario)`, el lector solo ve el nombre visible. El JSON de la API pública conserva el nombre completo.

`rss`, `web_list`, `json_list` y `x_search` tienen el botón "Previsualizar": muestra el total de entradas y, de las 20 primeras, titular, enlace al original, fecha de publicación y resumen, sin guardarlas en la base. Comprueba que se obtienen artículos y no elementos de navegación y que las fechas coinciden con el original antes de pulsar "Crear". La previsualización aplica los mismos filtros que la recolección real (prefijos de dirección, categorías, palabras de ruido, reescritura de direcciones y `publishedAfter`), así que lo que ves es lo que se guardaría; aun así no equivale a una recolección completa en producción, porque no pasa por el completado de detalles, la selección ni la publicación.

La previsualización sí envía peticiones de lectura, y en X y Jina puede generar costos, con comprobante y presupuesto. `COLLECT_ENABLED=false` solo apaga la recolección automática y no garantiza que una previsualización manual no acceda a servicios externos. Los ejemplos locales de HTML y JSON de abajo no requieren ninguna clave de API.

## Cómo se configura cada tipo

### rss

```json
{ "feedUrl": "https://example.com/feed.xml" }
```

Opcionales: `summaryIsBody` (cuando confirmaste que el resumen del feed es el texto completo, usa el `description` de RSS o el `summary` de Atom como cuerpo y no lee la página original) y `allowCategories` / `denyCategories` (filtran por las categorías del feed).

En ninguna fuente se toman como cuerpo de artículo las páginas de reproducción de YouTube o Vimeo. La descripción de video de Media RSS se conserva como resumen, y aunque exista `summaryIsBody` no se usa como subtítulos; el texto real que el feed entrega en `content` / `content:encoded` sí puede usarse. Un video incrustado en otro artículo no afecta la lectura del cuerpo de ese artículo.

Los videos nativos dentro del cuerpo conservan direcciones de medios seguras y sus formatos alternativos, y se reproducen a mano con los controles del navegador. El archivo de video lo pide el navegador directamente al sitio original y la portada pasa por el proxy de imágenes; no se reproduce solo ni en bucle y la precarga se indica como `none`, aunque el navegador no garantiza cero peticiones antes de interactuar. Un reproductor sin dirección de medios ni portada utilizable solo conserva su texto alternativo. El Markdown y el RSS de texto completo con permiso de redistribución conservan la estructura del video, y que se reproduzca depende del lector; los reproductores dinámicos de plataformas y los iframe quedan fuera.

Los gráficos SVG incrustados en las ilustraciones de un artículo no conservan el gráfico (sus colores y tipografías dependen de las hojas de estilo del sitio original): se reemplazan por la descripción accesible que el sitio escribió para ellos (`aria-label`, el texto al que apunta `aria-labelledby`, o el `<title>` y `<desc>` del gráfico), como texto simple en el lugar de la imagen. Si un gráfico tiene versión ancha y angosta se conserva una sola, y no se repite el texto que la ilustración ya muestra (pie de foto, subtítulo). Los gráficos sin descripción y los íconos SVG fuera de ilustraciones se eliminan, como antes.

En los episodios de podcast sin página web (sin `<link>` y cuyo `guid` no es una dirección), el enlace al original es su archivo de audio o video, que el navegador puede reproducir directamente; en esos episodios no se lee ninguna página y se procesa el texto del feed.

### web_list

Admite selectores CSS normales, así que también funciona con listas hechas de `div`. Lo esencial es que `itemSelector` seleccione **cada noticia** y no el contenedor que las envuelve a todas. Por ejemplo:

```html
<div class="news-list">
  <div class="news-item">
    <h2><a href="/posts/first">Primera noticia de ejemplo</a></h2>
    <time datetime="2026-10-01T09:00:00-06:00">1 de octubre</time>
  </div>
  <div class="news-item">
    <h2><a href="/posts/second">Segunda noticia de ejemplo</a></h2>
    <time datetime="2026-10-01T10:00:00-06:00">1 de octubre</time>
  </div>
</div>
```

Su configuración (`example.com` es un marcador; sustitúyelo por la página real; la versión ejecutable está en el [ejemplo local](#ejemplo-local-con-html-y-json)):

```json
{
  "url": "https://example.com/news",
  "parseMode": "html",
  "itemSelector": ".news-list > .news-item",
  "linkSelector": "h2 a",
  "titleSelector": "h2 a",
  "publishedAtSelector": "time",
  "allowUrlPrefixes": ["https://example.com/posts/"]
}
```

- `itemSelector` busca entradas en toda la página; `linkSelector` y `titleSelector` toman el primer nodo que coincide dentro de cada entrada, que puede ser la entrada misma. Si eliges `.news-list` obtienes un solo contenedor y casi siempre solo la primera noticia; si escribes solo `div`, se cuelan contenedores anidados. Elige el nodo que se repite por noticia.
- El enlace se toma de `href`; los enlaces relativos como `/posts/first` se resuelven con la dirección final del listado tras redirecciones, o con `baseUrl` si se indica. El titular es el texto del nodo. Los enlaces repetidos se fusionan; si en un listado Markdown aparece primero un botón como "Read more" y después el titular real, se usa el titular real. Los enlaces que apuntan al propio listado suelen omitirse.
- La fecha se busca con `publishedAtSelector` dentro de la entrada, probando en orden los atributos `datetime`, `content` y `title` y luego el texto; un texto que no se puede interpretar no tapa una fecha válida del mismo nodo. Las fechas y horas sin zona horaria se leen con `publishedAtUtcOffset` (de forma predeterminada, el desfase del sitio en `site/locale.ts`, que en Latido es `-06:00`); las que traen zona conservan su zona y un `YYYY-MM-DD` simple se lee como medianoche UTC. Meses incompletos, números de versión de productos y fechas de calendario inexistentes no se toman como fecha de publicación.
- `parseMode`: las páginas comunes usan `html` de forma predeterminada; `markdown` lee enlaces Markdown; `docusaurus_changelog` lee los títulos de un registro de cambios; `intercom_changelog` lee títulos y cuerpo por secciones de fecha de los centros de ayuda de Intercom, cada sección con su propia ancla, en día calendario UTC salvo que se indique `publishedAtUtcOffset`. Para usar Jina hay que escribir explícitamente `url` como `https://r.jina.ai/https://sitio-destino/ruta` y configurar `JINA_API_KEY`; no se activa sola cuando una lectura falla. Jina devuelve Markdown de forma predeterminada; para seguir usando selectores CSS, define `parseMode: "html"`.
- `detail`: si al listado le faltan fecha, titular o resumen, se leen de la página de detalle (`publishedAtSelector`, `titleSelector`, `summarySelector`, etc.). `maxFetches` es el máximo de páginas de detalle por ronda; si no se define vale 0 y no se lee ninguna, porque cada lectura es una petición más y la fuente debe declararlo. Las entradas cuya lectura falla o que agotan `maxFetches` en una ronda se completan en lecturas posteriores, conservando el cuerpo ya confirmado. Un titular real no vuelve a cambiarse por el texto de un botón aunque el listado siga diciendo "Read the Blog", ni se vuelve a leer el detalle solo porque el titular sea largo; para forzar el titular del detalle define `titleAuthoritative: true`. Si el detalle o la extracción del cuerpo encuentran una hora sin zona, se usa primero `detail.publishedAtUtcOffset`, después `publishedAtUtcOffset` de la fuente y, si ninguno existe, el desfase del sitio. RSS y listados JSON también pueden usar `detail`.
- En los listados por Jina, `detail.titleRegex` y `publishedAtRegex` se aplican al texto de Jina y pueden compartir la misma respuesta de detalle; los selectores CSS leen el HTML del sitio original. Elige la regla según la página que realmente se puede leer.
- `allowUrlPrefixes` / `denyUrlPrefixes`: recogen solo artículos bajo ciertas rutas.

### json_list

Si la API devuelve la estructura de abajo, `itemsPath` apunta al arreglo y las demás rutas son relativas a **cada elemento del arreglo**. Las rutas usan puntos, no JSONPath, así que no se escribe `$` ni `[*]`.

```json
{
  "data": {
    "items": [
      {
        "id": "first",
        "title": "Primera noticia de ejemplo",
        "url": "https://example.com/posts/first",
        "summary": "Resumen de la primera noticia.",
        "published_at": "2026-10-01T09:00:00-06:00"
      }
    ]
  }
}
```

Su configuración:

```json
{
  "url": "https://example.com/api/news",
  "mode": "json_api",
  "itemsPath": "data.items",
  "titlePaths": ["title"],
  "urlTemplate": "{raw:url}",
  "summaryPaths": ["summary"],
  "publishedAtPath": "published_at",
  "externalIdPath": "id"
}
```

- Si la API devuelve directamente un arreglo, omite `itemsPath`. `titlePaths`, `summaryPaths` y `authorPaths` son listas de rutas candidatas y se toma el primer valor no vacío, por ejemplo `["title", "name"]`.
- Si ya existe una dirección completa usa `{raw:url}`; si solo hay un slug, algo como `https://example.com/posts/{slug}`. `{ruta}` codifica el valor del campo y `{raw:ruta}` lo inserta tal cual. Los listados JSON no convierten direcciones relativas en absolutas, así que la plantilla debe producir una dirección HTTP(S) completa.
- `summaryIsBody`: cuando confirmaste que el resumen de la API es el texto completo, ponlo en `true` para usar como cuerpo lo que devuelve `summaryPaths` sin leer la página original.
- Lo ideal es que las fechas vengan como cadenas ISO con zona; las horas sin zona, como `2026-09-30 17:43:58`, se leen igual que en los listados web con `publishedAtUtcOffset` (el desfase del sitio de forma predeterminada). Para marcas de tiempo numéricas define `publishedAtUnit: "epoch_s"` (segundos) o `"epoch_ms"` (milisegundos), y para fechas como `20261001`, `"yyyymmdd"`.
- Las entradas sin titular o sin enlace posible se omiten. Si ninguna entrada de un arreglo no vacío se puede mapear, aparece `no items mapped (check title/url paths)`; si la ruta no apunta a un arreglo, `items path did not resolve to an array`.

### Ejemplo local con HTML y JSON

El repositorio incluye dos ejemplos ficticios, [news.html](examples/sources/news.html) y [news.json](examples/sources/news.json), con dos noticias cada uno. Sirven para verificar selectores y mapeo de campos; no son fuentes reales y sus artículos no tienen cuerpo.

Ejecuta lo siguiente desde la raíz del repositorio con Node.js 24.11 o superior. El servidor solo escucha en la propia máquina y solo sirve esos dos archivos; se detiene con `Ctrl+C`.

```bash
node --input-type=module -e '
import http from "node:http";
import { readFileSync } from "node:fs";
const files = {
  "/news.html": ["text/html; charset=utf-8", readFileSync("docs/examples/sources/news.html")],
  "/news.json": ["application/json", readFileSync("docs/examples/sources/news.json")]
};
http.createServer((req, res) => {
  const file = files[req.url];
  res.writeHead(file ? 200 : 404, { "content-type": file ? file[0] : "text/plain" });
  res.end(file ? file[1] : "Not found");
}).listen(8787, "127.0.0.1");'
```

En la misma máquina, prepara la base como en el [despliegue sin Docker](deploy.md#sin-docker) y corre la API y la web de desarrollo con `npm run dev:api` y `npm run dev:web`, con la recolección, los modelos, Feishu e IndexNow apagados y sin arrancar el worker. Solo para este ejemplo local, define `ALLOW_PRIVATE_NETWORK_FETCH=true` en el proceso de la API de desarrollo y reinícialo; de forma predeterminada se prohíbe leer direcciones internas, producción se niega a arrancar con esa opción, y debes quitarla al terminar. Si la API corre en un contenedor o en otro servidor, `127.0.0.1` apunta a ella misma y estas direcciones no sirven para ese despliegue.

Elige `web_list` y luego `json_list`, pega la configuración y pulsa "Previsualizar", sin necesidad de crear la fuente:

```json
{
  "url": "http://127.0.0.1:8787/news.html",
  "parseMode": "html",
  "itemSelector": ".news-list > .news-item",
  "linkSelector": "h2 a",
  "titleSelector": "h2 a",
  "publishedAtSelector": "time",
  "allowUrlPrefixes": ["http://127.0.0.1:8787/posts/"]
}
```

```json
{
  "url": "http://127.0.0.1:8787/news.json",
  "mode": "json_api",
  "itemsPath": "data.items",
  "titlePaths": ["title"],
  "urlTemplate": "http://127.0.0.1:8787/posts/{id}",
  "summaryPaths": ["summary"],
  "publishedAtPath": "published_at",
  "externalIdPath": "id"
}
```

En ambos casos deben aparecer **2 entradas**, en el orden de la tabla. El ejemplo JSON muestra además su resumen, mientras que el HTML no tiene configurada la extracción de resumen. Las fechas de la API de previsualización están en UTC y el panel las muestra en la hora del sitio como 09:00 y 10:00.

| Titular | Enlace al original | publishedAt en la API de previsualización |
|---|---|---|
| Primera noticia de ejemplo | `http://127.0.0.1:8787/posts/first` | `2026-10-01T15:00:00.000Z` |
| Segunda noticia de ejemplo | `http://127.0.0.1:8787/posts/second` | `2026-10-01T16:00:00.000Z` |

Para comparar, cambia temporalmente el `itemSelector` del HTML a `.news-list`: solo devolverá la primera. Al regresar a `.news-list > .news-item` vuelven las dos, y esa es la diferencia entre "el contenedor del listado" y "cada noticia".

Con páginas reales, revisa primero si los nodos de noticias aparecen en la respuesta HTTP original. El modo HTML no ejecuta JavaScript, así que lo que se ve en el navegador pero no está en la respuesta no aparecerá cambiando de selector. Busca antes un RSS o una API JSON, o configura Jina o una recolección externa propia. `no items matched (html)` también puede deberse a un selector que no coincide, a la falta de `href` o titular, o a enlaces filtrados por prefijo; revisa la respuesta y la configuración antes de pensar en otro método de recolección.

### x_search

Este tipo usa la búsqueda de SocialData; no consiste en poner la URL de un perfil de X en un listado web. Para `https://x.com/SomeAccount`, toma el usuario `SomeAccount`, sin `@` ni la URL completa:

```json
{ "query": "from:SomeAccount -filter:replies", "searchType": "Latest" }
```

`SomeAccount` es un marcador: sustitúyelo por la cuenta real que quieres seguir. `-filter:replies` excluye respuestas y `Latest` busca lo más reciente.

Configura `SOCIALDATA_API_KEY` en el `.env` del backend y reinicia la API (para previsualizar) y el worker (para la recolección programada); no pongas la clave en el JSON de la fuente ni la subas al repositorio. Revisa antes el límite de SocialData en "Configuración → Límites de peticiones de pago" y previsualiza solo cuando haga falta. Sin clave aparece `SOCIALDATA_API_KEY is not configured`; si el servicio rechaza la petición o se alcanza el límite de presupuesto, revisa el motivo en el panel. La previsualización puede generar peticiones de pago, y su resultado depende de la cuenta y de lo que devuelva el servicio en ese momento.

En la recolección automática de producción, las cuentas comunes se agrupan en una sola búsqueda (unas veinte cuentas como máximo por búsqueda) para ahorrar peticiones; la previsualización manual de una fuente no se agrupa.

### mp_account

```json
{ "ghid": "gh_xxxxxxxx", "nickname": "Nombre de la cuenta" }
```

Cada cuenta pública de WeChat se revisa según su intervalo de lectura (la consulta del listado se cobra por petición) y el cuerpo de los artículos nuevos se obtiene en la misma operación.

Requiere configurar `DAJIALA_KEY` en el `.env` del backend y usar en `ghid` el ID original de la cuenta. Los campos son `ghid` / `nickname`, no `biz` / `name`. `mp_account` no admite previsualización por ahora, y `external` tampoco admite lectura de prueba: se conecta con la interfaz de envío descrita abajo.

## Nivel, participación y texto completo

- **Nivel** `tier`: `T1` oficial de primera mano (sitios oficiales, blogs oficiales, instituciones), `T1_5` cuentas oficiales y creadores semioficiales, `T2` medios y personas, `EXCLUDE_MP` no participa en la selección. Cada nivel tiene su umbral (`industry/selection.ts`).
- **Clase de fuente** (opcional): a las fuentes oficiales que publican sobre todo para desarrolladores o para la industria se les puede asignar una clase en la página "Fuentes" (`classes` de `industry/selection.ts`), que eleva su umbral al menos al de la clase; ver [Selección y calibración](selection.md#umbrales-industryselectionts). `industry/sources.json` no la incluye y se asigna en el panel tras la importación.
- **Participación** `participation_mode`: `editorial` entra a la selección y a "Todo"; `hot_signal` no se muestra por sí sola y solo cuenta como evidencia de temperatura de "lo que se está comentando"; `isolated` no aparece en ninguna página pública.
- **Primera mano**: solo `T1` cuenta como primera mano y no se configura aparte. Cuando una noticia tiene varias coberturas, la representativa es de preferencia la de primera mano, y la página del evento también la muestra primero.
- **Editor** (opcional, dentro de `config`):
  - `publisherUrlPrefixes`: prefijos de las direcciones de los artículos propios de una fuente `T1`, por ejemplo `["https://example.com/blog/"]`. Si otras fuentes (agregadores, republicaciones) traen artículos con esas direcciones y se puede atribuir a una única fuente oficial, se registran a nombre de esa fuente. Si una fuente de listado web no lo define, se usa la ruta de su propio listado (y el artículo también debe haber aparecido en él).
  - `publisherRole`: la identidad de una cuenta `T1_5`, `organization` (cuenta oficial de una institución) o `person` (persona de la organización). Con el `owner_entity_id` de la fuente (id de `ENTITIES` en `industry/taxonomy.ts`), las noticias de esa cuenta cuyo protagonista es esa empresa pueden ser la cobertura representativa (detrás de `T1`).
- **Texto completo**: `site_fulltext` decide si el sitio muestra el texto completo y `syndicate_fulltext` si el RSS de texto completo incluye el cuerpo. **Ambos vienen apagados** y solo se muestran el resumen y el enlace al original; se encienden cuando la fuente lo permite de forma explícita. Que algo se pueda leer técnicamente, como contenido detrás de un muro de pago, no da derecho a mostrar el texto completo.

## Frecuencia de lectura

Cada fuente tiene su propio intervalo de lectura. Todos los días a las 04:20 se ajusta según lo publicado en los últimos 7 días: las fuentes más activas se leen más seguido, con un mínimo de 15 minutos (60 minutos para listados leídos con Jina); el máximo es de 60 minutos para las fuentes comunes, 120 para las cuentas de X y los listados por Jina, y 180 para las que solo aportan evidencia de temperatura. Las cuentas de X agrupadas siguen el ritmo del grupo: cada media hora las que participan en la selección y cada hora las de solo temperatura.

Una lectura fallida no avanza la posición y la siguiente continúa en el mismo punto; las fuentes con fallas consecutivas aparecen en rojo en el panel y, si hay alertas de Feishu configuradas, cada lunes se envía un informe semanal de fuentes.

"Sin contenido nuevo en 7 días" se juzga según **el ritmo de cada fuente** y no con una ventana fija: en los informes diario y semanal hay dos grupos. Primero van las que **superaron su propio ritmo** (los **días con publicación** de los últimos 90 días se cuentan por día, la mediana de los intervalos entre días consecutivos es su ritmo, se necesitan al menos 4 días así para tener ritmo, y el silencio debe superar 4 veces esa mediana). El día de publicación es la fecha de publicación de la nota o, si la página no la da, el día en que la descubrimos; **una primera importación cuenta como un solo día**, porque es una sola entrega, sin importar cuánto se extiendan hacia atrás sus fechas (de lo contrario, una fuente que nunca ha publicado parecería puntual y una importación que abarca meses inflaría la mediana y escondería una fuente que ya se quedó callada). La ventana solo cuenta los días de esos 90 días, porque la historia más antigua no dice cada cuánto publica ahora; la fecha de descubrimiento y la de publicación no tienen un orden fijo, así que basta con que una caiga en la ventana, y el día de publicación se acota a la ventana. **Las que no tienen ritmo calculable también se listan**, pero no como falla, en dos casos: no hubo publicaciones comparables en la ventana (publicó, pero fuera de ella) o nunca se recibió contenido (eso es un problema de recolección). Las que están dentro de su ritmo ya no se listan. El intervalo de lectura `interval_minutes` no participa en este juicio: indica cada cuánto la revisamos, no cada cuánto publica.

## Regla: lo viejo no inunda la portada

Las notas publicadas hace más de 48 horas cuando se descubren, el acervo de una fuente nueva en su primera importación y los envíos marcados como relleno se archivan con su fecha original: no entran a "hoy" ni se envían. Las notas sin fecha de publicación confiable no se publican (no entran a listas públicas, selección, boletines, tendencias ni envíos) hasta leer la fecha en la fuente o en la página original. Esta regla aplica a todas las entradas para que una importación de historia no inunde el sitio.

En la primera importación de una fuente nueva solo se toman las primeras `_aihot.initialBackfillLimit` entradas del listado (30 de forma predeterminada) con antigüedad máxima de `_aihot.initialBackfillMonths` meses (12 de forma predeterminada). Las lecturas siguientes solo recogen entradas publicadas desde 48 horas antes de la primera importación en adelante, así que el acervo antiguo del listado ya no entra y no se paga por archivar todo el feed; lo publicado después de la primera importación se recoge sin importar su posición en un listado largo. Las entradas sin fecha en el listado se recogen igual y esperan a conocer su fecha según la regla anterior. Las cuentas de X avanzan desde su posición de lectura y no tienen esta restricción.

Para empezar a monitorear solo a partir de un momento fijo, define `publishedAfter` en la configuración de RSS, listado web o JSON, por ejemplo `"2026-10-01T00:00:00.000Z"`. Debe ser una hora UTC completa (los milisegundos son opcionales); la previsualización, la primera importación y las lecturas siguientes solo aceptan entradas **estrictamente posteriores** con fecha de publicación confiable, y las de fecha desconocida también se excluyen. Si una página de actualizaciones del mismo día del inicio sigue usando esa fecha, lo que se le agregue después tampoco entrará; tómalo en cuenta al elegir el punto de partida.

## Interfaz de envío externo

El contenido que recojan tus propios scripts puede enviarse al sitio y pasa por la misma deduplicación, selección y agrupación que la recolección normal.

```
POST /api/ingest/items
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{
  "sourceId": "my-crawler",
  "sourceName": "Mi script de recolección",
  "items": [
    { "title": "obligatorio", "url": "obligatorio", "publishedAt": "2026-10-01T08:00:00-06:00", "author": "opcional" }
  ]
}
```

- `INGEST_TOKEN` se define en `.env`, con al menos 16 caracteres; sin él la interfaz responde siempre 401.
- Hasta 50 entradas por envío; más devuelve 413. Cuántos envíos por minuto admite cada cliente lo decide `INGEST_RATE_LIMIT`: con `docker compose` el valor predeterminado es 10 y al excederlo se responde 429 (con `Retry-After: 60`); sin Docker no hay límite, así que si no hay un proxy inverso que limite, defínelo en `.env` (0 significa sin límite).
- Responde `{"ok": true, "created": <entradas creadas>}`. Se omiten las entradas que no son objetos JSON o que no tienen titular o dirección, y en un mismo envío solo cuenta la primera aparición de cada dirección.
- Si `sourceId` no existe, se crea una fuente `external` que de forma predeterminada no aparece en páginas públicas: cambia su participación a `editorial` en el panel para que se publique.
- Con la fuente pausada en el panel, la interfaz responde 409 y no acepta artículos nuevos; al reactivarla se puede seguir enviando.
- Las entradas con `raw._aihot.backfill` en `true` se tratan como relleno histórico (no entran a "hoy" ni se envían).
