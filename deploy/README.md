# Despliegue

`Caddyfile` configura Caddy como proxy HTTPS delante del sitio: obtiene y renueva el certificado de `SITE_DOMAIN`, comprime las respuestas y reenvía las peticiones a la web. Se activa con `docker compose --profile https up -d --build`.

Los pasos completos, incluidos dominio, HTTPS con Caddy o Nginx, respaldos y actualizaciones, están en [Despliegue](../docs/deploy.md).
