# Planeación — Fase inicial

## Fases desarrolladas hasta ahora

- **Backend:** API en Node.js y Express para autenticación, con conexión configurable a MySQL, validación de datos, límites de intentos y bitácora de eventos.
- **Base de datos:** diseño inicial MySQL con las entidades necesarias para usuarios, recuperación de contraseña y auditoría.
- **Autenticación:** registro protegido del primer administrador, inicio de sesión, contraseñas hasheadas con bcrypt, JWT de corta duración y flujo base de recuperación y restablecimiento de contraseña.
- **Frontend:** interfaz Vite, React y Tailwind en tema negro; cuenta con acceso, registro, recuperación y rutas post-inicio de sesión según rol.

## Módulos terminados

| Módulo | Estado | Descripción |
| --- | --- | --- |
| Acceso | Terminado | Inicio de sesión con correo y contraseña; la respuesta incluye el rol del usuario. |
| Registro inicial | Terminado | Solo permite crear al primer usuario del sistema como `ADMIN`. |
| Recuperación de contraseña | Base terminada | Genera un token de un solo uso con caducidad y permite cambiar la contraseña; falta integrar el envío real por correo. |
| Roles y navegación | Terminado | `ADMIN` entra a `/administracion`; `GERENTE`, `RECEPCION`, `TECNICO` y `ALMACEN` entran a `/inicio`. |
| Auditoría básica | Terminado | Guarda eventos de registro, inicio de sesión y restablecimiento de contraseña. |

## Módulos pendientes

| Módulo | Descripción |
| --- | --- |
| Gestión de usuarios y roles | Pantalla y API para que el administrador cree cuentas posteriores, active/desactive usuarios y asigne roles. |
| Órdenes de reparación | Registro de cliente, vehículo, diagnóstico, presupuesto, fases, técnicos, costos, evidencias y entrega. |
| Catálogos operativos | Clientes, vehículos, servicios, refacciones, proveedores, garantías y estados de orden. |
| Permisos detallados | Reglas por acción y módulo, además del rol general actual. |
| Notificaciones | Correos de recuperación, avisos de asignaciones y cambios de fase. |
| Reportes | Indicadores de órdenes, ventas, tiempos de reparación, productividad e inventario. |
| Producción | Sesiones con cookies `httpOnly`, HTTPS, MFA para administración, copias de seguridad, monitoreo y revisión de seguridad. |

## Estructura de la base de datos

| Tabla | Propósito |
| --- | --- |
| `users` | Usuarios del taller: datos de cuenta, hash de contraseña, rol, estado y último acceso. Los roles disponibles son `ADMIN`, `GERENTE`, `RECEPCION`, `TECNICO` y `ALMACEN`. |
| `password_resets` | Tokens hasheados, de un solo uso y con expiración para restablecer contraseñas. |
| `audit_log` | Historial de acciones relevantes, usuario responsable, entidad afectada, IP y metadatos opcionales. |

## Credenciales y configuración

Las credenciales de aplicación y conexión a MySQL se guardan en el archivo `.env` de la raíz del proyecto. No deben añadirse al repositorio ni compartirse. El archivo `.env.example` solo sirve como plantilla sin valores reales.

## Publicación recomendada

- **Frontend:** [Vercel](https://vercel.com/), conectado al repositorio y configurado para compilar el proyecto Vite.
- **Backend:** [Railway](https://railway.com/), con variables de entorno privadas y una instancia MySQL administrada o conexión a una base de datos externa segura.
