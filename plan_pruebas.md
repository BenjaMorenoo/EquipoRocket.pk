# Plan de Pruebas de Software — EquipoRocket.pk (Pokémon Champions)

> Estado: **planificación**. Este documento define *qué* se debe probar, *cómo* y *con qué
> resultado esperado*, alineado a la arquitectura de microservicios descrita en
> `CLAUDE.md` y `docs/ARQUITECTURA.md`. No incluye implementación de pruebas todavía.

## 1. Contexto y problemática

EquipoRocket.pk es una plataforma de microservicios (9 componentes: `Frontend_EquipoRocket.pk`,
`ms_gateway`, `ms_auth`, `ms_usuarios`, `ms_pokemon`, `ms_db`, `ms_montecarlo`, `ms_carga_api`,
`ms_asistencia`) para construir, analizar y simular equipos competitivos de Pokémon. La
problemática que motiva este plan tiene tres dimensiones, derivadas directamente de las
características técnicas del sistema:

1. **Funcionalidad distribuida**: cada servicio expone su propia lógica (autenticación,
   CRUD de equipos, simulación Monte Carlo, recomendaciones de IA, ingesta de datos
   externos) y se comunica vía HTTP a través de `ms_gateway`. Un fallo silencioso en un
   servicio (p. ej. una respuesta mal formada de `ms_pokemon`) puede romper flujos en
   cascada en el Frontend o en `ms_montecarlo`/`ms_asistencia`.
2. **Carga computacional concentrada**: `/simulate` de `ms_montecarlo` ahora ejecuta
   `2 × iterations × sims` combates por request (búsqueda independiente para `team` y
   para `opponent`, ver `ms_montecarlo/README.md`), lo que lo convierte en el endpoint
   con mayor riesgo de degradación bajo carga concurrente.
3. **Superficie de seguridad propia de un sistema con autenticación, roles de
   administrador y datos de usuario**: JWT compartido entre `ms_auth` y `ms_usuarios`,
   panel de administración (`/admin/*`), credenciales de administrador por defecto,
   CORS abierto (`allow_origins=["*"]` en `ms_montecarlo`/`ms_carga_api`), y consultas
   SQL directas (`pool.query(...)`) en varios controladores.

Por lo tanto, el plan cubre tres tipos de prueba —**unitarias**, **de estrés/carga** y de
**seguridad**— sobre los componentes donde cada riesgo es más relevante, en lugar de
aplicar el mismo tipo de prueba homogéneamente a todo el sistema.

## 2. Objetivos

- **Funcionales (unitarias)**: verificar que la lógica de negocio de cada componente
  (modelos, controladores, motor de simulación, motor de recomendaciones) produce los
  resultados esperados ante entradas válidas, inválidas y de borde, de forma aislada de
  sus dependencias externas (BD, otros microservicios, APIs externas).
- **Rendimiento (estrés/carga)**: determinar el comportamiento del sistema bajo carga
  esperada y bajo carga superior a la esperada, identificando umbrales de degradación y
  posibles cuellos de botella (CPU de Monte Carlo/bcrypt, pool de conexiones Postgres,
  proxy del gateway).
- **Seguridad**: validar los controles de autenticación, autorización, manejo de
  credenciales y configuración (CORS, secretos) frente a los riesgos del
  [OWASP Top 10](https://owasp.org/Top10/), priorizando los puntos donde el código ya
  muestra patrones de riesgo conocido (CORS `"*"`, secretos con valor por defecto,
  queries construidas a mano).

## 3. Alcance

| Componente | Tecnología | Endpoint/módulo crítico | Tipos de prueba aplicables |
|---|---|---|---|
| `Frontend_EquipoRocket.pk` | React 19 + Vite | `TeamBuilder`, `Simulations`, `services/api.js` | Unitarias, seguridad (XSS) |
| `ms_gateway` | Node/Express + http-proxy-middleware | proxies `/api/*` | Unitarias, estrés, seguridad |
| `ms_auth` | Node/Express + bcrypt + JWT | `/register`, `/login`, `requireAdmin` | Unitarias, estrés, seguridad |
| `ms_usuarios` | Node/Express + pg | `teamModel`, `adminController`, `requireAuth` | Unitarias, estrés, seguridad |
| `ms_pokemon` | Node/Express + pg | `GET /:name`, `GET /` | Unitarias, estrés |
| `ms_db` | Postgres 15 + `schema.sql` | triggers, `init-db` | Unitarias, seguridad |
| `ms_montecarlo` | FastAPI (Python) | `/simulate`, `/persist_best`, `search_best_team` | Unitarias, estrés, seguridad |
| `ms_carga_api` | FastAPI (Python) | `/load`, `process_payload` | Unitarias, estrés |
| `ms_asistencia` | FastAPI (Python) + pandas | `/analyze/team`, `/recommend/*` | Unitarias, estrés |

Fuera de alcance (por ahora): pruebas de usabilidad/UX, pruebas de accesibilidad, pruebas
de migraciones de base de datos entre versiones de esquema.

## 4. Estrategia y herramientas por componente

| Componente | Pruebas unitarias | Pruebas de carga | Pruebas de seguridad |
|---|---|---|---|
| Frontend | Vitest + React Testing Library | Lighthouse (carga inicial) | `npm audit`, revisión manual de XSS |
| `ms_gateway` | Jest + Supertest (mock de targets con `nock`) | k6 / autocannon | `npm audit`, pruebas manuales de cabeceras/CORS |
| `ms_auth` | Jest + Supertest (BD de prueba) | k6 (foco en `/login`, CPU de bcrypt) | `npm audit`, casos manuales JWT/fuerza bruta |
| `ms_usuarios` | Jest + Supertest (BD de prueba) | k6 (`/teams`, `/admin/*`) | `npm audit`, casos manuales SQLi/IDOR |
| `ms_pokemon` | Jest + Supertest | k6 | `npm audit` |
| `ms_db` | scripts SQL (pgTAP o Jest+pg directo) | — | revisión de triggers, roles y privilegios |
| `ms_montecarlo` | pytest + `TestClient` (FastAPI) | locust (foco en `/simulate`) | `pip-audit`, revisión CORS |
| `ms_carga_api` | pytest + `responses` (mock HTTP externo) | locust (`/load`) | `pip-audit` |
| `ms_asistencia` | pytest | locust (`/recommend/*`) | `pip-audit`, revisión CORS |
| Transversal | — | — | OWASP ZAP (DAST) contra `ms_gateway` |

**Fundamento**: se eligen frameworks de pruebas idiomáticos por stack (Jest/Vitest para
Node/React, pytest para FastAPI) para minimizar la curva de adopción, dado que
actualmente **ningún servicio tiene runner de pruebas configurado** (confirmado en
`CLAUDE.md`: "No service currently has a configured test runner"). Las pruebas de carga
usan herramientas orientadas a HTTP (k6/locust/autocannon) que permiten definir
escenarios de usuarios virtuales concurrentes sin instrumentar el código. Las pruebas de
seguridad combinan análisis de dependencias (SCA: `npm audit`/`pip-audit`), análisis
dinámico (DAST: OWASP ZAP) y casos de prueba manuales dirigidos a los puntos de riesgo ya
identificados en el código (CORS, JWT, queries SQL).

---

## 5. Pruebas unitarias

Las pruebas unitarias siguen **partición de equivalencia** (entradas válidas/inválidas
representativas) y **análisis de valores límite** (equipos vacíos, de tamaño máximo,
listas con un solo elemento), aislando cada unidad de sus dependencias (BD, HTTP externo)
mediante mocks/stubs, conforme a los principios F.I.R.S.T. (Fast, Independent,
Repeatable, Self-validating, Timely).

| ID | Componente / módulo | Funcionalidad a comprobar | Caso de prueba (acción) | Resultado esperado |
|---|---|---|---|---|
| UT-MC-01 | `ms_montecarlo/montecarlo.py::pick_default_config` | Selección del build "más usado" de un Pokémon según datos de Pikalytics | Invocar con un Pokémon cuyos `moves`/`items`/`abilities`/`spreads` tienen distintos `percent` | Devuelve el elemento de mayor `percent` en cada categoría; con listas vacías no lanza excepción |
| UT-MC-02 | `ms_montecarlo/montecarlo.py::generate_random_config_for_pokemon` | Generación de configuración aleatoria reproducible | Invocar dos veces con el mismo `rng` (semilla fija) | Ambas llamadas devuelven exactamente la misma configuración; la configuración pertenece a los `top_moves`/`top_items`/`top_abilities`/`top_spreads` candidatos |
| UT-MC-03 | `ms_montecarlo/montecarlo.py::evaluate_team` | Simulación de `sims` combates contra un rival fijo | Invocar con `sims=200` y `opponent_fixed` definido | Devuelve `(win_rate, iterations)` con `0 <= win_rate <= 1`, `len(iterations) == 200`, cada iteración con `winner` en `{'A','B'}` |
| UT-MC-04 | `ms_montecarlo/app.py::_derive_seed` | Determinismo y simetría de la semilla por par de equipos | (a) Invocar dos veces con los mismos `(searched, against, iterations, sims, base)`. (b) Comparar `_derive_seed(A, B, ...)` con `_derive_seed(B, A, ...)` de la request inversa | (a) Misma salida en ambas llamadas (determinismo). (b) La semilla de la búsqueda de `team=A` en una request coincide con la semilla de la búsqueda de `opponent=A` en la request con equipos intercambiados |
| UT-MC-05 | `ms_montecarlo/montecarlo.py::search_best_team` | Reproducibilidad de la búsqueda Monte Carlo | Ejecutar dos veces con el mismo `random_seed` y mismos equipos | `best_wr`, `best_team` y `best_iterations` son idénticos en ambas ejecuciones |
| UT-MC-06 | `ms_montecarlo/app.py::POST /persist_best` | Validación estadística antes de persistir una recomendación | Enviar `win_rate_pct=50`, `simulation_count=30`, `force=false` | Responde `400` indicando que el intervalo de confianza al 95% (`lower95 <= 0.5`) no es significativo; con `force=true` persiste igualmente |
| UT-USU-01 | `ms_usuarios/src/models/teamModel.js::deleteTeam` | "Borrado" lógico de equipos | Llamar `deleteTeam(id)` sobre un equipo existente y luego `listTeams` | Se ejecuta `UPDATE teams SET active=FALSE` (nunca `DELETE`); el equipo no aparece en `listTeams` (filtro `active IS NULL OR active = TRUE`) |
| UT-USU-02 | `ms_usuarios/src/repositories/teamRepository.js::createTeam` | Validación de composición de equipo | Crear equipo con 0 Pokémon y con 7 Pokémon | Ambos casos son rechazados (error de validación) antes de generar cualquier `INSERT` |
| UT-USU-03 | `ms_usuarios/src/controllers/adminController.js` (p. ej. `getTypesByCountry`) | Fallback de vistas materializadas a consulta en vivo | Simular `admin_types_by_country` sin filas | El controlador ejecuta la query de fallback equivalente y devuelve datos agregados coherentes (sin error 500) |
| UT-USU-04 | `ms_usuarios/src/routes/userRoutes.js` (`/me`, `/collections`) | Autorización por usuario autenticado | Llamar `GET /me` sin token, y `PUT /me`/`DELETE /collections/:id` con el token de **otro** usuario | Sin token: `401`. Con token de otro usuario: la operación no afecta datos del usuario objetivo (403/404 o no-op) |
| UT-AUTH-01 | `ms_auth/src/controllers/authController.js::register` | Hashing de contraseñas | Registrar dos usuarios con la misma contraseña | Ambos hashes (`$2b$...`) son distintos entre sí (salt) y distintos del texto plano |
| UT-AUTH-02 | `ms_auth/src/controllers/authController.js::login` | Emisión de JWT y mensajes de error genéricos | (a) Login válido. (b) Usuario inexistente. (c) Password incorrecta | (a) JWT con payload `{sub, username, email}` y `expiresIn=JWT_EXPIRES_IN`. (b) y (c) devuelven el mismo mensaje de error genérico (no revelan si el usuario existe) |
| UT-AUTH-03 | `ms_auth/src/middleware/requireAdmin.js` | Verificación de token para rutas de administración | Invocar con: sin header `Authorization`, token inválido, token válido sin rol admin, token válido de admin | Los tres primeros casos devuelven `401`/`403`; solo el último llama a `next()` |
| UT-PKM-01 | `ms_pokemon/src/routes/pokemonRoutes.js::getPokemon` | Búsqueda de Pokémon por nombre | `GET /:name` con nombre existente y con nombre inexistente | Existente: `200` con `types`/`abilities`/`moves`. Inexistente: `404` |
| UT-PKM-02 | `ms_pokemon/src/routes/pokemonRoutes.js::listPokemons` | Listado/paginación | `GET /` sin parámetros y con parámetros de paginación fuera de rango | No lanza error; devuelve una lista (vacía o paginada) válida |
| UT-GW-01 | `ms_gateway/app.js` (proxies `/api/auth`, `/api/usuarios`, `/api/teams`, `/api/users`, `/api/pokemon`, `/api/carga`, `/api/montecarlo`, `/api/asistencia`) | Enrutamiento del proxy hacia el microservicio correcto | Mockear cada `MS_*_URL` (p. ej. con `nock`) y enviar una request a cada prefijo `/api/*` | Cada request llega al target correcto, con el header `Authorization` reenviado sin modificar |
| UT-GW-02 | `ms_gateway/app.js` (catch-all, ~línea 341) | Ruta no reconocida | `GET /api/no-existe` | Responde `404` |
| UT-GW-03 | `ms_gateway/app.js` (`GET /health`, `GET /gateway-info`) | Endpoints de diagnóstico | `GET /health` y `GET /gateway-info` | `200` con el estado del gateway y la lista de `MS_*_URL` configuradas |
| UT-CARGA-01 | `ms_carga_api/main.py::process_payload` | Idempotencia de los `upsert_*` | Ejecutar `process_payload` dos veces con el mismo payload de ejemplo | El número de filas en `pokemon`/`types`/`moves`/`items`/`abilities` es igual tras la 1ª y la 2ª ejecución (sin duplicados) |
| UT-CARGA-02 | `ms_carga_api/main.py::_normalize_payload_for_pool` | Manejo de payload vacío/incompleto | Invocar con `{}` y con un payload sin clave `pokemon` | Devuelve una estructura vacía válida; no lanza excepción |
| UT-CARGA-03 | `ms_carga_api/main.py::POST /load` | Manejo de error de API externa | `POST /load` con una `url` que responde error/timeout | Responde con error controlado (4xx/5xx con mensaje), y `insert_raw` no inserta un payload corrupto |
| UT-ASIS-01 | `ms_asistencia/engine.py::PokemonAnalyticsEngine._build_synergy_matrix` | Simetría de la matriz de sinergia | Construir la matriz para un conjunto de prueba y comparar `synergy[A][B]` vs `synergy[B][A]` | Ambos valores son iguales (matriz simétrica) |
| UT-ASIS-02 | `ms_asistencia/engine.py::analyze_team_synergy` | Cálculo de sinergia de equipo | Invocar con un equipo de 6 Pokémon y con una lista vacía | Equipo de 6: devuelve score agregado + desglose por par. Lista vacía: devuelve una estructura por defecto sin excepción |
| UT-ASIS-03 | `ms_asistencia/engine.py::recommend_teammate` | Recomendación de compañero de equipo | Invocar con `current_team` de 5 Pokémon y `top_n=3` | Devuelve exactamente 3 recomendaciones, ordenadas por score descendente, ninguna ya presente en `current_team` |
| UT-DB-01 | `ms_db/schema.sql` (`trg_prevent_delete_teams` / `prevent_teams_delete`) | Integridad: borrado físico bloqueado | Ejecutar `DELETE FROM teams WHERE id = <existente>` directamente sobre la BD | Postgres lanza una excepción (la fila no se elimina) |
| UT-DB-02 | `ms_db/server.js` (`node server.js init`) | Idempotencia de la inicialización | Ejecutar `init-db` dos veces sobre la misma BD | La segunda ejecución no falla (no intenta recrear objetos existentes) y no duplica el admin por defecto |
| UT-FE-01 | `Frontend_EquipoRocket.pk/src/services/api.js` (`gatewayAPI`) | Interceptor de autenticación | Realizar una request con y sin `localStorage.pk_token` | Con token: header `Authorization: Bearer <token>`. Sin token: header ausente, sin error |
| UT-FE-02 | `Frontend_EquipoRocket.pk` `TeamBuilder.jsx` | Límite de tamaño y duplicados de equipo | Intentar agregar un 7º Pokémon, y un Pokémon ya presente en el equipo | Ambas acciones son rechazadas en la UI (mensaje/validación), el equipo no excede 6 ni contiene duplicados |
| UT-FE-03 | `Frontend_EquipoRocket.pk` `Simulations.jsx` | Render de resultados independientes de `/simulate` | Mockear una respuesta donde `team_a_win_probability + team_b_win_probability != 100` | La UI muestra ambos porcentajes tal como llegan, sin forzar que sumen 100 |

---

## 6. Pruebas de estrés y carga

Se distinguen tres modalidades, siguiendo la terminología estándar de pruebas de
rendimiento: **carga** (comportamiento bajo el tráfico esperado), **estrés**
(comportamiento al superar el tráfico esperado, hasta encontrar el punto de quiebre) y
**resistencia/soak** (comportamiento sostenido en el tiempo). El foco se pone en los
componentes con costos computacionales conocidos: `ms_montecarlo` (CPU-bound, ahora con
el doble de combates por request tras la corrección de búsqueda dual), `ms_auth`
(`bcrypt.compare` es CPU-bound por diseño) y `ms_gateway` (único punto de entrada,
cualquier sobrecosto del proxy se multiplica por todo el tráfico).

| ID | Componente | Escenario | Acción / parámetros | Resultado esperado / umbral | Justificación |
|---|---|---|---|---|---|
| ST-MC-01 | `ms_montecarlo` | Carga — request única costosa | `POST /simulate` con `iterations=1000, sims=500` (≈1.000.000 combates totales) | Responde `200` dentro de un umbral acordado (p. ej. < 30 s) sin error de timeout en `ms_gateway` | Tras la corrección de búsqueda dual, este es el endpoint más caro (`2 × iterations × sims`); es el primero en degradarse y el más visible para el usuario final |
| ST-MC-02 | `ms_montecarlo` + `ms_db` | Estrés — concurrencia | 10–20 usuarios virtuales enviando `POST /simulate` simultáneamente (k6/locust) | 0 errores `5xx`; el pool de conexiones de Postgres no se agota (`pg.Pool` no reporta `timeout acquiring client`) | Cada simulación realiza múltiples `INSERT` (`battle_simulations`, `simulation_iterations`, `optimized_configurations`, `configuration_comparisons`); la concurrencia es el escenario realista de uso en una demo/clase |
| ST-GW-01 | `ms_gateway` | Carga — overhead del proxy | 100 req/s sostenidas a `/api/pokemon` vía gateway, comparado con la misma carga directa a `ms_pokemon` | La latencia añadida por `http-proxy-middleware` es marginal (p. ej. < 20 ms p95) y no aumenta con el tiempo | El gateway es el único punto de entrada del frontend; cualquier overhead se aplica a *todo* el tráfico de la plataforma |
| ST-AUTH-01 | `ms_auth` | Estrés — operación CPU-bound | 50 requests concurrentes a `POST /api/auth/login` con credenciales válidas | El tiempo de respuesta crece de forma acotada y predecible (no exponencial); se documenta el throughput máximo del contenedor | `bcrypt.compare` es intencionalmente costoso (mitiga fuerza bruta), pero también es el techo de throughput de login; es necesario conocer ese techo para dimensionar el despliegue |
| ST-CARGA-01 | `ms_carga_api` | Carga — ingesta de payload grande | `POST /load` con un payload Pikalytics realista (formato completo, miles de entradas) | `process_payload` completa sin error, con tiempo y memoria documentados; no se generan timeouts de conexión a Postgres | `ms_carga_api` es la única fuente de datos para `ms_montecarlo`/`ms_asistencia`; una ingesta lenta o que agote memoria deja a ambos servicios sin "pool" actualizado |
| ST-ASIS-01 | `ms_asistencia` | Carga — recomputo en memoria | N requests concurrentes a `POST /recommend/teammate` justo después de `POST /reload` (reconstrucción de `_build_synergy_matrix` con pandas) | Las requests concurrentes durante el `/reload` no devuelven datos parciales/inconsistentes ni error 500 | La matriz de sinergia se mantiene en memoria del proceso; un `/reload` concurrente con tráfico real es el caso de carrera más probable en producción |
| ST-USU-01 | `ms_usuarios` | Carga — listados | `GET /api/teams` para un usuario con 100+ equipos (`active = TRUE`) | Tiempo de respuesta estable (uso de índice sobre `user_id`/`active`, no *full table scan*) | El listado de equipos es la vista más usada de "Mis equipos"; debe escalar con el historial del usuario |

---

## 7. Pruebas de seguridad

El enfoque sigue el **OWASP Top 10** como marco de referencia, priorizando los riesgos
que ya son observables en el código actual (citados con archivo/línea para facilitar la
verificación), más una capa de análisis de dependencias (SCA) y análisis dinámico (DAST)
sobre el punto de entrada único (`ms_gateway`).

| ID | Componente | Riesgo (OWASP) | Caso de prueba | Resultado esperado |
|---|---|---|---|---|
| SEC-01 | `ms_usuarios`, `ms_auth` | A01 Broken Access Control / A07 Identification & Auth Failures | Llamar cualquier ruta protegida por `requireAuth`/`requireAdmin` (p. ej. `/api/teams`, `/api/usuarios/admin/*`) sin token, con token expirado y con token manipulado (firma inválida) | `401` en los tres casos; nunca `200` ni `500` |
| SEC-02 | `ms_auth` ↔ `ms_usuarios` | A02 Cryptographic Failures (gestión de secretos) | Emitir un JWT con `ms_auth` configurado con un `JWT_SECRET` distinto al de `ms_usuarios` (`src/config/env.js:9` vs `ms_auth/src/controllers/authController.js:7`), y usarlo contra `ms_usuarios` | `ms_usuarios` rechaza el token (`401`); se documenta como requisito operativo que ambos `JWT_SECRET` **deben** coincidir en todo despliegue |
| SEC-03 | `ms_usuarios`, `ms_carga_api` | A03 Injection (SQL) | Enviar payloads tipo `' OR 1=1; --` / `"; DROP TABLE teams; --` en parámetros de rutas/queries que construyen SQL (p. ej. `dataRoutes`, `adminController`, `process_payload` en `ms_carga_api/main.py`) | La consulta se ejecuta de forma parametrizada (`$1`, `%s`) y el payload se trata como dato, no como código; no se altera el esquema ni se filtran filas no autorizadas |
| SEC-04 | `ms_auth` | A07 Identification & Auth Failures (fuerza bruta) | Enviar N intentos consecutivos de `POST /api/auth/login` con el mismo usuario y contraseñas incorrectas | Se documenta si existe (o falta) límite de intentos/lockout/rate-limiting; si falta, se registra como hallazgo con recomendación de mitigación |
| SEC-05 | `ms_auth` | A02 Cryptographic Failures | Registrar usuarios con contraseñas triviales (`"123456"`) e inspeccionar la columna de password en la BD | Solo se almacenan hashes `bcrypt` (`$2b$...`); nunca texto plano, independientemente de la fortaleza de la contraseña |
| SEC-06 | `ms_usuarios` | A01 Broken Access Control | Con un JWT de usuario **no administrador**, llamar rutas bajo `/api/usuarios/admin/*` (`adminRoutes.js`: `/teams/performance`, `/users/by-age`, etc.), que actualmente solo exigen `requireAuth` | Se espera `403` para usuarios no admin; si la ruta responde `200`, se documenta como hallazgo de control de acceso roto (falta verificación de rol) |
| SEC-07 | `ms_gateway`, `ms_montecarlo`, `ms_carga_api`, `ms_asistencia` | A05 Security Misconfiguration (CORS) | Enviar requests con `Origin: https://sitio-externo.example` y `credentials: include` contra `ms_gateway` (`cors({origin:true, credentials:true})`) y directamente contra `ms_montecarlo`/`ms_carga_api` (`allow_origins=["*"]`, `ms_montecarlo/app.py:28`) | Se documenta el comportamiento actual (refleja cualquier origen) como hallazgo para entornos productivos; se recomienda restringir `allow_origins`/`origin` a los dominios del frontend |
| SEC-08 | `ms_usuarios`, `ms_db` | A01 Broken Access Control (integridad de datos) | Intentar `DELETE FROM teams` directo sobre la BD y, vía API, intentar provocar el mismo efecto sobre un equipo de otro usuario | El trigger `trg_prevent_delete_teams` (`ms_db/schema.sql:472`) bloquea el `DELETE` físico; la API solo permite `active=FALSE` sobre equipos propios |
| SEC-09 | Todos los servicios | A05 Security Misconfiguration (fuga de información) | Forzar errores `500` (payload malformado a `/simulate`, `/load`, `/register`, etc.) | Las respuestas de error no incluyen *stack traces*, queries SQL ni rutas absolutas del servidor |
| SEC-10 | `ms_usuarios` | A01 Broken Access Control (IDOR) | Usuario A autenticado llama `GET/PUT/DELETE /api/teams/:id` usando el `id` de un equipo del usuario B | `403`/`404`; el equipo de B no se lee ni modifica |
| SEC-11 | `ms_db` | A07 Identification & Auth Failures (credenciales por defecto) | Verificar si el admin sembrado por `ensureDefaultAdminOnCreate` (`admin@equiporocket.cl` / `Admin123!`) sigue activo con esas credenciales en un entorno no-local | Para entornos distintos de desarrollo local, se documenta como hallazgo si las credenciales por defecto no fueron rotadas/deshabilitadas |
| SEC-12 | Todos los servicios | A06 Vulnerable & Outdated Components | Ejecutar `npm audit` (Frontend, `ms_gateway`, `ms_auth`, `ms_usuarios`, `ms_pokemon`, `ms_db`) y `pip-audit` (`ms_montecarlo`, `ms_carga_api`, `ms_asistencia`) | Sin vulnerabilidades de severidad alta/crítica sin mitigación documentada |
| SEC-13 | Frontend | A03 Injection (XSS) | Crear un equipo/feedback con un nombre que contenga `<script>alert(1)</script>` y revisar su renderizado en `MyTeams`/`AdminPanel` | El contenido se escapa (comportamiento por defecto de React); no se ejecuta script; se confirma que no se usa `dangerouslySetInnerHTML` con datos de usuario |

---

## 8. Criterios de aceptación

- **Unitarias**: cobertura de líneas ≥ 70% en los módulos de lógica de negocio crítica
  (`montecarlo.py`, `app.py` de `ms_montecarlo`, `teamModel.js`/`teamRepository.js`,
  `authController.js`, `engine.py`). El 100% de los casos de la tabla de la Sección 5
  pasan en CI antes de mergear a `main`.
- **Estrés/carga**: bajo la "carga esperada" definida para el proyecto (a acordar, p. ej.
  20 usuarios concurrentes para un entorno de demo/clase), 0 errores `5xx` y latencias
  p95 dentro de los umbrales de la Sección 6. Bajo el doble de esa carga (estrés), se
  permite degradación de latencia pero no errores no controlados ni caída del servicio.
- **Seguridad**: 0 hallazgos de severidad alta/crítica sin mitigación o sin plan de
  mitigación documentado. Los hallazgos de severidad media/baja quedan registrados como
  deuda técnica con responsable y fecha estimada.

## 9. Riesgos y supuestos

- No existe un entorno de *staging* separado: las pruebas de carga y seguridad activa
  (SQLi, fuerza bruta, DAST) deben ejecutarse **solo** contra una instancia Docker local
  del propio desarrollador, nunca contra una instancia compartida o expuesta a Internet.
- `ms_montecarlo` y `ms_asistencia` dependen de que `external_raw` esté poblado (vía
  `ms_carga_api`); las pruebas que los ejerciten deben preparar este fixture primero
  (`POST /load` con un payload de prueba) o las pruebas fallarán por falta de datos, no
  por un defecto real.
- Los umbrales de tiempo de ST-MC-01/ST-MC-02 deben recalibrarse respecto a mediciones
  previas a la corrección de búsqueda dual, dado que el costo por request se duplicó
  (`2 × iterations × sims`).
- Las pruebas que requieren base de datos (`ms_usuarios`, `ms_auth`, `ms_pokemon`,
  `ms_db`) deben ejecutarse contra una instancia de Postgres de prueba (no la de
  desarrollo), para evitar dejar datos de prueba (usuarios, equipos, simulaciones) en la
  BD de trabajo.

## 10. Priorización / fases sugeridas

1. **Fase 1 — Núcleo funcional**: unitarias de `ms_montecarlo` (UT-MC-01 a UT-MC-06,
   incluye la verificación de reproducibilidad/intercambio de equipos ya implementada),
   `ms_auth` (UT-AUTH-01 a 03) y `ms_usuarios`/equipos (UT-USU-01 a 04).
2. **Fase 2 — Seguridad básica**: SEC-01, SEC-02, SEC-03, SEC-06, SEC-10 (control de
   acceso, JWT, SQLi, IDOR) — son los de mayor impacto y menor costo de ejecución.
3. **Fase 3 — Resto de unitarias**: `ms_gateway`, `ms_pokemon`, `ms_carga_api`,
   `ms_asistencia`, `ms_db`, Frontend.
4. **Fase 4 — Carga**: ST-MC-01/02 primero (mayor riesgo conocido), luego
   ST-GW-01, ST-AUTH-01, ST-CARGA-01, ST-ASIS-01, ST-USU-01.
5. **Fase 5 — Seguridad avanzada**: SEC-04, SEC-05, SEC-07, SEC-08, SEC-09, SEC-11,
   SEC-12, SEC-13, y un barrido DAST (OWASP ZAP) sobre `ms_gateway`.
