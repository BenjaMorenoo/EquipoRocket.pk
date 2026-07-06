# EquipoRocket.pk — Levantamiento de Requerimientos e Historias de Usuario
### Metodología: Scrum

---

## 1. Información del Proyecto

| Campo | Detalle |
|---|---|
| **Nombre del producto** | EquipoRocket.pk |
| **Descripción** | Plataforma web para construir, analizar y simular equipos competitivos del videojuego Pokémon Champions |
| **Objetivo** | Proveer a jugadores competitivos herramientas de construcción manual y asistida por IA, simulación Monte Carlo y análisis de sinergia, respaldadas por datos reales de la meta competitiva |
| **Metodología** | Scrum |

---

## 2. Roles del Proyecto (Scrum Team)

| Rol | Responsabilidad |
|---|---|
| **Product Owner** | Define la visión del producto, prioriza el backlog y acepta los incrementos |
| **Scrum Master** | Facilita las ceremonias, elimina impedimentos y guarda el proceso |
| **Dev Team** | Diseño, desarrollo, pruebas y despliegue de cada incremento |

### Tipos de Usuarios (Actores del Sistema)

| Actor | Descripción |
|---|---|
| **Usuario anónimo** | Visitante sin cuenta registrada |
| **Usuario registrado** | Jugador con cuenta activa; puede construir y guardar equipos |
| **Administrador** | Usuario con rol admin; accede al panel de gestión y analítica |

---

## 3. Definition of Done (DoD)

Una historia de usuario se considera **terminada** cuando:

- [ ] El código fue revisado por al menos un compañero (code review)
- [ ] Los criterios de aceptación están cubiertos y verificados manualmente
- [ ] No hay errores de ESLint / flake8 sin justificación
- [ ] Los endpoints nuevos están documentados en el README del microservicio correspondiente
- [ ] La funcionalidad fue probada en el entorno Docker local completo
- [ ] No se introdujeron regresiones visibles en las rutas existentes

---

## 4. Épicas

| ID | Épica | Descripción |
|---|---|---|
| E1 | Autenticación y Perfil | Registro, login, gestión de cuenta y sesión |
| E2 | Pokédex y Colección | Exploración del catálogo Pokémon y colección personal |
| E3 | Constructor Manual de Equipos | Creación y edición de equipos de forma manual |
| E4 | Constructor Asistido por IA | Generación de equipos recomendados por el motor de sinergia |
| E5 | Simulación Monte Carlo | Simulación de combates para evaluar y optimizar equipos |
| E6 | Análisis de Sinergia | Recomendaciones de compañeros y análisis de compatibilidad |
| E7 | Panel de Administración | Gestión de usuarios, equipos y analítica avanzada |
| E8 | Carga de Datos Externos | Ingesta y normalización de datos de la meta competitiva (Pikalytics) |
| E9 | Infraestructura y Despliegue | Arquitectura de microservicios, Docker, gateway y CI |

---

## 5. Product Backlog — Historias de Usuario

> **Formato:** `Como [rol], quiero [acción], para [valor/beneficio].`
>
> **Puntos de historia:** escala Fibonacci (1 · 2 · 3 · 5 · 8 · 13 · 21)
>
> **Prioridad MoSCoW:** Must Have · Should Have · Could Have · Won't Have (esta versión)

---

### E1 — Autenticación y Perfil

---

#### HU-01 · Registro de usuario

**Como** usuario anónimo,
**quiero** crear una cuenta con nombre de usuario, correo, contraseña y región,
**para** acceder a todas las funcionalidades de la plataforma y guardar mi progreso.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 5 |
| **Épica** | E1 |

**Criterios de aceptación:**
- [ ] El formulario valida: nombre de usuario (3-50 chars, único), correo (formato válido, único), contraseña (mín. 8 chars, mayúscula, número y símbolo), región obligatoria.
- [ ] Si ya existe el correo o usuario, se muestra mensaje de error específico.
- [ ] Al registrarse exitosamente, se redirige al home con sesión iniciada.
- [ ] La contraseña se almacena como hash bcrypt (nunca en texto plano).

---

#### HU-02 · Inicio de sesión

**Como** usuario registrado,
**quiero** iniciar sesión con mi correo y contraseña,
**para** acceder a mis equipos y configuraciones guardadas.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 3 |
| **Épica** | E1 |

**Criterios de aceptación:**
- [ ] Credenciales incorrectas muestran mensaje genérico (no revela si el correo existe).
- [ ] Al iniciar sesión, se emite un JWT y se almacena en `localStorage` bajo la clave `pk_token`.
- [ ] Un usuario administrador es redirigido automáticamente al panel de administración.
- [ ] Un usuario común es redirigido al home.

---

#### HU-03 · Cierre de sesión

**Como** usuario registrado,
**quiero** cerrar mi sesión,
**para** proteger mi cuenta en dispositivos compartidos.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 1 |
| **Épica** | E1 |

**Criterios de aceptación:**
- [ ] El token JWT se elimina de `localStorage`.
- [ ] El usuario es redirigido a la página de inicio.
- [ ] Las rutas protegidas redirigen a `/auth` si no hay sesión activa.

---

#### HU-04 · Edición de perfil

**Como** usuario registrado,
**quiero** actualizar mi nombre de usuario, región, país y fecha de nacimiento,
**para** mantener mi información actualizada.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 3 |
| **Épica** | E1 |

**Criterios de aceptación:**
- [ ] El nuevo nombre de usuario no puede estar ya en uso por otro usuario.
- [ ] El cambio se refleja inmediatamente en la navbar sin necesidad de cerrar sesión.
- [ ] La contraseña no se puede cambiar desde este formulario (flujo separado).

---

#### HU-05 · Recuperación de contraseña

**Como** usuario registrado,
**quiero** recuperar el acceso a mi cuenta si olvido mi contraseña,
**para** no perder mis datos y equipos guardados.

| Campo | Valor |
|---|---|
| **Prioridad** | Could Have |
| **Puntos** | 8 |
| **Épica** | E1 |

**Criterios de aceptación:**
- [ ] Se envía un correo con enlace de restablecimiento de un solo uso.
- [ ] El enlace expira en 24 horas.
- [ ] La nueva contraseña cumple los mismos requisitos de seguridad que en el registro.

---

### E2 — Pokédex y Colección

---

#### HU-06 · Explorar Pokédex

**Como** usuario (registrado o anónimo),
**quiero** explorar el catálogo de Pokémon disponibles con sus estadísticas base, tipos y habilidades,
**para** investigar opciones antes de construir un equipo.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 5 |
| **Épica** | E2 |

**Criterios de aceptación:**
- [ ] Se muestran nombre, sprite oficial, tipos, estadísticas base (HP, Atk, Def, SpAtk, SpDef, Vel) y habilidades.
- [ ] Se puede buscar por nombre.
- [ ] La lista es paginada o usa carga virtual para no degradar el rendimiento con +800 entradas.

---

#### HU-07 · Agregar Pokémon a la colección personal

**Como** usuario registrado,
**quiero** marcar Pokémon como parte de mi colección,
**para** filtrar el constructor de equipos a solo los Pokémon que tengo disponibles.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 3 |
| **Épica** | E2 |

**Criterios de aceptación:**
- [ ] El botón de agregar solo aparece para usuarios con sesión.
- [ ] Un Pokémon ya en la colección muestra opción de eliminarlo.
- [ ] La colección es visible en la sección "Mis Pokémon".

---

#### HU-08 · Ver y gestionar mi colección

**Como** usuario registrado,
**quiero** ver todos los Pokémon de mi colección en un solo lugar y poder eliminarlos,
**para** mantener actualizada mi lista de disponibles.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 2 |
| **Épica** | E2 |

**Criterios de aceptación:**
- [ ] Se muestran sprites y nombres de todos los Pokémon de la colección.
- [ ] Se puede eliminar un Pokémon de la colección con confirmación.
- [ ] La eliminación no afecta a los equipos ya creados que usen ese Pokémon.

---

### E3 — Constructor Manual de Equipos

---

#### HU-09 · Crear un equipo manualmente

**Como** usuario registrado,
**quiero** construir un equipo de hasta 6 Pokémon eligiendo individualmente cada miembro,
**para** diseñar la composición que mejor se adapte a mi estrategia.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 13 |
| **Épica** | E3 |

**Criterios de aceptación:**
- [ ] Cada slot permite buscar y seleccionar un Pokémon del catálogo.
- [ ] Al seleccionar un Pokémon se muestra su sprite, tipos y estadísticas en el slot.
- [ ] Se puede asignar habilidad, objeto equipado y hasta 4 movimientos por Pokémon.
- [ ] El equipo puede guardarse con un nombre definido por el usuario.
- [ ] Un equipo incompleto (menos de 6 miembros) puede guardarse como borrador.

---

#### HU-10 · Editar un equipo existente

**Como** usuario registrado,
**quiero** modificar un equipo que ya guardé,
**para** ajustar mi estrategia sin tener que recrearlo desde cero.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 5 |
| **Épica** | E3 |

**Criterios de aceptación:**
- [ ] Al abrir un equipo guardado, todos sus Pokémon, habilidades, objetos y movimientos se cargan correctamente.
- [ ] Los cambios se guardan con la fecha de última modificación actualizada.
- [ ] No se crea un equipo duplicado al guardar la edición.

---

#### HU-11 · Eliminar un equipo

**Como** usuario registrado,
**quiero** eliminar un equipo que ya no necesito,
**para** mantener organizada mi lista de equipos.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 2 |
| **Épica** | E3 |

**Criterios de aceptación:**
- [ ] Se muestra un modal de confirmación antes de eliminar.
- [ ] El equipo eliminado desaparece de la lista inmediatamente.
- [ ] El borrado es lógico (soft-delete): los datos históricos se conservan en la base de datos para analítica.

---

#### HU-12 · Ver mis equipos guardados

**Como** usuario registrado,
**quiero** ver todos mis equipos en una lista,
**para** acceder rápidamente a cualquiera de ellos.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 3 |
| **Épica** | E3 |

**Criterios de aceptación:**
- [ ] Se muestran nombre del equipo, fecha de creación y los sprites de los 6 miembros.
- [ ] Se puede acceder a editar o simular desde la tarjeta del equipo.
- [ ] Los equipos se ordenan por fecha de modificación más reciente.

---

#### HU-13 · Asignar spread de EVs y naturaleza

**Como** usuario registrado,
**quiero** configurar el spread de EVs y la naturaleza de cada Pokémon de mi equipo,
**para** optimizar sus estadísticas según mi estrategia.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 5 |
| **Épica** | E3 |

**Criterios de aceptación:**
- [ ] Se puede seleccionar naturaleza de una lista predefinida.
- [ ] Los EVs se ingresan por estadística con validación de máximo 252 por stat y 510 total.
- [ ] El spread se guarda y se muestra al volver a editar el equipo.

---

#### HU-14 · Ver cobertura de tipos del equipo

**Como** usuario registrado,
**quiero** ver un gráfico de cobertura de tipos de mi equipo,
**para** identificar debilidades y fortalezas colectivas.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 5 |
| **Épica** | E3 |

**Criterios de aceptación:**
- [ ] El gráfico se actualiza en tiempo real al agregar o quitar Pokémon.
- [ ] Muestra cuántos Pokémon del equipo son débiles, resistentes o inmunes a cada tipo.
- [ ] Se diferencia visualmente entre tipos cubiertos y tipos con vulnerabilidad.

---

#### HU-15 · Dejar feedback de un equipo

**Como** usuario registrado,
**quiero** marcar si un equipo me dio resultados positivos o negativos en partidas reales,
**para** llevar un registro de su rendimiento.

| Campo | Valor |
|---|---|
| **Prioridad** | Could Have |
| **Puntos** | 3 |
| **Épica** | E3 |

**Criterios de aceptación:**
- [ ] Se puede registrar victorias y derrotas acumuladas por equipo.
- [ ] El contador se muestra en la tarjeta del equipo en "Mis Equipos".
- [ ] Un mismo usuario no puede votar dos veces en la misma dirección sin haber jugado.

---

### E4 — Constructor Asistido por IA

---

#### HU-16 · Generar equipo con asistencia de IA

**Como** usuario registrado,
**quiero** obtener sugerencias de equipos completos generadas por el motor de sinergia,
**para** aprovechar el análisis de la meta competitiva y no partir desde cero.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 13 |
| **Épica** | E4 |

**Criterios de aceptación:**
- [ ] El sistema genera hasta 3 propuestas de equipos distintas.
- [ ] Cada propuesta muestra el porcentaje de sinergia calculado.
- [ ] El usuario puede aplicar una propuesta directamente al constructor.
- [ ] Los equipos aplicados quedan marcados como `created_by = 'ai'`.

---

#### HU-17 · Seleccionar Pokémon semilla para el equipo asistido

**Como** usuario registrado,
**quiero** indicar hasta 4 Pokémon que quiero incluir obligatoriamente,
**para** que la IA construya el equipo en torno a mis preferencias.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 5 |
| **Épica** | E4 |

**Criterios de aceptación:**
- [ ] Se pueden seleccionar entre 0 y 4 Pokémon semilla desde el grid de selección.
- [ ] Los Pokémon semilla siempre aparecen en las propuestas generadas.
- [ ] Si no se eligen semillas, la IA genera equipos basándose únicamente en sinergia de la meta.

---

#### HU-18 · Filtrar el asistente a mi colección personal

**Como** usuario registrado,
**quiero** que el constructor asistido use solo los Pokémon de mi colección,
**para** obtener recomendaciones con Pokémon que realmente tengo disponibles.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 3 |
| **Épica** | E4 |

**Criterios de aceptación:**
- [ ] Un toggle "Solo mi colección" filtra el pool del asistente.
- [ ] Si la colección tiene menos de 6 Pokémon, se muestra advertencia y el asistente completa con Pokémon del meta.

---

#### HU-19 · Filtrar por tipo en el asistente

**Como** usuario registrado,
**quiero** indicar uno o más tipos preferidos para el equipo asistido,
**para** obtener sugerencias que se ajusten a un estilo de juego específico.

| Campo | Valor |
|---|---|
| **Prioridad** | Could Have |
| **Puntos** | 3 |
| **Épica** | E4 |

**Criterios de aceptación:**
- [ ] Se puede escribir tipos separados por coma (ej. `fire, dragon`).
- [ ] Las sugerencias priorizan Pokémon que incluyan al menos uno de los tipos indicados.
- [ ] Si no hay suficientes Pokémon del tipo solicitado, se completa con otros y se informa al usuario.

---

### E5 — Simulación Monte Carlo

---

#### HU-20 · Simular combate entre dos equipos

**Como** usuario registrado,
**quiero** enfrentar dos equipos en una simulación Monte Carlo,
**para** estimar la probabilidad de victoria de cada uno antes de usarlos en partidas reales.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 13 |
| **Épica** | E5 |

**Criterios de aceptación:**
- [ ] Se seleccionan dos equipos (propio vs. rival) desde la interfaz.
- [ ] La simulación devuelve la probabilidad de victoria de cada equipo en porcentaje.
- [ ] Los resultados incluyen el mejor equipo recomendado y las configuraciones optimizadas.
- [ ] El resultado se guarda en el historial de simulaciones del usuario.

---

#### HU-21 · Ver configuraciones optimizadas tras la simulación

**Como** usuario registrado,
**quiero** ver las habilidades, objetos y movimientos recomendados para cada Pokémon del equipo tras la simulación,
**para** aplicar las optimizaciones y mejorar mi win rate.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 8 |
| **Épica** | E5 |

**Criterios de aceptación:**
- [ ] Se muestra la configuración recomendada (habilidad, objeto, spread, movimientos) por cada Pokémon del equipo ganador.
- [ ] Se indica el porcentaje de mejora de win rate de cada configuración respecto al original.
- [ ] El usuario puede aplicar las recomendaciones a su equipo guardado con un clic.

---

#### HU-22 · Reproducir una simulación previa

**Como** usuario registrado,
**quiero** reproducir exactamente los resultados de una simulación anterior,
**para** verificar la consistencia del sistema o comparar con nuevas configuraciones.

| Campo | Valor |
|---|---|
| **Prioridad** | Could Have |
| **Puntos** | 3 |
| **Épica** | E5 |

**Criterios de aceptación:**
- [ ] Cada simulación guarda la semilla aleatoria (`random_seed`).
- [ ] Al reproducir con la misma semilla e iteraciones, los resultados son idénticos.

---

#### HU-23 · Ver historial de simulaciones

**Como** usuario registrado,
**quiero** consultar el historial de simulaciones que he ejecutado,
**para** comparar el rendimiento de diferentes equipos a lo largo del tiempo.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 5 |
| **Épica** | E5 |

**Criterios de aceptación:**
- [ ] Se muestran las últimas simulaciones con equipos involucrados, fecha y probabilidades de victoria.
- [ ] Se puede acceder al detalle completo de cada simulación.

---

### E6 — Análisis de Sinergia

---

#### HU-24 · Analizar la sinergia de un equipo

**Como** usuario registrado,
**quiero** ver el porcentaje de sinergia calculado para mi equipo,
**para** saber qué tan bien se complementan entre sí los Pokémon seleccionados.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 8 |
| **Épica** | E6 |

**Criterios de aceptación:**
- [ ] El porcentaje de sinergia se muestra en el constructor de equipos y en el resumen del equipo.
- [ ] El cálculo se basa en los pares de sinergia del motor (`ms_asistencia/engine.py`).
- [ ] Un equipo con pares desconocidos muestra un porcentaje parcial con nota explicativa.

---

#### HU-25 · Recibir recomendaciones de compañero de equipo

**Como** usuario registrado,
**quiero** que el sistema me sugiera qué Pokémon agregar a mi equipo incompleto,
**para** maximizar la sinergia del conjunto.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 5 |
| **Épica** | E6 |

**Criterios de aceptación:**
- [ ] Con un equipo de 1 a 5 miembros, se devuelve un ranking de los mejores compañeros.
- [ ] Cada sugerencia muestra el incremento estimado de sinergia.
- [ ] Solo se sugieren Pokémon presentes en la base de datos normalizada (no referencias externas).

---

#### HU-26 · Recibir recomendación de build para un Pokémon

**Como** usuario registrado,
**quiero** que el sistema me sugiera la mejor habilidad, objeto y movimientos para un Pokémon específico en el contexto de mi equipo,
**para** optimizar su rol dentro de la composición.

| Campo | Valor |
|---|---|
| **Prioridad** | Could Have |
| **Puntos** | 8 |
| **Épica** | E6 |

**Criterios de aceptación:**
- [ ] La recomendación considera los datos de uso real de la meta competitiva.
- [ ] Se muestran las combinaciones más usadas en el nivel de rating seleccionado.

---

### E7 — Panel de Administración

---

#### HU-27 · Ver dashboard general de la plataforma

**Como** administrador,
**quiero** ver un dashboard con métricas clave (usuarios totales, activos, equipos creados, gráficos de uso),
**para** monitorear el estado y crecimiento de la plataforma.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 8 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] Se muestran: total de usuarios, activos, admins, equipos creados.
- [ ] Gráficos: Pokémon más usados, usuarios por región, IA vs. Manual, win rate por tipo.
- [ ] Los datos se actualizan al cargar el panel (sin necesidad de refrescar).

---

#### HU-28 · Gestionar usuarios (activar / desactivar)

**Como** administrador,
**quiero** activar o desactivar cuentas de usuarios,
**para** gestionar el acceso a la plataforma sin eliminar datos históricos.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 5 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] Se requiere confirmación con contraseña del admin para desactivar una cuenta.
- [ ] El admin no puede desactivar su propia cuenta.
- [ ] El usuario desactivado no puede iniciar sesión; sus datos se conservan.
- [ ] La acción puede revertirse (reactivar).

---

#### HU-29 · Crear cuentas administrador

**Como** administrador,
**quiero** crear nuevas cuentas con rol de administrador,
**para** delegar la gestión de la plataforma a otros miembros del equipo.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 3 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] El formulario valida los mismos campos que el registro de usuario regular.
- [ ] Se muestra advertencia de que el nuevo usuario tendrá acceso total al panel.
- [ ] El admin creado aparece inmediatamente en la lista de usuarios.

---

#### HU-30 · Ver analítica de usuarios

**Como** administrador,
**quiero** consultar métricas detalladas sobre usuarios (registros por mes, retención, distribución por región, edad, engagement),
**para** entender el comportamiento y crecimiento de la comunidad.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 8 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] Gráfico de registros por mes con filtro de período.
- [ ] Métricas de retención: usuarios con al menos 1, 3 o más equipos.
- [ ] Distribución por región y país.
- [ ] Distribución por rango de edad.

---

#### HU-31 · Ver analítica de Pokémon y equipos

**Como** administrador,
**quiero** ver qué Pokémon se usan más, sus win rates por tipo y análisis cruzado con simulaciones,
**para** entender la meta dentro de la plataforma.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 8 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] Top N de Pokémon más usados en equipos activos con su tipo principal.
- [ ] Win rate por tipo calculado a partir de simulaciones Monte Carlo.
- [ ] Comparación de rendimiento entre equipos manuales y asistidos por IA.

---

#### HU-32 · Ver analítica de simulaciones

**Como** administrador,
**quiero** ver métricas de rendimiento del sistema de simulación (throughput, latencia, errores),
**para** detectar cuellos de botella y asegurar la calidad del servicio.

| Campo | Valor |
|---|---|
| **Prioridad** | Could Have |
| **Puntos** | 5 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] Gráficos de simulaciones por hora (throughput).
- [ ] Latencia promedio y percentil 95.
- [ ] Tasa de errores y sus causas.

---

#### HU-33 · Vista previa como usuario normal

**Como** administrador,
**quiero** explorar la plataforma con la vista de un usuario regular,
**para** verificar la experiencia de usuario sin necesidad de crear una cuenta extra.

| Campo | Valor |
|---|---|
| **Prioridad** | Could Have |
| **Puntos** | 3 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] Un botón "Vista de usuario" en el panel admin activa el modo previsualización.
- [ ] En modo preview, el navbar y el footer de usuario son visibles; el panel admin no.
- [ ] Un banner indica que está en modo previsualización con un botón para volver al panel.

---

#### HU-34 · Ver y gestionar todos los equipos de la plataforma

**Como** administrador,
**quiero** visualizar todos los equipos creados en la plataforma con sus detalles,
**para** moderar el contenido y detectar usos indebidos.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 5 |
| **Épica** | E7 |

**Criterios de aceptación:**
- [ ] Lista paginada de todos los equipos con nombre, usuario propietario, fecha y estado.
- [ ] Se puede filtrar por usuario, estado (activo/inactivo), método de creación (manual/IA).
- [ ] Se puede desactivar un equipo desde el panel.

---

### E8 — Carga de Datos Externos

---

#### HU-35 · Cargar datos de la meta competitiva

**Como** administrador,
**quiero** disparar la ingesta de datos actualizados desde la API de Pikalytics,
**para** que las recomendaciones del asistente y las simulaciones reflejen la meta más reciente.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 8 |
| **Épica** | E8 |

**Criterios de aceptación:**
- [ ] El proceso guarda el payload crudo en `external_raw` con timestamp.
- [ ] Los datos se normalizan en las tablas: `pokemon`, `types`, `abilities`, `items`, `moves`, `spreads`.
- [ ] Si ya existe la entrada, se actualiza (upsert); no se crean duplicados.
- [ ] Un `DataStatusChip` en la interfaz muestra la fecha del último load exitoso.

---

#### HU-36 · Ver estado de la última carga de datos

**Como** usuario registrado,
**quiero** ver cuándo fue la última vez que se actualizaron los datos de la meta,
**para** saber si las recomendaciones están basadas en información reciente.

| Campo | Valor |
|---|---|
| **Prioridad** | Should Have |
| **Puntos** | 2 |
| **Épica** | E8 |

**Criterios de aceptación:**
- [ ] Un chip en la esquina superior derecha de la interfaz muestra la fecha VGC del meta y la fecha del último load.
- [ ] Si no hay datos cargados, el chip no se muestra.

---

### E9 — Infraestructura y Despliegue

---

#### HU-37 · Levantar todo el proyecto con un solo comando

**Como** desarrollador o evaluador,
**quiero** iniciar todo el proyecto con `docker compose up -d` desde la raíz del repositorio,
**para** reducir el tiempo de configuración y eliminar dependencias manuales.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 8 |
| **Épica** | E9 |

**Criterios de aceptación:**
- [ ] El `docker-compose.yml` raíz levanta todos los servicios usando imágenes de Docker Hub (`benjamorenoo/*`).
- [ ] El orden de arranque está controlado por healthchecks en cascada (postgres → ms_db → microservicios → gateway → frontend).
- [ ] Los datos de PostgreSQL persisten en un volumen nombrado (`pgdata`).
- [ ] No se requiere crear la red Docker manualmente.

---

#### HU-38 · Comunicación segura entre microservicios vía Gateway

**Como** desarrollador,
**quiero** que el frontend solo se comunique con un API Gateway central,
**para** simplificar la seguridad, el CORS y el enrutamiento.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 5 |
| **Épica** | E9 |

**Criterios de aceptación:**
- [ ] El gateway (`ms_gateway`) enruta `/api/auth/*`, `/api/usuarios/*`, `/api/pokemon/*`, `/api/montecarlo/*`, `/api/asistencia/*` y `/api/carga/*` a sus microservicios correspondientes.
- [ ] El frontend usa una sola `baseURL` (`VITE_API_URL`) apuntando al gateway.
- [ ] Los microservicios internos no son accesibles directamente desde el navegador.

---

#### HU-39 · Inicialización automática de la base de datos

**Como** desarrollador,
**quiero** que la base de datos se cree e inicialice automáticamente al levantar `ms_db`,
**para** no tener que ejecutar pasos manuales de configuración.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 3 |
| **Épica** | E9 |

**Criterios de aceptación:**
- [ ] El entrypoint de `ms_db` espera a que PostgreSQL esté disponible, luego ejecuta `schema.sql` de forma idempotente.
- [ ] Se inserta un usuario administrador por defecto en la primera inicialización.
- [ ] Repetir el proceso no destruye datos existentes.

---

#### HU-40 · Cumplimiento legal — Términos y Política de Privacidad (Ley N° 21.719)

**Como** usuario de la plataforma,
**quiero** acceder a los Términos y Condiciones y a la Política de Privacidad,
**para** conocer mis derechos sobre mis datos personales según la legislación chilena vigente.

| Campo | Valor |
|---|---|
| **Prioridad** | Must Have |
| **Puntos** | 3 |
| **Épica** | E9 |

**Criterios de aceptación:**
- [ ] El footer de todas las páginas de usuario (no admin) contiene enlaces a T&C y Política de Privacidad.
- [ ] La Política de Privacidad referencia explícitamente la Ley N° 21.719 y los derechos del titular (acceso, rectificación, supresión, oposición, portabilidad, bloqueo).
- [ ] La Agencia de Protección de Datos Personales se menciona como autoridad de control.
- [ ] El modal legal es accesible con teclado (Escape para cerrar).

---

## 6. Backlog Priorizado (Resumen)

| ID | Historia | Épica | Prioridad | Puntos |
|---|---|---|---|---|
| HU-01 | Registro de usuario | E1 | Must Have | 5 |
| HU-02 | Inicio de sesión | E1 | Must Have | 3 |
| HU-03 | Cierre de sesión | E1 | Must Have | 1 |
| HU-06 | Explorar Pokédex | E2 | Must Have | 5 |
| HU-09 | Crear equipo manualmente | E3 | Must Have | 13 |
| HU-10 | Editar equipo | E3 | Must Have | 5 |
| HU-11 | Eliminar equipo (soft-delete) | E3 | Must Have | 2 |
| HU-12 | Ver mis equipos | E3 | Must Have | 3 |
| HU-16 | Generar equipo con IA | E4 | Must Have | 13 |
| HU-17 | Seleccionar Pokémon semilla | E4 | Must Have | 5 |
| HU-20 | Simular combate Monte Carlo | E5 | Must Have | 13 |
| HU-24 | Analizar sinergia de equipo | E6 | Must Have | 8 |
| HU-27 | Dashboard admin | E7 | Must Have | 8 |
| HU-28 | Gestionar usuarios | E7 | Must Have | 5 |
| HU-35 | Cargar datos externos | E8 | Must Have | 8 |
| HU-37 | Levantar proyecto con un comando | E9 | Must Have | 8 |
| HU-38 | Gateway central | E9 | Must Have | 5 |
| HU-39 | Init automático de BD | E9 | Must Have | 3 |
| HU-40 | Cumplimiento Ley N° 21.719 | E9 | Must Have | 3 |
| HU-04 | Editar perfil | E1 | Should Have | 3 |
| HU-07 | Agregar Pokémon a colección | E2 | Should Have | 3 |
| HU-08 | Ver y gestionar colección | E2 | Should Have | 2 |
| HU-13 | Asignar EVs y naturaleza | E3 | Should Have | 5 |
| HU-14 | Gráfico de cobertura de tipos | E3 | Should Have | 5 |
| HU-18 | Filtrar asistente a colección | E4 | Should Have | 3 |
| HU-21 | Ver configuraciones optimizadas | E5 | Should Have | 8 |
| HU-23 | Historial de simulaciones | E5 | Should Have | 5 |
| HU-25 | Recomendación de compañero | E6 | Should Have | 5 |
| HU-29 | Crear cuenta admin | E7 | Should Have | 3 |
| HU-30 | Analítica de usuarios | E7 | Should Have | 8 |
| HU-31 | Analítica de Pokémon y equipos | E7 | Should Have | 8 |
| HU-34 | Ver equipos en panel admin | E7 | Should Have | 5 |
| HU-36 | Estado del último load de datos | E8 | Should Have | 2 |
| HU-05 | Recuperación de contraseña | E1 | Could Have | 8 |
| HU-15 | Feedback de equipo | E3 | Could Have | 3 |
| HU-19 | Filtrar asistente por tipo | E4 | Could Have | 3 |
| HU-22 | Reproducir simulación previa | E5 | Could Have | 3 |
| HU-26 | Recomendación de build | E6 | Could Have | 8 |
| HU-32 | Analítica de simulaciones | E7 | Could Have | 5 |
| HU-33 | Vista previa como usuario | E7 | Could Have | 3 |

**Total de puntos estimados:** 243 puntos de historia

---

## 7. Sprints Sugeridos

> Duración de sprint: **2 semanas** · Velocidad estimada del equipo: **35–40 puntos/sprint**

### Sprint 1 — Fundación (38 pts)
Autenticación completa + estructura del proyecto desplegable.

| HU | Descripción | Pts |
|---|---|---|
| HU-01 | Registro de usuario | 5 |
| HU-02 | Inicio de sesión | 3 |
| HU-03 | Cierre de sesión | 1 |
| HU-37 | Levantar proyecto con un comando | 8 |
| HU-38 | Gateway central | 5 |
| HU-39 | Init automático de BD | 3 |
| HU-35 | Cargar datos externos | 8 |
| HU-40 | Cumplimiento Ley N° 21.719 | 3 |

### Sprint 2 — Pokédex y Constructor Básico (38 pts)
El usuario puede explorar Pokémon y armar su primer equipo.

| HU | Descripción | Pts |
|---|---|---|
| HU-06 | Explorar Pokédex | 5 |
| HU-09 | Crear equipo manualmente | 13 |
| HU-10 | Editar equipo | 5 |
| HU-11 | Eliminar equipo | 2 |
| HU-12 | Ver mis equipos | 3 |
| HU-14 | Gráfico de cobertura de tipos | 5 |
| HU-36 | Estado del último load | 2 |

### Sprint 3 — Sinergia e IA (39 pts)
Constructor asistido y análisis de sinergia.

| HU | Descripción | Pts |
|---|---|---|
| HU-16 | Generar equipo con IA | 13 |
| HU-17 | Seleccionar Pokémon semilla | 5 |
| HU-18 | Filtrar asistente a colección | 3 |
| HU-24 | Analizar sinergia de equipo | 8 |
| HU-25 | Recomendación de compañero | 5 |
| HU-07 | Agregar Pokémon a colección | 3 |
| HU-08 | Ver y gestionar colección | 2 |

### Sprint 4 — Simulación Monte Carlo (39 pts)
Simulación de combates y optimización.

| HU | Descripción | Pts |
|---|---|---|
| HU-20 | Simular combate Monte Carlo | 13 |
| HU-21 | Ver configuraciones optimizadas | 8 |
| HU-23 | Historial de simulaciones | 5 |
| HU-13 | Asignar EVs y naturaleza | 5 |
| HU-04 | Editar perfil | 3 |
| HU-29 | Crear cuenta admin | 3 |

### Sprint 5 — Panel de Administración (39 pts)
Dashboard admin y analítica de la plataforma.

| HU | Descripción | Pts |
|---|---|---|
| HU-27 | Dashboard admin | 8 |
| HU-28 | Gestionar usuarios | 5 |
| HU-30 | Analítica de usuarios | 8 |
| HU-31 | Analítica de Pokémon y equipos | 8 |
| HU-34 | Ver equipos en panel admin | 5 |
| HU-33 | Vista previa como usuario | 3 |

### Sprint 6 — Pulido y Funcionalidades Opcionales (35 pts)
Mejoras y funcionalidades Could Have.

| HU | Descripción | Pts |
|---|---|---|
| HU-19 | Filtrar asistente por tipo | 3 |
| HU-15 | Feedback de equipo | 3 |
| HU-22 | Reproducir simulación previa | 3 |
| HU-26 | Recomendación de build | 8 |
| HU-32 | Analítica de simulaciones | 5 |
| HU-05 | Recuperación de contraseña | 8 |

---

## 8. Requerimientos No Funcionales

| ID | Categoría | Requerimiento |
|---|---|---|
| RNF-01 | Seguridad | Las contraseñas se almacenan con hash bcrypt (factor 10+). Nunca en texto plano. |
| RNF-02 | Seguridad | Todos los endpoints protegidos validan JWT antes de procesar la solicitud. El secreto `JWT_SECRET` es el mismo en `ms_auth` y `ms_usuarios`. |
| RNF-03 | Seguridad | Los DELETEs físicos sobre `teams` están bloqueados por trigger en la BD. Solo se permite soft-delete (`active = FALSE`). |
| RNF-04 | Privacidad | El sistema cumple con la Ley N° 21.719 de Chile. El borrado físico de usuarios es posible sin dejar FKs colgantes (FKs con `ON DELETE SET NULL`). |
| RNF-05 | Rendimiento | El frontend no debe bloquear el hilo principal con peticiones síncronas. Toda carga de datos es asíncrona con estados de loading. |
| RNF-06 | Rendimiento | Las simulaciones Monte Carlo no bloquean la UI. La respuesta del endpoint `/simulate` debe completarse en menos de 30 segundos para 1000 iteraciones. |
| RNF-07 | Disponibilidad | Cada microservicio tiene `restart: unless-stopped` en Docker Compose para recuperación automática ante fallos. |
| RNF-08 | Escalabilidad | La arquitectura de microservicios permite escalar servicios de forma independiente (ej. más instancias de `ms_montecarlo` en épocas de alto tráfico). |
| RNF-09 | Mantenibilidad | Cada servicio debe tener un `README.md` con sus endpoints, variables de entorno y comandos de ejecución. |
| RNF-10 | Portabilidad | El proyecto completo se levanta con `docker compose up -d` desde la raíz, sin instalación de dependencias locales. |
| RNF-11 | Integridad de datos | Los datos de la meta competitiva se cargan con upsert idempotente; recargar no crea duplicados ni rompe referencias. |
| RNF-12 | Usabilidad | La interfaz debe ser responsive y funcional en resoluciones desde 1024px de ancho. |

---

*Documento generado para el proyecto EquipoRocket.pk — Julio 2026*
