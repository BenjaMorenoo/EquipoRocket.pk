## Plan: Plan de Pruebas para EquipoRocket.pk

TL;DR - Crear una batería de pruebas (unitarias, integración, e2e, seguridad y rendimiento) que cubra frontend, microservicios y sincronización con la DB/externos; priorizar auth, CRUD de equipos y motor de simulación; documentar comandos y criterios de aceptación.

**Steps**
1. Preparar entorno de pruebas (*depends on step 7*): configurar DB de prueba (Postgres), variables de entorno, y un archivo `.env.test`; crear fixtures y datos seed mínimos.
2. Añadir herramientas de test y lint (*parallel with step 1*): Node (Jest, Supertest, ESLint), Python (Pytest, requests-mock), E2E (Playwright or Cypress), Security (OWASP ZAP or simple pen tests), Performance (locust or k6).
3. Escribir pruebas unitarias por servicio (prioridad alta: `ms_auth`, `ms_usuarios`, `ms_montecarlo`).
4. Escribir pruebas de integración entre services (auth→teams, carga_api→montecarlo, frontend→backend auth flow).
5. Implementar E2E representativos (registro→login→crear equipo→simular→guardar; admin→dashboard analytics).
6. Añadir pruebas de seguridad automatizadas y checks manuales (CORS, JWT, inyección SQL, XSS, rate limiting).
7. Crear pipeline local/CI básico (GitHub Actions) que ejecute linter, unit tests, integration smoke, y security scan en PRs.
8. Validación y métricas: monitorizar tiempos de simulación y errores; definir SLAs para funciones críticas.
9. Documentar cómo ejecutar pruebas y criterios de aceptación en `README-TESTS.md`.

**Relevant files**
- Frontend entry: [Frontend_EquipoRocket.pk/src/main.jsx](Frontend_EquipoRocket.pk/src/main.jsx#L1)
- Frontend app: [Frontend_EquipoRocket.pk/src/App.jsx](Frontend_EquipoRocket.pk/src/App.jsx#L1)
- Auth context: [Frontend_EquipoRocket.pk/src/context/AuthContext.jsx](Frontend_EquipoRocket.pk/src/context/AuthContext.jsx#L1)
- ms_auth: [ms_auth/server.js](ms_auth/server.js#L1), [ms_auth/src/controllers/authController.js](ms_auth/src/controllers/authController.js#L1)
- ms_usuarios: [ms_usuarios/server.js](ms_usuarios/server.js#L1), [ms_usuarios/src/controllers/teamsController.js](ms_usuarios/src/controllers/teamsController.js#L1)
- ms_montecarlo: [ms_montecarlo/app.py](ms_montecarlo/app.py#L1), [ms_montecarlo/montecarlo.py](ms_montecarlo/montecarlo.py#L1)
- ms_carga_api: [ms_carga_api/main.py](ms_carga_api/main.py#L1)
- DB schema: [ms_db/schema.sql](ms_db/schema.sql#L1)
- Docker compose: [docker-compose.yml](docker-compose.yml#L1) and service compose files

**Tabla de acciones (Funcionalidad → Acción de prueba → Tipo → Resultado esperado)**

| Funcionalidad | Acción de prueba | Tipo | Resultado esperado |
|---|---:|---|---|
| Registro de usuario | Enviar `POST /api/auth/register` con datos válidos | Unit/Integration | 201 Created, usuario en DB (hash de password), no exponer contraseña |
| Registro duplicado | `POST /api/auth/register` con email ya usado | Unit/Integration | 400 / 409 con mensaje claro |
| Login | `POST /api/auth/login` credenciales válidas | Unit/Integration | 200 OK con `accessToken` JWT válido y expiración |
| Login inválido | `POST /api/auth/login` credenciales inválidas | Unit | 401 Unauthorized, no token |
| Crear equipo | `POST /api/teams` con JWT válido | Integration | 201 Created, owner = userId del token, datos válidos en DB |
| Crear equipo sin auth | `POST /api/teams` sin token | Integration | 401 Unauthorized |
| Obtener equipos | `GET /api/teams` filtrado por owner | Integration | 200 OK, lista sólo de owner |
| Simulación | `POST /simulate` con equipo válido | Integration/Performance | 200 OK, payload con win rates; tiempo < SLA (ej. 5s para 100 runs) |
| Recomendación AI | `POST /recommend/teammate` | Integration | 200 OK, sugerencia coherente (validez de tipos) |
| Data ingest externa | `POST /load` ms_carga_api | Integration | 200 OK, registros persistidos en `external_raw` y tablas relacionas |
| CORS | Petición desde origen no permitido | Security | 403 o bloqueo del browser CORS |
| SQL Injection | Envío de payload malicioso en `name` | Security | Input sanitizado o rechazado, DB no comprometida |
| JWT manipulado | Token con firma inválida | Security | 401 Unauthorized |
| Rate limit | 100 intentos login en 1 minuto | Security | 429 Too Many Requests |

**Verification**
1. Ejecutar suites locales: Frontend unit (Jest): `npm run test` en `Frontend_EquipoRocket.pk`.
2. Backends Node (Jest+Supertest): `npm run test` en `ms_auth`, `ms_usuarios`, `ms_pokemon`.
3. Backends Python (Pytest): `pytest -q` en `ms_montecarlo`, `ms_carga_api`, `ms_asistencia`.
4. E2E: `npx playwright test` o `npx cypress run` apuntando a un entorno de pruebas docker-compose (`docker-compose -f docker-compose.test.yml up --build`).
5. Security: ejecutar scan OWASP ZAP o scripts de comprobación para CORS/JWT/Rate limit.
6. CI: Añadir `/.github/workflows/ci.yml` con jobs: lint → unit tests → integration smoke → e2e (optional) → security scan.

**Decisions / Supuestos**
- Usamos una DB de prueba separada (Postgres) y datos seed limitados para rapidez.
- External APIs (PokeAPI) se mockean en tests e2e e integración para disponibilidad; pruebas de integración con el API real se ejecutan en un job separado.
- JWT_SECRET y credenciales se inyectan vía `.env.test` en CI; nunca se versionan.
- Prioridad inicial: `ms_auth`, `ms_usuarios`, `ms_montecarlo`, Frontend auth flow.

**Further Considerations**
1. Añadir fixtures y factories (Factory Boy para Python, factory-girl / test-data-bot para Node) para generar equipos y pokémon.
2. Crear `docker-compose.test.yml` que levante servicios mínimos y DB migrada para integración/E2E.
3. Definir métricas SLA (p.ej. simulación 100 runs < 5s) y alertas si se rompe el SLA.

Criterios de aceptación: todas las pruebas unitarias pasan, tests de integración críticos pasan en CI, pasos de seguridad básico (no secrets hardcoded, CORS restringido, JWT secreto no expuesto) verificados.
