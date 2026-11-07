// Umbrales de la selección. La rúbrica está en prompts/selection-score.md; aquí solo se decide cuántos puntos bastan para entrar.
// El modelo califica cada nota dos veces por separado (0–100) y es candidata a la selección si la suma es ≥ 2 × el umbral;
// tras confirmar la identidad de la noticia y su valor nuevo, las reglas de publicación deciden si se muestra (ver docs/selection.md), y la tarjeta muestra el promedio.
// El umbral depende del nivel de la fuente: más bajo para fuentes oficiales de primera mano, más alto para medios y personas; la clase de fuente puede elevarlo para ciertas fuentes oficiales.
// Si cambias umbrales o la rúbrica, vuelve a correr scripts/eval-selection.ts sobre tus muestras etiquetadas antes de publicar (ver docs/selection.md).

export const SELECTION = {
  /**
   * Nivel de fuente → umbral de selección (promedio). El nivel se asigna a cada fuente en "Fuentes" del panel:
   *   T1 oficial de primera mano (sitio, blog oficial, institución) · T1_5 cuenta oficial o creador semioficial · T2 medios y personas
   * EXCLUDE_MP y los niveles que no aparecen aquí no participan en la calificación de selección (solo entran a "Todo").
   */
  thresholds: { T1: 60, T1_5: 65, T2: 76 } as Record<string, number>,
  /**
   * Clase de fuente → umbral mínimo. El nivel solo indica si la fuente es oficial y de primera mano; algunas fuentes oficiales publican sobre todo para desarrolladores o la industria,
   * y al lector solo le interesan sus anuncios grandes: en "Fuentes" del panel se les asigna una clase y su umbral sube al menos hasta este número.
   * Solo eleva, nunca baja: no afecta a los niveles cuyo umbral ya es mayor (medios). Sin clase, se usa solo el nivel.
   *   ecosystem Ecosistema e infraestructura: chips y hardware, inferencia y nube, hospedaje de modelos, frameworks y herramientas, empresas de investigación de seguridad, blogs de ingeniería y desarrolladores
   *   leaderboard Rankings y evaluaciones: organizaciones que miden y clasifican modelos
   */
  classes: {
    ecosystem: { label: "Ecosistema e infraestructura", threshold: 70 },
    leaderboard: { label: "Rankings y evaluaciones", threshold: 76 },
  } as Record<string, { label: string; threshold: number }>,
  /**
   * Las notas no seleccionadas con promedio mayor que este número también se redactan como seleccionadas (titular, resumen y motivo para leer);
   * el resto usa la redacción más barata de titular, resumen y traducción.
   */
  understandFloor: 50,
  /**
   * "Todo" (lista web, API y modo completo del RSS) solo muestra notas con promedio igual o mayor; las que no tienen calificación aparecen igual,
   * y la búsqueda cubre todo. Por debajo de 40 suele haber reposteos y saturación de cuentas informativas (llegó a ser más de un tercio de "Todo"), y la selección nunca tomó notas de menos de 60.
   */
  browseFloor: 40,
} as const;
