# GoPlan · Referencia de API

Documentación en formato Swagger / OpenAPI 3.0.3.

**Servidor:** `http://localhost:8080` · **Formato:** `application/json`

## Abrir como Swagger

El archivo [openapi.json](./openapi.json) contiene la especificación completa. Importarlo desde Swagger Editor con **File → Import file**, o desde **Import** en Postman. También se puede utilizar con Swagger UI. Este cambio documenta la API; no agrega una pantalla `/api-docs` al servidor.

Para ejecutar solicitudes al servidor local, Postman permite conservar las cookies de sesión. En un visor Swagger alojado en otro origen, las restricciones de origen y cookies pueden impedir probar el login desde el visor.

## Operaciones

Expandir una operación para consultar parámetros, cuerpo, respuestas y ejemplos. Los valores de ID y ubicación son ilustrativos.

## Autenticación

Login y sesión con JWT en cookie HttpOnly.

<details>
<summary><strong>POST</strong> <code>/api/auth/login</code> — Iniciar sesión</summary>

Verifica email, contraseña Argon2id y estado activo. Entrega el JWT en una cookie HttpOnly (goplan_session), SameSite=Strict, Path=/api y duración de una hora. No devuelve Bearer token en el cuerpo. Si se envía Origin debe coincidir con APP_ORIGIN.

**Autenticación:** no requiere sesión.

**Parameters**

Sin parámetros de ruta ni query.

**Request**

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json
```

**Request body** · obligatorio · `application/json`

```json
{
  "email": "nombre@dominio.com",
  "password": "CONTRASEÑA_DEL_USUARIO"
}
```

| Campo | Tipo | Obligatorio | Restricciones |
|---|---|---|---|
| `email` | string | Sí | Máx. 254 caracteres; email; Se normaliza quitando espacios exteriores y pasando a minúsculas. |
| `password` | string | Sí | Mín. 1 caracteres; Máx. 1024 caracteres; password |

**Responses**

| Code | Description |
|---|---|
| `200` | Sesión iniciada. |
| `400` | Email o contraseña inválidos. |
| `401` | Email o contraseña incorrectos, cuenta sin contraseña o usuario deshabilitado. |
| `403` | Origen no permitido. |
| `415` | Se requiere Content-Type: application/json. |
| `429` | Diez intentos por IP cada quince minutos. Límite en memoria por proceso. |
| `500` | No se pudo iniciar sesión. |

**Example value · 200**

```json
{
  "usuario": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Nombre Apellido",
    "email": "nombre@dominio.com",
    "rol": "admin"
  }
}
```

</details>

<details>
<summary><strong>GET</strong> <code>/api/auth/me</code> — Consultar la sesión</summary>

Valida el JWT de la cookie y consulta nuevamente al usuario en MongoDB para verificar que exista y esté activo.

**Autenticación:** cookie `goplan_session` requerida.

**Parameters**

Sin parámetros de ruta ni query.

**Request**

```http
GET http://localhost:8080/api/auth/me
Cookie: goplan_session=TOKEN_DEL_LOGIN
```

**Request body:** no se envía.

**Responses**

| Code | Description |
|---|---|
| `200` | Usuario autenticado. |
| `401` | Sesión inválida o vencida: cookie ausente, JWT inválido, usuario inexistente o inactivo. |
| `500` | No se pudo comprobar la sesión. |

**Example value · 200**

```json
{
  "usuario": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Nombre Apellido",
    "email": "nombre@dominio.com",
    "rol": "admin"
  }
}
```

</details>

<details>
<summary><strong>POST</strong> <code>/api/auth/logout</code> — Cerrar sesión</summary>

Elimina la cookie del cliente. No requiere sesión válida. No revoca copias del JWT, que vencen en una hora.

**Autenticación:** no requiere sesión.

**Parameters**

Sin parámetros de ruta ni query.

**Request**

```http
POST http://localhost:8080/api/auth/logout
Content-Type: application/json
```

**Request body** · obligatorio · `application/json`

```json
{}
```

**Responses**

| Code | Description |
|---|---|
| `204` | Cookie eliminada. Sin cuerpo. |
| `403` | Origen no permitido. |
| `415` | Se requiere Content-Type: application/json. |

</details>

## Actividades

CRUD público en el estado actual.

<details>
<summary><strong>GET</strong> <code>/api/actividades</code> — Listar actividades</summary>

Acceso público. Sin filtros ni paginación implementados.

**Autenticación:** no requiere sesión.

**Parameters**

Sin parámetros de ruta ni query.

**Request**

```http
GET http://localhost:8080/api/actividades
```

**Request body:** no se envía.

**Responses**

| Code | Description |
|---|---|
| `200` | Lista completa; [] si no hay actividades. |
| `500` | Error de persistencia. |

**Example value · 200**

```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "nombre": "Caminata urbana",
    "descripcion": "Recorrido guiado por los principales puntos de la ciudad.",
    "categoria": "Turismo",
    "fechaInicio": "2030-12-15T14:00:00.000Z",
    "cupo": 20,
    "precio": 15000,
    "ubicacion": {
      "pais": {
        "codigo": "AR",
        "nombre": "Argentina"
      },
      "provincia": {
        "codigo": "CODIGO_PROVINCIA",
        "nombre": "Provincia de ejemplo"
      },
      "ciudad": {
        "idExterno": 123,
        "nombre": "Ciudad de ejemplo"
      },
      "direccion": "Avenida de ejemplo 1234"
    }
  }
]
```

</details>

<details>
<summary><strong>POST</strong> <code>/api/actividades</code> — Crear actividad</summary>

Acceso público actualmente. Valida el alta con Joi. La fecha debe ser futura. La ubicación del ejemplo es ilustrativa; obtener códigos reales de los endpoints de ubicaciones.

**Autenticación:** no requiere sesión.

**Parameters**

Sin parámetros de ruta ni query.

**Request**

```http
POST http://localhost:8080/api/actividades
Content-Type: application/json
```

**Request body** · obligatorio · `application/json`

```json
{
  "nombre": "Caminata urbana",
  "descripcion": "Recorrido guiado por los principales puntos de la ciudad.",
  "categoria": "Turismo",
  "fechaInicio": "2030-12-15T14:00:00.000Z",
  "cupo": 20,
  "precio": 15000,
  "ubicacion": {
    "pais": {
      "codigo": "AR",
      "nombre": "Argentina"
    },
    "provincia": {
      "codigo": "CODIGO_PROVINCIA",
      "nombre": "Provincia de ejemplo"
    },
    "ciudad": {
      "idExterno": 123,
      "nombre": "Ciudad de ejemplo"
    },
    "direccion": "Avenida de ejemplo 1234"
  }
}
```

| Campo | Tipo | Obligatorio | Restricciones |
|---|---|---|---|
| `nombre` | string | Sí | Mín. 3 caracteres; Máx. 100 caracteres |
| `descripcion` | string | Sí | Mín. 10 caracteres; Máx. 1000 caracteres |
| `categoria` | string | Sí | Mín. 3 caracteres; Máx. 50 caracteres |
| `fechaInicio` | string | Sí | date-time; Fecha ISO posterior al momento del alta. |
| `cupo` | integer | Sí | Mín. 1 |
| `precio` | number | Sí | Mín. 0 |
| `ubicacion` | object | Sí | Ver esquema Ubicacion |

**Responses**

| Code | Description |
|---|---|
| `200` | Actividad guardada. La implementación devuelve 200, no 201. |
| `400` | Datos rechazados por Joi. |
| `500` | Error de persistencia. |

**Example value · 200**

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "nombre": "Caminata urbana",
  "descripcion": "Recorrido guiado por los principales puntos de la ciudad.",
  "categoria": "Turismo",
  "fechaInicio": "2030-12-15T14:00:00.000Z",
  "cupo": 20,
  "precio": 15000,
  "ubicacion": {
    "pais": {
      "codigo": "AR",
      "nombre": "Argentina"
    },
    "provincia": {
      "codigo": "CODIGO_PROVINCIA",
      "nombre": "Provincia de ejemplo"
    },
    "ciudad": {
      "idExterno": 123,
      "nombre": "Ciudad de ejemplo"
    },
    "direccion": "Avenida de ejemplo 1234"
  }
}
```

</details>

<details>
<summary><strong>GET</strong> <code>/api/actividades/{id}</code> — Consultar actividad por ID</summary>

Acceso público. Si un ID válido no existe, la implementación devuelve {} con 200. Un ID mal formado puede devolver 500.

**Autenticación:** no requiere sesión.

**Parameters**

| Nombre | Ubicación | Obligatorio | Descripción | Ejemplo |
|---|---|---|---|---|
| `id` | path | Sí | ObjectId devuelto al crear o listar una actividad. | `507f1f77bcf86cd799439012` |

**Request**

```http
GET http://localhost:8080/api/actividades/507f1f77bcf86cd799439012
```

**Request body:** no se envía.

**Responses**

| Code | Description |
|---|---|
| `200` | Actividad encontrada o {} si no existe. |
| `500` | ID mal formado o error de persistencia. |

**Example value · 200**

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "nombre": "Caminata urbana",
  "descripcion": "Recorrido guiado por los principales puntos de la ciudad.",
  "categoria": "Turismo",
  "fechaInicio": "2030-12-15T14:00:00.000Z",
  "cupo": 20,
  "precio": 15000,
  "ubicacion": {
    "pais": {
      "codigo": "AR",
      "nombre": "Argentina"
    },
    "provincia": {
      "codigo": "CODIGO_PROVINCIA",
      "nombre": "Provincia de ejemplo"
    },
    "ciudad": {
      "idExterno": 123,
      "nombre": "Ciudad de ejemplo"
    },
    "direccion": "Avenida de ejemplo 1234"
  }
}
```

</details>

<details>
<summary><strong>PUT</strong> <code>/api/actividades/{id}</code> — Modificar actividad</summary>

Acceso público. Aplica $set a los campos enviados. Actualmente no ejecuta la validación Joi del alta. Si se envía ubicacion se reemplaza ese objeto completo. No enviar _id.

**Autenticación:** no requiere sesión.

**Parameters**

| Nombre | Ubicación | Obligatorio | Descripción | Ejemplo |
|---|---|---|---|---|
| `id` | path | Sí | ObjectId devuelto al crear o listar una actividad. | `507f1f77bcf86cd799439012` |

**Request**

```http
PUT http://localhost:8080/api/actividades/507f1f77bcf86cd799439012
Content-Type: application/json
```

**Request body** · obligatorio · `application/json`

```json
{
  "nombre": "Caminata actualizada",
  "cupo": 25,
  "precio": 18000
}
```

**Responses**

| Code | Description |
|---|---|
| `200` | Documento actualizado. |
| `404` | Actividad no encontrada o ID inválido. |
| `500` | Error de persistencia. |

**Example value · 200**

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "nombre": "Caminata actualizada",
  "descripcion": "Recorrido guiado por los principales puntos de la ciudad.",
  "categoria": "Turismo",
  "fechaInicio": "2030-12-15T14:00:00.000Z",
  "cupo": 25,
  "precio": 18000,
  "ubicacion": {
    "pais": {
      "codigo": "AR",
      "nombre": "Argentina"
    },
    "provincia": {
      "codigo": "CODIGO_PROVINCIA",
      "nombre": "Provincia de ejemplo"
    },
    "ciudad": {
      "idExterno": 123,
      "nombre": "Ciudad de ejemplo"
    },
    "direccion": "Avenida de ejemplo 1234"
  }
}
```

</details>

<details>
<summary><strong>DELETE</strong> <code>/api/actividades/{id}</code> — Eliminar actividad</summary>

Acceso público. Eliminación del documento.

**Autenticación:** no requiere sesión.

**Parameters**

| Nombre | Ubicación | Obligatorio | Descripción | Ejemplo |
|---|---|---|---|---|
| `id` | path | Sí | ObjectId devuelto al crear o listar una actividad. | `507f1f77bcf86cd799439012` |

**Request**

```http
DELETE http://localhost:8080/api/actividades/507f1f77bcf86cd799439012
```

**Request body:** no se envía.

**Responses**

| Code | Description |
|---|---|
| `204` | Eliminada. Sin cuerpo. |
| `404` | Actividad no encontrada o ID inválido. |
| `500` | Error de persistencia. |

</details>

## Ubicaciones

Consultas a CountryStateCity desde el backend.

<details>
<summary><strong>GET</strong> <code>/api/ubicaciones/paises</code> — Listar países</summary>

Usar iso2 del país como parámetro pais en la siguiente consulta. Requiere CSC_API_KEY en el backend. Transmite el JSON de CountryStateCity sin transformar; la estructura depende del proveedor.

**Autenticación:** no requiere sesión.

**Parameters**

Sin parámetros de ruta ni query.

**Request**

```http
GET http://localhost:8080/api/ubicaciones/paises
```

**Request body:** no se envía.

**Responses**

| Code | Description |
|---|---|
| `200` | JSON devuelto por CountryStateCity. |
| `502` | Falta la clave, error del proveedor, timeout o fallo de comunicación. |

</details>

<details>
<summary><strong>GET</strong> <code>/api/ubicaciones/paises/{pais}/provincias</code> — Listar provincias o estados</summary>

Usar iso2 de la provincia como parámetro provincia en la consulta de ciudades. Requiere CSC_API_KEY en el backend. Transmite el JSON de CountryStateCity sin transformar; la estructura depende del proveedor.

**Autenticación:** no requiere sesión.

**Parameters**

| Nombre | Ubicación | Obligatorio | Descripción | Ejemplo |
|---|---|---|---|---|
| `pais` | path | Sí | Código iso2 obtenido de la lista de países. | `AR` |

**Request**

```http
GET http://localhost:8080/api/ubicaciones/paises/AR/provincias
```

**Request body:** no se envía.

**Responses**

| Code | Description |
|---|---|
| `200` | JSON devuelto por CountryStateCity. |
| `502` | Falta la clave, error del proveedor, timeout o fallo de comunicación. |

</details>

<details>
<summary><strong>GET</strong> <code>/api/ubicaciones/paises/{pais}/provincias/{provincia}/ciudades</code> — Listar ciudades</summary>

Usar id como ubicacion.ciudad.idExterno y name como nombre al crear una actividad. Requiere CSC_API_KEY en el backend. Transmite el JSON de CountryStateCity sin transformar; la estructura depende del proveedor.

**Autenticación:** no requiere sesión.

**Parameters**

| Nombre | Ubicación | Obligatorio | Descripción | Ejemplo |
|---|---|---|---|---|
| `pais` | path | Sí | Código iso2 obtenido de la lista de países. | `AR` |
| `provincia` | path | Sí | Código iso2 obtenido de la lista de provincias. Reemplazar el ejemplo. | `CODIGO_PROVINCIA` |

**Request**

```http
GET http://localhost:8080/api/ubicaciones/paises/AR/provincias/CODIGO_PROVINCIA/ciudades
```

**Request body:** no se envía.

**Responses**

| Code | Description |
|---|---|
| `200` | JSON devuelto por CountryStateCity. |
| `502` | Falta la clave, error del proveedor, timeout o fallo de comunicación. |

</details>

## Schemas

Los esquemas completos están en `components.schemas` de [openapi.json](./openapi.json).

| Esquema | Contenido |
|---|---|
| `Credenciales` | Email y contraseña de login |
| `UsuarioPublico` | `_id`, nombre, email y rol; no incluye hash |
| `Sesion` | Objeto con el usuario autenticado |
| `ActividadEntrada` | Campos y validaciones del alta |
| `Actividad` | Actividad persistida con `_id` |
| `Ubicacion` | País, provincia, ciudad y dirección |
| `Error` | Mensaje de error; algunas respuestas incluyen URL y método |

## Ejecución local

1. Instalar dependencias con `npm install` si todavía no están instaladas.
2. Crear un archivo `.env` en la raíz con la configuración propia:

   ```dotenv
   MODO_PERSISTENCIA=MONGODB
   STRCNX=mongodb://localhost:27017
   BASE=goplan
   APP_ORIGIN=http://localhost:8080
   JWT_SECRET=reemplazar_por_un_secreto_aleatorio_privado
   CSC_API_KEY=reemplazar_por_la_clave_de_CountryStateCity
   ```

   Usar la misma base donde se encuentran los datos que se quieren consultar. No subir `.env` al repositorio.

3. Ejecutar `npm run prod` (inicia `node index.js`).
4. Abrir `http://localhost:8080/` para acceder al frontend.

El puerto actual está fijado en `8080` en `config.js`. `npm run dev` utiliza `nodemon`, que no está declarado como dependencia del proyecto. El arranque conecta MongoDB y prepara los índices de usuarios antes de abrir el servidor.

### Variables de entorno

| Variable | Uso | Valor si no se configura |
|---|---|---|
| `MODO_PERSISTENCIA` | Selección mediante las factories; MongoDB es el modo implementado | MongoDB por defecto |
| `STRCNX` | URI de conexión a MongoDB | `mongodb://localhost:27017` |
| `BASE` | Nombre de la base | `test` |
| `JWT_SECRET` | Firma y verificación de JWT | Clave temporal aleatoria por proceso; reiniciar invalida las sesiones |
| `APP_ORIGIN` | Origen permitido para los POST de autenticación | `http://localhost:8080` |
| `CSC_API_KEY` | Clave del servicio CountryStateCity, utilizada solo desde el backend | Sin clave; ubicaciones responde con error |

## Probar la sesión en Postman

1. Usar **Authorization → No Auth** y **Body → raw → JSON** para el login.
2. Enviar `POST /api/auth/login`. Un 200 devuelve el usuario y establece la cookie `goplan_session`.
3. Conservar las cookies y enviar `GET /api/auth/me` al mismo host. No alternar `localhost` y `127.0.0.1`.
4. Para salir, enviar `POST /api/auth/logout` con `{}`. La siguiente consulta a `/me` debe devolver 401.

Si se envía `Origin`, debe coincidir con `APP_ORIGIN`. El JWT no se devuelve en el JSON ni se acepta como Bearer token. La cookie es HttpOnly, SameSite=Strict y dura una hora. Reiniciar sin un `JWT_SECRET` fijo invalida las sesiones. Logout elimina la cookie, pero no revoca otras copias del JWT.

Abrir `/api/auth/login` en la barra del navegador envía GET; el login requiere POST. Usar el formulario de inicio o Postman.

## Usuarios persistidos

El login requiere un usuario activo existente en la colección `usuarios` de la base configurada por `BASE`. Los ejemplos de autenticación son ilustrativos y no corresponden a cuentas precargadas. El alta pública se realiza con `POST /api/usuarios`; la edición del perfil propio, con `PATCH /api/usuarios/me`.

## Alcance y pruebas

Los 11 endpoints anteriores representan la implementación actual. Se incluyen alta de usuarios y modificación del perfil propio. No se incluye login con Google ni administración de otros usuarios. El rol todavía no restringe las operaciones de actividades.

Ejecutar `node --test` para las pruebas HTTP del login con persistencia simulada. `npm test` todavía contiene el mensaje predeterminado de pruebas no configuradas.

## Alta y modificación de usuarios

`POST /api/usuarios` crea una cuenta sin requerir sesión. Requiere JSON:

```json
{
  "nombre": "Ana",
  "apellido": "Perez",
  "email": "ana@dominio.com",
  "password": "UNA_CONTRASEÑA_PERSONAL"
}
```

Responde `201` con `{ "usuario": { ... } }`, sin contraseña ni hash. El rol siempre es `usuario` y `activo` es `true`. No inicia sesión automáticamente: luego se utiliza `/api/auth/login`.

`PATCH /api/usuarios/me` requiere la cookie de sesión y acepta uno o varios campos entre `nombre`, `apellido` y `email`. Responde `200` con el usuario actualizado. No permite modificar contraseñas, roles, estado ni otros usuarios.

Nombre y apellido admiten entre 2 y 100 caracteres, sin espacios exteriores. Email se normaliza a minúsculas. La contraseña de alta admite de 8 a 128 caracteres y se persiste como hash Argon2id. Campos adicionales y cuerpos vacíos son rechazados (`400`); emails duplicados devuelven `409`. Los POST/PATCH requieren JSON y el origen configurado si se envía `Origin`.

El alta establece `createdAt` y `updatedAt`; la edición conserva `createdAt` y renueva `updatedAt`. Los documentos anteriores sin apellido siguen siendo compatibles con el arranque y el login; pueden completar ese campo al editar su perfil. La validación Joi pertenece a la aplicación: no es un validador de colección en MongoDB.
