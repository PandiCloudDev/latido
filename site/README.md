# Sitio

Lo propio de Latido: nombre, textos, idioma, marca, páginas y qué módulos están activos. Los pasos para cambiarlos están en [Adaptarlo a otro sector](../docs/customize.md).

| Archivo | Contenido |
|---|---|
| `site.ts` | Nombre, términos del sector, horarios de los boletines, textos de portada y de "Acerca de", textos de las imágenes para compartir, forma de nombrar notas y boletines, categorías de las interfaces públicas |
| `locale.ts` | Idioma, zona horaria y factor de longitud de los textos generados (perfil `es` para Latido; `zh` conserva el comportamiento original de AIHOT) |
| `models.ts` | Modelos con nombre y cuál usa cada paso (los pasos no listados usan el configurado en `.env`) |
| `brand/` | Íconos, logotipo (`Logo.tsx`), logotipo para imágenes para compartir y pósters (`wordmark.svg`, `wordmark-dark.svg`, opcionales), cabeceras de los boletines (`nameplates/`) y códigos QR de "Acerca de" (`contact/`, opcional) |
| `pages/` | Términos de uso y aviso de privacidad (plantillas que se adaptan antes de publicar) |
| `public/` | Archivos fijos de la raíz del sitio, publicados tras sustituir marcadores como el nombre y la dirección: `robots.txt`, `manifest.webmanifest`, `openapi-v1.json` y, de forma opcional, `.well-known/security.txt` |
| `changelog.json` | Registro de cambios |
| `modules/` | Qué módulos están activos: las tres listas `index.ts`, `server.ts` y `web.ts` enumeran los módulos de `modules/<nombre>/` en la raíz del repositorio; vienen vacías (ver "Módulos" en [Arquitectura](../docs/architecture.md#módulos)) |
