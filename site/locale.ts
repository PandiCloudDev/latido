// Idioma y calendario del sitio: en qué idioma publica, en qué zona horaria cuenta los días y cómo se miden
// las longitudes de lo que escribe el modelo. Todo el motor consulta este archivo en lugar de suponer chino y
// hora de Pekín. Para volver al comportamiento original de AIHOT basta con language "zh", timeZone
// "Asia/Shanghai", utcOffset "+08:00" y lengthScale 1.

export type SiteLanguage = "zh" | "es" | "en" | "pt";

export interface SiteLocale {
  /** Idioma (ISO 639-1) de todo lo que el sitio escribe: titulares, resúmenes, traducciones, reportes. */
  language: SiteLanguage;
  /** Etiqueta BCP 47 para <html lang> y metadatos. */
  htmlLang: string;
  /** Zona IANA para el programador de tareas, Intl y SQL `AT TIME ZONE`. */
  timeZone: string;
  /**
   * Desfase fijo de esa zona. El calendario del motor usa un desfase fijo, así que la zona elegida no debe tener
   * horario de verano (el centro de México no lo tiene desde 2022).
   */
  utcOffset: string;
  /** Cómo se nombra la hora local en los textos públicos: "hora del centro de México". */
  timeZoneLabel: string;
  /**
   * Los límites heredados del motor están medidos en caracteres chinos. Un mismo contenido ocupa en español unas
   * 2.5 veces más caracteres, así que cada límite de longitud del texto generado se multiplica por este factor.
   */
  lengthScale: number;
}

/** Perfiles disponibles. "zh" es el de AIHOT original; "es" es Latido. */
export const LOCALES: Record<"zh" | "es", SiteLocale> = {
  zh: { language: "zh", htmlLang: "zh-CN", timeZone: "Asia/Shanghai", utcOffset: "+08:00", timeZoneLabel: "北京时间", lengthScale: 1 },
  es: { language: "es", htmlLang: "es-MX", timeZone: "America/Mexico_City", utcOffset: "-06:00", timeZoneLabel: "hora del centro de México", lengthScale: 2.5 },
};

/**
 * El perfil del sitio. SITE_LOCALE permite elegir otro sin tocar código; se usa sobre todo para correr las
 * pruebas heredadas de AIHOT con SITE_LOCALE=zh. En el navegador no hay process y vale el predeterminado.
 */
const requested = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SITE_LOCALE;
export const LOCALE: SiteLocale = LOCALES[(requested === "zh" || requested === "es" ? requested : "es")];

/** Desfase de la zona del sitio en milisegundos ("-06:00" → -21600000). */
export const UTC_OFFSET_MS: number = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(LOCALE.utcOffset);
  if (!m) throw new Error(`LOCALE.utcOffset inválido: ${LOCALE.utcOffset}`);
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60) * 1000;
})();

/** Un límite de longitud heredado (en caracteres chinos), llevado al idioma del sitio. */
export const scaledLength = (chineseChars: number): number =>
  LOCALE.language === "zh" ? chineseChars : Math.round(chineseChars * LOCALE.lengthScale);

/** Texto del motor (andamiaje de prompts, etiquetas) en el idioma del sitio: el original chino o su versión en español. */
export const tr = (zh: string, es: string): string => (LOCALE.language === "zh" ? zh : es);
