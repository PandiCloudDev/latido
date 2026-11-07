# Migraciones de base de datos

Cada archivo `NNNN_nombre.sql` es una migración del motor; se ejecutan en orden por nombre completo de archivo y el nombre queda registrado al aplicarse. `scripts/migrate.ts` solo lee los archivos `.sql` de esta carpeta y de `modules/<nombre>/migrations/`.

Las migraciones ya publicadas forman parte de la historia del despliegue y no se modifican, aunque sus comentarios estén en chino (vienen del motor original AIHOT). Una corrección siempre va en un archivo nuevo, y desde `0055` cada archivo contiene una sola sentencia apta para ejecutarse en línea. Las reglas completas están en [Migraciones de base de datos](../../docs/architecture.md#migraciones-de-base-de-datos).
