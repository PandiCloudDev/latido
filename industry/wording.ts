// Palabras que el sitio no usa en el texto que ve el lector, cada una con la indicación de cómo corregirla (por ejemplo
// [/bombazo|revolucionario/iu, "sin exageraciones; di directamente qué pasó"]). Después de escribir título, resumen y motivo,
// se revisan una por una; si aparece alguna, el modelo corrige solo esos lugares una vez (packages/backend/src/editorial/
// analyze.ts, mendWording). Solo van expresiones que se reconocen a simple vista; las dudosas no, para no corregir texto normal.

export const READER_WORDING: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(?:no vas a creer|no creer[aá]s|te sorprender[aá]|lo que nadie te dice|esto es lo que|as[ií] es como)\b/iu, "sin fórmulas de clickbait; escribe el hecho concreto"],
  [/\b(?:imperdible|bombazo|alucinante|brutal|impactante|incre[ií]ble)\b/iu, "sin adjetivos de exageración; deja que el dato haga el gancho"],
  [/\b(?:revolucionari[oa]s?|cambia las reglas del juego|lo cambia todo|sin precedentes)\b/iu, "sin superlativos; di qué cambia y para quién"],
  [/[¡!]{2,}|[¿?]{2,}/u, "un solo signo, o ninguno; el tono es informativo"],
];
