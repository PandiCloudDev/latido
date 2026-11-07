# Módulos

Aquí van las funciones que el motor no trae y que solo necesita este sitio, una carpeta por función (`modules/<nombre>/`), cada una como paquete npm `@aihot/<nombre>` con su propio backend, interfaces, páginas, estilos, migraciones y pruebas. Latido no tiene módulos por ahora.

Un módulo se activa listándolo en `site/modules/` (`index.ts`, `server.ts` y `web.ts`) y en las dependencias de `site/package.json`. El procedimiento completo está en "Módulos" de [Arquitectura](../docs/architecture.md#módulos).
