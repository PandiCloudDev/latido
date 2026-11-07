# Evaluación del prompt de síntesis de eventos

La síntesis de la página de evento la genera `industry/prompts/story-digest.md`. Antes de cambiar este prompt, corre el actual y el candidato lado a lado sobre los mismos eventos y compáralos a mano, en lugar de juzgar por la impresión que deja la página.

## 1. Prepara los casos

```bash
node --env-file=.env scripts/eval-story-digests.ts --stories <id del evento>,<id del evento> --out .data/story-digest-cases.jsonl
```

El id del evento es la parte final de su dirección, `/story/<id>`. La exportación solo lee la base: no llama al modelo ni modifica ningún evento. Las coberturas se toman con las mismas reglas que usa el sitio al generar la síntesis, sin contar las menciones de paso, las notas que reúnen varios hechos, las retiradas ni las aún no publicadas. Los eventos que ya tienen síntesis se arman como "reescritura tras corrección" (sin la síntesis anterior) y los que no tienen, como primera redacción. Si un evento no existe, ya se fusionó con otro o no tiene coberturas utilizables, el script termina con error.

El archivo exportado tiene un evento por línea y se puede revisar antes. Para probar una actualización incremental con coberturas nuevas, cambia `inputMode` a `incremental` y llena `story.previousDigest` y `knownArticleIds` (los ids de las coberturas que ya incluía la versión anterior). También puedes escribir casos a mano con el formato de `industry/story-digest-eval.example.jsonl` (ejemplo ficticio).

## 2. Comparación lado a lado

```bash
node --env-file=.env scripts/eval-story-digests.ts --cases .data/story-digest-cases.jsonl --system mi-candidato.md
```

- Cada caso se corre una vez con el prompt actual y otra con el candidato, con el mismo modelo (de forma predeterminada el del paso "Síntesis de eventos"; `--models` permite elegir otro) y la misma entrada. El prompt de sistema, la entrada y los parámetros de muestreo son idénticos a los que usa el sitio.
- El archivo candidato se escribe igual que los de `industry/prompts/`: `{{siteName}}` se sustituye por el nombre del sitio y `{{> nombre-de-archivo}}` inserta reglas compartidas; si falta un valor, se produce un error. Si el candidato, ya renderizado, es idéntico al actual, la ejecución se rechaza. Sin `--system` solo corre el prompt actual.
- Antes de empezar imprime el número de llamadas (casos × modelos × prompts) y, si supera `--max-calls` (18 de forma predeterminada), no envía ninguna. Cada llamada se registra y cuenta para el presupuesto como cualquier otra petición del sitio; repetir sin cambios reutiliza los resultados recibidos sin volver a pagar, así que al probar una nueva versión del candidato la mitad del prompt actual no cuesta.

Los resultados se escriben en `.data/eval/` (se cambia con `--out-dir`), en un JSON y un Markdown: titulares y síntesis de ambos lados, uno junto al otro, con el uso de tokens y el número de registro de cada llamada, y el motivo de las que fallaron.

## 3. Qué revisar a mano

No existe una calificación automática confiable, y esta herramienta tampoco pone a un modelo a calificar a otro. Revisa caso por caso:

- Si primero explica el cambio central y la conclusión actual, en lugar de repetir por fecha la línea de tiempo de abajo;
- Si hay tono promocional vacío o frases hechas;
- Si las condiciones, a quién aplica, precios y cuotas, regiones y otras restricciones siguen ligadas a lo que corresponden;
- Si aparece algo que no está en las coberturas ni en la evidencia de los hechos, si comenta la cobertura en sí ("la nota no revela…") o si se filtran instrucciones de redacción al texto;
- En una reescritura tras corrección, si se eliminaron las afirmaciones anteriores que ya no son válidas.

## 4. Después de cambiar el prompt

Cambiar de versión no reescribe las síntesis existentes. Un evento solo se regenera cuando cambian sus coberturas, y al llegar coberturas nuevas se reescribe de forma incremental a partir de la síntesis anterior, así que el prompt nuevo se aplica poco a poco sin provocar una avalancha de llamadas.

Para que algunos eventos se reescriban de inmediato con el prompt nuevo, llama a `rewriteStoryDigest` desde la raíz del repositorio (una llamada al modelo por evento, registrada en la auditoría del panel):

```bash
node --env-file=.env --input-type=module -e '
const { rewriteStoryDigest } = await import("@aihot/backend/events/corrections");
const { sql } = await import("@aihot/backend/db");
const [s] = await sql`SELECT id FROM stories WHERE public_id = ${"<id del evento>"}`;
if (!s) throw new Error("No existe ese id de evento");
console.log(await rewriteStoryDigest(s.id, "Se actualizó el prompt de síntesis", "ops-script"));
await sql.end();'
```
