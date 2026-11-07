# Paquete del sector

Aquí vive todo el conocimiento del sector que cubre Latido (tecnología y negocios digitales en México y Latinoamérica): categorías, temas, fuentes, criterio de selección y umbrales. Para cambiar de sector se modifica sobre todo esta carpeta y [`site/`](../site/) (nombre, textos, marca y páginas); los pasos están en [Adaptarlo a otro sector](../docs/customize.md).

| Archivo | Contenido |
|---|---|
| `taxonomy.ts` | Categorías, etiquetas, empresas e instituciones, el vocabulario que evita que el modelo atribuya mal una empresa y el tipo de lanzamiento que más interesa al sector (`RELEASE`) |
| `topics.json` | Índice de temas (`/topics`), que se lee al arrancar el sitio |
| `sources.json` | Fuentes que se importan en el primer arranque |
| `prompts/` | Los prompts de cada paso: prefiltro, calificación, redacción, estructura, agrupación, síntesis de eventos, semanal y mensual, y traducción |
| `selection.ts` | Umbrales de selección |
| `wording.ts` | Palabras que los lectores no usan y su corrección (vacío de forma predeterminada) |
| `gold.example.jsonl` | Ejemplo del formato de muestras para evaluar la selección |
| `relation-gold.example.jsonl` | Ejemplo del formato de muestras para evaluar relaciones entre eventos |
| `story-digest-eval.example.jsonl` | Ejemplo del formato de casos para evaluar la síntesis de eventos |
