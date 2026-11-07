// Shared admin vocabulary.
import { SELECTION } from "@aihot/industry/selection";

export const KIND_LABEL: Record<string, string> = { rss: "RSS", web_list: "Lista web", json_list: "JSON", x_search: "X", mp_account: "Cuentas de WeChat", external: "Reporte externo" };
export const MODE_LABEL: Record<string, string> = { editorial: "Destacadas", hot_signal: "Ambiente", isolated: "Fuera de noticias" };
export const HEALTH_LABEL: Record<string, string> = { ok: "Normal", degraded: "Inestable", failing: "Falla", paused: "En pausa", unknown: "Sin revisar" };
export const VISIBILITY_LABEL: Record<string, string> = { public: "Pública", "summary-only": "Solo resumen", withdrawn: "Retirada" };
export const FEEDBACK_STATUS: Record<string, string> = { new: "Nuevo", triaged: "En proceso", replied: "Respondido", resolved: "Resuelto", spam: "Spam" };
export const FEEDBACK_KIND: Record<string, string> = { bug: "BUG", suggestion: "Sugerencia", question: "Pregunta", other: "Otro" };
export const TIER_LABEL: Record<string, string> = { T1: "T1", T1_5: "T1.5", T2: "T2", EXCLUDE_MP: "Excluir WeChat" };
/** The industry pack's source classes, each with the threshold floor it sets. */
export const SELECTION_CLASS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(SELECTION.classes).map(([k, c]) => [k, `${c.label} (umbral mínimo ${c.threshold})`]),
);
