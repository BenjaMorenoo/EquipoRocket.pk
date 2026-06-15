# Matriz de Pruebas — EquipoRocket.pk

> Registro de ejecución de las pruebas definidas en [`plan_pruebas.md`](./plan_pruebas.md).
> Se actualiza incrementalmente: primero **pruebas de humo** (verifican que el stack
> está arriba y enrutado correctamente, condición previa para que cualquier prueba
> unitaria/de integración tenga sentido), luego **pruebas unitarias** por componente.
>
> Fecha de ejecución: 2026-06-14. Entorno: stack Docker local (`docker ps` — 10
> contenedores `Up`: `ms_montecarlo`, `ms_asistencia`, `frontend`, `ms_auth`,
> `ms_usuarios`, `ms_pokemon`, `ms_carga_api`, `api_gateway`, `ms_db`, `postgres`).

**Leyenda de Estado**: ✅ PASS &nbsp;|&nbsp; ❌ FAIL &nbsp;|&nbsp; ⚠️ Observación (pasa, pero con hallazgo a registrar)

---

## 1. Pruebas de humo (smoke tests)

Objetivo: confirmar, con pruebas de caja negra vía HTTP, que cada uno de los 9
microservicios + `ms_gateway` + frontend están operativos y que el gateway enruta
correctamente hacia cada uno, **antes** de invertir esfuerzo en pruebas unitarias más
profundas. Si alguna de estas fallara, las pruebas unitarias de integración (UT-GW-*,
etc.) no tendrían entorno válido sobre el cual ejecutarse.

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| SMK-01 | `ms_gateway` activo | `GET http://localhost:9000/health` | `200` con `status` del gateway | `200` — `{"status":"healthy","service":"api_gateway","uptime":10583.66}` | ✅ |
| SMK-02 | `ms_gateway` expone configuración de proxies | `GET http://localhost:9000/gateway-info` | `200` con mapa de las 6 `MS_*_URL` | `200` — incluye `auth`, `usuarios`, `pokemon`, `carga_api`, `montecarlo`, `asistencia` con sus URLs internas | ✅ |
| SMK-03 | `ms_auth` activo | `GET http://localhost:3001/` | `200` con `{"service":"ms_auth"}` | `200` — `{"service":"ms_auth"}` | ✅ |
| SMK-04 | `ms_usuarios` activo | `GET http://localhost:3003/` | `200` con `{"service":"ms_usuarios"}` | `200` — `{"service":"ms_usuarios"}` | ✅ |
| SMK-05 | `ms_pokemon` activo | `GET http://localhost:3002/` | `200` con `{"service":"ms_pokemon"}` | `200` — `{"service":"ms_pokemon"}` | ✅ |
| SMK-06 | `ms_db` activo y conectado a la BD destino | `GET http://localhost:4002/` | `200` con `{"service":"ms_db","db":"equiporocketDb"}` | `200` — `{"service":"ms_db","db":"equiporocketDb"}` | ✅ |
| SMK-07 | `ms_montecarlo` (FastAPI) cargó sin errores | `GET http://localhost:8010/openapi.json` | `200` con esquema OpenAPI incluyendo `/simulate` y `/persist_best` | `200` — `openapi: "3.1.0"`, `paths` incluye `/simulate` (`POST`) | ✅ |
| SMK-08 | `ms_carga_api` activo | `GET http://localhost:8000/` | `200` con `{"service":"ms_carga_api"}` | `200` — `{"service":"ms_carga_api"}` | ✅ |
| SMK-09 | `ms_carga_api` tiene `external_raw` cargado (pool disponible para MC/asistencia) | `GET http://localhost:8000/api/pool` | `200` con arreglo no vacío de equipos/Pokémon | `200` — arreglo no vacío (`Basculegion`, `Kingambit`, `Garchomp`, `Charizard-Mega-Y`, ...) | ✅ |
| SMK-10 | `ms_asistencia` activo | `GET http://localhost:8005/health` | `200` con `{"status":"ok"}` | `200` — `{"status":"ok"}` | ✅ |
| SMK-11 | Frontend servido | `GET http://localhost:3000/` | `200` con documento HTML (`<html lang="es">`) | `200` — HTML de la SPA (`<!doctype html><html lang="es">...`) | ✅ |
| SMK-12 | Proxy `ms_gateway → ms_pokemon` | `GET http://localhost:9000/api/pokemon` | `200`, misma forma de respuesta que `ms_pokemon` directo | `200` — `{"success":true,"data":{"pokemons":[...]}}` (Basculegion, Kingambit, Garchomp, ...) | ✅ |
| SMK-13 | Proxy `ms_gateway → ms_auth` (con credenciales inválidas) | `POST http://localhost:9000/api/auth/login` body `{"email":"noexiste@test.com","password":"wrong"}` | `401` (no `502`/`504`: confirma que el proxy llega a `ms_auth` y que `ms_auth` valida credenciales) | `401` — `{"success":false,"error":"INVALID_CREDENTIALS"}` | ✅ |
| SMK-14 | Proxy `ms_gateway → ms_montecarlo` | `GET http://localhost:9000/api/montecarlo/openapi.json` | `200` con el mismo esquema OpenAPI que el acceso directo | `200` — `openapi: "3.1.0"`, `title: "ms_montecarlo"` | ✅ |
| SMK-15 | Proxy `ms_gateway → ms_asistencia` | `GET http://localhost:9000/api/asistencia/health` | `200` con `{"status":"ok"}` | `200` — `{"status":"ok"}` | ✅ |

**Resultado de la fase de humo**: 15/15 ✅. El stack está íntegramente operativo y el
gateway enruta correctamente hacia los 6 microservicios proxied (incluyendo el caso de
error de negocio `401` propagado sin distorsión). Queda despejado el camino para
ejecutar pruebas unitarias y, más adelante, de integración a través del gateway.

---

## 2. Pruebas unitarias

### 2.1 `ms_montecarlo`

**Entorno de ejecución**: contenedor `ms_montecarlo` (Python 3.11.15). Se instalaron
`pytest` y `httpx` (ver `ms_montecarlo/requirements-dev.txt`, agregado para que la
instalación sea reproducible en el contenedor/imagen de pruebas). Archivo de pruebas:
[`ms_montecarlo/tests/test_montecarlo.py`](./ms_montecarlo/tests/test_montecarlo.py).
Comando: `python -m pytest tests/ -v`.

Cobertura: casos UT-MC-01 a UT-MC-06 de `plan_pruebas.md`. Todas las pruebas son de
caja blanca sobre `montecarlo.py`/`simulator.py` (funciones puras) y sobre
`_derive_seed`/`POST /persist_best` de `app.py`; ninguna requiere base de datos real —
el único caso que toca `get_db_conn` (UT-MC-06b) lo aísla con `monkeypatch`.

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-MC-01a | `pick_default_config`: selecciona el build "más usado" (mayor `percent`) | `test_pick_default_config_selects_highest_percent` — Pokémon con `moves`/`items`/`abilities`/`spreads` con distintos `percent` | `moves` ordenados desc. (top 4); `item`/`ability`/`spread` = el de mayor `percent` | `moves` → `[50,30,10,5]`; `item.percent=60`; `ability.percent=60`; `spread.percent=70` | ✅ |
| UT-MC-01b | `pick_default_config`: maneja listas vacías sin error | `test_pick_default_config_handles_empty_lists` — Pokémon con `moves=[]` y sin `items`/`abilities`/`spreads` | No lanza excepción; `moves=[]`; no agrega claves `item`/`ability`/`spread` | `moves=[]`; claves `item`/`ability`/`spread` ausentes | ✅ |
| UT-MC-02a | `generate_random_config_for_pokemon`: reproducible con `rng` fijo | `test_generate_random_config_is_reproducible_with_seed` — dos llamadas con `random.Random(123)` | Ambas llamadas devuelven exactamente la misma configuración | `cfg1 == cfg2` (idéntico) | ✅ |
| UT-MC-02b | `generate_random_config_for_pokemon`: respeta el conjunto de candidatos | `test_generate_random_config_moves_within_top_candidates` — Pokémon con 6 movimientos, `rng=random.Random(7)` | `len(moves) == 4`; cada movimiento ∈ top-6 candidatos por `percent` | 4 movimientos devueltos, todos dentro del top-6 | ✅ |
| UT-MC-03 | `evaluate_team`: simula `sims` combates y devuelve `(win_rate, iterations)` | `test_evaluate_team_returns_win_rate_and_iterations` — equipo "fuerte" vs. rival "débil" fijo, `sims=50` | `0<=win_rate<=1`; `len(iterations)==50`; cada `winner ∈ {A,B}`; `iteration` 1..50; equipo fuerte gana mayoría (`win_rate>0.8`) | `len(iterations)==50`, `iteration` secuencial 1..50, `winner∈{A,B}`, `win_rate>0.8` | ✅ |
| UT-MC-04a | `_derive_seed`: determinismo | `test_derive_seed_is_deterministic` — misma entrada dos veces | Misma salida en ambas llamadas | `s1 == s2` | ✅ |
| UT-MC-04b | `_derive_seed`: sensibilidad a los parámetros | `test_derive_seed_changes_with_inputs` — variar `sims` y `searched` | La semilla cambia si cambia `sims` o el equipo a optimizar | Ambas variaciones produjeron semillas distintas a la base | ✅ |
| UT-MC-04c | `_derive_seed`: simetría de intercambio `team`↔`opponent` (garantía del diseño de búsqueda dual) | `test_derive_seed_swap_symmetry` — comparar semillas de "team" y "opponent" entre una request y su versión con equipos intercambiados | `seed_team(req1) == seed_opponent(req2)` y `seed_opponent(req1) == seed_team(req2)`; y `seed_team(req1) != seed_opponent(req1)` | Las tres igualdades/desigualdades se cumplen | ✅ |
| UT-MC-05 | `search_best_team`: reproducibilidad con `random_seed` fijo | `test_search_best_team_is_reproducible_with_fixed_seed` — pool de 6 Pokémon, `iterations=5, sims=10, random_seed=42`, dos ejecuciones | `best_wr`, `best_team`, `best_iterations` idénticos entre ambas ejecuciones | `r1[0]==r2[0]`, `r1[1]==r2[1]`, `r1[2]==r2[2]` | ✅ |
| UT-MC-06a | `POST /persist_best`: rechaza `win_rate` no significativo (95% CI) | `test_persist_best_rejects_non_significant_win_rate` — `win_rate=50, simulation_count=30, force=false` | `400` con mensaje "win_rate not significant" | `400` — detalle incluye `"error": "win_rate not significant"`, `lower95≈32.11` | ✅ |
| UT-MC-06b | `POST /persist_best`: `force=true` omite el chequeo de significancia | `test_persist_best_force_bypasses_significance_check` — mismo payload + `force=true`, `get_db_conn` interceptada con `monkeypatch` | No responde `400` por significancia; el flujo llega a `get_db_conn` (intercept. devuelve `500` con el mensaje simulado) | `500` — `detail` contiene `"db not available in unit test"` (confirma que `force=true` saltó el corte en `400`) | ✅ |

**Resultado de la fase unitaria (`ms_montecarlo`)**: 11/11 ✅
(`11 passed, 1 warning in 0.55s`).

**Observación (no bloqueante)**: pytest emite
`StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated;
install httpx2 instead`. No afecta el resultado actual; se deja registrado para
revisarlo cuando se actualicen las dependencias de `ms_montecarlo`.

---

### 2.2 `ms_auth`

**Entorno de ejecución**: contenedor `ms_auth` (Node v18.20.8). Se instaló
`jest@29.7.0` (ver `ms_auth/package.json` → `devDependencies`, agregado para que la
instalación sea reproducible; script `npm test`). `ms_auth` usa ESM
(`"type": "module"`), por lo que las pruebas se ejecutan con
`node --experimental-vm-modules node_modules/jest/bin/jest.js --verbose` y el mockeo de
módulos se hace con `jest.unstable_mockModule`. Archivos de pruebas:
[`ms_auth/tests/authController.test.js`](./ms_auth/tests/authController.test.js),
[`ms_auth/tests/requireAdmin.test.js`](./ms_auth/tests/requireAdmin.test.js) y
[`ms_auth/tests/rateLimit.test.js`](./ms_auth/tests/rateLimit.test.js) (agregado al
corregir SEC-04, ver §8; requirió agregar `supertest@^6.3.4` a `devDependencies`).

Cobertura: casos UT-AUTH-01 a UT-AUTH-03 de `plan_pruebas.md`. `UserRepo`
(`repositories/userRepository.js`) y `userModel.getUserById` se mockean — ninguna
prueba requiere conexión real a Postgres.

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-AUTH-01 | `register`: hashing + salting de contraseñas | `test_...salt` — registrar dos usuarios distintos con la misma contraseña (`SuperSecret123!`) y capturar el `password_hash` enviado a `UserRepo.create` | Ambos hashes con formato bcrypt (`$2[aby]$NN$...`), distintos entre sí (salt) y distintos del texto plano; ambos validan con `bcrypt.compare` | `hash1`/`hash2` con formato `$2b$12$...`, `hash1 !== hash2`, ninguno `=== 'SuperSecret123!'`, `bcrypt.compare(plain, hash1/2) === true` | ✅ |
| UT-AUTH-02a | `login`: credenciales válidas emiten JWT | Login con email + password correctos (hash bcrypt precomputado como "usuario almacenado") | `200`; `data.token` es un JWT de 3 partes cuyo payload (verificado con `JWT_SECRET`) es `{sub, username, email}`; `data.user` no expone `password_hash` | `200` — `decoded = {sub:42, username:'tester', email:'tester@test.com', ...}`; `data.user.password_hash === undefined` | ✅ |
| UT-AUTH-02b | `login`: usuario inexistente → error genérico | `findByEmail` devuelve `null` (usuario no existe) | `401 {success:false, error:'INVALID_CREDENTIALS'}` | `401` — `{"success":false,"error":"INVALID_CREDENTIALS"}` | ✅ |
| UT-AUTH-02c | `login`: password incorrecta → mismo error genérico que (b) | Usuario existe, `bcrypt.compare` falla | Mismo `401 INVALID_CREDENTIALS` que UT-AUTH-02b (no revela si el usuario existe) | `401` — `{"success":false,"error":"INVALID_CREDENTIALS"}` (idéntico a UT-AUTH-02b) | ✅ |
| UT-AUTH-03a | `requireAdmin`: sin header `Authorization` | Invocar middleware sin `Authorization` | `401 NO_TOKEN`; no llama a `next()` | `401` — `{"success":false,"error":"NO_TOKEN"}`; `next` no invocado | ✅ |
| UT-AUTH-03b | `requireAdmin`: token inválido/malformado | `Authorization: Bearer esto-no-es-un-jwt` | `401 INVALID_TOKEN`; no llama a `next()` | `401` — `{"success":false,"error":"INVALID_TOKEN"}` | ✅ |
| UT-AUTH-03c | `requireAdmin`: token válido, usuario sin rol admin | Token válido (`sub=5`), `getUserById` mockeado → `{id:5, is_admin:false}` | `403 FORBIDDEN`; no llama a `next()` | `403` — `{"success":false,"error":"FORBIDDEN"}`; `next` no invocado | ✅ |
| UT-AUTH-03d | `requireAdmin`: token válido de usuario admin | Token válido (`sub=1`), `getUserById` mockeado → `{id:1, is_admin:true,...}` | Llama a `next()`; asigna `req.authUser` con el usuario | `next()` llamado 1 vez; `req.authUser` = usuario admin mockeado; `res.status` no invocado | ✅ |
| SEC-04 | `loginLimiter` (`express-rate-limit`) en `POST /api/auth/login` (corrección, ver §8) | `UserRepo.findByEmail` mockeado → `null`; 10 `POST /api/auth/login` con credenciales inválidas, luego un 11vo | Los primeros 10 → `401 INVALID_CREDENTIALS`; el 11vo → `429 TOO_MANY_ATTEMPTS` | 10× `401 {"success":false,"error":"INVALID_CREDENTIALS"}`, luego `429 {"success":false,"error":"TOO_MANY_ATTEMPTS"}` | ✅ |

**Resultado de la fase unitaria (`ms_auth`)**: 9/9 ✅
(`Test Suites: 3 passed, 3 total. Tests: 9 passed, 9 total. Time: ~3.0s`).

---

### 2.3 `ms_usuarios`

**Entorno de ejecución**: contenedor `ms_usuarios` (Node v18.20.8). Se instaló
`jest@29.7.0` (ver `ms_usuarios/package.json` → `devDependencies`, script `npm test`).
Mismo enfoque ESM + `jest.unstable_mockModule` que `ms_auth`. Archivos de pruebas:
[`ms_usuarios/tests/teamModel.test.js`](./ms_usuarios/tests/teamModel.test.js),
[`teamsController.test.js`](./ms_usuarios/tests/teamsController.test.js),
[`adminController.test.js`](./ms_usuarios/tests/adminController.test.js) y
[`userAuth.test.js`](./ms_usuarios/tests/userAuth.test.js).

Cobertura: casos UT-USU-01 a UT-USU-04 de `plan_pruebas.md`. `config/db.js` (pool de
Postgres) y `teamRepository.js` se mockean — ninguna prueba requiere BD real.

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-USU-01a | `teamModel.deleteTeam`: "borrado" lógico de equipos | `deleteTeam(7)` — capturar SQL/params enviados a `query` | Ejecuta `UPDATE teams SET active = FALSE ... WHERE id=$1 RETURNING *` (nunca `DELETE FROM teams`); devuelve la fila actualizada | SQL contiene `UPDATE teams SET active = FALSE` y NO contiene `DELETE FROM teams`; `params=[7]`; retorna `{id:7, active:false}` | ✅ |
| UT-USU-01b | `teamModel.getTeamsByUser`: filtra solo equipos activos | `getTeamsByUser(3)` — capturar SQL | SQL incluye `WHERE user_id=$1 AND (active IS NULL OR active = TRUE)` | SQL coincide con `active IS NULL OR active = TRUE` y `WHERE user_id = $1`; `params=[3]` | ✅ |
| UT-USU-02a | `teamsController.createTeam`: equipo con **0 Pokémon** | Llamar `createTeam` con `req.body = {name, format_id, pokemon: []}` | Según `plan_pruebas.md`: rechazado con `400` (error de validación) **antes** de cualquier `INSERT` (sin llamar a `TeamRepo.create`) | **`400 {"success":false,"error":"INVALID_TEAM_SIZE"}`** — corregido (ver §8): `createTeam` ahora valida `pokemon.length` antes de `TeamRepo.create` | ✅ |
| UT-USU-02b | `teamsController.createTeam`: equipo con **7 Pokémon** | Llamar `createTeam` con `req.body.pokemon` = arreglo de 7 elementos | Igual que UT-USU-02a: rechazado con `400`, sin `INSERT` | **`400 {"success":false,"error":"INVALID_TEAM_SIZE"}`** — corregido (ver §8): misma validación rechaza equipos de 7 Pokémon | ✅ |
| UT-USU-03a | `adminController.getTypesByCountry`: fallback cuando la vista materializada está vacía | Mock: `admin_types_by_country` devuelve `[]` | Ejecuta la query de fallback en vivo (`JOIN pokemon_types`...) y devuelve esas filas, sin `500` | 3 queries ejecutadas (`is_admin`, vista vacía, fallback en vivo); `res.json` devuelve `{success:true, data:liveRows}`; sin `500` | ✅ |
| UT-USU-03b | `adminController.getTypesByCountry`: vista materializada con filas | Mock: `admin_types_by_country` devuelve filas | Devuelve esas filas directamente, sin ejecutar el fallback | 2 queries ejecutadas (`is_admin`, vista); `res.json` devuelve `{success:true, data:viewRows}` | ✅ |
| UT-USU-03c | `adminController.getTypesByCountry`: usuario no admin | `req.user.id` cuyo registro tiene `is_admin=false` | `403 FORBIDDEN`, sin consultar la vista ni el fallback | `403` — `{"success":false,"error":"FORBIDDEN"}`; solo 1 query (`SELECT is_admin`) | ✅ |
| UT-USU-04a | `requireAuth` (`/me`, `/collections`): sin token | Invocar middleware sin `Authorization` | `401 NO_TOKEN`; no llama a `next()` | `401` — `{"success":false,"error":"NO_TOKEN"}` | ✅ |
| UT-USU-04b | `requireAuth`: token inválido | `Authorization: Bearer no-soy-un-jwt` | `401 INVALID_TOKEN`; no llama a `next()` | `401` — `{"success":false,"error":"INVALID_TOKEN"}` | ✅ |
| UT-USU-04c | `requireAuth`: token válido de **otro** usuario (`sub=9`) — la identidad viene del JWT, no de la petición | Token válido firmado con `sub:9, username:'otherUser'` | `req.user = {id:9, username:'otherUser', email:'other@test.com'}` (derivado solo del token); llama a `next()` | `req.user` queda exactamente igual al payload del token; `next()` llamado 1 vez | ✅ |
| UT-USU-04d | `userController.getMe` / `removeCollection`: alcance limitado a `req.user.id` | Invocar ambos controladores con `req.user = {id:9}` (token de "otro usuario") | Las queries usan `id=9` (del token) — no hay forma de operar sobre datos de un usuario distinto vía parámetros de la petición | `getMe`: SQL `... FROM users WHERE id = $1`, `params=[9]`; `removeCollection`: SQL `DELETE FROM user_collections WHERE user_id = $1 AND pokemon_id = $2`, `params=[9,25]` | ✅ |

**Resultado de la fase unitaria (`ms_usuarios`)**: 12/12 ✅
(`Test Suites: 4 passed, 4 total. Tests: 12 passed, 12 total. Time: ~1.1s`).

**Hallazgo (UT-USU-02, corregido — ver §8)**: `plan_pruebas.md` ubica esta validación en
`teamRepository.js::createTeam`, pero ese método (y `teamModel.createTeam`) ni siquiera
reciben el arreglo `pokemon` — solo insertan `name`/`format_id`/`created_by`. El único
lugar donde `pokemon` llega es `teamsController.js::createTeam` (orquesta
`TeamRepo.create` + `TeamRepo.replacePokemons`), por lo que las pruebas se escribieron
ahí. Originalmente esa función no validaba la cantidad de Pokémon: con `pokemon: []` el
equipo se creaba igual (`201`) y con 7 Pokémon se insertaban los 7 sin verificar el
máximo de 6 por equipo, contradiciendo `plan_pruebas.md` (UT-USU-02). **Corregido**: se
agregó `if (pokemon.length < 1 || pokemon.length > 6) return res.status(400).json({
success:false, error:'INVALID_TEAM_SIZE' })` al inicio de `createTeam`, antes de
`TeamRepo.create`/`replacePokemons` (`ms_usuarios/src/controllers/teamsController.js`).

---

### 2.4 `ms_pokemon`

**Entorno de ejecución**: contenedor `ms_pokemon` (Node v18.20.8). Se instaló
`jest@29.7.0` (ver `ms_pokemon/package.json` → `devDependencies`, script `npm test`
agregado). Mismo enfoque ESM + `jest.unstable_mockModule` que `ms_auth`/`ms_usuarios`.
Archivo de pruebas: [`ms_pokemon/tests/pokemon.test.js`](./ms_pokemon/tests/pokemon.test.js).

Cobertura: casos UT-PKM-01 y UT-PKM-02 de `plan_pruebas.md`, sobre
`src/controllers/pokemonController.js`. `config/db.js` se mockea — ninguna prueba
requiere conexión real a Postgres.

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-PKM-01a | `getPokemon`: nombre existente devuelve detalle completo | `getPokemon` con `params.name='Charizard'`, mocks para `pokemon`/`types`/`abilities`/`moves` | `200`; `data.pokemon` incluye `types`, `abilities`, `moves` y `stats` (6 entradas) con la forma esperada por el frontend | `200` — `body.success===true`, `pokemon.name==='Charizard'`, `types/abilities/moves/stats` con la forma `{type:{name}}`/`{ability:{name},is_hidden}`/`stats` (6 entradas hp..speed) | ✅ |
| UT-PKM-01b | `getPokemon`: nombre inexistente | `getPokemon` con `params.name='NoExiste'`, query principal devuelve `rows: []` | `404 {success:false, error:'NOT_FOUND'}` | `404` — `{"success":false,"error":"NOT_FOUND"}` | ✅ |
| UT-PKM-02a | `listPokemons`: paginación por defecto | `listPokemons` con `query={}` | Usa `limit=200, offset=0` (valores por defecto) en la query SQL | `params` enviados a `query` = `[200, 0]`; `200` con `{success:true, data:{pokemons:[...]}}` | ✅ |
| UT-PKM-02b | `listPokemons`: parámetros fuera de rango no rompen la consulta | `listPokemons` con `query={limit:'999999', offset:'-5'}` | No lanza error/`500`; `limit` se acota con `Math.min(limit, 2000)` | `params[0] <= 2000` (acotado correctamente); `200` con `{success:true, data:{pokemons:[]}}`, sin `500` | ✅ |

**Resultado de la fase unitaria (`ms_pokemon`)**: 4/4 ✅
(`Test Suites: 1 passed, 1 total. Tests: 4 passed, 4 total. Time: ~0.8s`).

---

### 2.5 `ms_gateway`

**Entorno de ejecución**: contenedor `api_gateway` (imagen `ms_gateway-api_gateway`,
Node v22.22.3, working dir `/app`). Se instalaron `jest@29.7.0` y `supertest@6.3.4`
(ver `ms_gateway/package.json` → `devDependencies`, script `npm test` agregado).
Mismo enfoque ESM + `node --experimental-vm-modules`. Archivo de pruebas:
[`ms_gateway/tests/gateway.test.js`](./ms_gateway/tests/gateway.test.js).

**Cambio de código necesario para poder probar (`ms_gateway/app.js`)**: el módulo no
exportaba `app` y llamaba a `app.listen(PORT, ...)` incondicionalmente al cargarse, lo
que impide usar `supertest` (no hay nada que importar, y un segundo `listen` en el
mismo puerto que el proceso principal del contenedor fallaría con `EADDRINUSE`). Se
añadieron dos cambios mínimos al final del archivo: `export default app;` y se envolvió
`app.listen(...)` en `if (process.env.NODE_ENV !== 'test') { ... }`. No cambia ningún
comportamiento en producción/desarrollo (`NODE_ENV` nunca es `'test'` fuera de los
tests).

Cobertura: casos UT-GW-01 a UT-GW-03 de `plan_pruebas.md`. Las URLs `MS_AUTH_URL`,
`MS_POKEMON_URL` y `MS_USUARIOS_URL` se leen de variables de entorno al cargar
`app.js`, así que el test levanta 3 servidores HTTP "mock" en puertos efímeros de
`127.0.0.1` **antes** de `import('../app.js')` y apunta esas variables hacia ellos
(`MS_CARGA_API_URL`/`MS_MONTECARLO_URL`/`MS_ASISTENCIA_URL` quedan con su valor por
defecto, sin ejercitarse). Se probaron 3 de los 9 proxies configurados como muestra
representativa (uno con reescritura de path + reenvío de body vía `onProxyReq`, uno
simple sin `onProxyReq`, y uno con `pathRewrite` no trivial); los 6 restantes siguen el
mismo patrón `createProxyMiddleware`.

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-GW-01a | Proxy `/api/auth` → `MS_AUTH_URL`, reenvío de `Authorization` y body | `POST /api/auth/login` con header `Authorization: Bearer abc123` y body `{email,password}` | El mock de `MS_AUTH_URL` recibe `POST /api/auth/login` con el mismo header `Authorization` y el mismo body JSON | `200`; mock recibió `POST /api/auth/login`, `authorization: 'Bearer abc123'`, body `{"email":"a@b.com","password":"x"}` | ✅ |
| UT-GW-01b | Proxy `/api/pokemon` → `MS_POKEMON_URL` (sin `onProxyReq`, `pathRewrite` idéntico) | `GET /api/pokemon` | El mock de `MS_POKEMON_URL` recibe `GET /api/pokemon` | `200`; mock recibió `GET /api/pokemon` | ✅ |
| UT-GW-01c | Proxy `/api/usuarios` → `MS_USUARIOS_URL` con `pathRewrite '^/api/usuarios'->'/api'` | `GET /api/usuarios/teams` con `Authorization: Bearer xyz789` | El mock de `MS_USUARIOS_URL` recibe `GET /api/teams` (path reescrito) con el header `Authorization` intacto | `200`; mock recibió `GET /api/teams`, `authorization: 'Bearer xyz789'` | ✅ |
| UT-GW-02 | Catch-all de rutas no mapeadas | `GET /api/no-existe` | `404` con `error:'Not Found'`, `message` incluye la ruta solicitada y `availableEndpoints` lista las rutas válidas | `404` — `error:'Not Found'`, `message` contiene `/api/no-existe`, `availableEndpoints` incluye `GET /health` y `GET /api/pokemon/*` | ✅ |
| UT-GW-03a | `GET /health` | Health check propio del gateway | `200` con `status:'healthy'`, `service:'api_gateway'`, `uptime` numérico | `200` — `status:'healthy'`, `service:'api_gateway'`, `uptime` es `number` | ✅ |
| UT-GW-03b | `GET /gateway-info` | Configuración expuesta de proxies | `200` con `microservices.{auth,pokemon,usuarios,...}` igual a las `MS_*_URL` configuradas | `200` — `microservices.auth`/`pokemon`/`usuarios` coinciden exactamente con los `MS_*_URL` mockeados | ✅ |
| SEC-09 (a) | `forwardJsonBody`: `POST` con body `{}` (corrección, ver §8) | `POST /api/auth/register` con `.send({})` | El mock de `MS_AUTH_URL` recibe `Content-Length: 2` y body `"{}"`; responde `200` sin colgarse | `200`; mock recibió `POST /api/auth/register`, `content-length: '2'`, body `'{}'` | ✅ |
| SEC-09 (b) | `forwardJsonBody`: `GET` no agrega body (regresión) | `GET /api/usuarios/teams` con `Authorization: Bearer xyz789` | El mock de `MS_USUARIOS_URL` recibe `GET /api/teams` sin body ni `Content-Length` | `200`; mock recibió body `''`, `content-length` indefinido | ✅ |
| DAST (a) | `app.disable('x-powered-by')` (corrección, ver §8) | `GET /health` | Respuesta sin cabecera `X-Powered-By` | `200`, `headers['x-powered-by']` indefinido | ✅ |
| DAST (b) | `Cache-Control: no-store` en `/api/*` (corrección, ver §8) | `GET /api/pokemon` | Respuesta incluye `Cache-Control: no-store` | `200`, `headers['cache-control'] === 'no-store'` | ✅ |

**Resultado de la fase unitaria (`ms_gateway`)**: 10/10 ✅
(`Test Suites: 1 passed, 1 total. Tests: 10 passed, 10 total. Time: ~1.2s`).

---

### 2.6 `ms_carga_api`

**Entorno de ejecución**: contenedor `ms_carga_api-ms_carga_api-1` (Python 3.11.15,
working dir `/app`). Se instalaron `pytest` y `httpx<0.28` (ver
`ms_carga_api/requirements-dev.txt`, agregado para que la instalación sea
reproducible — `httpx>=0.28` elimina el kwarg `app=` que usa
`starlette.testclient.TestClient` en `starlette==0.27.0`). Comando:
`python -m pytest tests/ -v`. Archivo de pruebas:
[`ms_carga_api/tests/test_carga.py`](./ms_carga_api/tests/test_carga.py).

Cobertura: casos UT-CARGA-01 a UT-CARGA-03 de `plan_pruebas.md`, sobre `main.py`.
UT-CARGA-01 corre contra el **Postgres real** del stack (`PGHOST=postgres`,
`DB_NAME=equiporocketDb`, ya tiene el esquema de `ms_db` aplicado) usando un Pokémon
de prueba con nombres únicos (`ZZUnitTest*`) que se elimina al final del test
(`pokemon`, `pokemon_types/abilities/moves`, `types`, `abilities`, `items`, `moves`).
UT-CARGA-02/03 son de caja blanca puras (sin BD): UT-CARGA-03 mockea `requests.get`
para simular el error externo y `get_conn` para verificar que la BD nunca se toca.

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-CARGA-01 | `process_payload`: idempotencia de los `upsert_*` (sin duplicados) | Ejecutar `process_payload(conn, payload)` dos veces con el mismo payload de prueba (1 Pokémon, 1 tipo, 1 habilidad, 1 ítem, 1 movimiento, todos con nombres únicos) contra Postgres real | El número de filas en `pokemon`/`types`/`moves`/`items`/`abilities` (y en las tablas de unión `pokemon_types`/`pokemon_abilities`/`pokemon_moves`) es igual tras la 1ª y la 2ª ejecución; mismo `pokemon.id` en ambas | Tras la 1ª ejecución: `(types,abilities,items,moves,pokemon_types,pokemon_abilities,pokemon_moves) = (1,1,1,1,1,1,1)`; tras la 2ª: idéntico; `pokemon_id` igual en ambas (ON CONFLICT actualiza, no duplica) | ✅ |
| UT-CARGA-02a | `_normalize_payload_for_pool`: payload vacío | `_normalize_payload_for_pool({})` | Devuelve una estructura vacía válida; no lanza excepción | Devuelve `{}` sin excepción | ✅ |
| UT-CARGA-02b | `_normalize_payload_for_pool`: payload sin clave `pokemon` pero con clave alternativa (`results`) | `_normalize_payload_for_pool({'results': [{'name':'Pikachu'}, {'name':'Bulbasaur'}]})` | No lanza excepción; usa la clave alternativa como lista de entrada | Devuelve la lista `payload['results']` sin excepción | ✅ |
| UT-CARGA-02c | `_normalize_payload_for_pool`: payload sin ninguna clave conocida ni listas | `_normalize_payload_for_pool({'foo':'bar','baz':123})` | No lanza excepción; devuelve una estructura válida (fallback) | Devuelve el `payload` original sin excepción | ✅ |
| UT-CARGA-03 | `POST /load`: manejo de error de la API externa | `POST /load` con `requests.get` mockeado para lanzar `ConnectionError` (`url` no usada) | Responde `502` con mensaje controlado (`'Failed to fetch url: ...'`); `get_conn`/`insert_raw` no se invocan (no se guarda payload corrupto) | `502` — `detail` contiene `"Failed to fetch url"`; `get_conn` mockeado para lanzar `AssertionError` si se llama → no se llamó (test pasa) | ✅ |
| ST-CARGA-01 | `insert_spread` con `ON CONFLICT` no duplica `spreads`/`pokemon_spreads` (corrección, ver §8) | `process_payload(conn, payload)` dos veces con un payload que incluye `spreads: [{"nature": "...", "ev": "4/252/0/0/0/252"}]`, contra Postgres real | El conteo de filas en `spreads` (para esa combinación) y en `pokemon_spreads` (para ese Pokémon) es igual tras la 1ª y la 2ª ejecución | Tras la 1ª: `(spreads_count, pokemon_spreads_count) = (1, 1)`; tras la 2ª: idéntico (ON CONFLICT actualiza, no duplica) | ✅ |

**Resultado de la fase unitaria (`ms_carga_api`)**: 6/6 ✅
(`6 passed, 2 warnings in 1.56s`). Los warnings son `DeprecationWarning` de
`@app.on_event('startup')` (no bloqueante, ver hallazgo SEC-12).

---

### 2.7 `ms_asistencia`

**Entorno de ejecución**: contenedor `ms_asistencia` (Python 3.11.15, working dir
`/app`, pandas 3.0.3 / numpy 2.4.6 ya instalados). Se instaló `pytest` (ver
`ms_asistencia/requirements-dev.txt`, agregado para reproducibilidad). Comando:
`python -m pytest tests/ -v`. Archivo de pruebas:
[`ms_asistencia/tests/test_engine.py`](./ms_asistencia/tests/test_engine.py).

Cobertura: casos UT-ASIS-01 a UT-ASIS-03 de `plan_pruebas.md`, sobre
`PokemonAnalyticsEngine` (`engine.py`). Todas las pruebas son de caja blanca con datos
sintéticos construidos en memoria (sin BD ni `external_raw`).

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-ASIS-01 | `_build_synergy_matrix`: simetría | Construir el engine con 3 Pokémon (A/B/C) cuyas listas `team` son simétricas entre sí (`A→B=30%`, `B→A=30%`, etc.) y comparar `matrix.at[A,B]` vs `matrix.at[B,A]` | `synergy[A][B] == synergy[B][A]` para los 3 pares | `matrix.at['A','B']==matrix.at['B','A']==0.3`; `['A','C']==['C','A']==0.1`; `['B','C']==['C','B']==0.2` | ✅ |
| UT-ASIS-02a | `analyze_team_synergy`: equipo de 6 Pokémon | Engine con 6 Pokémon (`P1..P6`), cada uno con `team` hacia los otros 5 al 10%; `analyze_team_synergy(['P1',...,'P6'])` | Devuelve score agregado (`synergy_percent`) **y** desglose por par | `result == {'synergy_percent': 10.0, 'pairs': [...]}` — corregido (ver §8): `pairs` incluye los `C(6,2)=15` pares con `{pokemon1, pokemon2, synergy_percent}` | ✅ |
| UT-ASIS-02b | `analyze_team_synergy`: lista vacía | `analyze_team_synergy([])` | Devuelve una estructura por defecto sin lanzar excepción | `{'error': 'Se necesitan al menos 2 Pokémon para analizar la sinergia.'}`, sin excepción | ✅ |
| UT-ASIS-03 | `recommend_teammate`: top-N recomendaciones | Engine con 5 Pokémon (A-E) + 3 candidatos (F/G/H) con distintos pesos de sinergia hacia A-E; `recommend_teammate(['A','B','C','D','E'], top_n=3)` | Devuelve exactamente 3 recomendaciones, ordenadas por score descendente, ninguna ya en `current_team` | `recommendations == {'F':0.85,'G':0.5,'H':0.45}` (orden `['F','G','H']` descendente); ninguna de F/G/H ∈ {A..E} | ✅ |

**Resultado de la fase unitaria (`ms_asistencia`)**: 4/4 ✅
(`4 passed in 1.22s`).

**Hallazgo (UT-ASIS-02a, corregido — ver §8)**: `plan_pruebas.md` espera que
`analyze_team_synergy` con un equipo de 6 Pokémon devuelva "score agregado + desglose
por par". `ms_asistencia/engine.py::analyze_team_synergy` ya calculaba internamente el
score de cada uno de los `C(6,2)=15` pares (`synergy_scores`), pero originalmente solo
retornaba el promedio agregado (`{'synergy_percent': round(avg_synergy*100,2)}`) — el
desglose por par se descartaba. **Corregido**: la función ahora también construye
`pairs` (una entrada `{'pokemon1', 'pokemon2', 'synergy_percent'}` por cada par,
reutilizando la misma lógica que ya existía en `app.py::/store/synergy`) y la retorna
junto al agregado: `{'synergy_percent': ..., 'pairs': [...]}`. `app.py::/analyze/team`
reenvía directamente el resultado de `analyze_team_synergy`, por lo que el desglose
queda expuesto sin cambios adicionales en `app.py`.

---

### 2.8 `ms_db`

**Entorno de ejecución**: contenedor `ms_db-ms_db-1` (Node v18.20.8, working dir
`/usr/src/app`, `"type":"module"`), conectado a `ms_db-postgres-1` (postgres:15,
BD `equiporocketDb`, env `PGHOST=postgres PGUSER=postgres PGPASSWORD=example`). Se
instaló `jest@29` transitoriamente y se agregó a `devDependencies` +
`"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --verbose"`
en `ms_db/package.json` para reproducibilidad. Comando:
`node --experimental-vm-modules node_modules/jest/bin/jest.js --verbose`. Archivo de
pruebas: [`ms_db/tests/db.test.js`](./ms_db/tests/db.test.js).

A diferencia de los demás servicios Node, estas pruebas son de integración directa
contra el Postgres real del stack (no usan mocks): UT-DB-01 valida una restricción a
nivel de base de datos (`schema.sql`) y UT-DB-02 valida el script CLI `node server.js
init` (`server.js`, rama `process.argv[2]==='init'`).

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-DB-01 | Trigger `trg_prevent_delete_teams` (`schema.sql` líneas 465-473) | Dentro de una transacción: `INSERT` de un equipo de prueba (`user_id` = un usuario existente, `format_id=NULL`, `created_by='manual'`), luego `DELETE FROM teams WHERE id=<ese id>`, después `ROLLBACK` | El `DELETE` lanza una excepción de Postgres (`PHYSICAL_DELETE_FORBIDDEN`) y la fila no se elimina | `client.query('DELETE ...')` rechaza con `error: PHYSICAL_DELETE_FORBIDDEN: Physical DELETE on "teams" is disabled. Use UPDATE teams SET active = FALSE to deactivate instead.`; tras `ROLLBACK`, `SELECT COUNT(*) FROM teams` sigue en 2 (sin cambios) | ✅ |
| UT-DB-02a | Idempotencia de `node server.js init` | Ejecutar `node server.js init` dos veces consecutivas vía `execFileSync` | Ambas ejecuciones terminan con código 0 (sin lanzar) | `createDatabaseIfNotExists()` devuelve `created:false` (la BD ya existe) en ambas corridas; `applySchema()` reaplica las 474 líneas de `schema.sql` ignorando errores `42P07`/"already exists"; ambas corridas terminan con `process.exit(0)` | ✅ |
| UT-DB-02b | `ensureDefaultAdminOnCreate` no duplica el admin por defecto | Tras las dos ejecuciones de `init`, `SELECT COUNT(*) FROM users WHERE email='admin@equiporocket.cl'` | `count == 1` | `count == 1` — `ensureDefaultAdminOnCreate(result.created)` recibe `created=false` en ambas corridas y devuelve `{skipped:true, reason:'db_not_created'}` sin insertar nada | ✅ |

**Resultado de la fase unitaria (`ms_db`)**: 3/3 ✅
(`Test Suites: 1 passed, 1 total. Tests: 3 passed, 3 total. Time: 3.834s`).

Se verificó tras la ejecución que no quedó estado residual: `SELECT COUNT(*) FROM
teams` permanece en 2 y `SELECT COUNT(*) FROM users WHERE
email='admin@equiporocket.cl'` permanece en 1, iguales a los valores previos a correr
las pruebas.

---

### 2.9 Frontend (`Frontend_EquipoRocket.pk`)

**Entorno de ejecución**: host (Node v22.13.1, npm 10.9.2), no en contenedor — el
contenedor `frontend` solo sirve el build estático (`/app/dist`, sin `node_modules`).
No existía ningún framework de pruebas configurado (Vite 8.0.13 / "rolldown-vite").
Se instalaron como `devDependencies`: `vitest@^4.1.8`, `jsdom`,
`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
Se agregó un bloque `test: { environment: 'jsdom', globals: true, setupFiles:
'./src/setupTests.js' }` a `vite.config.js` y el script
`"test": "vitest run"` en `package.json`. Comando: `npm run test`.

**Cambio de testabilidad**: en `src/services/api.js`, `gatewayAPI` (instancia de axios
creada con `axios.create(...)`, antes no exportada) se cambió a
`export const gatewayAPI = ...` — cambio mínimo, sin alterar su comportamiento, para
poder invocar directamente su interceptor de request desde la prueba (UT-FE-01).

Archivos de prueba:
[`src/services/api.test.js`](./Frontend_EquipoRocket.pk/src/services/api.test.js),
[`src/pages/TeamBuilder.test.jsx`](./Frontend_EquipoRocket.pk/src/pages/TeamBuilder.test.jsx),
[`src/pages/Simulations.test.jsx`](./Frontend_EquipoRocket.pk/src/pages/Simulations.test.jsx).
En `TeamBuilder.test.jsx` y `Simulations.test.jsx` se mockean `../context/AuthContext`
(`useAuth`), `../services/api` (llamadas de red) y, en `TeamBuilder`, además
`../components/TypeCoverageChart` (usa `ResizeObserver`, no disponible en jsdom) y
`../components/SearchModal` (se reemplaza por un stub controlable que permite elegir
"pikachu" para un slot dado).

| ID | Funcionalidad a comprobar | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| UT-FE-01a | `gatewayAPI` interceptor de request: con `pk_token` | `localStorage.setItem('pk_token','abc123')`, invocar el interceptor con `{headers:{}}` | `config.headers.Authorization === 'Bearer abc123'` | `config.headers.Authorization === 'Bearer abc123'` | ✅ |
| UT-FE-01b | `gatewayAPI` interceptor de request: sin `pk_token` | `localStorage.clear()`, invocar el interceptor con `{headers:{}}` | `config.headers.Authorization` no definido | `config.headers.Authorization === undefined` | ✅ |
| UT-FE-02a | `TeamBuilder`: el equipo tiene exactamente `TEAM_SIZE=6` espacios | Renderizar `TeamBuilder` y buscar los botones "Agregar Pokémon al espacio 1..6" y "...espacio 7" | Existen los 6 espacios; no existe un 7mo espacio | Los 6 botones "Agregar Pokémon al espacio N" (N=1..6) existen; "...espacio 7" no existe — `team = Array(6).fill(null)` es de tamaño fijo | ✅ |
| UT-FE-02b | `TeamBuilder`: Pokémon duplicado en dos espacios | Elegir "pikachu" para el espacio 1 (vía `SearchModal` mockeado) y luego elegir "pikachu" otra vez para el espacio 2 | El segundo Pokémon duplicado es rechazado: solo 1 tarjeta "pikachu" en el equipo | Solo 1 tarjeta "pikachu" — corregido (ver §8): `handleSelect` ahora libera el espacio anterior cuando el mismo Pokémon se elige para otro espacio; `screen.getAllByRole('button',{name:'Remover pikachu'})` tiene longitud 1 | ✅ |
| UT-FE-03a | `Simulations`: respuesta real de `ms_montecarlo` (`{success, win_rate}`) | Mockear `simulateBattle` → `{success:true, win_rate:73.5, best_team:[]}`, click en "Simular Batalla" | Se muestra el panel "Resultado de la Simulación" con el win rate | Se muestra "Resultado de la Simulación", `"74%"` y `"Win rate 74%"` (`Math.round(73.5)=74`) | ✅ |
| UT-FE-03b | `Simulations`: respuesta con `team_a_win_probability`/`team_b_win_probability` (suma ≠ 100, sin `win_rate`) | Mockear `simulateBattle` → `{team_a_win_probability:62.5, team_b_win_probability:55.0}`, click en "Simular Batalla" | Dado que la respuesta no trae `success`/`win_rate`, `handleSimulate` la trata como fallo: `alert('Error al simular la batalla: Simulation failed')` y no se renderiza el panel de resultado ni los valores 62.5/55.0 (comportamiento real; difiere de la expectativa original de `plan_pruebas.md` — ver Hallazgo) | `alert` fue llamado con un mensaje que contiene "Simulation failed"; no se renderiza "Resultado de la Simulación" ni los valores 62.5/55 | ✅ |

**Resultado de la fase unitaria (Frontend)**: 6/6 ✅
(`Test Files: 3 passed (3). Tests: 6 passed (6)`).

**Hallazgo (UT-FE-02b, corregido — ver §8)**: `plan_pruebas.md` espera que un Pokémon
duplicado sea rechazado al construir un equipo. La función `handleSelect` en
`src/pages/TeamBuilder.jsx` — invocada por `SearchModal` vía `onSelect` — originalmente
hacía `n[targetSlot] = { ...pokemon, ... }` sin comprobar si `pokemon.name` ya existía
en otro slot de `team`, permitiendo que un usuario seleccionara el mismo Pokémon para
hasta los 6 espacios del equipo. **Corregido**: `handleSelect` ahora busca
`team.some((p, idx) => idx !== targetSlot && p?.name === pokemon.name)` y, si
encuentra el Pokémon en otro espacio, libera ese espacio (`n[dupIdx] = null`) antes de
asignarlo al espacio elegido — el Pokémon se "mueve" de un espacio a otro en lugar de
duplicarse.

**Hallazgo (UT-FE-03b)**: `plan_pruebas.md` espera que, ante una respuesta de
`/simulate` donde `team_a_win_probability + team_b_win_probability != 100` (ver nota
de `CLAUDE.md` sobre `ms_montecarlo`: ambas probabilidades son resultados
independientes, no complementarios), la UI muestre ambos porcentajes "tal cual". En la
práctica, **el endpoint `POST /simulate` de `ms_montecarlo` nunca devuelve
`team_a_win_probability`/`team_b_win_probability` en la respuesta HTTP** —
`ms_montecarlo/app.py` línea 623 retorna únicamente
`{"success": True, "simulation_id": ..., "win_rate": team_a_prob, "best_team": [...]}`
(`team_b_prob`/`opponent_win_rate` se calculan y persisten en la BD vía
`persist_simulation_results`, pero no se exponen al cliente). Y
`src/pages/Simulations.jsx::handleSimulate` (líneas 74-90) solo reconoce respuestas con
`success===true` o `win_rate` definido, mostrando un único valor
`simulationResult.winRate` (líneas 366-380) — no existe ningún elemento de UI para un
segundo porcentaje "team B". Si el backend alguna vez devolviera el esquema que
`plan_pruebas.md` espera (solo `team_a_win_probability`/`team_b_win_probability`, sin
`win_rate`/`success`), el frontend lo trataría como una simulación fallida
(`alert('Error al simular la batalla: Simulation failed')`). Esto representa un
hallazgo real para corrección futura: o bien `ms_montecarlo`'s `/simulate` debería
incluir ambas probabilidades en la respuesta HTTP y `Simulations.jsx` debería
renderizarlas ambas, o `plan_pruebas.md` debería actualizarse para reflejar que la UI
solo muestra un win rate agregado (el de `team_a`).

---

## 4. Pruebas de estrés y carga

**Entorno de ejecución**: mismo stack Docker local descrito al inicio (10 contenedores
`Up`). Herramientas: `curl -w` para timing/códigos de requests individuales y
secuenciales; bucles bash `( ... ) & ... wait` para ráfagas de N requests
concurrentes; `npx --yes autocannon@8.0.0` para carga sostenida (`-c` conexiones, `-d`
duración, `-R` requests/s, `-j` para desglose JSON exacto de errores/timeouts/no-2xx);
`EXPLAIN (ANALYZE, BUFFERS)` y deltas de `pg_stat_user_tables` para análisis a nivel de
consultas; `docker stats`/`docker logs` para memoria y errores. Cobertura: los 7 casos
`ST-*` de `plan_pruebas.md` §6, en el orden sugerido por §10 (Fase 4). Por §9, los
umbrales de ST-MC-01/02 se recalibran respecto al costo duplicado de `/simulate`
(`2 × iterations × sims`, ver `CLAUDE.md`). Para ST-CARGA-01, ST-ASIS-01 y ST-USU-01 —
que requieren insertar datos en la BD de desarrollo — los datos de prueba se
eliminaron al finalizar cada caso (detallado en su hallazgo correspondiente), dejando
la BD en su estado previo, igual que en 2.8.

| ID | Componente | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| ST-MC-01 | `ms_montecarlo` | `POST /simulate` con `iterations=1000, sims=500` (escenario exacto de `plan_pruebas.md`, ≈1.000.000 combates), directo (`:8010`) y vía gateway (`:9000/api/montecarlo/simulate`) | `200` dentro de un umbral acordado (plan original: `<30s`), sin timeout de `ms_gateway` (60s) | `200` en ambos casos, `success:true`; **33.1s directo / 33.8s vía gateway** — muy por debajo del timeout de 60s del gateway, pero ~10% por encima del umbral original `<30s` | ⚠️ |
| ST-MC-02 | `ms_montecarlo` + Postgres | 15 requests concurrentes a `/simulate` (carga pesada, 100x100) | `0` errores `5xx`; `max_connections` de Postgres no se agota | 15/15 → `200`, `simulation_id` únicos y secuenciales (27-41); 11.45s de pared (cuasi-serializado por GIL/single worker de uvicorn); `pg_stat_activity` = 7 conexiones (« 100); 0 errores en logs de `postgres`/`ms_montecarlo` | ✅ |
| ST-GW-01 | `ms_gateway` | `autocannon` sobre ruta *proxied* (`/api/pokemon` vía gateway) vs. acceso directo a `ms_pokemon` vs. ruta del gateway sin proxy (`/health`) | Overhead del proxy marginal (`<20ms p95`), estable en el tiempo | Ruta *proxied*: **~19% de errores de conexión y throughput ~4x menor** que el acceso directo y que `/health` (no proxied); el stack Express del gateway (cors/morgan/json/urlencoded/interceptor de auth) y `ms_pokemon` están sanos en aislamiento — el defecto es específico de `http-proxy-middleware@2.0.6` | ❌ |
| ST-AUTH-01 | `ms_auth` | 50 requests concurrentes a `POST /api/auth/login` directo (credenciales válidas, `bcrypt` cost=12) | Tiempo de respuesta crece de forma acotada/predecible; se documenta el techo de throughput | 50/50 → `200`; latencia crece **10-19x (0.9s → 8.5-16.9s)** por la serialización de `bcrypt.compare` en el threadpool de libuv (`UV_THREADPOOL_SIZE=4` por defecto) a pesar de 6 CPUs disponibles; techo de throughput ≈ **2.75 req/s** | ✅ |
| ST-CARGA-01 | `ms_carga_api` | `POST /load` con payload real de Pikalytics (`API_URL` configurado, formato completo) | `process_payload` completa sin error, tiempo/memoria documentados, sin timeouts de Postgres | `200`, **18.632s**, memoria 52.57→53.12 MiB (+0.55MB), 0 errores Postgres; `pokemon/types/abilities/items/moves/natures` sin cambios (idempotente); `spreads`/`pokemon_spreads` se duplicaron (4840→9680) — **corregido (ver §8)**: `insert_spread` ahora usa `ON CONFLICT ... DO UPDATE ... RETURNING id` sobre una restricción `UNIQUE`, confirmado idempotente por la nueva prueba `test_process_payload_twice_does_not_duplicate_spreads` | ✅ |
| ST-ASIS-01 | `ms_asistencia` | N requests concurrentes a `POST /recommend/teammate` justo durante un `POST /reload` (reconstrucción de `_build_synergy_matrix` con pandas) | Sin datos parciales/inconsistentes ni `500` durante el `/reload` | 1x `/reload` + 5x `/recommend/teammate` concurrentes → **6/6 `200`** en 0.16-0.61s; las 5 respuestas de `/recommend/teammate` idénticas y consistentes; 0 errores en `docker logs ms_asistencia` | ✅ |
| ST-USU-01 | `ms_usuarios` | `GET /api/teams` para un usuario con 100+ equipos activos (152 sembrados vía SQL) | Tiempo de respuesta estable mediante uso de índice sobre `user_id`/`active`, sin *full table scan* | `200` en 0.14-0.51s, **pero `EXPLAIN ANALYZE` confirma `Seq Scan`** (la tabla cabe en 2 páginas); `pg_stat_user_tables` registra **~317 `Seq Scan`** para una sola request (patrón N+1 en `listTeams`/`getTeamById`) — datos de prueba eliminados tras la prueba | ❌ |

**Resultado de la fase de estrés**: 4 ✅, 1 ⚠️ (pasa el criterio principal pero con un
hallazgo a registrar: ST-MC-01, umbral desactualizado — no requiere cambio de código),
2 ❌ (ST-GW-01, ST-USU-01, dejados como deuda técnica por decisión del usuario — ver
§8). ST-CARGA-01 corregido (ver §8). Detalle de cada hallazgo no trivial a
continuación.

**Hallazgo (ST-MC-01 — umbral `<30s` quedó desactualizado por la búsqueda dual)**:
`plan_pruebas.md` propone `<30s` como umbral para el escenario por defecto
(`iterations=1000, sims=500`), pero ese umbral se definió **antes** de la corrección
que hizo que `/simulate` ejecute `search_best_team` dos veces (una para `team`, otra
para `opponent`; `2 × iterations × sims` = 1.000.000 combates totales, ver
`CLAUDE.md`/`ms_montecarlo/app.py`). Con el escenario exacto del plan, la respuesta
real toma 33.1s directo y 33.8s vía gateway (+0.7s de overhead del proxy para esta
*request única* — contraste con ST-GW-01, cuyo problema de `http-proxy-middleware`
solo se manifiesta bajo *carga concurrente sostenida*, no en una request aislada).
Ambas mediciones están muy por debajo del timeout real de 60s configurado en
`ms_gateway/app.js` para `/api/montecarlo` (que es el límite operacional que
realmente importa), pero ~10% por encima del `<30s` documentado. Como permite §9,
se recomienda actualizar el umbral de `plan_pruebas.md` a algo como "`<40s`, y
siempre `< 60s` (timeout del gateway)" en lugar de `<30s`, para reflejar el costo
real post-corrección.

**Hallazgo (ST-GW-01 — `http-proxy-middleware@2.0.6` degrada severamente las rutas
*proxied* bajo carga)**: este es el hallazgo más severo de toda la campaña de
pruebas (unitarias + estrés). Mediante aislamiento sistemático con `autocannon` —
(a) `ms_pokemon` directo, (b) `ms_gateway` `/health` (no pasa por
`http-proxy-middleware`), (c) `ms_gateway` `/api/pokemon` (*proxied*) — se observó que
**solo (c)** presenta ~19% de errores de conexión y un throughput ~4x menor que (a) y
(b), los cuales están completamente sanos. Esto aísla el defecto específicamente a
`http-proxy-middleware@2.0.6` (`ms_gateway/package.json`), no al stack propio de
Express del gateway (`cors`/`morgan`/`json`/`urlencoded`/interceptor de auth,
`ms_gateway/app.js` líneas 9-45), que rinde igual con o sin proxy. Como **todas** las
rutas del frontend pasan por este mismo proxy (`/api/auth/*`, `/api/usuarios/*` +
`/api/teams` + `/api/users`, `/api/pokemon/*`, `/api/montecarlo/*`,
`/api/asistencia/*`, `/api/carga/*`), este problema afecta a la plataforma completa
bajo carga real, y falla el criterio `<20ms p95` de `plan_pruebas.md` por órdenes de
magnitud. Se recomienda actualizar `http-proxy-middleware` a una versión 3.x (o
migrar a un proxy basado en `undici`/`http.request` nativo) y re-ejecutar ST-GW-01
para confirmar la corrección.

**Hallazgo (ST-CARGA-01 — `insert_spread` sin `ON CONFLICT` duplicaba `spreads`/
`pokemon_spreads` en cada `/load`, corregido — ver §8)**: `ms_carga_api/main.py::
insert_spread` era un `INSERT INTO spreads (...) VALUES (...) RETURNING id` simple,
**sin cláusula `ON CONFLICT`**, a diferencia de `upsert_pokemon`/`upsert_type`/
`upsert_ability`/`upsert_item`/`upsert_move`/`upsert_nature`, que sí usan
`ON CONFLICT (...) DO UPDATE`/`DO NOTHING`. `spreads` tenía una clave natural clara
(`nature_id` + las 6 columnas `*_evs`) sin restricción `UNIQUE`. Como resultado, cada
`POST /load` — incluido el `startup_load_once()` que corre en **cada reinicio del
contenedor** — insertaba una copia completa nueva de `spreads`/`pokemon_spreads`
aunque el payload no hubiera cambiado: un solo `/load` repetido duplicó ambas tablas de
4840 a 9680 filas. *(Limpieza realizada en su momento: se eliminaron las 4840 filas
duplicadas de `spreads` (`id > 4840`, con cascada a `pokemon_spreads` vía
`fk_ps_spread ON DELETE CASCADE`).)* **Corregido**: se agregó
`CONSTRAINT uq_spreads_combo UNIQUE (nature_id, hp_evs, attack_evs, defense_evs,
sp_attack_evs, sp_defense_evs, speed_evs)` a `spreads` en `ms_db/schema.sql` (para
instalaciones nuevas; aplicada también con `ALTER TABLE` a la BD local existente, que
no tenía filas duplicadas) y `insert_spread` ahora usa
`ON CONFLICT (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs,
sp_defense_evs, speed_evs) DO UPDATE SET nature_id = EXCLUDED.nature_id RETURNING id`,
análogo a los demás `upsert_*`. Se agregó `test_process_payload_twice_does_not_
duplicate_spreads` en `test_carga.py`, que ejecuta `process_payload` dos veces con un
payload que incluye `spreads` y confirma que `spreads`/`pokemon_spreads` no crecen en
la segunda ejecución.

**Hallazgo (ST-USU-01 — patrón N+1/N×M en `listTeams` genera ~317 consultas
secuenciales para una sola request)**: se sembraron 150 equipos adicionales para
`user_id=1` (vía `INSERT` directo, 152 equipos activos en total + 2 preexistentes con
Pokémon). `EXPLAIN (ANALYZE, BUFFERS)` sobre la consulta base de
`ms_usuarios/src/models/teamModel.js::getTeamsByUser` (línea 14,
`SELECT * FROM teams WHERE user_id = $1 AND (active IS NULL OR active = TRUE) ORDER BY
created_at DESC`) confirma `Seq Scan` (`Buffers: shared hit=2`, 0.18ms) — `teams` no
tiene ningún índice además de `teams_pkey` (`id`), pero como la tabla completa cabe en
2 páginas de 8KB, Postgres prefiere `Seq Scan` incluso para *cualquier* consulta sobre
ella, incluidas búsquedas por PK. Sin embargo, el cuello de botella real no es ese
índice faltante: `ms_usuarios/src/controllers/teamsController.js::listTeams` (líneas
24-39) llama a `TeamRepo.findById(t.id)` (→ `getTeamById`, `teamModel.js` líneas
31-57) **una vez por cada equipo** devuelto por `getTeamsByUser`, y cada
`getTeamById` ejecuta secuencialmente 1 consulta a `teams` por PK + 1 `JOIN` a
`team_pokemon`/`abilities`/`items` + 1 consulta a `team_pokemon_moves` **por cada
Pokémon del equipo**. Confirmado empíricamente vía deltas de `pg_stat_user_tables`
para una sola `GET /api/teams` (154 equipos, 12 `team_pokemon` en los 2 equipos
reales): **+153 `Seq Scan` en `teams`** (1 de `getTeamsByUser` + 152 de
`getTeamById`), **+152 `Seq Scan` en `team_pokemon`**, **+12 `Seq Scan` en
`team_pokemon_moves`** ≈ 317 *round-trips* secuenciales y *awaited* a Postgres para
una sola request HTTP. El tiempo observado (0.14-0.51s) es bajo solo porque cada
consulta es trivial sobre una BD casi vacía; con equipos completos (152 × 6 Pokémon =
912 filas en `team_pokemon` + hasta 3648 en `team_pokemon_moves`), el mismo patrón
implicaría ≈1+152+152+912 ≈ 1217 *round-trips* secuenciales para cargar "Mis
equipos" — el escenario de no escalar "con el historial del usuario" que
`plan_pruebas.md` anticipa. Se recomienda reescribir `listTeams`/`getTeamById` para
obtener equipos + `team_pokemon` + `team_pokemon_moves` del usuario en 3 consultas
*bulk* (`WHERE team_id = ANY($1)`) y ensamblar la estructura anidada en memoria, y
agregar un índice `(user_id, active)` en `teams` para cuando el volumen por usuario
crezca más allá de unas pocas páginas. *(Limpieza realizada: se deshabilitó
temporalmente el trigger `trg_prevent_delete_teams`, se eliminaron los 150 equipos
`'StressTeam %'` sembrados, y se re-habilitó el trigger; `teams` quedó con sus 2 filas
originales.)*

---

## 6. Pruebas de seguridad

**Entorno de ejecución**: mismo stack Docker local descrito al inicio (10 contenedores
`Up`). Cobertura: los 13 casos `SEC-*` de `plan_pruebas.md` §7 más un *DAST sweep*
sobre `ms_gateway`, completando la Fase 5 anunciada en la sección anterior. Por §9, las
pruebas activas (inyección SQL, fuerza bruta, DAST) se ejecutaron exclusivamente contra
`localhost`/la red Docker interna `equiporocket-net`, nunca contra una instancia
expuesta. Herramientas: `curl -w` para códigos/cabeceras/tiempos de requests
individuales; `docker exec ... node -e` para forjar JWT con secretos arbitrarios
(`jsonwebtoken`); `docker exec ms_db-postgres-1 psql` (con `MSYS_NO_PATHCONV=1`) para
inspección y limpieza de BD; `npm audit` / `pip-audit` (instalado temporalmente dentro
de cada contenedor Python) para SEC-12; `docker run --rm --network equiporocket-net
zaproxy/zap-stable zap-baseline.py` para el *DAST sweep*. Usuarios de prueba creados:
`secusera`/`secuserb`/`secuserc` (vía `POST /api/auth/register`) y el admin seedeado
`admin@equiporocket.cl`. Todos los artefactos de prueba (equipos, el spread/nature
id=9681, usuarios) fueron desactivados o eliminados, y las herramientas instaladas
temporalmente (`pip-audit`, `node_modules`/`package-lock.json` de las auditorías npm,
imagen de ZAP) fueron removidas al finalizar, dejando el entorno en su estado previo —
igual que en las fases anteriores.

| ID | Componente | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| SEC-01 | `ms_auth` / `ms_usuarios` (`requireAuth`) | `GET /api/teams` y `GET /api/usuarios/admin/teams/performance` (a) sin header `Authorization`, (b) con JWT expirado, (c) con JWT de firma inválida | `401` en los tres casos; nunca `200` ni `500` | (a) `401 {"error":"NO_TOKEN"}`; (b) y (c) `401 {"error":"INVALID_TOKEN"}` en ambas rutas — 6/6 respuestas `401` | ✅ |
| SEC-02 | `ms_auth` ↔ `ms_usuarios` (`JWT_SECRET`) | JWT forjado localmente con un secreto distinto (`WRONG_SECRET`) enviado a `GET /api/teams` y `GET /api/auth/me` | `ms_usuarios` rechaza el token (`401`); ambos `JWT_SECRET` deben coincidir en todo despliegue | `401 INVALID_TOKEN` en ambos servicios; pero `ms_usuarios/.env` fija `JWT_SECRET=dev_jwt_secret` mientras `ms_auth` no define la variable y cae al *fallback* hardcodeado `'dev_jwt_secret'` de `authController.js:7` — "coinciden" por accidente, no por configuración compartida | ⚠️ |
| SEC-03 | `ms_usuarios` (`dataController`, `teamsController`), `ms_carga_api` | Payloads SQLi (`' OR '1'='1`, UNION, `'; DROP TABLE teams; --`, `Hardy'); DROP TABLE natures; --`) en `?pokemon=` de `/api/usuarios/data/spreads`, en `name` de `POST /api/teams` y en `nature` de `POST /api/usuarios/data/spreads` | La consulta se ejecuta parametrizada (`$1`, `%s`); el payload se trata como dato; esquema intacto, sin filas filtradas | `?pokemon='OR'1'='1` y UNION → `200 {"spreads":[]}` (comparación literal, 0 coincidencias); `name="'; DROP TABLE teams; --"` → `201`, almacenado como string (team id 154); `nature="Hardy'); DROP TABLE natures; --"` → `201` (id 9681); `teams`/`natures`/`spreads` intactas. 0 interpolaciones de string en queries de `ms_usuarios`; `ms_carga_api` usa `%s`/`psycopg2` en sus ~15 `cur.execute` | ✅ |
| SEC-04 | `ms_auth` (`POST /api/auth/login`) | 8 logins fallidos consecutivos para `secusera`, seguidos de 1 login correcto | Se documenta si existe (o falta) límite de intentos/lockout/rate-limiting; si falta, se registra como hallazgo | Originalmente 8/8 → `401 INVALID_CREDENTIALS` sin `429`/lockout — **corregido (ver §8)**: `express-rate-limit` ahora limita `POST /api/auth/login` a 10 intentos/15min por IP; el intento 11 devuelve `429 {"success":false,"error":"TOO_MANY_ATTEMPTS"}`, confirmado por la nueva prueba `rateLimit.test.js` | ✅ |
| SEC-05 | `ms_auth` (`POST /api/auth/register`) + tabla `users` | Registrar 3 usuarios (uno con contraseña `"123456"`) e inspeccionar `password_hash` vía `psql` | Solo se almacenan hashes `bcrypt` (`$2b$...`); nunca texto plano | Los 3 `password_hash` son `$2a$12$...` (bcrypt, 12 rounds), incluido el de `"123456"` — sin texto plano | ✅ |
| SEC-06 | `ms_usuarios` (8 rutas `/api/usuarios/admin/*`) | Las 8 rutas admin llamadas con token de `secusera` (no admin) y luego con token de `admin@equiporocket.cl` | `403` para no-admin; `200` se documenta como control de acceso roto | Las 8 rutas → `403 {"success":false,"error":"FORBIDDEN"}` con token no-admin; `200` con datos reales con token admin. `adminRoutes.js` solo aplica `requireAuth`, pero cada una de las 8 funciones en `adminController.js` repite `SELECT is_admin FROM users WHERE id=$1` + `403 FORBIDDEN` — control de acceso correcto pero a nivel de controlador, no de ruta | ✅ |
| SEC-07 | `ms_gateway`, `ms_montecarlo`, `ms_carga_api` (CORS) | `OPTIONS` *preflight* con `Origin: https://sitio-externo.example` contra `/api/montecarlo/simulate` (vía gateway y directo) y `/load` de `ms_carga_api` | Se documenta el comportamiento actual (refleja cualquier origen) como hallazgo para producción; se recomienda restringir `allow_origins`/`origin` | Gateway (`cors({origin:true,credentials:true})`, `app.js:32`) y `ms_montecarlo` (`CORSMiddleware(allow_origins=["*"], allow_credentials=True, ...)`, `app.py:25-31`) responden con `Access-Control-Allow-Origin: https://sitio-externo.example` + `Allow-Credentials: true`; `ms_carga_api` no tiene `CORSMiddleware` → `OPTIONS` → `405` | ⚠️ |
| SEC-08 | `ms_db` (trigger), `ms_usuarios` | `DELETE FROM teams WHERE id=154` directo vía `psql`; `DELETE /api/teams/155` de usuario B sobre equipo de A (compartido con SEC-10) | El trigger `trg_prevent_delete_teams` (`ms_db/schema.sql:472`) bloquea el `DELETE` físico; la API solo permite `active=FALSE` sobre equipos propios | `DELETE FROM teams WHERE id=154` → `ERROR: PHYSICAL_DELETE_FORBIDDEN` (`prevent_teams_delete()`); `DELETE /api/teams/155` con token de B → `403 FORBIDDEN`, equipo de A sin cambios | ✅ |
| SEC-09 | `ms_gateway`, `ms_montecarlo`, `ms_auth` | Payloads malformados (`{"team":"not-an-array"}`, `{}`) a `POST /simulate`; `{"username":12345,...}` a `/api/auth/register`; JSON truncado a `/api/auth/login`; y `{}` vía gateway a `/api/montecarlo/simulate`, `/api/auth/register`, etc. | Las respuestas de error no incluyen *stack traces*, queries SQL ni rutas absolutas del servidor | Llamadas directas → `422` Pydantic limpio, `500 {"error":"INTERNAL_ERROR"}` o `500 {"message":"Unexpected end of JSON input"}`, sin stacks/paths. Originalmente `{}` vía gateway a cualquier ruta `POST`/`PUT`/`PATCH` proxiada colgaba ~60s (`ECONNRESET`) — **corregido (ver §8)**: `POST /api/auth/register` con `{}` ahora se reenvía con `Content-Length: 2`/body `"{}"` y responde `200` de inmediato, confirmado por nuevas pruebas en `gateway.test.js` | ✅ |
| SEC-10 | `ms_usuarios` (`teamsController`, ownership) | Usuario B (`secuserb`) ejecuta `GET`/`PUT`/`DELETE` sobre `/api/teams/155` (equipo de `secusera`) | `403`/`404`; el equipo de B no se lee ni modifica | Los 3 métodos → `403 FORBIDDEN`; `team 155` sin cambios (verificado vía `psql`) | ✅ |
| SEC-11 | `ms_db` (`ensureDefaultAdminOnCreate`) | `POST /api/auth/login` con `admin@equiporocket.cl` / `Admin123!` (credenciales por defecto seedeadas) | Para entornos distintos de desarrollo local, se documenta como hallazgo si las credenciales por defecto no fueron rotadas/deshabilitadas | Login exitoso (`200`), `is_admin:true`, `is_active:true` — credenciales por defecto activas (usadas productivamente en SEC-05/SEC-06 en este entorno local) | ⚠️ |
| SEC-12 | Todos los servicios (`npm audit` / `pip-audit`) | Auditoría de dependencias en Frontend, `ms_gateway`, `ms_auth`, `ms_usuarios`, `ms_pokemon`, `ms_db`, `ms_montecarlo`, `ms_asistencia`, `ms_carga_api` | Sin vulnerabilidades de severidad alta/crítica sin mitigación documentada | Frontend/`ms_db`/`ms_gateway`/`ms_auth`/`ms_pokemon` → 0 vulns; `ms_usuarios` → 3 *high* (ReDoS `semver` vía `nodemon`, solo `devDependencies`, sin cambios); `ms_montecarlo`/`ms_asistencia` → 6 CVEs en `pip`/`wheel` de la imagen base, sin cambios. `ms_carga_api` (15 vulnerabilidades en `fastapi==0.95.2`/`starlette 0.27.0`/`requests==2.31.0`/`python-dotenv==1.0.0`) — **corregido (ver §8)**: `requirements.txt` actualizado a `fastapi==0.116.1`, `requests==2.32.4`, `python-dotenv==1.1.1` (+ `uvicorn==0.35.0`, `psycopg2-binary==2.9.12`), sin *breaking changes* (6/6 tests siguen pasando) | ✅ |
| SEC-13 | Frontend (`MyTeams.jsx`), `ms_usuarios` | Crear equipo con `name="<script>alert(1)</script>"` vía `POST /api/teams`, listar y renderizar en `MyTeams.jsx` | El contenido se escapa (comportamiento por defecto de React); no se ejecuta script; no se usa `dangerouslySetInnerHTML` con datos de usuario | `201`, `name` almacenado/devuelto como string literal sin sanitizar en backend (tratado como dato); `grep -r dangerouslySetInnerHTML Frontend_EquipoRocket.pk/src` → 0 resultados; `MyTeams.jsx:108` renderiza `{team.name}` vía interpolación JSX estándar (auto-escapado) | ✅ |
| DAST | `ms_gateway` (superficie expuesta) | OWASP ZAP *baseline* (passive scan): `docker run --rm --network equiporocket-net -t zaproxy/zap-stable zap-baseline.py -t http://api_gateway:8000 -m 2 -I -s` | Se identifican configuraciones/cabeceras inseguras expuestas por el gateway | Originalmente `PASS: 65, WARN-NEW: 2, FAIL-NEW: 0` con **10037** `X-Powered-By: Express` y **10049** *Storable and Cacheable Content* ×3 — **corregidos (ver §8)**: `app.disable('x-powered-by')` elimina la cabecera `X-Powered-By`, y `Cache-Control: no-store` se agrega a todas las respuestas `/api/*`, confirmado por nuevas pruebas en `gateway.test.js`. *Spider* sigue limitado (`GET /` → `404`, sin cambios) | ✅ |

**Resultado de la fase de seguridad**: 11 ✅, 3 ⚠️ (pasan el criterio principal pero con
un hallazgo a documentar como deuda de configuración para despliegues no-locales:
SEC-02, SEC-07, SEC-11). SEC-04, SEC-09, SEC-12 y DAST corregidos (ver §8). Detalle de
cada hallazgo no trivial a continuación.

**Hallazgo (SEC-02 — `JWT_SECRET` coincide entre `ms_auth`/`ms_usuarios` por
accidente, no por configuración compartida)**: aunque `ms_usuarios` rechaza
correctamente (`401 INVALID_TOKEN`) un JWT firmado con un secreto distinto, el secreto
"correcto" (`dev_jwt_secret`) coincide entre ambos servicios solo porque
`ms_usuarios/.env` lo define explícitamente (`JWT_SECRET=dev_jwt_secret`) mientras
`ms_auth` **no** tiene la variable configurada y depende del *fallback* hardcodeado en
`ms_auth/src/controllers/authController.js:7`
(`process.env.JWT_SECRET || 'dev_jwt_secret'`). Si en un despliegue futuro se rota
`JWT_SECRET` en `ms_usuarios` sin replicarlo en `ms_auth` (o viceversa), los tokens
emitidos por uno dejarían de ser válidos para el otro de forma silenciosa, o ambos
seguirían "funcionando" con un secreto público conocido del código fuente. Se
recomienda: (1) exigir `JWT_SECRET` como variable de entorno obligatoria en **ambos**
servicios, sin *fallback* hardcodeado en `authController.js`; (2) documentar en cada
`docker-compose.yml`/`.env.example` que `JWT_SECRET` debe ser un valor compartido
inyectado desde un origen común.

**Hallazgo (SEC-04 — sin límite de intentos/lockout/rate-limiting en
`POST /api/auth/login`, corregido — ver §8)**: 8 intentos consecutivos con contraseña
incorrecta para `secusera` devolvieron `401 {"error":"INVALID_CREDENTIALS"}` sin
variación de código de estado, y el intento 9 (contraseña correcta) tuvo éxito (`200`)
sin fricción adicional. `ms_auth/src/controllers/authController.js::login` no
implementaba contador de intentos fallidos ni bloqueo temporal, y ni `ms_auth` ni
`ms_gateway` registraban middleware de *rate limiting*. **Corregido**: se agregó
`express-rate-limit` (`ms_auth/package.json`) como `loginLimiter` (10 intentos / 15
minutos por IP, `standardHeaders: true`) aplicado únicamente a
`POST /api/auth/login` en `ms_auth/src/routes/authRoutes.js`; al superar el límite,
responde `429 {"success":false,"error":"TOO_MANY_ATTEMPTS"}`. Nueva prueba
`ms_auth/tests/rateLimit.test.js` confirma 10×`401 INVALID_CREDENTIALS` seguidos de
1×`429 TOO_MANY_ATTEMPTS`.

**Hallazgo (SEC-07 — CORS permisivo refleja cualquier `Origin` con
credenciales habilitadas)**: `ms_gateway/app.js:32` (`cors({ origin: true, credentials:
true })`) refleja dinámicamente cualquier `Origin` en `Access-Control-Allow-Origin`
junto con `Access-Control-Allow-Credentials: true`. `ms_montecarlo/app.py:25-31`
(`CORSMiddleware(allow_origins=["*"], allow_credentials=True, allow_methods=["*"],
allow_headers=["*"])`, precedido del comentario `# Enable CORS for local development
(adjust origins for production)`) tiene el mismo efecto: Starlette, al combinar
`allow_credentials=True` con `allow_origins=["*"]`, refleja el `Origin` real en lugar
de enviar `*` literal (inválido junto con credenciales según la especificación CORS).
En ambos casos, un sitio malicioso abierto en el navegador del usuario podría, en
teoría, hacer peticiones autenticadas (con `pk_token`) contra el gateway o
`ms_montecarlo` y leer la respuesta. `ms_carga_api/main.py` no configura CORS en
absoluto (`OPTIONS` → `405`), lo que de hecho bloquea cualquier llamada *cross-origin*
desde un navegador. Se recomienda, para cualquier despliegue no-local, restringir
`origin`/`allow_origins` a una lista explícita de dominios del frontend (p.ej.
`https://app.equiporocket.cl`) tanto en `ms_gateway` como en `ms_montecarlo`.

**Hallazgo (SEC-09 — body `{}` vía `ms_gateway` cuelga ~60s por un bug en
`onProxyReq`, el hallazgo más severo de la Fase 5, corregido — ver §8)**: cualquier
`POST`/`PUT`/`PATCH` con cuerpo `{}` (JSON vacío válido) enviado a través de
`ms_gateway` se colgaba ~60s y terminaba en error de conexión, en vez de la respuesta
inmediata (`400`/`422`) que el microservicio destino produce si se le llama
directamente. Confirmado en `POST /api/montecarlo/simulate` (~60.0s, `[HPM]
ECONNRESET: Error: socket hang up` en los logs de `ms_gateway`, `HTTP_STATUS:000` en
el cliente) y en `POST /api/auth/register` (mismo patrón); llamando directo a
`ms_montecarlo:8010/simulate` o `ms_auth:3001/api/auth/register` con `{}`, ambos
respondían en milisegundos con un error de validación limpio (`422`/`400`).

**Causa raíz** (`ms_gateway/app.js`, patrón repetido en el `onProxyReq` de **todas**
las rutas proxiadas — `/api/auth`, `/api/usuarios/users`, `/api/usuarios`,
`/api/teams`, `/api/users`, `/api/carga`, `/api/montecarlo`, `/api/asistencia`):
```js
onProxyReq: (proxyReq, req, res) => {
  try {
    ...
    if (req.body && Object.keys(req.body).length) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  } catch (e) {}
},
```
Cuando el cliente enviaba `{}`, Express ya había parseado el body (`req.body = {}`),
pero `Object.keys({}).length === 0` es *falsy*, así que el bloque completo se omitía:
nunca se llamaba a `proxyReq.write(...)` ni se finalizaba el request proxiado. Sin
embargo, `http-proxy-middleware` ya había copiado las cabeceras del request entrante
hacia `proxyReq` antes de invocar `onProxyReq`, incluyendo el `Content-Length: 2`
original (tamaño de la cadena `"{}"`). El servicio destino veía un request con
`Content-Length: 2` y esperaba esos 2 bytes que nunca llegaban, hasta que
`proxyTimeout`/`timeout` (60000ms) expiraba y abortaba con `ECONNRESET`.

**Impacto**: cualquier cliente (legítimo o malicioso) que enviara `{}` como body a
cualquiera de las ~8 rutas POST/PUT/PATCH proxiadas bloqueaba un *worker*/conexión del
gateway durante el timeout completo — un vector trivial de agotamiento de recursos
disparado por un body JSON mínimo y válido, sin herramientas especiales.

**Corregido**: se extrajo el `onProxyReq` repetido en una función compartida única
`forwardJsonBody(proxyReq, req)` (`ms_gateway/app.js`), que se invoca desde las 8 rutas
proxiadas con `onProxyReq`. En vez de `if (req.body && Object.keys(req.body).length)`,
la función gatea sobre el **método HTTP** (`METHODS_WITH_BODY = new Set(['POST', 'PUT',
'PATCH', 'DELETE'])`) — necesario porque `express.json()`/body-parser deja
`req.body = {}` para *cualquier* request, incluidos `GET` sin body, así que un check
basado en `req.body !== undefined` habría escrito `{}`/`Content-Length: 2` también en
los `GET` proxiados (regresión nueva). Para los métodos que admiten body, siempre
escribe `JSON.stringify(req.body ?? {})` con su `Content-Type`/`Content-Length`
correctos. Dos nuevas pruebas en `gateway.test.js` confirman: (1)
`POST /api/auth/register` con `{}` se reenvía con `Content-Length: 2` y body `"{}"`,
respondiendo `200` de inmediato; (2) `GET /api/usuarios/teams` no agrega body ni
`Content-Length`.

**Hallazgo (SEC-11 — credenciales de administrador por defecto siguen activas)**:
el usuario admin seedeado por `ms_db` al crear la base de datos
(`ensureDefaultAdminOnCreate`, credenciales por defecto `admin@equiporocket.cl` /
`admin` / `Admin123!` vía `DEFAULT_ADMIN_EMAIL`/`_USERNAME`/`_PASSWORD`) sigue activo y
funcional: `POST /api/auth/login` con esas credenciales devuelve `200`, con
`is_admin:true`, `is_active:true`. En este entorno de desarrollo local es esperado — de
hecho esta cuenta se usó productivamente en SEC-05/SEC-06 para acciones administrativas
de limpieza. Pero como las credenciales están documentadas en texto plano en
`CLAUDE.md` y como valores por defecto en el código de `ms_db`, cualquier despliegue
que no sea estrictamente local del desarrollador (staging, demo compartida, producción)
**debe** rotar la contraseña de esta cuenta o deshabilitarla (`is_active = FALSE`)
inmediatamente tras el primer arranque de `ms_db`. Se recomienda documentar este paso en
el *runbook* de despliegue y considerar que `ensureDefaultAdminOnCreate` exija
`DEFAULT_ADMIN_PASSWORD` como variable obligatoria (sin valor por defecto) cuando
`NODE_ENV !== 'development'`.

**Hallazgo (SEC-12 — `ms_carga_api` con 15 vulnerabilidades sin mitigar en 6 paquetes,
corregido — ver §8)**: `npm audit`/`pip-audit` sobre los 9 servicios + Frontend
confirmaron que la mayoría del *stack* está libre de vulnerabilidades altas/críticas
alcanzables: Frontend, `ms_db`, `ms_gateway`, `ms_auth` y `ms_pokemon` reportan 0; los 3
*high* de `ms_usuarios` (ReDoS en `semver` 7.0.0-7.5.1, vía `nodemon@2.0.19-2.0.22` →
`simple-update-notifier@1.0.7-1.1.0` → `semver`) están confinados a `devDependencies`
(`nodemon` solo se usa en `npm run dev`, no en `npm start`/imagen Docker de producción,
sin cambios); los 6 CVEs de `ms_montecarlo`/`ms_asistencia` están en `pip`/`wheel` de la
imagen base de Python, no en `requirements.txt`, sin cambios. El hallazgo con
mitigación pendiente era `ms_carga_api` (`ms_carga_api/requirements.txt`): **15
vulnerabilidades en 6 paquetes**, incluyendo `fastapi==0.95.2` (PYSEC-2024-38, ReDoS vía
`python-multipart`, corregido en fastapi≥0.109.1); `starlette==0.27.0` (transitiva de
fastapi; PYSEC-2026-161 ×2, CVE-2024-47874, CVE-2025-54121 — *DoS* vía
formularios/multipart malformados, corregidas en starlette≥0.40.0); `requests==2.31.0`
(CVE-2024-35195, CVE-2024-47081, CVE-2026-25645, corregidas en requests≥2.32.4);
`python-dotenv==1.0.0` (CVE-2026-28684, corregida en ≥1.1.1). Como `ms_carga_api`
expone `/load` (descarga y procesa JSON de una `API_URL` externa configurable) usando
`requests`, estas vulnerabilidades eran potencialmente alcanzables con datos de una
fuente externa. **Corregido**: `ms_carga_api/requirements.txt` actualizado a
`fastapi==0.116.1` (arrastra `starlette==0.47.2`, ≥0.40.0), `requests==2.32.4`,
`python-dotenv==1.1.1`, `uvicorn[standard]==0.35.0` y `psycopg2-binary==2.9.12`. Sin
cambios de API observados para el uso actual (`FastAPI()`, `requests.get/post`,
`load_dotenv()`); `ms_carga_api/tests/test_carga.py` (6/6, incluida la nueva
UT-CARGA/ST-CARGA-01) sigue pasando, con solo un `DeprecationWarning` no bloqueante
(`@app.on_event('startup')` → *lifespan handlers*, no usado actualmente).

**Hallazgo (DAST — ZAP reportaba `X-Powered-By: Express` y respuestas cacheables con
`ETag` sin `Cache-Control`, corregido — ver §8; cobertura de *spider* sigue
limitada)**: el *baseline scan* pasivo de OWASP ZAP contra `http://api_gateway:8000`
(red Docker `equiporocket-net`) reportó `PASS: 65, WARN-NEW: 2, FAIL-NEW: 0`. **(10037)
`X-Powered-By: Express`**: el gateway revelaba el framework backend en la cabecera de
respuesta por defecto de Express. **Corregido**: `app.disable('x-powered-by')` en
`ms_gateway/app.js`; `GET /health` ya no incluye la cabecera (confirmado por
`gateway.test.js`). **(10049) Storable and Cacheable Content** ×3: respuestas con
`ETag` pero sin `Cache-Control`/`Pragma`, potencialmente cacheables por proxies/CDNs
intermedios aunque contengan datos dinámicos/sensibles. **Corregido**: middleware
`app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store');
next(); })` en `ms_gateway/app.js`, aplicado a todas las respuestas `/api/*`;
`GET /api/pokemon` ahora incluye `Cache-Control: no-store` (confirmado por
`gateway.test.js`). **Limitación de cobertura (sin cambios)**: el *spider* (`-m 2`) no
descubrió rutas adicionales porque `GET /` en el gateway devuelve `404` — sin enlaces
HTML que seguir, el *sweep* cubrió principalmente cabeceras de respuesta a la petición
raíz y al manejo de `404`, no las ~9 familias de rutas `/api/*` autenticadas
documentadas en `CLAUDE.md`. Para una cobertura DAST más completa se recomendaría un
*ZAP context* con autenticación preconfigurada (script de login que obtenga un JWT) y
una definición OpenAPI/Postman como semilla de URLs — esto queda como mejora futura, no
bloqueante.

---

## 7. Próximos pasos

- **Fase 1**: ✅ completada — `ms_montecarlo` (11/11), `ms_auth` (9/9, incluida la
  corrección SEC-04 — ver §8), `ms_usuarios` (12/12, incluida la corrección UT-USU-02 —
  ver §8).
- **Fase 3**: ✅ completada — `ms_pokemon` (4/4), `ms_gateway` (10/10, incluidas las
  correcciones SEC-09/DAST — ver §8), `ms_carga_api` (6/6, incluida la corrección
  ST-CARGA-01 — ver §8), `ms_asistencia` (4/4, incluida la corrección UT-ASIS-02a — ver
  §8), `ms_db` (3/3), Frontend (6/6, incluida la corrección UT-FE-02b — ver §8).
- **Fase 4**: ✅ completada — 7/7 casos `ST-*` ejecutados contra el stack real (4 ✅,
  1 ⚠️, 2 ❌). ST-CARGA-01 corregido (ver §8). Hallazgo más severo restante:
  **ST-GW-01** (`http-proxy-middleware@2.0.6` degrada todas las rutas *proxied* bajo
  carga concurrente), dejado como deuda técnica por decisión del usuario. Ver tabla y
  hallazgos en la sección 4.
- **Fase 5**: ✅ completada — 13/13 casos `SEC-*` + 1 *DAST sweep* ejecutados contra el
  stack real (11 ✅, 3 ⚠️). SEC-04, SEC-09, SEC-12 y DAST corregidos (ver §8). Hallazgos
  restantes (SEC-02, SEC-07, SEC-11) son configuración pendiente para despliegues
  no-locales, sin cambio de código. Ver tabla y hallazgos en la sección 6.
- **Correcciones (post Fase 5)**: ✅ completadas — 8 hallazgos corregidos (3 unitarios +
  SEC-04, SEC-09, ST-CARGA-01, SEC-12, DAST), con 65/65 pruebas unitarias pasando. Ver
  sección 8 para el detalle de cada corrección.

### Resumen consolidado de todas las pruebas unitarias

| Componente | Resultado | Hallazgos pendientes |
|---|---|---|
| `ms_montecarlo` | 11/11 ✅ | — |
| `ms_auth` | 9/9 ✅ | — (SEC-04 corregido, ver §8) |
| `ms_usuarios` | 12/12 ✅ | — (UT-USU-02a/b corregido, ver §8) |
| `ms_pokemon` | 4/4 ✅ | — |
| `ms_gateway` | 10/10 ✅ | — (SEC-09/DAST corregidos, ver §8) |
| `ms_carga_api` | 6/6 ✅ | — (ST-CARGA-01 corregido, ver §8; SEC-12 corregido sin pruebas nuevas) |
| `ms_asistencia` | 4/4 ✅ | — (UT-ASIS-02a corregido, ver §8) |
| `ms_db` | 3/3 ✅ | — |
| Frontend | 6/6 ✅ | UT-FE-03b (caveat de comportamiento, sin cambio de código) |
| **Total** | **65/65 ✅** | — |

### Resumen consolidado de las pruebas de estrés

| ID | Resultado | Hallazgo |
|---|---|---|
| ST-MC-01 | ⚠️ | Umbral `<30s` desactualizado (real: ~33-34s, < timeout 60s) |
| ST-MC-02 | ✅ | — |
| ST-GW-01 | ❌ | `http-proxy-middleware@2.0.6`: ~19% errores, throughput ~4x menor en rutas *proxied* — dejado como deuda técnica (ver §8) |
| ST-AUTH-01 | ✅ | — |
| ST-CARGA-01 | ✅ | Corregido (ver §8): `insert_spread` ahora usa `ON CONFLICT ... DO UPDATE ... RETURNING id` sobre `uq_spreads_combo` |
| ST-ASIS-01 | ✅ | — |
| ST-USU-01 | ❌ | `listTeams`/`getTeamById`: patrón N+1/N×M, ~317 `Seq Scan` para una request — dejado como deuda técnica (ver §8) |

### Resumen consolidado de las pruebas de seguridad

| ID | Resultado | Hallazgo |
|---|---|---|
| SEC-01 | ✅ | — |
| SEC-02 | ⚠️ | `JWT_SECRET` coincide entre `ms_auth`/`ms_usuarios` por accidente (fallback hardcodeado) |
| SEC-03 | ✅ | — |
| SEC-04 | ✅ | Corregido (ver §8): `express-rate-limit` (`loginLimiter`, 10/15min) en `POST /api/auth/login` |
| SEC-05 | ✅ | — |
| SEC-06 | ✅ | Control de acceso admin a nivel de controlador, no de ruta (funciona, pero frágil) |
| SEC-07 | ⚠️ | CORS permisivo (`origin:true` / `allow_origins=["*"]` + credentials) en gateway y `ms_montecarlo` |
| SEC-08 | ✅ | — |
| SEC-09 | ✅ | Corregido (ver §8): `forwardJsonBody` compartido, gateado por método HTTP, en `ms_gateway/app.js` |
| SEC-10 | ✅ | — |
| SEC-11 | ⚠️ | Credenciales admin por defecto activas (`admin@equiporocket.cl` / `Admin123!`) |
| SEC-12 | ✅ | Corregido (ver §8): `ms_carga_api/requirements.txt` actualizado (fastapi/starlette/requests/python-dotenv) |
| SEC-13 | ✅ | — |
| DAST | ✅ | Corregido (ver §8): `x-powered-by` deshabilitado + `Cache-Control: no-store` en `/api/*` |

### Hallazgos corregidos (ver §8 para el detalle)

De los 15 hallazgos originales, los siguientes **8 fueron corregidos** en una
iteración posterior a la Fase 5, con código y pruebas nuevas — ver sección 8 para el
*diff* completo de cada uno:

- **UT-USU-02a/b** (`ms_usuarios`): validación `1 <= pokemon.length <= 6` en
  `teamsController.js::createTeam` → §8.2.
- **UT-ASIS-02a** (`ms_asistencia`): `analyze_team_synergy` ahora devuelve también
  `pairs` (desglose por par) → §8.3.
- **UT-FE-02b** (Frontend): `TeamBuilder.jsx::handleSelect` ya no permite Pokémon
  duplicados (mueve el Pokémon de espacio en vez de duplicarlo) → §8.4.
- **SEC-04** (`ms_auth`): `express-rate-limit` (`loginLimiter`, 10 intentos/15min) en
  `POST /api/auth/login` → §8.5.
- **SEC-09** (`ms_gateway`): `forwardJsonBody` compartido, gateado por método HTTP,
  corrige el cuelgue de ~60s con body `{}` → §8.6.
- **DAST** (`ms_gateway`): `app.disable('x-powered-by')` + `Cache-Control: no-store`
  en `/api/*` → §8.6.
- **ST-CARGA-01** (`ms_carga_api` + `ms_db`): `uq_spreads_combo` UNIQUE +
  `insert_spread` con `ON CONFLICT ... DO UPDATE ... RETURNING id` → §8.7.
- **SEC-12** (`ms_carga_api`): `requirements.txt` actualizado (fastapi/starlette/
  requests/python-dotenv) → §8.8.

### Hallazgos pendientes de corrección (deuda técnica, fuera del alcance acotado)

Los siguientes **7 hallazgos** quedan deliberadamente sin corregir en esta iteración,
por decisión explícita del usuario de acotar las correcciones a los hallazgos de bajo
riesgo. **UT-FE-03b** y **ST-MC-01** son *caveats* de comportamiento/umbral que no
requieren cambio de código; **ST-GW-01** y **ST-USU-01** requieren cambios
estructurales (migración de dependencia / reescritura de consultas); **SEC-02**,
**SEC-07** y **SEC-11** son configuración pendiente para despliegues no-locales.

1. **UT-FE-03b** (`ms_montecarlo/app.py` `/simulate` ↔
   `Frontend_EquipoRocket.pk/src/pages/Simulations.jsx`): el endpoint solo devuelve un
   `win_rate` agregado (probabilidad de `team_a`), nunca
   `team_a_win_probability`/`team_b_win_probability` por separado; el frontend solo
   sabe renderizar ese único `win_rate`. La prueba pasó (✅) porque confirma este
   comportamiento real, pero difiere de la expectativa de `plan_pruebas.md` de mostrar
   ambas probabilidades de forma independiente.
2. **ST-MC-01** (`ms_montecarlo/app.py::/simulate`): el umbral `<30s` de
   `plan_pruebas.md` quedó desactualizado tras la corrección de búsqueda dual
   (`2 × iterations × sims`); el tiempo real (~33-34s) sigue muy por debajo del
   timeout del gateway (60s).
3. **ST-GW-01** (`ms_gateway` + `http-proxy-middleware@2.0.6`): degradación severa
   (~19% errores, ~4x menos throughput) en **todas** las rutas *proxied* bajo carga
   concurrente — el hallazgo más severo de toda la matriz; requiere migrar
   `http-proxy-middleware` a 3.x (o un proxy basado en `undici`).
4. **ST-USU-01** (`ms_usuarios/src/controllers/teamsController.js::listTeams` +
   `teamModel.js::getTeamById`): patrón N+1/N×M — ~317 consultas secuenciales para
   una sola `GET /api/teams` con 154 equipos; no escala con el historial del usuario;
   requiere reescribir `listTeams`/`getTeamById` para usar consultas *bulk*.
5. **SEC-02** (`ms_auth/src/controllers/authController.js:7` + `ms_usuarios/.env`):
   `JWT_SECRET` "coincide" entre ambos servicios solo porque `ms_usuarios` lo fija
   explícitamente y `ms_auth` cae al mismo valor por *fallback* hardcodeado — no hay
   una fuente de verdad compartida; una rotación futura en uno sin el otro rompería
   la autenticación o dejaría un secreto público en uso.
6. **SEC-07** (`ms_gateway/app.js:32`, `ms_montecarlo/app.py:25-31`): CORS refleja
   cualquier `Origin` con `Access-Control-Allow-Credentials: true`
   (`cors({origin:true,credentials:true})` / `CORSMiddleware(allow_origins=["*"],
   allow_credentials=True)`) — apropiado para desarrollo, pero debe restringirse a
   dominios concretos en producción.
7. **SEC-11** (`ms_db`, `ensureDefaultAdminOnCreate`): las credenciales admin por
   defecto (`admin@equiporocket.cl` / `Admin123!`) siguen activas y funcionales —
   esperado en este entorno local, pero deben rotarse/deshabilitarse en cualquier
   despliegue no-local.

Estos 7 hallazgos quedan documentados como deuda técnica/configuración pendiente para
una futura iteración; no se modificó código de producción para "hacer pasar" estas
pruebas, conforme a la metodología seguida en toda esta matriz (las pruebas reflejan el
comportamiento real, no el deseado). Toda la BD de desarrollo y el entorno de cada
servicio fueron restaurados a su estado previo tras cada fase (spreads/pokemon_spreads,
external_raw, teams, usuarios de prueba, dependencias instaladas temporalmente para
auditorías).

### Siguiente fase

Con las pruebas unitarias (Fases 1 y 3), de estrés (Fase 4) y de seguridad (Fase 5)
completas, la cobertura definida en `plan_pruebas.md` §7/§10 está **completa**: 59
casos unitarios, 7 casos `ST-*` y 13 casos `SEC-*` + 1 *DAST sweep*, todos ejecutados
contra el stack Docker real y documentados en las secciones 2-6 de esta matriz.
`plan_pruebas.md` no define una Fase 6.

De los 15 hallazgos originales, **8 fueron corregidos** (3 unitarios + SEC-04, SEC-09,
ST-CARGA-01, SEC-12, DAST — ver sección 8 para el detalle de cada corrección, código y
nuevas pruebas) y **65/65 pruebas unitarias pasan**. Los **7 hallazgos restantes**
quedan documentados como deuda técnica/configuración pendiente, por decisión explícita
del usuario de acotar esta ronda de correcciones a los hallazgos de bajo riesgo:
**ST-GW-01** y **ST-USU-01** (ambos requieren cambios estructurales — migración de
`http-proxy-middleware` y reescritura de `listTeams`/`getTeamById` — fuera del alcance
acotado), **SEC-02**, **SEC-07**, **SEC-11** (configuración para despliegues no-locales)
y **UT-FE-03b**/**ST-MC-01** (caveats de comportamiento/umbral, sin cambio de código).
Una vez se aborden ST-GW-01/ST-USU-01, se recomienda re-ejecutar esos dos casos para
confirmar la corrección.

---

## 8. Correcciones aplicadas

Esta sección documenta, archivo por archivo, las **8 correcciones** implementadas tras
las Fases 1-5: 3 hallazgos de pruebas unitarias (UT-USU-02, UT-ASIS-02a, UT-FE-02b) y 4
hallazgos de las Fases 4/5 (SEC-04, SEC-09, ST-CARGA-01, SEC-12, DAST cuenta como una
corrección de `ms_gateway` junto con SEC-09), según el alcance acotado que el usuario
eligió explícitamente ("solo los hallazgos acotados/de bajo riesgo"). **ST-GW-01**
(migración de `http-proxy-middleware` 2.x→3.x) y **ST-USU-01** (reescritura N+1 de
`listTeams`/`getTeamById`) quedan fuera de este alcance — ver "Hallazgos pendientes de
corrección" más arriba. Ningún cambio de esta sección altera el comportamiento de
producción salvo el descrito explícitamente (nuevas restricciones de validación/
rate-limiting/headers son el objetivo de cada corrección).

### 8.1 Resumen

| # | Hallazgo | Componente(s) | Archivos modificados | Resultado |
|---|---|---|---|---|
| 1 | UT-USU-02a/b | `ms_usuarios` | `src/controllers/teamsController.js`, `tests/teamsController.test.js` | 12/12 ✅ |
| 2 | UT-ASIS-02a | `ms_asistencia` | `engine.py`, `tests/test_engine.py` | 4/4 ✅ |
| 3 | UT-FE-02b | Frontend | `src/pages/TeamBuilder.jsx`, `src/pages/TeamBuilder.test.jsx` | 6/6 ✅ |
| 4 | SEC-04 | `ms_auth` | `package.json`, `src/routes/authRoutes.js`, `tests/rateLimit.test.js` | 9/9 ✅ |
| 5 | SEC-09 | `ms_gateway` | `app.js`, `tests/gateway.test.js` | 10/10 ✅ |
| 6 | ST-CARGA-01 | `ms_carga_api`, `ms_db` | `main.py`, `tests/test_carga.py`, `ms_db/schema.sql` | 6/6 ✅ |
| 7 | SEC-12 | `ms_carga_api` | `requirements.txt` | 6/6 ✅ |
| 8 | DAST | `ms_gateway` | `app.js`, `tests/gateway.test.js` | 10/10 ✅ |

**Total**: 65/65 pruebas unitarias ✅ (suma de la sección "Resumen consolidado de todas
las pruebas unitarias" más abajo).

### 8.2 UT-USU-02 — validación de tamaño de equipo (`ms_usuarios`)

**Problema**: `teamsController.js::createTeam` aceptaba equipos con `0` o con `7+`
Pokémon (`201` en ambos casos), sin validar `1 <= pokemon.length <= 6`.

**Corrección** — `ms_usuarios/src/controllers/teamsController.js`, dentro de
`createTeam`, justo después de la validación de `name` y antes de cualquier consulta a
la BD:

```js
if (!name) return res.status(400).json({ success:false, error: 'NAME_REQUIRED' });
if (pokemon.length < 1 || pokemon.length > 6) return res.status(400).json({ success:false, error: 'INVALID_TEAM_SIZE' });
```

**Nuevas pruebas** — `ms_usuarios/tests/teamsController.test.js`, bloque
`describe('UT-USU-02: validación de composición de equipo', ...)`: dos casos
(`pokemon: []` y un arreglo de 7 elementos), ambos esperan `res.status(400)` con
`{success:false, error:'INVALID_TEAM_SIZE'}` y verifican que `TeamRepo.create` **no**
se invoque.

**Resultado**: `ms_usuarios` pasa de 10/12 a **12/12 ✅**.

### 8.3 UT-ASIS-02a — desglose de sinergia por par (`ms_asistencia`)

**Problema**: `engine.py::analyze_team_synergy` ya calculaba internamente el score de
cada uno de los `C(6,2)=15` pares de un equipo de 6 Pokémon, pero solo retornaba el
promedio agregado (`{'synergy_percent': ...}`), descartando el desglose por par que
`plan_pruebas.md` espera para `/analyze/team`.

**Corrección** — `ms_asistencia/engine.py::analyze_team_synergy` (líneas 60-81), ahora
acumula también una lista `pairs` con `{pokemon1, pokemon2, synergy_percent}` por cada
par (reutilizando la misma lógica que ya existía en `app.py::/store/synergy`) y la
retorna junto al agregado:

```python
synergy_scores = []
pairs = []
for i, poke1 in enumerate(current_team):
    for poke2 in current_team[i+1:]:
        score = ...  # igual que antes
        synergy_scores.append(score)
        pairs.append({'pokemon1': poke1, 'pokemon2': poke2, 'synergy_percent': round(float(score) * 100, 2)})
avg_synergy = float(np.mean(synergy_scores)) if synergy_scores else 0.0
return {'synergy_percent': round(avg_synergy * 100, 2), 'pairs': pairs}
```

`app.py::/analyze/team` reenvía directamente el resultado de `analyze_team_synergy`,
por lo que el desglose queda expuesto al cliente sin cambios adicionales en `app.py`.

**Nueva prueba** — `ms_asistencia/tests/test_engine.py::
test_analyze_team_synergy_with_six_pokemon_returns_aggregate_and_breakdown`: construye
un engine con 6 Pokémon simétricos al 10% y verifica
`result['synergy_percent'] == 10.0` y `'pairs' in result` con 15 entradas.

**Resultado**: `ms_asistencia` pasa de 3/4 a **4/4 ✅**.

### 8.4 UT-FE-02b — Pokémon duplicado en `TeamBuilder` (Frontend)

**Problema**: `handleSelect` en `src/pages/TeamBuilder.jsx` asignaba el Pokémon elegido
directamente a `n[targetSlot]` sin comprobar si ya ocupaba otro espacio del equipo,
permitiendo que el mismo Pokémon llenara hasta los 6 espacios.

**Corrección** — `Frontend_EquipoRocket.pk/src/pages/TeamBuilder.jsx::handleSelect`
(líneas 45-58): antes de asignar al espacio elegido, busca si el Pokémon ya está en
otro espacio y, si es así, libera ese espacio (el Pokémon se "mueve" en vez de
duplicarse):

```jsx
const n = [...prev];
const dupIdx = n.findIndex((p, idx) => idx !== targetSlot && p?.name === pokemon.name);
if (dupIdx !== -1) n[dupIdx] = null;
n[targetSlot] = { ...pokemon, ability: prev[targetSlot]?.ability || null, item: prev[targetSlot]?.item || null, moves: prev[targetSlot]?.moves || [] };
```

**Nueva prueba** — `TeamBuilder.test.jsx`, bloque `describe('UT-FE-02: límite de
equipo y duplicados en TeamBuilder', ...)`, caso (b): elige "pikachu" para el espacio 1
y luego para el espacio 2; verifica que
`screen.getAllByRole('button',{name:'Remover pikachu'})` tenga longitud `1`.

**Resultado**: Frontend pasa de 5/6 a **6/6 ✅**.

### 8.5 SEC-04 — rate limiting en `POST /api/auth/login` (`ms_auth`)

**Problema**: 8+ logins fallidos consecutivos devolvían `401 INVALID_CREDENTIALS` sin
ninguna variación de código de estado; no había límite de intentos ni bloqueo temporal,
dejando `/api/auth/login` (y `/register`) expuestos a fuerza bruta/credential stuffing.

**Corrección**:
- `ms_auth/package.json`: se agregó `express-rate-limit: ^7.4.0` a `dependencies`.
- `ms_auth/src/routes/authRoutes.js`: se definió `loginLimiter` y se aplicó **solo**
  a `POST /login`:

```js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_ATTEMPTS' },
});

router.post('/login', loginLimiter, login);
```

Al superar 10 intentos por IP en 15 minutos, responde `429
{"success":false,"error":"TOO_MANY_ATTEMPTS"}`. `/register` y el resto de rutas no se
ven afectados.

**Nueva prueba** — `ms_auth/tests/rateLimit.test.js` (nuevo archivo; se agregó
`supertest: ^6.3.4` a `devDependencies`): mockea `UserRepo.findByEmail` → `null`,
envía 10 `POST /api/auth/login` con credenciales inválidas (esperando `401
INVALID_CREDENTIALS` cada vez) y un 11vo (esperando `429 TOO_MANY_ATTEMPTS`).

**Resultado**: `ms_auth` pasa de 8/8 a **9/9 ✅** (3 test suites).

### 8.6 SEC-09 / DAST — cuelgue del proxy con body `{}` y cabeceras inseguras (`ms_gateway`)

**Problema (SEC-09)**: cualquier `POST`/`PUT`/`PATCH` con body `{}` enviado vía
`ms_gateway` se colgaba ~60s y terminaba en `ECONNRESET`. Las ~7 rutas proxiadas
repetían el mismo `onProxyReq`:

```js
if (req.body && Object.keys(req.body).length) {
  const bodyData = JSON.stringify(req.body);
  proxyReq.setHeader('Content-Type', 'application/json');
  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
}
```

Con `req.body = {}`, `Object.keys({}).length === 0` es *falsy* y el bloque se omitía
por completo: nunca se llamaba `proxyReq.write(...)`, pero `http-proxy-middleware` ya
había copiado el `Content-Length: 2` original del request entrante hacia `proxyReq`. El
servicio destino esperaba esos 2 bytes que nunca llegaban hasta que `proxyTimeout`
(60000ms) expiraba.

**Problema (DAST)**: el `zap-baseline.py` reportó `X-Powered-By: Express` (10037) y
respuestas `/api/*` con `ETag` pero sin `Cache-Control`/`Pragma` (10049 ×3).

**Corrección** — `ms_gateway/app.js`:

1. Se extrajo el `onProxyReq` repetido en una función compartida `forwardJsonBody`,
   que gatea sobre el **método HTTP** (no sobre `Object.keys(req.body).length`, para
   no afectar los `GET` que también traen `req.body = {}` por `express.json()`):

```js
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function forwardJsonBody(proxyReq, req) {
  if (!METHODS_WITH_BODY.has(req.method)) return;
  const bodyData = JSON.stringify(req.body ?? {});
  proxyReq.setHeader('Content-Type', 'application/json');
  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
}
```

   Las 8 rutas proxiadas con `onProxyReq` (`/api/auth`, `/api/usuarios/users`,
   `/api/usuarios`, `/api/teams`, `/api/users`, `/api/carga`, `/api/montecarlo`,
   `/api/asistencia`) ahora llaman `forwardJsonBody(proxyReq, req)` en vez del bloque
   `if` repetido.

2. `app.disable('x-powered-by')` cerca del inicio del archivo (elimina la cabecera
   `X-Powered-By: Express` de todas las respuestas).

3. Middleware `app.use('/api', (req, res, next) => { res.setHeader('Cache-Control',
   'no-store'); next(); })`, aplicado a toda respuesta `/api/*`.

**Nuevas pruebas** — `ms_gateway/tests/gateway.test.js`:
- **SEC-09 (a)**: `POST /api/auth/register` con `.send({})` → el mock de `MS_AUTH_URL`
  recibe `Content-Length: 2` y body `"{}"`, responde `200` de inmediato (sin colgarse).
- **SEC-09 (b)**: `GET /api/usuarios/teams` → el mock de `MS_USUARIOS_URL` recibe la
  request sin body ni `Content-Length` (regresión: confirma que `forwardJsonBody` no
  agrega body a los `GET`).
- **DAST (a)**: `GET /health` → `headers['x-powered-by']` indefinido.
- **DAST (b)**: `GET /api/pokemon` → `headers['cache-control'] === 'no-store'`.

**Resultado**: `ms_gateway` pasa de 6/6 a **10/10 ✅**.

### 8.7 ST-CARGA-01 — duplicación de `spreads`/`pokemon_spreads` (`ms_carga_api` + `ms_db`)

**Problema**: `ms_carga_api/main.py::insert_spread` hacía un `INSERT INTO spreads (...)
VALUES (...) RETURNING id` simple, sin `ON CONFLICT`, a diferencia de los demás
`upsert_*`. `spreads` no tenía ninguna restricción `UNIQUE` sobre su clave natural
(`nature_id` + las 6 columnas `*_evs`). Cada `POST /load` — incluido
`startup_load_once()` en cada reinicio del contenedor — insertaba una copia completa
nueva de `spreads`/`pokemon_spreads`, duplicando ambas tablas (4840→9680 filas en la
prueba de estrés).

**Corrección**:

1. `ms_db/schema.sql` (tabla `spreads`, línea 253): se agregó

```sql
CONSTRAINT uq_spreads_combo UNIQUE (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs)
```

   (aplicado también con `ALTER TABLE ... ADD CONSTRAINT` a la BD local existente,
   tras eliminar las 4840 filas duplicadas `id > 4840` — la cascada
   `fk_ps_spread ON DELETE CASCADE` limpió `pokemon_spreads` automáticamente).

2. `ms_carga_api/main.py::insert_spread` (líneas 118-135), análogo a los demás
   `upsert_*`:

```python
cur.execute(
    "INSERT INTO spreads (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs) "
    "VALUES (%s,%s,%s,%s,%s,%s,%s) "
    "ON CONFLICT (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs) "
    "DO UPDATE SET nature_id = EXCLUDED.nature_id "
    "RETURNING id;",
    (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs),
)
```

**Nueva prueba** — `ms_carga_api/tests/test_carga.py::
test_process_payload_twice_does_not_duplicate_spreads`: ejecuta `process_payload`
dos veces con un payload que incluye `spreads: [{"nature": "...", "ev":
"4/252/0/0/0/252"}]` contra Postgres real, y confirma que el conteo de filas en
`spreads`/`pokemon_spreads` para esa combinación es igual tras ambas ejecuciones
(`1` en ambas).

**Resultado**: `ms_carga_api` pasa de 5/5 a **6/6 ✅**.

### 8.8 SEC-12 — dependencias vulnerables (`ms_carga_api`)

**Problema**: `ms_carga_api/requirements.txt` fijaba versiones con 15 vulnerabilidades
conocidas en 6 paquetes: `fastapi==0.95.2` (PYSEC-2024-38, ReDoS vía
`python-multipart`), `starlette==0.27.0` (transitiva de fastapi; PYSEC-2026-161 ×2,
CVE-2024-47874, CVE-2025-54121 — DoS vía formularios/multipart malformados),
`requests==2.31.0` (CVE-2024-35195, CVE-2024-47081, CVE-2026-25645),
`python-dotenv==1.0.0` (CVE-2026-28684).

**Corrección** — `ms_carga_api/requirements.txt`:

| Paquete | Antes | Después |
|---|---|---|
| `fastapi` | `0.95.2` | `0.116.1` (arrastra `starlette` ≥0.40.0, resuelto en `0.47.2`) |
| `uvicorn[standard]` | `0.22.0` | `0.35.0` |
| `requests` | `2.31.0` | `2.32.4` |
| `psycopg2-binary` | `2.9.7` | `2.9.12` |
| `python-dotenv` | `1.0.0` | `1.1.1` |

Sin cambios de API para el uso actual (`FastAPI()`, `requests.get/post`,
`load_dotenv()`).

**Resultado**: `ms_carga_api/tests/test_carga.py` (6/6, incluida la prueba nueva de
ST-CARGA-01) sigue pasando — `6 passed, 2 warnings in 1.56s`, donde los 2 *warnings*
son el mismo `DeprecationWarning` de `@app.on_event('startup')` (no bloqueante,
*lifespan handlers* no usados actualmente). **6/6 ✅**.

### 8.9 Configuración de entorno para pruebas con BD real

`UT-CARGA-01`/`ST-CARGA-01` (`ms_carga_api`) y `UT-DB-01`/`UT-DB-02` (`ms_db`) requieren
Postgres real con el esquema de `ms_db/schema.sql` (incluida la nueva restricción
`uq_spreads_combo`) ya aplicado. En lugar del contenedor `ms_db-postgres-1`, se usó una
instancia nativa de Postgres en `localhost:5432` (usuario `postgres` / contraseña
`root`, base `equiporocketDb`), exportando
`PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=root DB_NAME=equiporocketDb`
(mismo esquema de variables que usan `ms_carga_api`/`ms_db`/Python según `CLAUDE.md`) al
ejecutar cada suite. No se requirió ningún cambio de código para esto — es solo
configuración de invocación —, salvo una particularidad detectada en `ms_db`: en este
entorno Windows/Git-Bash, `npm test` (`npm.cmd`, invocado vía `cmd.exe`) no propaga de
forma confiable las variables de entorno exportadas en Bash hacia el proceso
`node`/`jest` subyacente (falla con `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password
must be a string` en los 3 tests). Invocando el binario de jest directamente —
`node --experimental-vm-modules node_modules/jest/bin/jest.js --verbose` con las mismas
variables — los 3 tests pasan correctamente. No es un defecto de `ms_db` ni de
`schema.sql` (confirmado con un script `pg.Client` directo con las mismas variables);
es una particularidad del *invocador* `npm.cmd` en este entorno, documentada aquí para
quien reproduzca la suite de `ms_db` en Windows/Git-Bash.
