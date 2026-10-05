# Fase 02 — Registro de clientes

## 1. Tabla de funciones creadas

| Archivo | Función o componente | Responsabilidad objetiva |
| --- | --- | --- |
| `server/index.js` | `authenticate` | Valida el JWT `Bearer`, emisor y audiencia antes de continuar con una solicitud protegida. |
| `server/index.js` | `authorizeRoles` | Permite el acceso al recurso de clientes únicamente a los roles declarados por la ruta: `ADMIN` y `RECEPCION`. |
| `server/index.js` | `POST /api/clients` | Recurso REST que recibe el formulario multipart, valida datos y fotografía, registra el cliente y devuelve `usuario guardado`. |
| `server/index.js` | `customerSchema` | Comprueba formatos, campos obligatorios, código postal, teléfonos, correos, fecha válida y coherencia entre edad y fecha de nacimiento. |
| `server/repositories/customerRepository.js` | `findDuplicate` | Busca duplicados por correo personal, teléfono personal o identidad normalizada antes de insertar. |
| `server/repositories/customerRepository.js` | `create` | Inserta el cliente, su dirección y fotografía en la tabla `clients` usando parámetros SQL. |
| `server/repositories/customerRepository.js` | `recordAudit` | Registra la acción `CLIENT_CREATED` en `audit_log`. |
| `server/services/customerService.js` | `createIdentityKey` | Genera una huella SHA-256 de nombre normalizado y fecha de nacimiento para detectar otro registro de la misma persona. |
| `server/services/customerService.js` | `register` | Coordina la búsqueda, alta y auditoría dentro de una sola transacción MySQL; ante duplicado hace rollback y devuelve conflicto. |
| `src/customerRegistrationFacade.js` | `CustomerRegistrationFacade.validate` | Valida el formulario en frontend antes del envío: obligatorios, formato, imagen y máximo de 7 MB. |
| `src/customerRegistrationFacade.js` | `CustomerRegistrationFacade.register` | Encapsula `FormData`, token Bearer y petición REST; la vista no conoce detalles de transporte. |
| `src/App.jsx` | `CustomerRegistration` | Vista React de captura del cliente, con la misma apariencia oscura/ámbar de la fase inicial y aviso de resultado. |
| `src/App.jsx` | `CustomerDetailModal` / `CustomerList` | Presenta el detalle completo y fotografía de cada cliente; permite editar sus datos y reemplazar la imagen para `ADMIN` y `RECEPCION`. |
| `src/App.jsx` | Consulta de código postal `cp.terio.dev` | Al capturar un CP válido, obtiene `datos`, autocompleta estado y municipio, y convierte colonia en un selector de asentamientos; mantiene captura manual si la API falla o no devuelve resultados. |
| `src/App.jsx` | `openCustomerRegistration` / `backToDashboard` | Controlan la ruta interna `/clientes/nuevo` y el regreso al panel correspondiente. |

## 2. Tabla de módulos terminados y pendientes

| Módulo | Estado | Descripción |
| --- | --- | --- |
| Autorización de registro | Terminado | El botón está disponible para `ADMIN` y `RECEPCION`; el servidor vuelve a exigir esos mismos roles. `GERENTE`, `TECNICO` y `ALMACEN` no pueden registrar clientes. |
| Formulario de cliente | Terminado | Captura nombre completo, contacto alternativo, edad, nacimiento, ambos teléfonos, correos, foto y dirección completa. Solo el correo de trabajo es opcional. |
| Fotografía | Terminado | Acepta MIME `image/*`, limita el archivo a 7 MB en frontend y backend, y lo conserva en MySQL como `MEDIUMBLOB` junto con su tipo MIME. |
| Validación | Terminado | Valida formato en navegador y servidor. La API es la fuente de verdad para evitar eludir reglas desde el cliente. |
| Antiduplicados | Terminado | Verificación previa y restricciones únicas por correo, teléfono e identidad normalizada; una condición de carrera también se transforma en respuesta `409`. |
| Persistencia y auditoría | Terminado | La creación del cliente y el evento `CLIENT_CREATED` se confirman o revierten juntos en una transacción. |
| Asociación con taller A/B | Pendiente | Se deja fuera de esta fase, según la precondición indicada. |
| Consulta, edición y baja de clientes | Pendiente | No se implementan porque esta fase solo cubre el alta. |

## 3. Código generado, documentado

### Backend REST, Repository y seguridad

- Se añadió `multer` para recibir `multipart/form-data` en memoria, con una sola fotografía de máximo 7 MB.
- `POST /api/clients` requiere `Authorization: Bearer <JWT>`, valida el JWT y rechaza cualquier rol distinto a `ADMIN` o `RECEPCION`.
- `CustomerRepository` contiene las consultas SQL; `CustomerService` contiene el flujo de negocio y la transacción. Este reparto aplica el patrón **Repository**.
- El alta normaliza nombre + nacimiento con SHA-256 y consulta correo/teléfono/identidad antes de insertar. La base también impone índices únicos, por lo que nunca se conserva un segundo registro si dos solicitudes llegan al mismo tiempo.
- La respuesta exitosa es HTTP `201` con la leyenda exacta: `usuario guardado`.

### Frontend y Facade

- El proyecto de la fase inicial está construido con **React**, no Vue; por eso el Facade se implementó como `CustomerRegistrationFacade` para conservar el framework existente sin introducir una migración fuera del alcance.
- `CustomerRegistrationFacade` concentra validación, armado de `FormData`, token Bearer y llamada REST. `CustomerRegistration` solo captura y presenta datos. Este reparto aplica el patrón **Facade** entre vista y lógica de registro.
- La ruta interna `/clientes/nuevo` se muestra únicamente cuando la sesión en memoria tiene rol `ADMIN` o `RECEPCION`. La autorización definitiva permanece en el backend.

### Base de datos

Se añadió la tabla `clients` con los datos de contacto, dirección, fotografía, huella de identidad, auditoría de creador y fechas. Sus restricciones `UNIQUE` para `personal_email`, `personal_phone` e `identity_key` son la barrera persistente contra duplicados. `created_by` relaciona el cliente con el usuario autenticado que realizó el alta.

### Diagrama de componentes con Archify

Archify fue instalado y generó el diagrama HTML autocontenido en:

`/home/gyntkd/Taller mecanico/.archify/architecture-registro-cliente-20260928-120000/registro-cliente-componentes.html`

Representa el flujo Usuario autorizado → Vista React → Facade → API protegida → Service → Repository → MySQL (`clients` y `audit_log`). Archify validó correctamente el candidato, el renderizado, la consistencia del artefacto y la comprobación automática en navegador. No se realizó revisión visual manual.
