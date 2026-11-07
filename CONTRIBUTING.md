# Cómo contribuir

Son bienvenidos los problemas reproducibles, las correcciones a la documentación, las sugerencias de fuentes y las mejoras que sirvan a cualquier sitio construido con este motor. Puedes escribir en español o en inglés.

## Dónde conversar

- [Issues](https://github.com/PandiCloudDev/latido/issues/new/choose): errores reproducibles, propuestas de funciones con un caso de uso claro y sugerencias de fuentes de México y Latinoamérica.
- Las vulnerabilidades de seguridad se reportan de forma privada según la [guía de seguridad](SECURITY.md).

## Qué contribuciones buscamos

Damos prioridad a mejoras en la experiencia de despliegue, la recolección, el flujo de procesamiento, las interfaces públicas, la accesibilidad, la documentación y la corrección de fallas reproducibles. Antes de cambios grandes de arquitectura o de comportamiento del producto, explica en un issue el caso de uso y la propuesta, para no invertir tiempo en una dirección que no encaje.

Las fuentes y el criterio editorial de Latido viven en `industry/`; el nombre, la marca y las páginas en `site/`, y las funciones exclusivas del sitio se hacen como módulos en `modules/` (ver [Arquitectura](docs/architecture.md#módulos)). Para adaptar el motor a otro sector, consulta [Adaptarlo a otro sector](docs/customize.md). Este repositorio no mantiene adaptadores de recolección específicos para cada red social; puedes conectar resultados de una recolección externa propia con la interfaz descrita en [Fuentes](docs/sources.md).

## Cómo enviar cambios

1. Haz un fork del repositorio y crea tu rama a partir del `main` más reciente.
2. Lee [AGENTS.md](AGENTS.md) y la documentación del área que vas a tocar. Cada PR debe resolver un problema claro, sin refactorizaciones ajenas ni cambios de `package-lock.json` por reinstalar dependencias. Las actualizaciones de dependencias, los archivos de reglas para agentes (`AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`) y los archivos binarios no se aceptan en PR externos; si hace falta cambiarlos, abre antes un issue y el mantenedor se encarga.
3. Configura tu entorno local según [Despliegue](docs/deploy.md). Usa una base de pruebas independiente y apaga la recolección, las llamadas al modelo y los envíos externos mientras desarrollas; no pruebes contra la base de producción ni contra servicios de pago reales.
4. Verifica el comportamiento que tocaste y anota los resultados en el PR; la CI de los forks requiere aprobación del mantenedor y no sustituye la revisión local. Para cambios de código ejecuta `npm run typecheck`, `npm test`, la construcción de la web y sus pruebas; el nombre de la base de pruebas del backend debe terminar en `_test` o `_ci` (si no existe se crea y migra sola) y cada archivo corre en paralelo sobre su propia copia, así que la cuenta necesita permiso `CREATEDB`. Con el sitio en marcha puedes revisar con `node scripts/smoke.ts --base http://localhost:3000`. Para cambios solo de documentación o plantillas basta revisar enlaces, sintaxis y cómo se ven; no hace falta agregar pruebas por agregar.
   Si cambias la base de datos, no modifiques migraciones ya publicadas: la corrección va en un archivo nuevo, que solo debe contener una sentencia apta para ejecutarse en línea; el PR lo revisa de forma automática y en local puedes correr antes `node scripts/check-migrations.ts --base main`. Las reglas están en [Migraciones](docs/architecture.md#migraciones-de-base-de-datos).
   Las pruebas de respaldo y restauración también necesitan `tar` y un `pg_dump`/`pg_restore` compatible con la versión del servidor; crean y limpian una base y un directorio temporales propios, sin acceder a almacenamiento de objetos real.
5. Envía el PR a `main`, enlaza el issue relacionado y marca "Allow edits by maintainers", para que los detalles pequeños se puedan corregir directamente en tu rama. Si todavía estás trabajando, ábrelo como borrador. Los cambios de interfaz llevan capturas, y si cambian la configuración o los pasos de actualización, actualiza la documentación y anota en la sección "Actualizaciones" de [Despliegue](docs/deploy.md) lo que deben hacer los sitios ya desplegados.

`main` se integra mediante PR. Antes de integrar, reúne la rama del PR en un solo commit con la autoría correcta; para actualizar una rama ya publicada usa `git push --force-with-lease`. La rama debe incluir el `main` más reciente, y cuando `check` y `docker` pasen en ese commit se integra con rebase, conservando tu autoría.

No subas `.env`, claves, contraseñas de administrador, cookies, datos de producción ni material sin autorización, y quita la información sensible de registros y capturas. El código se distribuye bajo la [licencia MIT](LICENSE); la información sobre marca y material de terceros está en [NOTICE](NOTICE).
