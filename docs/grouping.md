# Agrupación de eventos y evaluación de relaciones

El sitio busca primero, con el titular y el resumen, hechos candidatos de las últimas dos semanas (con vectores si hay servicio de embeddings y, si no, por coincidencia de texto). Después le pide a un modelo que decida la relación entre las coberturas y, al mismo tiempo, si la cobertura aporta información nueva frente a lo ya seleccionado (una nota que alcanzó la calificación solo entra a la selección por esta vía; ver [Selección y calibración](selection.md)). Las definiciones de las relaciones y los prompts que usa el sitio están en `industry/prompts/group-*.md`, y el código en `packages/backend/src/events/relate.ts` y `group.ts`.

Hay cuatro relaciones:

- `SAME_OCCURRENCE`: el mismo hecho real, como el anuncio oficial y la cobertura de los medios sobre ese mismo lanzamiento.
- `SAME_STORY`: no es el mismo hecho, pero sí un avance directo del mismo evento concreto, como la llegada a tiendas, una reseña o una respuesta tras el lanzamiento.
- `UNRELATED`: hechos distintos, aunque compartan protagonista, producto o tema.
- `ROUNDUP`: una de las dos es una recopilación que abarca varios temas.

## Evaluar el juicio de relaciones con tus propias muestras

`scripts/eval-relations.ts` solo evalúa cómo decide el modelo la relación entre dos coberturas. Reutiliza directamente `PAIR_SYSTEM`, `pairUser()`, `PairSchema` y la versión del prompt que usa el sitio al agrupar, así que si el prompt cambia la evaluación cambia con él. No vuelve a buscar candidatos ni escribe resultados en la agrupación de eventos.

Guarda tus datos etiquetados en `.data/` (ese directorio no se sube a Git). `industry/relation-gold.example.jsonl` trae cuatro ejemplos ficticios. Una muestra por línea:

```json
{"caseId":"release-001","a":{"title":"...","source":"...","firstParty":true,"publishedAt":"2026-09-01T09:00:00-06:00","summary":"..."},"b":{"title":"...","source":"...","firstParty":false,"publishedAt":"2026-09-01T09:20:00-06:00","summary":"..."},"samplingContext":{"benchmarkSplit":"development","samplingStratum":"same-release"},"gold":{"relation":"SAME_OCCURRENCE"}}
```

`a` y `b` también pueden llevar un `frame` opcional con la misma forma que `ReportView` dentro del sitio:

```json
{"subject":"Acme","action":"lanza","object":"Acme-2","occurredAt":"2026-09-01"}
```

Conviene poner en el conjunto de desarrollo los casos límite que se confunden con facilidad y reservar una parte con `benchmarkSplit: "holdout"` para la revisión final. `samplingStratum` es una etiqueta de grupo opcional para ver en qué tipo se equivoca, y no forma parte de la entrada del modelo.

### Ejecución

Configura la base y el modelo como en un despliegue normal y ejecuta:

```bash
node --env-file=.env scripts/eval-relations.ts \
  --gold .data/relation-gold.jsonl \
  --split development
```

De forma predeterminada usa el modelo actual del paso "Revisión de agrupación": primero el elegido en la página "Modelos y evaluación", después la variable `GROUP_REVIEW_MODEL`, luego `DEFAULTS.groupReview` de `site/models.ts` y, si no hay ninguno, el modelo predeterminado. También se pueden comparar varios modelos configurados:

```bash
node --env-file=.env scripts/eval-relations.ts \
  --gold .data/relation-gold.jsonl \
  --models default,deepseek-flash \
  --split development \
  --n 200 \
  --seed 7 \
  --thresholds 0.75,0.8
```

Parámetros disponibles:

| Parámetro | Valor predeterminado | Descripción |
|---|---:|---|
| `--gold` | `.data/relation-gold.jsonl` | Archivo de muestras etiquetadas (JSONL) |
| `--models` | Modelo actual de "Revisión de agrupación" | Nombres de modelos separados por comas |
| `--split` | `all` | `development`, `holdout` o un grupo propio |
| `--n` | `200` | Máximo de muestras a evaluar |
| `--seed` | `7` | Semilla del muestreo; con la misma semilla se obtienen siempre las mismas muestras |
| `--concurrency` | `6` | Peticiones simultáneas al modelo |
| `--thresholds` | `STORY_REVIEW_MIN_CONFIDENCE,TIE_MIN_CONFIDENCE` de producción | Umbrales de confianza para decidir que dos coberturas "van al mismo evento"; si se pasan, sustituyen a los predeterminados |

El informe completo se escribe en `.data/eval/relations-*.json`. Para cada modelo se obtiene:

- Una tabla de 4 × 4: en qué relación clasificó el modelo cada relación etiquetada;
- Precisión, exhaustividad, F1 y número de muestras por relación (solo con las muestras que obtuvieron un juicio estructurado);
- `coverage`: la proporción de muestras con juicio estructurado sobre el total etiquetado;
- `accuracy` y macro-F1 de las cuatro clases, que solo miden la calidad cuando hubo juicio estructurado; `completeAccuracy` usa como denominador todas las muestras etiquetadas, de modo que las llamadas fallidas o fuera de formato cuentan como no resueltas;
- Contando `SAME_OCCURRENCE` y `SAME_STORY` como "van al mismo evento", la precisión, la exhaustividad y el F1 con cada umbral de confianza, junto con `coverage` y `completeAccuracy` del mismo lote;
- Llamadas con error, uso de tokens, tiempo promedio por petición y tiempo total de la evaluación;
- Para cada muestra, el juicio, la confianza, la explicación de diferencias que escribió el modelo (`difference`) y el número de comprobante.

Las llamadas al modelo pasan, como siempre, por comprobantes y límites de presupuesto. Las evaluaciones repetidas con el mismo modelo, prompt y entrada reutilizan los comprobantes existentes; dentro de una corrida, las muestras con entrada idéntica comparten una sola petición y cada una se puntúa con su propia etiqueta, y los fallos también se comparten sin volver a pedirse. `reused` en el informe incluye los resultados compartidos, exitosos o fallidos, y los comprobantes exitosos reutilizados. Los comprobantes de la evaluación tienen su propio uso, `eval_relation_pair`, y no se suman a las estadísticas de los pasos de agrupación del sitio en el panel.

El uso de tokens y el tiempo promedio suman todos los intentos de los comprobantes que cita el informe, incluidas las respuestas que antes no pudieron interpretarse; un mismo comprobante no se cuenta dos veces aunque lo usen varias muestras. Al repetir con resultados previos se muestra ese uso histórico, que no equivale al costo nuevo de la corrida.

La integración continua verifica la lectura del JSONL, el muestreo con semilla fija, cada métrica y, con un servicio de modelo falso local, la reutilización concurrente y el conteo de reintentos, sin acceder a servicios de modelos externos.
