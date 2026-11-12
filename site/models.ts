// Qué modelos usa este sitio. El framework trae `default`: el modelo definido por las variables LLM_BASE_URL / LLM_API_KEY / LLM_MODEL.
// Aquí se listan además modelos con nombre (cada uno con sus propias variables de dirección y clave) y cuál usa cada paso; los pasos no listados usan default.
// Al desplegar también se puede cambiar paso por paso con variables de entorno (PREFILTER_MODEL, SCORE_MODEL…) o en la página "Modelos y evaluación" del panel.

import type { ModelPreset } from "@aihot/contracts/site-config";
export type { ModelPreset } from "@aihot/contracts/site-config";

/** Ejemplos de modelos con nombre (cada uno necesita su clave). Puedes borrar los que no uses. */
export const PRESETS: Record<string, ModelPreset> = {
  // GLM 5.3 Flash always reasons; the lowest effort keeps short structured tasks fast.
  "glm-5.3-flash": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled" }, reasoning_effort: "low" }, jsonMode: true, vision: true,
  },
  // The scorer's parameters for glm-5.3-flash: temperature 1 with high reasoning, up to 180 s per call.
  "glm-5.3-flash-selection": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled", clear_thinking: false }, reasoning_effort: "high", top_p: 0.95 }, jsonMode: true, vision: true,
    scoreCall: { temperature: 1, maxTokens: 65_536, timeoutMs: 180_000 },
  },
  // DeepSeek Flash reasons by default; structured tasks switch it off. deepseek-flash-think keeps it on,
  // with room in the output for the reasoning.
  "deepseek-flash": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "DEEPSEEK_BASE_URL", apiKeyEnv: "DEEPSEEK_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
  },
  "deepseek-flash-think": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "DEEPSEEK_BASE_URL", apiKeyEnv: "DEEPSEEK_API_KEY", reasoningTokens: 4000, jsonMode: true,
  },
  "qwen3.7-flash": {
    service: "dashscope", model: "qwen3.7-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  },
  "qwen3.8-flash": {
    service: "dashscope", model: "qwen3.8-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  },
  "mimo-v2.6-flash": {
    service: "mimo", model: "mimo-v2.6-flash", baseUrlEnv: "XIAOMI_MIMO_BASE_URL", apiKeyEnv: "XIAOMI_MIMO_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
  },
  // Latido: free model on the office iMac M1 (Ollama, OpenAI-compatible), reached through a reverse SSH
  // tunnel. A step routed here (PREFILTER_MODEL=local-m1, etc.) falls over to deepseek-respaldo whenever
  // the iMac is off: connection refused or a timeout counts as an outage, and after 10 failures in
  // 5 minutes the circuit skips the iMac for 5 minutes before probing it again.
  "local-m1": {
    service: "local", baseUrlEnv: "LOCAL_LLM_BASE_URL", apiKeyEnv: "LOCAL_LLM_API_KEY",
    get model() { return process.env.LOCAL_LLM_MODEL ?? ""; },
    get extra() { return process.env.LOCAL_LLM_EXTRA_JSON ? JSON.parse(process.env.LOCAL_LLM_EXTRA_JSON) as Record<string, unknown> : undefined; },
    jsonMode: true,
  },
  // The paid backup for every step that may run on the iMac: the same DeepSeek account and prices as default.
  "deepseek-respaldo": {
    service: "llm", model: "deepseek-flash", baseUrlEnv: "LLM_BASE_URL", apiKeyEnv: "LLM_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
    fallbackFor: Object.fromEntries(["prefilter", "score", "summarize", "understand", "structure", "group", "groupReview", "digest", "wording", "feedback"].map(step => [step, "local-m1"])),
  },
  "qwen3-vl-flash": {
    service: "dashscope", model: "qwen3-vl-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: false, vision: true,
  },
};

/**
 * Modelo predeterminado de cada paso (los pasos están en "Modelos y evaluación" del panel): un nombre de arriba o default. Los pasos no listados usan default.
 * Ejemplo: { score: "glm-5.3-flash-selection", groupReview: "mimo-v2.6-flash" }
 */
export const DEFAULTS: Record<string, string> = {};
