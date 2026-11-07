# Selección y calibración

## Cómo una nota llega a la selección

1. **Ingreso**: una misma dirección o un mismo contenido se guarda una sola vez. Si un artículo común solo trae titular o resumen, el texto se completa según las reglas de la fuente; en las páginas de video se usa el texto que ya viene incluido y el reproductor no se toma como cuerpo. Las notas sin fecha de publicación confiable no se publican hasta leer la fecha del original (ver "Lo viejo no inunda la portada" en [Fuentes](sources.md#regla-lo-viejo-no-inunda-la-portada)).
2. **Prefiltro** (`prefilter.md`): ¿la nota pertenece al sector? Entra con holgura y solo frena lo claramente ajeno: lo marcado `BLOCK` no aparece en ninguna página pública, mientras que `PASS` y el dudoso `UNKNOWN` siguen adelante. Un artículo común que solo tiene titular, sin cuerpo, resumen del feed ni texto de la publicación, espera a tener material: no se califica, no se redacta a partir del titular y no entra al conjunto público; se vuelve a evaluar cuando el material llega en una nueva revisión. Las publicaciones originales sin texto o solo con enlaces que pueden mostrarse siguen sus reglas de calificación y presentación de siempre.
3. **Calificación** (`selection-score.md`): la misma rúbrica califica dos veces por separado (de 0 a 100). Alcanza la calificación cuando **la suma de ambas es ≥ 2 × el umbral**; el umbral depende del nivel de la fuente y la clase de fuente puede elevarlo para ciertas fuentes oficiales. Además, debe pasar la deduplicación del paso 6 para entrar a la selección. La calificación que se muestra es el promedio de ambas, redondeado hacia abajo.
4. **Estructura** (`structure.md`): ocurre al mismo tiempo que la calificación. Asigna categoría y etiquetas (las que se ven en la página) y empresa protagonista, y decide si se trata de una noticia concreta, de una nota que reúne varios hechos o de material insuficiente; si es una noticia concreta, extrae sus hechos (quién, qué hizo, sobre qué y cuándo) con la cita del original y sus condiciones. De esto dependen las páginas de temas, la agrupación y el boletín diario.
5. **Titular y resumen**: se redactan cuando termina la estructura. Las notas seleccionadas y las que quedan cerca (promedio por encima de `understandFloor`) reciben, según `content-understanding.md`, un titular, un resumen que responde primero y un motivo para leer; el resto recibe un titular y resumen breves según `summarize-*.md` y aparece en "Todo". Al navegar "Todo" (la lista web, la API, la lista reciente para agentes y el modo completo del MCP, y el RSS de "Todo") solo aparecen notas con promedio igual o mayor a `browseFloor`, mientras que las que no tienen calificación aparecen igual; con un término de búsqueda se busca en todo. Las publicaciones de X sin cuerpo o solo con enlaces conservan sus enlaces, imágenes y citas originales sin llamar a modelos de redacción ni de traducción, y sin generar textos que pidan completar el contenido; los artículos largos de X con cuerpo real se procesan con normalidad. Si el texto redactado contiene palabras listadas en `industry/wording.ts`, el modelo cambia solo esas palabras una vez (`mend-wording.md`).
6. **Agrupación y deduplicación** (`group-*.md`): las coberturas del mismo hecho en distintas fuentes se agrupan en un evento con síntesis en su página (`story-digest.md`), y "Tendencias" se ordena por evento. Antes de cambiar el prompt de síntesis puedes comparar el actual contra un candidato sobre los mismos eventos con la [Evaluación de síntesis](story-digest-evaluation.md). Una nota que alcanzó la calificación espera a que termine la agrupación para entrar a la selección: el modelo decide al mismo tiempo si es la misma noticia que alguna ya seleccionada y si aporta información concreta que la selección todavía no tenía.
   - Varias coberturas de la misma noticia pueden entrar a la selección: en la web se pliegan en un grupo de lectura, mientras que la API, el RSS y la sincronización publican una sola entrada por noticia a través de su cobertura representativa. Tiene prioridad la fuente oficial de primera mano; después, las cuentas oficiales verificadas (cuentas `T1_5` con `publisherRole` y `owner_entity_id` cuya empresa es protagonista de la noticia, con las instituciones antes que las personas); y luego las que tienen texto completo, mayor calificación y publicación más temprana.
   - Lo que no es la misma noticia pero no aporta información nueva (volver a presentar una capacidad ya anunciada, la llegada a otra plataforma, un resumen que solo repite lo seleccionado) no entra a la selección y se queda en "Todo". Una nota que reúne varios hechos no forma un evento propio: se cuelga de los eventos que menciona y solo entra a la selección si contiene algo importante que la selección no cubría; si el material no alcanza para confirmar de qué noticia se trata, tampoco entra.
   - Las coberturas retiradas explícitamente conservan su historial de pertenencia, pero ya no participan en búsquedas de agrupación posteriores, candidaturas de representante, inicio de eventos ni comparaciones automáticas; tampoco sirven como base de identidad por compartir dirección o por ser respuesta o cita en X. Si el mismo hecho tiene otra cobertura vigente, se usa esa; si todas se retiraron, deja de buscarse, y vuelve a participar si se publica de nuevo. Mostrar solo el resumen o no haberse publicado todavía no equivale a un retiro. Las relaciones y decisiones existentes no se borran ni se reagrupan en masa.
   - Antes de la confirmación la nota solo está en "Todo" y no pasa sola por mucho que espere. Si la llamada al modelo falla o la respuesta no cumple el formato, la nota se detiene ahí: tras 10 minutos se genera una alerta, la página "Ejecuciones" del panel la lista y en "Diagnóstico de contenido" se puede abrir y pulsar "Reagrupar". Por eso el modelo de agrupación debe responder con un formato estable.
7. **Boletines diario, semanal y mensual**:
   - El **diario** sale cada día a las 08:00 (los horarios de los boletines se definen en `EDITION_TIMES` de `site/site.ts`; aquí se usan los valores predeterminados), cubre de las 08:00 del día anterior a las 08:00 del día y se arma por reglas, sin modelo. Cada hecho ocupa una entrada, con la cobertura más autorizada de la noticia más cubierta, y debajo los demás avances del mismo evento ese día; una nota que reúne varios hechos se cuelga del más importante que menciona. Lo publicado en los últimos 7 números no vuelve a aparecer; si un evento ya publicado tiene un avance, solo entra al cuerpo cuando el protagonista hace algo nuevo (las categorías `commentary`, como guías y opinión, no cuentan) o cuando el avance lo cubren 4 o más fuentes, y si no, va a las breves. También se agregan los eventos sin cobertura seleccionada que tienen una publicación oficial original y 3 o más participantes independientes (solo en el diario, sin entrar a la selección ni enviarse). Se ordena por importancia (la calificación más alta de sus coberturas seleccionadas, los participantes independientes que lo discutieron ese día y la existencia de una publicación oficial original, con penalización para los seguimientos): las 12 primeras van al cuerpo, con un máximo de 2 por fuente, y después hasta 10 breves de una línea. La primera es la nota principal y su entradilla es su propio titular y resumen; de la 2 a la 4 son lo destacado del día.
   - El **semanal** (lunes a las 10:00) y el **mensual** (día 1 a las 10:30) se arman a partir de los diarios de la semana o el mes: un mismo evento en varios días cuenta una vez, se ordena por el lugar que le dio el diario (principal, destacado, días publicados), su cobertura y su calificación, el semanal toma los primeros 20 eventos y el mensual los primeros 30, y se organizan en secciones según el diario. El modelo (`report-period.md`, `report-period-sections.md`) solo escribe el panorama y una introducción de una línea para las secciones con tres o más entradas, sin agregar ni quitar entradas; si escribe nombres o cifras que no están en las entradas (nombres en alfabeto latino, números de tres o más cifras, con decimales o porcentajes, o empresas del vocabulario), ese texto se descarta: el panorama se sustituye por una frase de plantilla y la sección se queda sin introducción. Los términos comunes del sector (`PLAIN_TERMS` de `taxonomy.ts`) y el nombre del sitio no tienen esta restricción.
   - Cada nota seleccionada entra a un solo número, según su hora; si se confirmó después que su hora, cuenta la hora de confirmación, y lo que se confirma después del cierre pasa al número siguiente.
   - La revisión ocurre cada media hora: el número que corresponde sale una vez y no se reescribe; lo que se perdió por una caída o falló se completa en revisiones posteriores. Si en la franja del diario hubo notas evaluadas pero ningún evento nuevo, sale igual un número vacío; si ninguna nota se evaluó, cuenta como falla y el número faltante genera alerta según [Despliegue](deploy.md#actualizaciones). Si en el periodo de un semanal o mensual existen todos los diarios esperados pero ninguno tiene entradas, ese número se salta sin escribirse vacío, sin llamar al modelo y sin registrarse como generado ni fallido; el primer periodo se revisa a partir del diario más antiguo del sitio. Si no hay entradas que resumir pero faltan diarios o sus entradas dejaron de ser públicas, se conserva el error. El salto no deja marca permanente: si se corrige un diario dentro del rango de reposición, el número puede generarse de nuevo.

Los prompts de cada paso están en `industry/prompts/` y cambiarlos no exige tocar código. La versión de un prompt es el hash de su contenido: tras modificarlo, las notas nuevas se evalúan con la versión nueva y las ya evaluadas no se recalculan.

## Umbrales: `industry/selection.ts`

```ts
export const SELECTION = {
  thresholds: { T1: 60, T1_5: 65, T2: 76 },   // el promedio de las dos calificaciones debe llegar al menos a este número
  classes: {                                  // clases de fuente: su umbral no es menor que este número
    ecosystem: { label: "Ecosistema e infraestructura", threshold: 70 },
    leaderboard: { label: "Rankings y evaluaciones", threshold: 76 },
  },
  understandFloor: 50,                        // las no seleccionadas con promedio mayor se redactan como seleccionadas
  browseFloor: 40,                            // "Todo" solo muestra notas con promedio igual o mayor; la búsqueda no se limita
};
```

Las fuentes oficiales de primera mano (T1) tienen un umbral más bajo y los medios y personas (T2) uno más alto: ante el mismo hecho, conviene leer primero el original oficial. Los niveles sin umbral (`EXCLUDE_MP`) no participan en la selección.

El nivel solo indica si una fuente es oficial y de primera mano. Algunas fuentes oficiales publican sobre todo contenido para desarrolladores o para la industria (chips y nube, frameworks y herramientas, rankings…) y al lector solo le interesan sus anuncios grandes: en la página "Fuentes" del panel se les asigna una clase, que eleva el umbral al menos hasta el de la clase. Solo eleva y nunca baja, así que no afecta a los niveles cuyo umbral ya es mayor; sin clase se usa solo el del nivel. La clave de la clase se guarda en la fuente y no debe renombrarse una vez publicada, porque la clase renombrada dejaría de aplicar sin aviso; las muestras de evaluación no llevan clase y se calculan con el umbral del nivel.

Con `browseFloor` en `0`, "Todo" vuelve a listar todas las notas públicas.

Estos valores provienen de la calibración original del motor y son estrictos: prefieren seleccionar algunas notas menos antes que dejar pasar ruido. Si cambias de sector o de rúbrica, recalibra con el método siguiente.

## Calibración

### 1. Prepara las muestras

Elige entre 100 y 200 notas de tus fuentes, márcalas una por una como "se selecciona" o "no se selecciona" y guárdalas en `.data/gold.jsonl` (`.data/` no entra a Git). Una por línea:

```json
{"caseId":"tec-001","material":{"title":"Titular original","originalTitle":null,"publishedAt":"2026-10-01T09:00:00-06:00","sourceName":"Nombre de la fuente","bodyZh":null,"bodyOriginal":"Cuerpo…"},"sourceFacts":{"sourceKind":"rss","sourceTier":"T1","firstParty":true,"language":"es"},"samplingContext":{"benchmarkSplit":"development","samplingStratum":"regulacion"},"gold":{"decision":"select"}}
```

| Campo | Descripción |
|---|---|
| `caseId` | Identificador único |
| `material` | Titular, titular original, fecha de publicación, nombre de la fuente y cuerpo (el cuerpo ya en el idioma del sitio va en `bodyZh`, nombre heredado del motor, y el original en `bodyOriginal`; basta con uno) |
| `sourceFacts` | Tipo de fuente, nivel, si es de primera mano (en producción solo `T1` cuenta como primera mano; mantenlo igual al etiquetar) e idioma. El nivel decide qué umbral se usa |
| `samplingContext` | Opcional. `benchmarkSplit` separa desarrollo y control, y `samplingStratum` es tu propio grupo (por ejemplo "regulación", "lanzamiento", "promocional") para ver en qué tipo se equivoca |
| `gold.decision` | `select` se selecciona, `reject` no se selecciona, `either` cualquiera de las dos (no cuenta para la exactitud) |

`industry/gold.example.jsonl` trae dos ejemplos.

Algunas recomendaciones:

- Incluye muchos **casos difíciles**: los que casi se seleccionan y los que casi no. Si abundan los obvios, la exactitud se infla.
- Separa una parte como **conjunto de control** (`benchmarkSplit: "holdout"`): ajusta los prompts mirando solo el de desarrollo y al final revisa con el de control, para no afinar el prompt a unas pocas preguntas.
- Lo ideal es que etiquete quien va a leer el sitio, o alguien con su mismo criterio.
- La evaluación solo corre el prefiltro y las dos calificaciones, sin la deduplicación del paso 6: etiqueta según si la nota merece entrar por sí misma, y no la marques como "no se selecciona" porque ya se eligió otra cobertura del mismo hecho.

### 2. Corre la evaluación

```bash
node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl --split development --label "Primera versión de la rúbrica"
```

Para cada muestra corre el prefiltro y las dos calificaciones, y reporta:

- **Exactitud, precisión, exhaustividad y F1 sobre salidas válidas**: solo con las muestras distintas de `either` que obtuvieron una decisión, para medir qué tan bien acierta el modelo cuando responde;
- **Cobertura**: la proporción de muestras distintas de `either` que obtuvieron decisión; la **exactitud completa** usa como denominador todas las muestras distintas de `either`, de modo que las fallas del modelo o las respuestas fuera de formato cuentan como no resueltas;
- `either` nunca entra al denominador de esas métricas, y el informe anota aparte las fallas de muestras con decisión y las de `either`. `goldSelectRate` se calcula sobre todas las muestras distintas de `either`, así que debe ser igual entre modelos para un mismo lote;
- Lo que pasaría con umbrales de 40 a 90 en pasos de 2 (el rango se cambia en `DEPLOYMENT.selectionGold`, descrito abajo), también con exactitud sobre salidas válidas, cobertura y exactitud completa;
- Las notas mal evaluadas: el informe completo se escribe en `.data/eval/` y se importa a SelectBench en el panel (con `--no-import` no se importa).

Sin `--models`, la evaluación usa el modelo que está en producción para el paso "Calificación de la selección": primero el elegido en la página "Modelos y evaluación", después la variable `SCORE_MODEL`, luego `DEFAULTS.score` de `site/models.ts` y, si no hay ninguno, el modelo predeterminado (`LLM_*` de `.env`). `--models default,deepseek-flash` compara varios modelos sobre las mismas muestras. Otros parámetros útiles: `--n 200` para el máximo de muestras, `--split holdout` para correr solo el conjunto de control y `--no-import` para no importar a SelectBench. Si en `DEPLOYMENT.selectionGold` de `site/site.ts` defines el archivo de muestras, el número a tomar, la partición y el rango de umbrales, bastará correr el script sin parámetros.

Dentro de una misma evaluación, si varias muestras generan exactamente la misma entrada de calificación, solo comparten el resultado del modelo; cada una se puntúa por separado con su propio prefiltro, el umbral de su nivel y su etiqueta. Los fallos también se comparten dentro de la corrida, para que la primera ejecución y una repetición con resultados previos cubran las mismas muestras. Las repeticiones reutilizan los comprobantes existentes. El uso de tokens y el tiempo promedio del informe suman todos los intentos de los comprobantes involucrados, incluidos los reintentos por errores de interpretación; al repetir con resultados previos se muestra el acumulado de esos comprobantes, que no equivale al costo nuevo de esa corrida.

### 3. Revisa errores, ajusta el criterio y repite

En SelectBench, dentro del panel, revisa una por una las notas mal evaluadas y la razón que dio el modelo.

Al subir un informe con varios modelos, un mismo `caseId` debe tener la misma etiqueta `gold` en todos ellos, aunque la `decision` del modelo cambie. Los informes con etiquetas contradictorias se rechazan antes de guardarse, para que una misma nota no muestre respuestas humanas distintas al comparar; los informes sin `cases` por caso pueden importarse igual.

- Si algo que debía entrar no entró, lo más probable es que la rúbrica no explique por qué importa: agrega ese tipo de valor, con ejemplos, a la parte de "debe evaluarse con normalidad" de `selection-score.md`.
- Si entró algo que no debía, lo más probable es que el ruido no esté contenido: agrégalo a la parte de "debe contenerse".
- Si en general está demasiado laxo o demasiado estricto y las notas mal evaluadas están justo en el umbral, ajusta el umbral en `industry/selection.ts`.

Primero ajusta el criterio y después el umbral: el umbral solo se mueve en bloque y no corrige que se equivoque con un tipo de nota en particular. Corre la evaluación después de cada cambio; SelectBench muestra la comparación entre versiones. Al comparar modelos no mires solo el F1 sobre salidas válidas: si la cobertura cambia mucho, revisa también la exactitud completa, porque un modelo con buena calificación que a menudo no termina la estructura no debe esconder sus fallas sacándolas del denominador.

## Cambiar de modelo

La página "Modelos y evaluación" del panel muestra el modelo de cada paso, su tasa de éxito reciente, el tiempo y el uso de tokens, y permite cambiarlo directamente (solo afecta las tareas nuevas). Antes de cambiar el modelo de calificación, compáralo con `--models` sobre las mismas muestras.
