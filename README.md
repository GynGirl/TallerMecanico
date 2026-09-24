# Taller Control

Primera base de la aplicación de gestión de órdenes para talleres mecánicos.

## Arranque

1. Copia `.env.example` como `.env` y completa las credenciales de MySQL.
2. Crea las tablas: `mysql -u root -p < database/schema.sql`.
3. Instala dependencias: `npm install`.
4. En una terminal inicia la API: `npm run server`.
5. En otra inicia el frontend: `npm run dev`.

El primer usuario registrado recibe el rol `ADMIN`; la API bloquea los registros públicos posteriores. Las cuentas posteriores deben ser creadas por un administrador en el módulo de gestión de usuarios que construiremos después.

## Seguridad incluida

- Contraseñas hasheadas con bcrypt (coste 12), nunca reversibles.
- Consultas parametrizadas contra inyección SQL.
- Validación de entradas, límites de peticiones, cabeceras Helmet y CORS restringido.
- JWT de corta duración y bitácora de accesos.
- Tokens de recuperación aleatorios, almacenados solamente como hash y con caducidad.

Ningún sistema puede prometer ser imposible de vulnerar. Antes de producción: usar HTTPS, secretos reales fuera del repositorio, un proveedor de correo, cookies `httpOnly` para sesiones, MFA para administradores, respaldo cifrado, monitoreo y una revisión de seguridad profesional.
