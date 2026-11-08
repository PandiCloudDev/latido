# Despliegue

## Con Docker (recomendado)

Necesitas una máquina con Docker (incluido Compose). En un servidor en la nube conviene contar con al menos 2 núcleos y 4 GB de memoria, que se usan al construir las imágenes. Latido corre en producción sobre un VPS de Hostinger con esta misma configuración.

```bash
git clone https://github.com/PandiCloudDev/latido.git
cd latido
node scripts/init-env.ts --llm-key <tu clave de la API del modelo>
```

`init-env.ts` genera `.env` con claves aleatorias y la contraseña de administrador, que imprime una sola vez. Si la máquina no tiene Node, copia `.env.example` como `.env` y llena tú mismo `ADMIN_PASSWORD` (al menos 12 caracteres), `SESSION_SECRET`, `IMG_PROXY_SIGN_SECRET`, `POSTGRES_PASSWORD` (cada uno con `openssl rand -hex 32`) y `LLM_API_KEY`.

Antes de arrancar revisa `SITE_URL` en `.env`: para probar en local deja `http://localhost:3000`; en un servidor pon la dirección que realmente usarán los lectores. Por ejemplo, si se accede por la IP del servidor (cambia la IP de ejemplo por la tuya):

```dotenv
SITE_URL=http://192.0.2.10:3000
```

Los enlaces absolutos del RSS, los enlaces para compartir, el sitemap y el Markdown para agentes usan este valor y no cambian según la dirección con que se abra el navegador. Para dominio y HTTPS sigue la sección "Dominio y HTTPS".

Con la configuración lista, arranca:

```bash
docker compose up -d --build
```

Abre `http://dirección-del-servidor:3000`; el panel está en `/admin` y se entra con la contraseña de administrador. En el primer arranque se importan las fuentes y el contenido empieza a aparecer en uno o dos minutos; las primeras ciento y tantas notas tardan cerca de media hora en procesarse (cada una pasa por prefiltro, calificación, estructura, titular y resumen, y agrupación).

`docker compose` levanta cinco contenedores: `db` (PostgreSQL 17), `setup` (en cada arranque ejecuta migraciones y datos semilla y termina), `api`, `worker` (lectura de fuentes, procesamiento con modelos y tareas programadas) y `web` (las páginas). `web` solo recibe la configuración de las páginas, como la dirección del sitio y de la API, y lee la API por HTTP; la base de datos, las claves de modelos y de administración, y los volúmenes de datos solo se entregan a los contenedores del backend.

### Servidores con restricciones de red

- Si npm es lento al construir, usa un espejo: `docker compose build --build-arg NPM_REGISTRY=<url del espejo>` y después `docker compose up -d`.
- Si Docker tarda en descargar imágenes, configura un espejo de registro.
- Si no se alcanzan fuentes del extranjero, define `EGRESS_PROXY_URL` en `.env`: la lectura de fuentes e imágenes pasa por ese proxy, mientras que las llamadas al modelo no.

### Dominio y HTTPS

Apunta el dominio al servidor y define en `.env`:

```bash
SITE_URL=https://latido.news
SITE_DOMAIN=latido.news
PORT=127.0.0.1:3000        # el puerto 3000 solo lo usa Caddy en la propia máquina; no se expone
TRUST_PROXY=true           # la IP del visitante se lee de los encabezados que reenvía Caddy
```

Después arranca con el perfil HTTPS, y Caddy solicitará y renovará el certificado de forma automática:

```bash
docker compose --profile https up -d --build
```

Si ya tienes Nginx, no necesitas Caddy: haz proxy inverso hacia `http://127.0.0.1:3000` con `proxy_set_header Host $http_host;`, `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` y `proxy_set_header X-Forwarded-Proto $scheme;`, y define `TRUST_PROXY=true` en `.env`. Así el sitio reconoce la dirección HTTPS original al validar el origen de los formularios y al marcar como segura la cookie del panel. `SITE_URL` debe ser la dirección que usan los lectores, porque de ella salen los enlaces, el RSS, las imágenes para compartir y el MCP.

El MCP acepta por defecto el host de `SITE_URL`, además de `localhost`, `127.0.0.1` y `[::1]`. Otros hosts se agregan en `MCP_ALLOWED_HOSTS`, separados por comas, por ejemplo `extra.example:8443,[2001:db8::1]`. No distingue mayúsculas, las IPv6 van entre corchetes y se admite un puerto decimal entre 0 y 65535, que se ignora al comparar. Las entradas con ruta, usuario o puerto inválido no tienen efecto; alias como `127.1` deben listarse explícitamente, y esta configuración solo afecta la validación de Host, sin ampliar los orígenes permitidos para el navegador.

Si hay cachés como Nginx o una CDN enfrente, deben respetar el vencimiento que indica la aplicación (`Cache-Control`): páginas públicas, datos de navegación, API, RSS, Markdown de notas, imágenes para compartir de boletines, sitemap, y las guías `/api/v1/agent` y `/openapi-v1.json` (que también se revalidan al vencer sus cinco minutos). No les asignes un vencimiento más largo, no sirvas contenido viejo sin conexión una vez vencido, no reinicies su vigencia al reenviar una respuesta vieja y no acumules caché de proxy y CDN sobre contenido dinámico. El framework no administra la CDN de tu sitio ni purga su caché.

### Actualizaciones

Antes de actualizar, respalda (ver [Respaldos](#respaldos)). Construye primero, detén los servicios anteriores y después ejecuta las migraciones y la versión nueva:

```bash
git pull
docker compose build
docker compose stop api worker web
docker compose run --rm setup && docker compose up -d
```

Arranca los servicios solo si la migración terminó bien; si falla, revisa el error antes de continuar. Los sitios con HTTPS deben conservar `--profile https`. La api y el worker anteriores deben detenerse antes de migrar, porque una migración puede borrar tablas o columnas y el código viejo fallaría; un worker que se detiene con normalidad espera a que terminen las llamadas de pago en curso (hasta poco más de tres minutos). Sin Docker se sigue el mismo orden: respaldo, construcción, detener API/worker/web, migraciones (`scripts/migrate.ts`), datos semilla (`scripts/seed.ts`) y arranque.

Si una migración nueva encuentra un bloqueo prolongado, informa el nombre del archivo y el tiempo de espera agotado; resuelve la transacción que bloquea y vuelve a ejecutar setup, sin saltarte migraciones ni reescribir su registro. Una creación concurrente de índice interrumpida puede dejar un índice inválido: tras verificar el objeto del error, elimínalo con `DROP INDEX CONCURRENTLY <nombre>` y vuelve a ejecutar; si existe un índice válido con el mismo nombre pero otra definición, revisa la diferencia antes. Estas protecciones no cambian el orden de actualización y, al saltar varias versiones, pueden ejecutarse migraciones destructivas históricas.

#### Notas de actualización de Latido

Aquí se anotan, de la más reciente a la más antigua, las actualizaciones de Latido que requieran migraciones, variables de entorno nuevas o cambios en archivos propios del sitio, y en particular las que borren datos existentes.

- **Noviembre de 2026, configuración editorial**: migraciones aditivas para suscripciones y registro de envíos. La publicidad y el boletín por correo empiezan desactivados. Para activar el boletín, sigue los pasos de abajo.
- **Noviembre de 2026, lanzamiento**: identidad visual de Latido, sitio en español para México y Latinoamérica y fuentes iniciales. No requiere pasos adicionales sobre una instalación nueva.

Las notas de actualización anteriores corresponden al motor AIHOT (versiones de la interfaz pública 3.0.0 y 4.0.0 y sincronizaciones de octubre de 2026) y se conservan en el [`docs/deploy.md` del repositorio original](https://github.com/KKKKhazix/AIHOT/blob/main/docs/deploy.md). Al integrar una actualización del motor, consulta ahí los cambios que afecten a `site/` o `industry/` y anota en esta sección los que apliquen a Latido.

### Boletín semanal por correo

1. Configura en `.env` el relay y su remitente: `LATIDO_SMTP_HOST`, `LATIDO_SMTP_PORT` (587 con STARTTLS o 465 con TLS), `LATIDO_SMTP_USER`, `LATIDO_SMTP_PASSWORD` y `LATIDO_SMTP_FROM` (una sola dirección autorizada). Los procesos API y worker leen estos valores; no los pongas en GitHub. Recrea ambos servicios tras modificar las variables.
2. En **Configuración editorial**, usa **Enviar prueba** con una dirección propia. Comprueba que llega y que el remitente autentica correctamente el dominio. La prueba no registra la dirección.
3. Revisa y publica el aviso de privacidad con el manejo de las suscripciones, el proveedor que transporta el correo y la retención de los respaldos. Luego activa el formulario y los envíos desde ese mismo panel. El worker empieza con las próximas ediciones generadas tras la activación y las envía solo a direcciones confirmadas antes de cada edición.
4. El enlace de confirmación dura 48 horas. Las solicitudes vencidas se eliminan en la limpieza diaria. Una baja borra el correo de la lista activa y el registro asociado a esa suscripción. La lista forma parte de los respaldos de PostgreSQL: limita el acceso y aplica la retención del aviso. Tras una restauración, verifica las bajas posteriores al respaldo antes de reactivar los envíos.

El panel muestra conteos de confirmaciones y entregas aceptadas o fallidas, sin listar direcciones. Un fallo o interrupción durante el envío no vuelve a intentar esa copia automáticamente, porque el relay podría haberla aceptado. El RSS del boletín funciona aunque el correo esté desactivado.

### Respaldos

Configura `DB_BACKUP_STORE_*` en `.env` (cualquier almacenamiento de objetos compatible con S3) y cada día a las 04:10 se hará un respaldo automático. Hay que llenar `DB_BACKUP_STORE_SECRET_ID`, `DB_BACKUP_STORE_SECRET_KEY`, `DB_BACKUP_STORE_BUCKET` y `DB_BACKUP_STORE_REGION`; si falta `DB_BACKUP_STORE_DOMAIN` la dirección se arma con el formato de Tencent COS (`<bucket>.cos.<región>.myqcloud.com`), así que con otro proveedor S3 escribe en `DB_BACKUP_STORE_DOMAIN` el dominio de acceso del bucket (con su nombre incluido, por ejemplo `<bucket>.s3.<región>.amazonaws.com` en AWS S3).

Un respaldo completo incluye el `.dump` de la base y el paquete de archivos `.tar.gz` con la misma marca de tiempo, nombrados según la base: en Docker la base se llama `aihot`, así que son `aihot-<fecha>.dump` y `aihot-files-<fecha>.tar.gz`. El paquete guarda `uploads/` y las `feedback-screenshots/` que sigan en local, sin la caché de imágenes ni el directorio de respaldos locales; si esos directorios están vacíos solo se genera el `.dump`. Las imágenes ya reenviadas a Feishu solo conservan su referencia externa en la base y no se guardan en el paquete.

Cada archivo se sube una sola vez bajo un prefijo: el día 1 de cada mes en `monthly/`, los domingos en `weekly/` y el resto en `daily/`. En el almacenamiento puedes fijar vencimientos distintos por prefijo.

Para restaurar, recupera el par de archivos (o solo el `.dump` si no hay paquete): restaura el `.dump` en una base vacía con un `pg_restore` compatible con la versión de la base y descomprime el paquete en la raíz del directorio de datos (`/data` en Docker; sin Docker, `AIHOT_DATA_DIR`, que por defecto es `.data`), conservando sus subdirectorios y con permisos de lectura para los procesos. Restaurar solo la base no recupera las capturas de comentarios referidas como `local:`, y los archivos que no estaban en un respaldo anterior no se pueden recuperar a partir de sus referencias en la base.

Esta exportación manual solo incluye la base, sin los directorios de adjuntos:

```bash
docker compose exec -T db pg_dump -U aihot aihot | gzip > latido-$(date +%F).sql.gz
```

Los datos viven en tres volúmenes de Docker: `db` (base de datos), `data` (imágenes subidas, caché de imágenes y respaldos locales) y `caddy` (certificados). `docker compose down` no los borra; `docker compose down -v` sí.

### Registros

```bash
docker compose logs -f --tail 100 api worker web
```

La página "Ejecuciones" del panel muestra el último resultado de cada tarea programada y la página "Fuentes" el estado de lectura de cada fuente.

### Sesiones de administrador y cambios de configuración

La sesión queda ligada al método de inicio y a las credenciales de administrador o la identidad de Feishu usadas al entrar. Después de cambiar la contraseña de administrador, la lista de administradores de Feishu o la clave de sesión, reinicia todos los procesos de la API para que carguen la misma configuración; editar el archivo no significa que los procesos en marcha ya la usen, y mezclar procesos con código o configuración vieja impide revocar de forma uniforme.

Con la configuración nueva en vigor, las sesiones por contraseña dejan de aceptar la autorización de la contraseña anterior, y las sesiones de Feishu se comparan con la lista actual según el union ID o el correo obtenido al entrar (basta con que uno de los dos siga autorizado). Desactivar la aplicación de inicio de sesión de Feishu o cambiar su ID invalida esas sesiones; rotar solo el secret de la misma aplicación no cierra las sesiones que sigan autorizadas. Rotar o eliminar `SESSION_SECRET` invalida ambos tipos de sesión.

Las sesiones que resultan inválidas al autenticarse se borran, y restaurar la configuración anterior no las revive. El sistema no guarda un historial global de cambios de credenciales: si un cambio nunca lo cargó un proceso, o ninguna verificación de sesión lo observó antes de revertirse, no sirve para revocar sesiones de forma retroactiva.

## Costos

- **Modelo**: cada nota nueva pasa una vez por el prefiltro; las que lo superan se califican dos veces, se estructuran una vez, reciben titular y resumen y luego se agrupan (con llamada solo si hay coberturas parecidas). A eso se suman la síntesis de eventos, el panorama del semanal y el mensual y la traducción de las notas seleccionadas. Las publicaciones de X sin texto o solo con enlaces no usan modelos de redacción ni de traducción, y el boletín diario se arma por reglas, sin modelo. En una prueba local con las fuentes de ejemplo del motor original, las primeras 152 notas consumieron cerca de 930 llamadas al modelo; el gasto diario depende de cuántas notas publiquen tus fuentes. La página "Modelos y evaluación" del panel muestra las llamadas y los tokens de entrada y salida de cada paso.
- **Recolección de pago** (X, WeChat, Jina): se cobra por petición, viene desactivada y solo se usa si llenas la clave.
- Todos los servicios de pago tienen topes por minuto, por hora y por día (panel, "Configuración → Límites de peticiones de pago"); al superarlos se pausan, así que la factura no se dispara de la noche a la mañana. Un 0 desactiva el servicio de inmediato.

Para ahorrar, en este orden:

1. Revisa la página "Modelos y evaluación", donde están las llamadas y los tokens de cada paso, y empieza por lo que más pesa.
2. Asegúrate de apagar el modo de razonamiento: el razonamiento se cobra como tokens de salida, y `LLM_EXTRA_JSON` en `.env.example` explica cómo desactivarlo.
3. Usa modelos más baratos en los pasos de mayor volumen: en `.env` puedes elegir uno por paso (`PREFILTER_MODEL`, `SCORE_MODEL`, `STRUCTURE_MODEL`…) o cambiarlo en "Modelos y evaluación". Antes de cambiar el modelo de calificación, compáralo con `scripts/eval-selection.ts` sobre las mismas muestras, para no ahorrar a costa de seleccionar mal.
4. Deja entrar menos notas ajenas: el gasto es casi proporcional a las notas diarias. En medios generalistas suscríbete solo a las secciones de tu tema, baja la frecuencia en "Fuentes" y pausa las fuentes con mucho volumen y pocas notas seleccionadas.

## Sin Docker

Necesitas Node.js 24.11 o superior y PostgreSQL 16 o 17, en Linux o macOS; en Windows usa WSL2 o el método con Docker.

```bash
npm ci
node scripts/init-env.ts --llm-key <tu clave de la API del modelo>
createdb latido
```

Agrega a `.env`:

```bash
DATABASE_URL=postgres://tu_usuario@127.0.0.1:5432/latido
API_BASE_URL=http://127.0.0.1:3001
```

Y después:

```bash
node --env-file=.env scripts/migrate.ts
node --env-file=.env scripts/seed.ts
npm run build -w @aihot/web

NODE_ENV=production node --env-file=.env apps/api/src/main.ts          # API, puerto 3001
NODE_ENV=production node --env-file=.env apps/worker/src/main.ts       # tareas en segundo plano
cd apps/web && NODE_ENV=production node --env-file=../../.env server.ts   # páginas, puerto 3000
```

Los tres procesos necesitan `NODE_ENV=production`. Sin esa variable, la api y el worker corren como entorno de desarrollo: no verifican las claves de producción ni la contraseña de administrador al arrancar, y `DEV_AUTH_ROLE` permite entrar sin iniciar sesión.

Los tres procesos deben mantenerse siempre activos; en producción, supervísalos con systemd o pm2 (también con `NODE_ENV=production`). Al detener el worker dale 515 segundos (`TimeoutStopSec=515` en systemd; `kill_timeout: 515000` y `treekill: false` en pm2) para cubrir los 470 segundos de vaciado de la cola y la limpieza de la base; en systemd define además `KillMode=mixed`, para que solo el proceso principal reciba la orden de dejar de tomar tareas y los `pg_dump` y `tar` de un respaldo en curso terminen solos. Una llamada interrumpida antes de tiempo queda con resultado incierto y solo se reintenta cuando se libera sola, al menos media hora después.

Para desarrollar con recarga automática: `npm run dev:api`, `npm run dev:worker` y `npm run dev:web`. Para entrar al panel sin iniciar sesión durante el desarrollo, define `DEV_AUTH_ROLE=admin` en `.env` (en producción el sistema se niega a arrancar con ella).
