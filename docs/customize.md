# Adaptarlo a otro sector

Este repositorio está configurado como Latido, un radar de noticias de tecnología para México y Latinoamérica: las fuentes son medios y blogs oficiales del sector y el criterio de selección está calibrado para ese público. Para convertirlo en un radar de energía, salud, legal o finanzas, casi todo lo que hay que cambiar vive en dos carpetas, [`site/`](../site/) (nombre, textos, marca y páginas del sitio) e [`industry/`](../industry/) (categorías, fuentes, prompts y umbrales del sector), y el código rara vez se toca.

Si usas un agente como Claude Code o Codex, puedes enviarle este texto y responder sus preguntas:

```text
Lee AGENTS.md y docs/customize.md y convierte este sitio en un radar de noticias del sector "XX".
Lo que me importa: … (las fuentes que quieres seguir, qué consideras noticia y qué consideras ruido; entre más específico, mejor).
Al terminar ejecuta npm run typecheck, npm test y node scripts/smoke.ts, y dime qué decisiones me siguen tocando a mí.
```

Esto es lo que el agente (o tú) debe hacer, en orden.

## 1. Nombre y textos: `site/site.ts`

Cada exportación y cada campo de [`site/site.ts`](../site/site.ts) lleva un comentario que explica dónde se usa, si puede quedar vacío y qué significa su valor predeterminado; basta con recorrerlo de arriba abajo. Después reconstruye (`docker compose up -d --build`) para que el cambio llegue al frontend y al backend. Solo hay que vigilar lo que cruza archivos o lo que no debe cambiar una vez publicado:

- **La dirección del sitio no está en `site.ts`**: se define al desplegar con la variable de entorno `SITE_URL` (`SITE.defaultUrl` solo se usa en local cuando `SITE_URL` no existe).
- **Nombres que cambian juntos**: al cambiar `SITE.name` cambia también `SITE.organization.name` (datos estructurados para buscadores); en `SITE.crawlerName` usa tu propio identificador de lectura y no el nombre de otro sitio.
- **Identificadores que no se cambian una vez que alguien se conecta**: `SITE.mcpPrefix` (prefijo de las herramientas MCP), `PUBLIC_CATEGORIES` (fusiones y nombres de categorías en interfaces públicas y feeds) y `ABOUT.termsAnchor` (ancla que otros sitios pueden tener enlazada). `SITE.interfaceVersion` solo sube, y sube la versión mayor cuando cambia un campo público o su significado.
- **Horarios en horas exactas o medias horas**: `EDITION_TIMES` (`HH:mm` en la zona horaria del sitio, definida en `site/locale.ts`) lo revisa una programación cada media hora, y lo leen la ventana del boletín diario, las alertas de números faltantes y todos los textos que mencionan horarios.
- **Qué se puede ocultar del menú**: `NAV.hidden` solo admite `"/hot"` y `"/topics"` (ajusta barra lateral, barra inferior, página "Mi espacio", enlaces de regreso y migas de pan, y al ocultar `"/hot"` también la franja de tendencias de la portada y el lugar del evento en su página; la dirección sigue funcionando si se abre directamente).
- **Que el límite declarado sea real**: llena `ACCESS.ratePerMinute` solo si el proxy inverso de enfrente de verdad limita por IP.

## 2. Categorías, etiquetas y temas: `industry/taxonomy.ts`, `industry/topics.json`

[`industry/taxonomy.ts`](../industry/taxonomy.ts) define las categorías (`CATEGORIES`), el conteo de lanzamientos destacados en la cabecera (`RELEASE`), los términos comunes que la síntesis no necesita verificar (`PLAIN_TERMS`), los tipos de contenido (`ITEM_TYPES`), los vocabularios de etiquetas y sus sinónimos (`CATEGORY_TAGS`, `TOPIC_TAGS`, `ENTITY_TAGS`, `TAG_SYNONYMS`), y el directorio de empresas con su diccionario contra atribuciones equivocadas (`ENTITIES`, `IDENTITY_LEXICON`, `PUBLISHER_DOMAINS`, `IDENTITY_CONTEXT_ALIASES`). El significado de cada campo está en los comentarios del archivo; al cambiarlo, cuida estas dependencias:

- **La `key` que aparece en las URL no cambia una vez publicada**: la `key` de `CATEGORIES` forma parte de direcciones y feeds (`/all?category=`, `/feed/category/<key>.xml`). Si quieres que una categoría se publique dentro de otra en la API, el RSS y el MCP (aunque en la web sigan separadas), configúralo en `PUBLIC_CATEGORIES` de `site/site.ts`.
- **Sincronía con los prompts**: si cambias `CATEGORIES`, los vocabularios de etiquetas o `ITEM_TYPES`, actualiza también `industry/prompts/structure.md` (criterios de clasificación y reglas de etiquetas), `content-understanding.md` (lista de tipos de contenido) y `selection-score.md` (tabla de pesos de las cinco dimensiones por tipo de contenido).
- **La verificación de empresas se puede vaciar**: `IDENTITY_LEXICON`, `PUBLISHER_DOMAINS` e `IDENTITY_CONTEXT_ALIASES` garantizan que las empresas mencionadas en titulares y resúmenes aparezcan en la nota original; si tu sector no necesita esa verificación, déjalos como arreglos vacíos `[]`.
- **`industry/topics.json`** (índice de temas `/topics`): se lee al arrancar el sitio y el cambio se aplica al reconstruir (`docker compose up -d --build`). Tiene tres grupos, `company` (empresas e instituciones), `field` (tecnologías y áreas) y `genre` (tipos de contenido), y el `slug` no se cambia una vez publicado:
  - Los temas `company` usan `entityId` (el id en `ENTITIES`) para reunir las notas cuyo protagonista es esa empresa; si una nota tiene varias empresas protagonistas, solo cuenta si el titular la nombra. Con `aliases` (opcional) la búsqueda encuentra las notas de esa empresa aunque se busque solo por ese término.
  - Los temas `field` y `genre` usan `tags` para reunir las notas que llevan esas etiquetas.

## 3. Fuentes: `industry/sources.json`

Son las fuentes que se importan en el primer arranque, y las que ya existen no se sobrescriben; en cada arranque posterior solo se agregan las que están en el archivo pero no en la base, y lo que borres del archivo no se borra de la base (lo que no quieras, pausa en el panel). Ya en producción se usa más la página "Fuentes" del panel, donde se crean, se prueban, se ajusta la frecuencia, se pausan y se revisan los motivos de error.

Campos clave de cada fuente:

| Campo | Significado |
|---|---|
| `kind` | `rss`, `web_list` (página de listado con selectores), `json_list` (API JSON), `x_search` (cuenta de X, requiere SocialData), `mp_account` (cuentas públicas de WeChat, requiere Dajiala) y `external` (envío externo) |
| `config` | Configuración propia de cada tipo; ver [Fuentes](sources.md) |
| `tier` | Nivel: `T1` oficial de primera mano, `T1_5` cuentas oficiales y semioficiales, `T2` medios y personas, `EXCLUDE_MP` no participa en la selección. Cada nivel tiene su propio umbral; `T1` ya equivale a "primera mano" y no hay que marcarlo aparte |
| `owner_entity_id` | Opcional: a qué empresa pertenece la fuente (id de `ENTITIES`). Varias fuentes de la misma empresa cuentan como un solo participante en la temperatura, y una cuenta oficial `T1_5` que deba servir como cobertura representativa también lo necesita (ver [Fuentes](sources.md)) |
| `participation_mode` | `editorial` entra a la selección y a "Todo"; `hot_signal` solo cuenta como evidencia de temperatura; `isolated` no aparece en ninguna página pública |
| `site_fulltext` | Si el sitio puede mostrar el texto completo. **Apagado de forma predeterminada**: solo se muestra el resumen y el enlace al original. Enciéndelo únicamente cuando la fuente lo permita de forma explícita |
| `syndicate_fulltext` | Si el RSS de texto completo puede incluir el cuerpo. **Apagado de forma predeterminada**; solo funciona si el sitio también muestra el texto completo, y se enciende cuando la fuente permite expresamente la redistribución |

## 4. Criterio de selección: `industry/prompts/`

Es el paso que más vale la pena trabajar, porque aquí se escribe el juicio editorial sobre el sector.

| Archivo | Función |
|---|---|
| `prefilter.md` | Prefiltro: ¿la nota pertenece al sector? Recuperación amplia; solo frena lo claramente ajeno |
| `selection-score.md` | **Rúbrica de calificación** de 0 a 100: tipos de contenido, cinco dimensiones, pesos por tipo, valores que deben evaluarse con normalidad y ruido que debe contenerse |
| `content-understanding.md` | Cómo se redactan las notas seleccionadas o cercanas al umbral: titular, resumen que responde primero y motivo para leer (también propone etiquetas, pero las categorías y etiquetas de la página salen de `structure.md`) |
| `rules-domain.md` | Reglas de traducción y conservación de términos del sector |
| `mend-wording.md` | Corrección de vocabulario: si titular, resumen o motivo usan palabras listadas en `industry/wording.ts`, el modelo cambia solo esas palabras |
| `summarize-*.md` | Titulares y resúmenes de otros tipos de contenido |
| `structure.md` | Categoría, etiquetas, empresa protagonista, si es una noticia concreta o una nota que reúne varios hechos, y los datos del hecho (quién hizo qué sobre qué, con su cita del original y sus condiciones). De aquí dependen las categorías y etiquetas visibles, las páginas de temas, la agrupación de eventos y el boletín |
| `group-*.md` | Agrupación de eventos: si dos coberturas son el mismo hecho, una continuación o dos historias distintas, y si una cobertura aporta información nueva frente a lo ya seleccionado (si no aporta, no entra a la selección) |
| `story-digest.md` | Síntesis de la página de evento (antes de cambiarla, compara versiones con la [Evaluación de síntesis](story-digest-evaluation.md)) |
| `report-period.md`, `report-period-sections.md` | Panorama e introducciones de sección del semanal y el mensual (el diario se arma por reglas, sin prompt) |
| `translate-*.md` | Traducción del texto completo |

Si tu sitio tiene palabras que sus lectores no usan (exageraciones, regionalismos, jerga que no entienden), agrégalas a `industry/wording.ts`: cada entrada es una expresión regular con su corrección. Después de redactar titular, resumen y motivo se revisan una por una y, si aparecen, el modelo cambia solo esas palabras una vez (paso "corrección de vocabulario"; la variable `WORDING_MODEL` permite elegir otro modelo). Si tras la corrección cambian las cifras, el titular o el resumen quedan vacíos, o el servicio del modelo se niega, se conserva el texto original. Con la lista vacía no se revisa nada, no hay llamadas extra y este paso no aparece en las alertas por rechazo del servicio.

En los prompts, `{{siteName}}` se refiere al nombre del sitio y `{{> nombre-de-archivo}}` incluye otro prompt. Cambiar prompts no requiere cambiar código.

**Lo recomendable**: conserva la estructura (cinco dimensiones ponderadas, reglas para contener ruido, límites de seguridad) y cambia solo los ejemplos de qué es importante y qué es ruido. En el sector legal, por ejemplo, la publicación de una ley, una sentencia relevante o una sanción regulatoria deben evaluarse con normalidad, mientras que la publicidad de despachos o los anuncios de cursos deben contenerse.

## 5. Umbrales y calibración: `industry/selection.ts`

Una nota alcanza la calificación cuando la suma de sus dos evaluaciones es ≥ 2 × el umbral (y además debe pasar la deduplicación al agruparse; ver [Selección y calibración](selection.md)). Los umbrales vienen de la calibración original de AIHOT (T1 60, T1_5 65, T2 76). `classes` son categorías de fuente que elevan el umbral (vacíalas o reemplázalas por las de tu sector) y `browseFloor` es la calificación mínima para aparecer en "Todo" (40 de forma predeterminada). Al cambiar de sector y de prompts hay que recalibrar:

1. Elige entre 100 y 200 notas de tus fuentes, márcalas tú como "se selecciona" o "no se selecciona" y guárdalas en `.data/gold.jsonl` (formato en [Selección y calibración](selection.md); `industry/gold.example.jsonl` trae dos ejemplos).
2. Ejecuta `node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl` y revisa exactitud, precisión, exhaustividad y los resultados con distintos umbrales.
3. En SelectBench, dentro del panel, revisa una por una las notas mal clasificadas, ajusta la rúbrica o el umbral y vuelve a correr la evaluación.

De este paso depende que tu sitio seleccione bien.

## 6. Marca: `site/brand/`

- `logo.svg`, `icon.png` (512), `icon-192.png`, `apple-icon.png` (180) y `favicon.ico`: íconos del sitio.
- `Logo.tsx`: el logotipo de la esquina superior izquierda, que de forma predeterminada compone el nombre con texto; si tienes tu propio logotipo, sustituye `Wordmark` por tu SVG y conserva los parámetros.
- `wordmark.svg` y `wordmark-dark.svg` (opcionales): el logotipo en imágenes para compartir y pósters; la versión oscura se usa en fondos oscuros. Si no existen, se usa el nombre en texto.
- Fuentes de las imágenes para compartir (opcionales, en `assets/og-fonts/`): los archivos `<nombre>-400.ttf` y `<nombre>-700.ttf` se usan en orden alfabético y, si a una fuente le falta un carácter, se toma de la siguiente. Latido usa Inter, que cubre la ñ y las mayúsculas acentuadas del español. Al cambiar las fuentes hay que reiniciar el servicio y la caché de imágenes se renueva.
- `nameplates/`: los títulos de cabecera de los boletines ("Latido diario", "semanal", "mensual", "Archivo."). Si cambias los términos, vuelve a generarlos con `scripts/nameplates.ts` (el uso está en el encabezado del script).
- Códigos QR de la página "Acerca de": escribe primero el bloque del autor en `ABOUT.maker` de `site.ts` con sus tarjetas `wechat` y `feishu` (título y descripción); después sube las imágenes en el panel ("Configuración → Códigos QR de Acerca de") o colócalas en `site/brand/contact/` con nombres que empiecen por `qr-wechat` o `qr-feishu`, en png, jpg o webp. Si falta el bloque, la tarjeta o la imagen, ese código no se muestra.

No uses el nombre ni el logotipo de AIHOT.

En "Mi espacio", el lector puede cambiar la tipografía de "Predeterminada" a "La del navegador". La segunda usa la fuente estándar que el lector configuró en su navegador para el texto, los formularios y las gráficas dinámicas; el código sigue en fuente monoespaciada y el logotipo, las cabeceras y las imágenes para compartir conservan la marca. La elección se guarda solo en ese navegador. El respaldo de guardados (versión 1) incluye un campo opcional `font`; los respaldos anteriores se siguen importando y la importación no sobrescribe la fuente que el lector ya eligió.

## 7. Textos de páginas: `site/pages/`, `site/public/`, `site/changelog.json`

- `pages/terms.md` y `pages/privacy.md`: términos de uso y aviso de privacidad. **Son plantillas**; antes de publicar, adáptalos a tu caso y, si hace falta, pide revisión profesional.
- `public/`: los cuatro archivos fijos de la raíz del sitio, publicados tras sustituir sus marcadores: `robots.txt`, `manifest.webmanifest` (nombre e ícono al instalar en la pantalla de inicio), `openapi-v1.json` (descripción de la API pública) y, de forma opcional, `.well-known/security.txt` (contacto para temas de seguridad). Solo se publican esos cuatro; cualquier otro archivo que pongas ahí no aparecerá, y si falta alguno se responde 404. Marcadores disponibles: `{{siteName}}`, `{{siteUrl}}`, `{{description}}`, `{{tagline}}`, `{{locale}}`, los horarios `{{dailyTime}}`, `{{weeklyTime}}`, `{{monthlyTime}}`, la versión de la interfaz `{{version}}` y la lista de categorías públicas separada por comas `{{categoryList}}`; en los JSON, `"{{categories}}"` dentro de una lista `enum` o `examples` se reemplaza por las `key` de las categorías públicas.
- `changelog.json`: registro de cambios. Trae un ejemplo de "lanzamiento del sitio"; antes de publicar ajusta su `date`, su `time` y `latestVersion` a tu fecha de lanzamiento. Las entradas nuevas van al principio y `latestVersion` toma su fecha y hora. `kind` es uno de "Actualización", "Mejora", "Aviso" o "Retiro"; agrega `"urgent": true` a lo que el lector no debe perderse (aparece en rojo con la marca "Importante").

## 8. Modelos y despliegue

- Modelos: `LLM_BASE_URL`, `LLM_API_KEY` y `LLM_MODEL` en `.env`; sirve cualquier API compatible con OpenAI y todos los pasos la usan de forma predeterminada. `site/models.ts` lista modelos con nombre (cada uno con sus propias variables de dirección y clave) y cuál usa cada paso; al desplegar también se pueden cambiar paso por paso con variables de entorno (ver `.env.example`) o en la página "Modelos y evaluación" del panel. Con un modelo de razonamiento deja espacio para razonar: `LLM_REASONING_TOKENS` para el modelo predeterminado y `reasoningTokens` en `site/models.ts` para los modelos con nombre; si no, el razonamiento consume todo el límite de salida, la respuesta llega vacía y cada llamada falla. Los preajustes de calificación admiten `scoreCall: { temperature, maxTokens, timeoutMs }` para la temperatura, el límite de salida y el tiempo de espera en milisegundos. Un modelo de respaldo usa `fallbackFor` para indicar, por capacidad, a qué modelo principal sustituye; evalúa antes esa combinación con tus propios datos.
- Despliegue: ver [Despliegue](deploy.md).

## Revisión final

```bash
npm run typecheck
DATABASE_URL=postgres://…/latido_test npm test     # el nombre de la base debe terminar en _test o _ci y la cuenta debe poder crear bases
npm run build -w @aihot/web && npm run test:web
node scripts/smoke.ts --base http://localhost:3000   # con el sitio en marcha
```

Reescribir prompts o recalibrar umbrales no rompe las pruebas: las pruebas reconocen las peticiones por el prompt que realmente se genera en cada paso y leen los umbrales de `industry/selection.ts`. Algunas pruebas de `tests/` usan categorías, etiquetas y empresas del sector de ejemplo; si cambias `industry/taxonomy.ts` y fallan, sustituye esos ejemplos por los equivalentes de tu sector, sin cambiar las reglas que prueban.

Por último, abre la portada, "Todo", el boletín, las páginas de temas y "Acerca de", y revisa en la página "Fuentes" del panel que todas se estén leyendo bien.
