// Clasificación del sector: categorías, vocabularios de etiquetas, directorio de empresas (protagonistas) y el diccionario de identidad que evita atribuciones equivocadas.
// El modelo etiqueta con estos vocabularios, las páginas de temas (topics.json) agrupan por etiqueta y la barra de filtros agrupa por categoría.
// Al cambiar de sector: la key de cada categoría aparece en las URL (/all?category=…) y no se cambia una vez publicada; etiquetas y directorio se pueden ajustar cuando quieras.

/**
 * Categorías de la web (barra de filtros, marca en tarjetas, RSS por categoría). La key es la identidad en URL e interfaces y no se cambia una vez publicada.
 * section es el título de sección en el boletín diario (varias categorías pueden compartir sección, en este orden); guide le dice al modelo de estructura qué entra en la categoría
 * y dónde está el límite con las vecinas (el criterio general de clasificación está en prompts/structure.md).
 * commentary marca las categorías de comentario (guías, opinión): si un hecho ya publicado en el diario tiene un seguimiento de este tipo, solo ocupa una breve (salvo que lo cubran suficientes fuentes).
 * Las notas sin categoría van en el diario a la sección de la primera categoría con key industry (si no existe, a la última sección).
 * tagColor es el color de la pequeña etiqueta de la categoría tras el titular en las tarjetas de Feishu (nombre de color de text_tag de Feishu).
 * feedLabel es el nombre en el título del RSS por categoría (si falta, se usa label). Para publicar una categoría dentro de otra en la API, el RSS y el MCP, se configura en PUBLIC_CATEGORIES de site/site.ts.
 */
export const CATEGORIES = [
  { key: "ia", tagColor: "indigo", label: "IA", feedLabel: "Inteligencia artificial", section: "Inteligencia artificial", guide: "Modelos de IA, asistentes, agentes y funciones de IA: lanzamientos, versiones, capacidades, precios y resultados en pruebas. Un producto que solo agrega una función de IA menor va en Productos." },
  { key: "productos", tagColor: "turquoise", label: "Productos", feedLabel: "Productos y gadgets", section: "Productos y gadgets", guide: "Lanzamientos y actualizaciones de productos, servicios, apps, plataformas, smartphones, gadgets y electrónica de consumo, incluida su llegada a México o Latinoamérica y sus precios. Las reseñas y comparativas van en Guías." },
  { key: "industry", tagColor: "orange", label: "Negocios", feedLabel: "Negocios digitales", section: "Negocios y startups", guide: "Hechos ya ocurridos en empresas de tecnología y negocios digitales: resultados financieros, rondas de inversión, adquisiciones, alianzas, despidos, nombramientos de directivos, expansión a nuevos mercados, fintech y comercio electrónico. Que lo anuncie la propia empresa con tono promocional no lo vuelve opinión." },
  { key: "regulacion", tagColor: "violet", label: "Regulación", feedLabel: "Regulación digital", section: "Regulación y política digital", guide: "Leyes, normas, decisiones de autoridades, multas, licitaciones, impuestos digitales, protección de datos y política pública de tecnología y telecomunicaciones. Un juicio entre empresas sin autoridad reguladora va en Negocios." },
  { key: "ciberseguridad", tagColor: "red", label: "Ciberseguridad", section: "Ciberseguridad", guide: "Ataques, filtraciones de datos, fraudes digitales, vulnerabilidades y sus investigaciones, así como productos o estudios de seguridad con hallazgos concretos." },
  { key: "videojuegos", tagColor: "green", label: "Videojuegos", section: "Videojuegos", guide: "Industria, consolas, plataformas, estudios y lanzamientos de videojuegos, incluidos sus negocios y adquisiciones." },
  { key: "tip", tagColor: "wathet", label: "Guías", section: "Guías y análisis", guide: "Lo que el lector puede aplicar: guías, trucos, explicaciones, reseñas, comparativas y pruebas de producto. Si solo se lanza una herramienta, va en Productos; si solo hay opinión sin método, va en Análisis.", commentary: true },
  { key: "opinion", tagColor: "purple", label: "Análisis", section: "Guías y análisis", guide: "El foco es la interpretación, el juicio, la predicción, el comentario o la entrevista del autor. Hablar del mercado no lo vuelve Negocios, y que el autor sea famoso no lo vuelve Análisis.", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * El tipo de lanzamiento más seguido del sector: el encabezado del boletín diario muestra "N lanzamientos".
 * Cuenta las notas con esa categoría y esa etiqueta; unit va después del número.
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "productos", tag: "Lanzamiento", unit: " lanzamientos" };

/** Palabras generales del sector que el panorama semanal o mensual puede usar sin citar una nota (en minúsculas). */
export const PLAIN_TERMS: readonly string[] = ["ia", "ai", "api", "app", "apps", "5g", "ceo", "ipo", "startup", "startups", "fintech"];

/**
 * Tipo de contenido que asigna la comprensión de contenido (prompts/content-understanding.md; si cambian, actualiza ese prompt).
 * La rúbrica (prompts/selection-score.md) da a cada tipo pesos distintos en los cinco ejes.
 */
export const ITEM_TYPES = ["model_release", "product_launch", "tool_or_prompt", "research_paper", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

// ── Etiquetas ─────────────────────────────────────────────────────────────────────────────

/** La primera etiqueta de cada nota debe ser una de estas etiquetas de categoría. */
export const CATEGORY_TAGS = [
  "Modelo o nueva generación", "Lanzamiento", "Actualización", "Empresas", "Inversión y startups", "Nombramientos", "Regulación",
  "Ciberseguridad", "Videojuegos", "Estudio o investigación", "Código abierto", "Guía práctica", "Reseña y comparativa",
  "Análisis y opinión", "Rumor o filtración", "Otro",
] as const;

/** Etiquetas de tema opcionales. */
export const TOPIC_TAGS = [
  "IA", "Agentes de IA", "Smartphones", "Gadgets", "Telecom y 5G", "Nube y centros de datos", "Chips", "Fintech", "Comercio electrónico",
  "Redes sociales", "Streaming", "Movilidad", "Privacidad", "Talento y empleo", "México", "Latinoamérica",
] as const;

/** Etiquetas de entidad opcionales (empresas y plataformas). */
export const ENTITY_TAGS = ["OpenAI", "Google", "Apple", "Microsoft", "Meta", "Amazon", "NVIDIA", "Samsung", "Anthropic", "Mercado Libre", "Nubank", "América Móvil"] as const;

/** Sinónimos frecuentes del modelo, llevados a la forma del vocabulario. */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  lanzamientos: "Lanzamiento", "nuevo producto": "Lanzamiento", estreno: "Lanzamiento", "nuevo modelo": "Modelo o nueva generación", modelo: "Modelo o nueva generación",
  "nueva generación": "Modelo o nueva generación", actualizacion: "Actualización", "actualización de producto": "Actualización", "precio": "Actualización",
  empresa: "Empresas", negocios: "Empresas", "resultados financieros": "Empresas", adquisición: "Empresas", adquisicion: "Empresas", alianza: "Empresas", despidos: "Empresas",
  inversión: "Inversión y startups", inversion: "Inversión y startups", "ronda de inversión": "Inversión y startups", startup: "Inversión y startups", startups: "Inversión y startups",
  nombramiento: "Nombramientos", "nuevo director": "Nombramientos", regulacion: "Regulación", ley: "Regulación", política: "Regulación", "politica pública": "Regulación",
  seguridad: "Ciberseguridad", ciberataque: "Ciberseguridad", filtración: "Ciberseguridad", hackeo: "Ciberseguridad", videojuego: "Videojuegos", gaming: "Videojuegos",
  investigación: "Estudio o investigación", estudio: "Estudio o investigación", paper: "Estudio o investigación", reporte: "Estudio o investigación",
  "open source": "Código abierto", "open-source": "Código abierto", "codigo abierto": "Código abierto", repositorio: "Código abierto",
  guía: "Guía práctica", guia: "Guía práctica", tutorial: "Guía práctica", trucos: "Guía práctica", reseña: "Reseña y comparativa", comparativa: "Reseña y comparativa", review: "Reseña y comparativa",
  opinión: "Análisis y opinión", opinion: "Análisis y opinión", análisis: "Análisis y opinión", rumor: "Rumor o filtración", filtracion: "Rumor o filtración",
  "inteligencia artificial": "IA", ai: "IA", agentes: "Agentes de IA", celulares: "Smartphones", teléfonos: "Smartphones", telecomunicaciones: "Telecom y 5G", "5g": "Telecom y 5G",
  nube: "Nube y centros de datos", semiconductores: "Chips", "e-commerce": "Comercio electrónico", ecommerce: "Comercio electrónico", "comercio electronico": "Comercio electrónico",
  mexico: "México", latam: "Latinoamérica", latinoamerica: "Latinoamérica", "américa latina": "Latinoamérica",
};

// ── Empresas y protagonistas ──────────────────────────────────────────────────────────────

/**
 * Temas de empresa: id → nombre visible, etiqueta en tarjetas (null para agrupar solo con entity:<id>) y alias.
 * aliases es para el modelo de estructura; orgNames son los nombres de organización con que la empresa firma sus anuncios (empresa, laboratorio, equipo),
 * que en su propia página de tema se pueden omitir porque el lector ya sabe de quién se habla; otherNames son otras formas de llamarla (cuentas oficiales, submarcas).
 * Todos estos nombres sirven para reconocer de qué empresa se trata, por ejemplo para asociar el protagonista de un hecho con su emisor.
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "ChatGPT", "Sora", "Codex", "GPT"], orgNames: ["OpenAI"], otherNames: ["OpenAI Developers"] },
  anthropic: { name: "Anthropic", displayTag: "Anthropic", aliases: ["Anthropic", "Claude"], orgNames: ["Anthropic"], otherNames: ["Claude Code"] },
  google: { name: "Google", displayTag: "Google", aliases: ["Google", "DeepMind", "Gemini", "Android", "YouTube", "Alphabet"], orgNames: ["Google DeepMind", "Google Research", "Google", "DeepMind", "Alphabet"], otherNames: ["Google AI", "Google Cloud", "Google México"] },
  apple: { name: "Apple", displayTag: "Apple", aliases: ["Apple", "iPhone", "iPad", "Mac", "iOS", "Apple Intelligence"], orgNames: ["Apple"] },
  microsoft: { name: "Microsoft", displayTag: "Microsoft", aliases: ["Microsoft", "Copilot", "Windows", "Xbox", "Azure"], orgNames: ["Microsoft Research", "Microsoft AI", "Microsoft", "Microsoft México"] },
  meta: { name: "Meta", displayTag: "Meta", aliases: ["Meta", "Llama", "WhatsApp", "Instagram", "Facebook"], orgNames: ["Meta Superintelligence Labs", "Meta AI", "Meta"], otherNames: ["AI at Meta"] },
  amazon: { name: "Amazon", displayTag: "Amazon", aliases: ["Amazon", "AWS", "Alexa", "Prime Video"], orgNames: ["Amazon", "Amazon Web Services", "AWS"], otherNames: ["Amazon México"] },
  nvidia: { name: "NVIDIA", displayTag: "NVIDIA", aliases: ["NVIDIA", "GeForce"], orgNames: ["NVIDIA"] },
  samsung: { name: "Samsung", displayTag: "Samsung", aliases: ["Samsung", "Galaxy"], orgNames: ["Samsung Electronics", "Samsung", "Samsung México"] },
  xai: { name: "xAI", displayTag: null, aliases: ["xAI", "Grok"], orgNames: ["xAI"] },
  deepseek: { name: "DeepSeek", displayTag: null, aliases: ["DeepSeek"], orgNames: ["DeepSeek"] },
  "hugging-face": { name: "Hugging Face", displayTag: null, aliases: ["Hugging Face"], orgNames: ["Hugging Face", "HuggingFace"] },
  sony: { name: "Sony", displayTag: null, aliases: ["Sony", "PlayStation"], orgNames: ["Sony", "Sony Interactive Entertainment", "PlayStation"] },
  nintendo: { name: "Nintendo", displayTag: null, aliases: ["Nintendo", "Switch"], orgNames: ["Nintendo"] },
  "mercado-libre": { name: "Mercado Libre", displayTag: "Mercado Libre", aliases: ["Mercado Libre", "MercadoLibre", "Mercado Pago"], orgNames: ["Mercado Libre", "Mercado Pago"] },
  nubank: { name: "Nubank", displayTag: "Nubank", aliases: ["Nubank", "Nu México", "Nu"], orgNames: ["Nubank", "Nu Holdings", "Nu México"] },
  "america-movil": { name: "América Móvil", displayTag: "América Móvil", aliases: ["América Móvil", "Telcel", "Telmex", "Claro"], orgNames: ["América Móvil", "Telcel", "Telmex", "Claro"] },
  rappi: { name: "Rappi", displayTag: null, aliases: ["Rappi"], orgNames: ["Rappi"] },
  kavak: { name: "Kavak", displayTag: null, aliases: ["Kavak"], orgNames: ["Kavak"] },
  clip: { name: "Clip", displayTag: null, aliases: ["Clip"], orgNames: ["Clip", "PayClip"] },
  bitso: { name: "Bitso", displayTag: null, aliases: ["Bitso"], orgNames: ["Bitso"] },
  globant: { name: "Globant", displayTag: null, aliases: ["Globant"], orgNames: ["Globant"] },
  totalplay: { name: "Totalplay", displayTag: null, aliases: ["Totalplay"], orgNames: ["Totalplay", "Grupo Salinas"] },
  "at-t": { name: "AT&T", displayTag: null, aliases: ["AT&T"], orgNames: ["AT&T", "AT&T México"] },
  spotify: { name: "Spotify", displayTag: null, aliases: ["Spotify"], orgNames: ["Spotify"] },
  netflix: { name: "Netflix", displayTag: null, aliases: ["Netflix"], orgNames: ["Netflix"] },
  tesla: { name: "Tesla", displayTag: null, aliases: ["Tesla", "Starlink", "SpaceX"], orgNames: ["Tesla", "SpaceX", "Starlink"] },
  huawei: { name: "Huawei", displayTag: null, aliases: ["Huawei", "HarmonyOS"], orgNames: ["Huawei"] },
  xiaomi: { name: "Xiaomi", displayTag: null, aliases: ["Xiaomi", "Redmi", "POCO"], orgNames: ["Xiaomi"] },
  motorola: { name: "Motorola", displayTag: null, aliases: ["Motorola", "Moto"], orgNames: ["Motorola", "Lenovo"] },
};

/**
 * Diccionario de identidad: las empresas que aparecen en titular y resumen deben aparecer también en el original; si no, se regresa al titular original y se descarta el resumen (evita que el modelo atribuya mal).
 * Si el sector no tiene este problema, puede quedar como arreglo vacío.
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "openai", name: "OpenAI", patterns: [/openai|chatgpt|\bgpt-?[o\d]|\bsora\b|\bcodex\b/i] },
  { id: "anthropic", name: "Anthropic", patterns: [/anthropic|\bclaude\b/i, /\b(?:opus|sonnet|haiku)\s*\d+(?:[.\-]\d+)*\b/i] },
  { id: "google", name: "Google / Gemini", patterns: [/google|deepmind|\bgemini\b|notebooklm|\bandroid\b|\byoutube\b|\bpixel\s?\d/i] },
  { id: "apple", name: "Apple", patterns: [/\bapple\b|\biphone\b|\bipad\b|\bmacbook\b|\bios\s?\d+|\bvision pro\b/i] },
  { id: "microsoft", name: "Microsoft / Copilot", patterns: [/microsoft|copilot|\bwindows\b|\bazure\b|\bxbox\b/i] },
  { id: "meta", name: "Meta", patterns: [/\bMeta\b/, /\bmeta\s?ai\b|\bllama\b|whatsapp|instagram|facebook/i] },
  { id: "amazon", name: "Amazon / AWS", patterns: [/amazon|\baws\b|\balexa\b/i] },
  { id: "nvidia", name: "NVIDIA", patterns: [/nvidia|\bgeforce\b|\bblackwell\b|\brubin(?:\s+ultra)?\b|\bcuda\b/i] },
  { id: "samsung", name: "Samsung", patterns: [/samsung|\bgalaxy\s?[a-z]?\d/i] },
  { id: "xai", name: "xAI / Grok", patterns: [/\bxai\b|\bgrok\b/i] },
  { id: "deepseek", name: "DeepSeek", patterns: [/deepseek/i] },
  { id: "mistral", name: "Mistral", patterns: [/mistral/i] },
  { id: "hugging-face", name: "Hugging Face", patterns: [/hugging\s?face/i] },
  { id: "sony", name: "Sony / PlayStation", patterns: [/\bsony\b|playstation|\bps[45]\b/i] },
  { id: "nintendo", name: "Nintendo", patterns: [/nintendo|\bswitch\s?2\b/i] },
  { id: "mercado-libre", name: "Mercado Libre", patterns: [/mercado\s?libre|mercado\s?pago/i] },
  { id: "nubank", name: "Nubank", patterns: [/nubank|\bnu m[eé]xico\b/i] },
  { id: "america-movil", name: "América Móvil", patterns: [/am[eé]rica m[oó]vil|\btelcel\b|\btelmex\b/i] },
  { id: "rappi", name: "Rappi", patterns: [/\brappi\b/i] },
  { id: "kavak", name: "Kavak", patterns: [/\bkavak\b/i] },
  { id: "bitso", name: "Bitso", patterns: [/\bbitso\b/i] },
  { id: "globant", name: "Globant", patterns: [/\bglobant\b/i] },
  { id: "totalplay", name: "Totalplay", patterns: [/totalplay/i] },
  { id: "huawei", name: "Huawei", patterns: [/huawei|harmonyos/i] },
  { id: "xiaomi", name: "Xiaomi", patterns: [/xiaomi|\bredmi\b/i] },
  { id: "tesla", name: "Tesla / SpaceX", patterns: [/\btesla\b|\bstarlink\b|\bspacex\b/i] },
  { id: "netflix", name: "Netflix", patterns: [/netflix/i] },
  { id: "spotify", name: "Spotify", patterns: [/spotify/i] },
  { id: "perplexity", name: "Perplexity", patterns: [/\bPerplexity\b/] },
  { id: "ollama", name: "Ollama", patterns: [/\bollama\b/i] },
];

/** En estos dominios, quien publica es la empresa correspondiente (plataformas como GitHub o arXiv no cuentan). */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "openai", domains: ["openai.com"] },
  { entityId: "anthropic", domains: ["anthropic.com", "claude.com"] },
  { entityId: "google", domains: ["deepmind.google", "ai.google", "blog.google"] },
  { entityId: "apple", domains: ["apple.com"] },
  { entityId: "microsoft", domains: ["microsoft.com"] },
  { entityId: "nvidia", domains: ["nvidia.com"] },
  { entityId: "samsung", domains: ["news.samsung.com", "samsung.com"] },
  { entityId: "hugging-face", domains: ["huggingface.co"] },
  { entityId: "deepseek", domains: ["deepseek.com"] },
  { entityId: "xai", domains: ["x.ai"] },
  { entityId: "meta", domains: ["ai.meta.com", "about.fb.com"] },
];

/** Estas formas en el original también cuentan como mención de la empresa. */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "meta", pattern: /@AIatMeta\b/i },
];
