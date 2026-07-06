-- ============================================
-- SCHEMA POSTGRESQL
-- Convertido desde DBML
--
-- NOTA DE NOTACIÓN (corrección del modelo de datos):
-- Este archivo define el modelo relacional FÍSICO del sistema, expresado en
-- notación de tabla estilo "crow's foot" (claves primarias, claves foráneas
-- y cardinalidades implícitas en las relaciones FK). No corresponde a un DER
-- (Diagrama Entidad-Relación) conceptual clásico con entidades/atributos
-- abstractos: cada CREATE TABLE corresponde 1:1 a una tabla real de
-- PostgreSQL, ya normalizada e implementada. Ver docs/ARQUITECTURA.md para
-- el diagrama de arquitectura y los patrones de diseño aplicados.
-- ============================================

-- --- GEOGRAFÍA ---

CREATE TABLE regions (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(50)  NOT NULL UNIQUE,
    code    VARCHAR(10)  NOT NULL UNIQUE
);

CREATE TABLE countries (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    code      VARCHAR(10)  NOT NULL UNIQUE,
    region_id INT          NOT NULL,
    CONSTRAINT fk_countries_region FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- ── Seed: regiones y países básicos (id fijos para coincidir con frontend)
-- Estas sentencias son idempotentes y pueden ejecutarse varias veces.
INSERT INTO regions (id, name, code) VALUES
    (1, 'Latinoamérica', 'R1'),
    (2, 'Norteamérica', 'R2'),
    (3, 'Europa', 'R3'),
    (4, 'Asia-Pacífico', 'R4'),
    (5, 'Medio Oriente y África', 'R5'),
    (6, 'Oceanía', 'R6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO countries (id, name, code, region_id) VALUES
    (1,  'Argentina', 'C1', 1),
    (2,  'Bolivia', 'C2', 1),
    (3,  'Brasil', 'C3', 1),
    (4,  'Chile', 'C4', 1),
    (5,  'Colombia', 'C5', 1),
    (6,  'Costa Rica', 'C6', 1),
    (7,  'Cuba', 'C7', 1),
    (8,  'Ecuador', 'C8', 1),
    (9,  'El Salvador', 'C9', 1),
    (10, 'Guatemala', 'C10', 1),
    (11, 'Honduras', 'C11', 1),
    (12, 'México', 'C12', 1),
    (13, 'Nicaragua', 'C13', 1),
    (14, 'Panamá', 'C14', 1),
    (15, 'Paraguay', 'C15', 1),
    (16, 'Perú', 'C16', 1),
    (17, 'Puerto Rico', 'C17', 1),
    (18, 'República Dominicana', 'C18', 1),
    (19, 'Uruguay', 'C19', 1),
    (20, 'Venezuela', 'C20', 1),
    (21, 'Canadá', 'C21', 2),
    (22, 'Estados Unidos', 'C22', 2),
    (23, 'Alemania', 'C23', 3),
    (24, 'Austria', 'C24', 3),
    (25, 'Bélgica', 'C25', 3),
    (26, 'Bulgaria', 'C26', 3),
    (27, 'Chipre', 'C27', 3),
    (28, 'Croacia', 'C28', 3),
    (29, 'Dinamarca', 'C29', 3),
    (30, 'Eslovaquia', 'C30', 3),
    (31, 'Eslovenia', 'C31', 3),
    (32, 'España', 'C32', 3),
    (33, 'Estonia', 'C33', 3),
    (34, 'Finlandia', 'C34', 3),
    (35, 'Francia', 'C35', 3),
    (36, 'Grecia', 'C36', 3),
    (37, 'Hungría', 'C37', 3),
    (38, 'Irlanda', 'C38', 3),
    (39, 'Islandia', 'C39', 3),
    (40, 'Italia', 'C40', 3),
    (41, 'Letonia', 'C41', 3),
    (42, 'Lituania', 'C42', 3),
    (43, 'Luxemburgo', 'C43', 3),
    (44, 'Malta', 'C44', 3),
    (45, 'Noruega', 'C45', 3),
    (46, 'Países Bajos', 'C46', 3),
    (47, 'Polonia', 'C47', 3),
    (48, 'Portugal', 'C48', 3),
    (49, 'Reino Unido', 'C49', 3),
    (50, 'República Checa', 'C50', 3),
    (51, 'Rumania', 'C51', 3),
    (52, 'Suecia', 'C52', 3),
    (53, 'Suiza', 'C53', 3),
    (54, 'Turquía', 'C54', 3),
    (55, 'China', 'C55', 4),
    (56, 'Corea del Sur', 'C56', 4),
    (57, 'Filipinas', 'C57', 4),
    (58, 'Hong Kong', 'C58', 4),
    (59, 'India', 'C59', 4),
    (60, 'Indonesia', 'C60', 4),
    (61, 'Japón', 'C61', 4),
    (62, 'Malasia', 'C62', 4),
    (63, 'Singapur', 'C63', 4),
    (64, 'Taiwán', 'C64', 4),
    (65, 'Tailandia', 'C65', 4),
    (66, 'Vietnam', 'C66', 4),
    (67, 'Arabia Saudita', 'C67', 5),
    (68, 'Emiratos Árabes Unidos', 'C68', 5),
    (69, 'Israel', 'C69', 5),
    (70, 'Jordania', 'C70', 5),
    (71, 'Kuwait', 'C71', 5),
    (72, 'Marruecos', 'C72', 5),
    (73, 'Qatar', 'C73', 5),
    (74, 'Sudáfrica', 'C74', 5),
    (75, 'Australia', 'C75', 6),
    (76, 'Nueva Zelanda', 'C76', 6)
ON CONFLICT (id) DO NOTHING;

-- Ajustar secuencias para evitar valores duplicados en futuros inserts
SELECT setval(pg_get_serial_sequence('regions','id'), COALESCE((SELECT MAX(id) FROM regions), 1));
SELECT setval(pg_get_serial_sequence('countries','id'), COALESCE((SELECT MAX(id) FROM countries), 1));


-- --- USUARIOS ---

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    region_id     INT,
    country_id    INT,
    fecha_nac     DATE,
    is_admin      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_users_region  FOREIGN KEY (region_id)  REFERENCES regions(id),
    CONSTRAINT fk_users_country FOREIGN KEY (country_id) REFERENCES countries(id)
);

-- --- DATOS BASE POKÉMON ---

CREATE TABLE types (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(30) UNIQUE,
    color VARCHAR(7)
);

CREATE TABLE pokemon (
    id         SERIAL PRIMARY KEY,
    pokeapi_id INTEGER,
    name       VARCHAR(100) UNIQUE,
    hp         INT,
    attack     INT,
    defense    INT,
    sp_attack  INT,
    sp_defense INT,
    speed      INT
);

CREATE TABLE pokemon_types (
    pokemon_id INT NOT NULL,
    type_id    INT NOT NULL,
    slot       INT,
    CONSTRAINT fk_pt_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
    CONSTRAINT fk_pt_type    FOREIGN KEY (type_id)    REFERENCES types(id)
);

CREATE TABLE abilities (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE,
    description TEXT
);

CREATE TABLE pokemon_abilities (
    id         SERIAL PRIMARY KEY,
    pokemon_id INT,
    ability_id INT,
    is_hidden  BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_pa_pokemon  FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
    CONSTRAINT fk_pa_ability  FOREIGN KEY (ability_id) REFERENCES abilities(id)
);

CREATE TABLE items (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) UNIQUE,
    name_us    VARCHAR(100),
    sprite_url VARCHAR(255)
);

CREATE TABLE moves (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(100) UNIQUE,
    type_id  INT,
    category VARCHAR(50),
    power    INT,
    pp       INT,
    CONSTRAINT fk_moves_type FOREIGN KEY (type_id) REFERENCES types(id)
);

CREATE TABLE pokemon_moves (
    id         SERIAL PRIMARY KEY,
    pokemon_id INT,
    move_id    INT,
    CONSTRAINT fk_pm_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
    CONSTRAINT fk_pm_move    FOREIGN KEY (move_id)    REFERENCES moves(id)
);

-- --- COMPETITIVO Y EQUIPOS ---

CREATE TABLE formats (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(100) UNIQUE,
    team_size INT
);

CREATE TABLE teams (
    id            SERIAL PRIMARY KEY,
    user_id       INT,
    name          VARCHAR(100),
    format_id     INT,
    synergy_score DECIMAL(5,2),
    win_rate      DECIMAL(5,2),
    created_by    VARCHAR(20)  NOT NULL DEFAULT 'manual'
                  CHECK (created_by IN ('manual', 'ai')),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP,
    active        BOOLEAN      DEFAULT TRUE,
    CONSTRAINT fk_teams_user   FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_teams_format FOREIGN KEY (format_id) REFERENCES formats(id)
);

COMMENT ON COLUMN teams.created_by IS 'manual o ai';

CREATE TABLE natures (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(50) UNIQUE,
    increased_stat VARCHAR(50),
    decreased_stat VARCHAR(50)
);

CREATE TABLE spreads (
    id             SERIAL PRIMARY KEY,
    nature_id      INT,
    hp_evs         INT,
    attack_evs     INT,
    defense_evs    INT,
    sp_attack_evs  INT,
    sp_defense_evs INT,
    speed_evs      INT,
    CONSTRAINT fk_spreads_nature FOREIGN KEY (nature_id) REFERENCES natures(id),
    CONSTRAINT uq_spreads_combo UNIQUE (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs)
);

CREATE TABLE pokemon_spreads (
    pokemon_id INT NOT NULL,
    spread_id  INT NOT NULL,
    CONSTRAINT pk_pokemon_spreads PRIMARY KEY (pokemon_id, spread_id),
    CONSTRAINT fk_ps_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_spread   FOREIGN KEY (spread_id)  REFERENCES spreads(id) ON DELETE CASCADE
);

CREATE TABLE team_pokemon (
    id          SERIAL PRIMARY KEY,
    team_id     INT,
    pokemon_id  INT,
    slot        INT,
    ability_id  INT,
    item_id     INT,
    spread_id   INT,
    tera_type_id INT,
    CONSTRAINT fk_tp_team      FOREIGN KEY (team_id)      REFERENCES teams(id)      ON DELETE CASCADE,
    CONSTRAINT fk_tp_pokemon   FOREIGN KEY (pokemon_id)   REFERENCES pokemon(id),
    CONSTRAINT fk_tp_ability   FOREIGN KEY (ability_id)   REFERENCES abilities(id),
    CONSTRAINT fk_tp_item      FOREIGN KEY (item_id)      REFERENCES items(id),
    CONSTRAINT fk_tp_spread    FOREIGN KEY (spread_id)    REFERENCES spreads(id),
    CONSTRAINT fk_tp_tera_type FOREIGN KEY (tera_type_id) REFERENCES types(id)
);

COMMENT ON TABLE team_pokemon IS 'Conceptualmente "team_member_configuration": almacena la configuración completa (habilidad, item, spread de EVs/naturaleza, tera tipo y movimientos vía team_pokemon_moves) de cada Pokémon dentro de un equipo. El nombre físico de la tabla se mantiene como team_pokemon por compatibilidad con el código existente; "team_member_configuration" es el nombre conceptual usado en la documentación/DAS para reflejar mejor su propósito.';

CREATE TABLE team_pokemon_moves (
    team_pokemon_id INT NOT NULL,
    move_id         INT NOT NULL,
    slot            INT,
    CONSTRAINT pk_team_pokemon_moves PRIMARY KEY (team_pokemon_id, move_id),
    CONSTRAINT fk_tpm_team_pokemon FOREIGN KEY (team_pokemon_id) REFERENCES team_pokemon(id) ON DELETE CASCADE,
    CONSTRAINT fk_tpm_move         FOREIGN KEY (move_id)         REFERENCES moves(id)
);

-- --- FEEDBACK Y COLECCIONES ---

CREATE TABLE team_feedback (
    id         SERIAL PRIMARY KEY,
    team_id    INT,
    user_id    INT,
    wins       INT,
    loses      INT,
    created_by VARCHAR(20) NOT NULL DEFAULT 'manual'
               CHECK (created_by IN ('manual', 'ai')),
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tf_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_tf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON COLUMN team_feedback.created_by IS 'manual o ai';

CREATE TABLE user_collections (
    user_id    INT       NOT NULL,
    pokemon_id INT       NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_user_collections PRIMARY KEY (user_id, pokemon_id),
    CONSTRAINT fk_uc_user    FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT fk_uc_pokemon FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
);

-- --- ANÁLISIS Y SIMULACIÓN ---

CREATE TABLE synergy_data (
    id                  SERIAL PRIMARY KEY,
    pokemon_id          INT,
    teammate_pokemon_id INT,
    format_id           INT,
    synergy_percent     DECIMAL(5,2),
    CONSTRAINT fk_sd_pokemon   FOREIGN KEY (pokemon_id)          REFERENCES pokemon(id),
    CONSTRAINT fk_sd_teammate  FOREIGN KEY (teammate_pokemon_id) REFERENCES pokemon(id),
    CONSTRAINT fk_sd_format    FOREIGN KEY (format_id)           REFERENCES formats(id)
);

COMMENT ON TABLE synergy_data IS 'Sinergia por pares (pairwise) entre dos Pokémon. Se origina en los datos de "teammates" de la API externa (Pikalytics) cargados por ms_carga_api en external_raw; ms_asistencia/engine.py construye con esos datos la matriz de sinergia y la persiste aquí vía POST /store/synergy. Es una simplificación: la sinergia de un equipo completo (3-6 Pokémon) NO se calcula sumando/promediando filas de esta tabla en SQL, sino a posteriori en ms_asistencia/engine.py (PokemonAnalyticsEngine.analyze_team_synergy), que promedia la sinergia de todos los pares del equipo.';
COMMENT ON COLUMN synergy_data.synergy_percent IS 'Porcentaje de sinergia entre pokemon_id y teammate_pokemon_id (0-100), basado en la frecuencia de aparición conjunta en equipos reales (dato externo de Pikalytics)';

CREATE TABLE battle_simulations (
    id                    SERIAL PRIMARY KEY,
    user_id               INT,
    team_a_id             INT,
    team_b_id             INT,
    winner_team_id        INT,
    team_a_score          INT,
    team_b_score          INT,
    team_a_win_probability DECIMAL(5,2),
    team_b_win_probability DECIMAL(5,2),
    simulation_count      INT          NOT NULL DEFAULT 1000,
    simulation_type       VARCHAR(20)  NOT NULL DEFAULT 'montecarlo',
    prediction            VARCHAR(255),
    random_seed           BIGINT,
    algorithm_version     VARCHAR(20)  DEFAULT 'v1',
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMP,
    CONSTRAINT fk_bs_user        FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bs_team_a      FOREIGN KEY (team_a_id)      REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_bs_team_b      FOREIGN KEY (team_b_id)      REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_bs_winner_team FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Migración idempotente para bases de datos ya existentes (creadas antes de esta corrección)
ALTER TABLE battle_simulations ADD COLUMN IF NOT EXISTS random_seed BIGINT;
ALTER TABLE battle_simulations ADD COLUMN IF NOT EXISTS algorithm_version VARCHAR(20) DEFAULT 'v1';

COMMENT ON COLUMN battle_simulations.winner_team_id        IS 'ID del equipo ganador';
COMMENT ON COLUMN battle_simulations.team_a_score          IS 'Pokémon restantes del equipo A';
COMMENT ON COLUMN battle_simulations.team_b_score          IS 'Pokémon restantes del equipo B';
COMMENT ON COLUMN battle_simulations.team_a_win_probability IS 'Probabilidad de victoria Team A (%)';
COMMENT ON COLUMN battle_simulations.team_b_win_probability IS 'Probabilidad de victoria Team B (%)';
COMMENT ON COLUMN battle_simulations.simulation_count      IS 'Número de iteraciones (combates) Monte Carlo ejecutadas para la configuración recomendada; cada una queda registrada en simulation_iterations';
COMMENT ON COLUMN battle_simulations.simulation_type       IS 'Tipo de simulación';
COMMENT ON COLUMN battle_simulations.random_seed           IS 'Semilla pseudoaleatoria usada en esta corrida Monte Carlo, para poder reproducir exactamente los mismos resultados';
COMMENT ON COLUMN battle_simulations.algorithm_version     IS 'Versión del algoritmo Monte Carlo usado para esta simulación (ej. v1)';

CREATE TABLE optimized_configurations (
    id                     SERIAL PRIMARY KEY,
    battle_simulation_id   INT          NOT NULL,
    team_pokemon_id        INT          NOT NULL,
    recommended_ability_id INT,
    recommended_item_id    INT,
    recommended_spread_id  INT,
    recommended_moves      TEXT,
    win_rate_improvement   DECIMAL(5,2),
    confidence_score       DECIMAL(5,2),
    created_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_oc_battle_sim  FOREIGN KEY (battle_simulation_id)   REFERENCES battle_simulations(id) ON DELETE CASCADE,
    CONSTRAINT fk_oc_team_poke   FOREIGN KEY (team_pokemon_id)        REFERENCES team_pokemon(id)       ON DELETE CASCADE,
    CONSTRAINT fk_oc_ability     FOREIGN KEY (recommended_ability_id) REFERENCES abilities(id),
    CONSTRAINT fk_oc_item        FOREIGN KEY (recommended_item_id)    REFERENCES items(id),
    CONSTRAINT fk_oc_spread      FOREIGN KEY (recommended_spread_id)  REFERENCES spreads(id)
);

COMMENT ON TABLE  optimized_configurations                       IS 'Almacena recomendaciones de optimización del simulador Monte Carlo';
COMMENT ON COLUMN optimized_configurations.battle_simulation_id  IS 'Simulación que generó esta optimización';
COMMENT ON COLUMN optimized_configurations.team_pokemon_id       IS 'Pokémon del equipo a optimizar';
COMMENT ON COLUMN optimized_configurations.recommended_ability_id IS 'Habilidad recomendada';
COMMENT ON COLUMN optimized_configurations.recommended_item_id   IS 'Objeto recomendado';
COMMENT ON COLUMN optimized_configurations.recommended_spread_id IS 'Spread de EVs recomendado';
COMMENT ON COLUMN optimized_configurations.recommended_moves     IS 'JSON array de move IDs recomendados';
COMMENT ON COLUMN optimized_configurations.win_rate_improvement  IS 'Mejora de win rate en %';
COMMENT ON COLUMN optimized_configurations.confidence_score      IS 'Confianza de la recomendación (0-100)';

-- =====================================================
-- Trazabilidad de iteraciones individuales de Monte Carlo
-- (Corrección punto 1: dejar registro de cada una de las
--  iteraciones individuales simuladas para la configuración
--  recomendada de cada battle_simulation)
-- =====================================================
CREATE TABLE simulation_iterations (
    id               SERIAL PRIMARY KEY,
    simulation_id    INT        NOT NULL,
    iteration_num    INT        NOT NULL,
    winner           VARCHAR(1) NOT NULL CHECK (winner IN ('A','B')),
    team_a_survivors INT,
    team_b_survivors INT,
    random_seed      BIGINT,
    created_at       TIMESTAMP  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_si_simulation FOREIGN KEY (simulation_id) REFERENCES battle_simulations(id) ON DELETE CASCADE
);

COMMENT ON TABLE  simulation_iterations                  IS 'Detalle de cada iteración individual (1 combate simulado) ejecutada por ms_montecarlo para la configuración recomendada de una battle_simulation';
COMMENT ON COLUMN simulation_iterations.simulation_id    IS 'Simulación (battle_simulations) a la que pertenece esta iteración';
COMMENT ON COLUMN simulation_iterations.iteration_num    IS 'Número de iteración dentro de la simulación (1..simulation_count)';
COMMENT ON COLUMN simulation_iterations.winner           IS 'Equipo ganador de esta iteración: A (equipo propio) o B (rival)';
COMMENT ON COLUMN simulation_iterations.team_a_survivors IS 'Pokémon sobrevivientes del equipo A al final de la iteración (si el motor de batalla lo calcula; NULL en el simulador heurístico actual)';
COMMENT ON COLUMN simulation_iterations.team_b_survivors IS 'Pokémon sobrevivientes del equipo B al final de la iteración (si el motor de batalla lo calcula; NULL en el simulador heurístico actual)';
COMMENT ON COLUMN simulation_iterations.random_seed      IS 'Semilla usada para esta iteración (igual a battle_simulations.random_seed para toda la corrida)';

CREATE INDEX idx_simulation_iterations_simulation_id ON simulation_iterations(simulation_id);

-- =====================================================
-- Comparaciones de configuraciones alternativas
-- (Corrección punto 2: registrar las variantes evaluadas que
--  justifican la recomendación final guardada en
--  optimized_configurations)
-- =====================================================
CREATE TABLE configuration_comparisons (
    id                   SERIAL PRIMARY KEY,
    battle_simulation_id INT          NOT NULL,
    team_pokemon_id      INT          NOT NULL,
    config_variant       VARCHAR(50)  NOT NULL, -- 'original', 'alt_item_1', 'alt_spread_1', etc.
    ability_id           INT,
    item_id              INT,
    spread_id            INT,
    simulations_run      INT          NOT NULL DEFAULT 0,
    wins                 INT          NOT NULL DEFAULT 0,
    win_rate             DECIMAL(5,2),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cc_battle_sim FOREIGN KEY (battle_simulation_id) REFERENCES battle_simulations(id) ON DELETE CASCADE,
    CONSTRAINT fk_cc_team_poke  FOREIGN KEY (team_pokemon_id)      REFERENCES team_pokemon(id)       ON DELETE CASCADE,
    CONSTRAINT fk_cc_ability    FOREIGN KEY (ability_id)           REFERENCES abilities(id),
    CONSTRAINT fk_cc_item       FOREIGN KEY (item_id)              REFERENCES items(id),
    CONSTRAINT fk_cc_spread     FOREIGN KEY (spread_id)            REFERENCES spreads(id)
);

COMMENT ON TABLE  configuration_comparisons                      IS 'Variantes de configuración (habilidad/item/spread) evaluadas por Monte Carlo para justificar la recomendación final guardada en optimized_configurations';
COMMENT ON COLUMN configuration_comparisons.battle_simulation_id IS 'Simulación que generó esta comparación';
COMMENT ON COLUMN configuration_comparisons.team_pokemon_id      IS 'Pokémon del equipo (team_member_configuration) cuya configuración se está comparando';
COMMENT ON COLUMN configuration_comparisons.config_variant       IS 'Identificador de la variante: original, alt_item_1, alt_spread_1, etc.';
COMMENT ON COLUMN configuration_comparisons.ability_id           IS 'Habilidad usada en esta variante';
COMMENT ON COLUMN configuration_comparisons.item_id              IS 'Objeto usado en esta variante';
COMMENT ON COLUMN configuration_comparisons.spread_id            IS 'Spread de EVs/naturaleza usado en esta variante';
COMMENT ON COLUMN configuration_comparisons.simulations_run      IS 'Número de combates simulados para evaluar esta variante';
COMMENT ON COLUMN configuration_comparisons.wins                 IS 'Número de combates ganados por esta variante';
COMMENT ON COLUMN configuration_comparisons.win_rate             IS 'Win rate de esta variante (%)';

CREATE INDEX idx_configuration_comparisons_battle_sim ON configuration_comparisons(battle_simulation_id);
CREATE INDEX idx_configuration_comparisons_team_poke  ON configuration_comparisons(team_pokemon_id);

-- =====================================================
-- Prevent physical DELETE on teams to preserve analytic data
-- Use soft-delete: UPDATE teams SET active = FALSE
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_teams_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'PHYSICAL_DELETE_FORBIDDEN: Physical DELETE on "teams" is disabled. Use UPDATE teams SET active = FALSE to deactivate instead.'; RETURN OLD; END; $$;

-- install trigger (idempotent)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_delete_teams') THEN CREATE TRIGGER trg_prevent_delete_teams BEFORE DELETE ON teams FOR EACH ROW EXECUTE FUNCTION prevent_teams_delete(); END IF; END$$;

-- =====================================================
-- Migración idempotente: FKs con ON DELETE SET NULL
-- Permite eliminar físicamente un usuario (ej. derecho de
-- supresión Ley N°21.719) sin dejar FKs colgantes.
-- Ejecutar una sola vez en bases de datos ya existentes.
-- =====================================================

-- teams.user_id: quitar NOT NULL + reemplazar FK con SET NULL
ALTER TABLE teams ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS fk_teams_user;
ALTER TABLE teams ADD CONSTRAINT fk_teams_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- team_feedback.user_id: SET NULL para preservar historial de feedback
ALTER TABLE team_feedback DROP CONSTRAINT IF EXISTS fk_tf_user;
ALTER TABLE team_feedback ADD CONSTRAINT fk_tf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- battle_simulations: user_id y referencias a teams → SET NULL
ALTER TABLE battle_simulations DROP CONSTRAINT IF EXISTS fk_bs_user;
ALTER TABLE battle_simulations ADD CONSTRAINT fk_bs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE battle_simulations DROP CONSTRAINT IF EXISTS fk_bs_team_a;
ALTER TABLE battle_simulations ADD CONSTRAINT fk_bs_team_a FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE battle_simulations DROP CONSTRAINT IF EXISTS fk_bs_team_b;
ALTER TABLE battle_simulations ADD CONSTRAINT fk_bs_team_b FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE battle_simulations DROP CONSTRAINT IF EXISTS fk_bs_winner_team;
ALTER TABLE battle_simulations ADD CONSTRAINT fk_bs_winner_team FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL;

