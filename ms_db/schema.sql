-- ============================================
-- SCHEMA POSTGRESQL
-- Convertido desde DBML
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
    user_id       INT          NOT NULL,
    name          VARCHAR(100),
    format_id     INT,
    synergy_score DECIMAL(5,2),
    win_rate      DECIMAL(5,2),
    created_by    VARCHAR(20)  NOT NULL DEFAULT 'manual'
                  CHECK (created_by IN ('manual', 'ai')),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP,
    CONSTRAINT fk_teams_user   FOREIGN KEY (user_id)   REFERENCES users(id),
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
    CONSTRAINT fk_spreads_nature FOREIGN KEY (nature_id) REFERENCES natures(id)
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
    CONSTRAINT fk_tf_user FOREIGN KEY (user_id) REFERENCES users(id)
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
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMP,
    CONSTRAINT fk_bs_user        FOREIGN KEY (user_id)        REFERENCES users(id),
    CONSTRAINT fk_bs_team_a      FOREIGN KEY (team_a_id)      REFERENCES teams(id),
    CONSTRAINT fk_bs_team_b      FOREIGN KEY (team_b_id)      REFERENCES teams(id),
    CONSTRAINT fk_bs_winner_team FOREIGN KEY (winner_team_id) REFERENCES teams(id)
);

COMMENT ON COLUMN battle_simulations.winner_team_id        IS 'ID del equipo ganador';
COMMENT ON COLUMN battle_simulations.team_a_score          IS 'Pokémon restantes del equipo A';
COMMENT ON COLUMN battle_simulations.team_b_score          IS 'Pokémon restantes del equipo B';
COMMENT ON COLUMN battle_simulations.team_a_win_probability IS 'Probabilidad de victoria Team A (%)';
COMMENT ON COLUMN battle_simulations.team_b_win_probability IS 'Probabilidad de victoria Team B (%)';
COMMENT ON COLUMN battle_simulations.simulation_count      IS 'Número de iteraciones Monte Carlo';
COMMENT ON COLUMN battle_simulations.simulation_type       IS 'Tipo de simulación';

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
