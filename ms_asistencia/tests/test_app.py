"""Tests de integración para las rutas de ms_asistencia/app.py.
Todos los tests mockean get_conn y load_latest_external_raw para no necesitar BD real.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app import app

client = TestClient(app, raise_server_exceptions=False)


# ── /health ─────────────────────────────────────────────────────────────────

class TestHealth:
    def test_ok_when_db_connects(self):
        mock_conn = MagicMock()
        with patch("app.get_conn", return_value=mock_conn):
            resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        mock_conn.close.assert_called_once()

    def test_500_when_db_fails(self):
        with patch("app.get_conn", side_effect=Exception("connection refused")):
            resp = client.get("/health")
        assert resp.status_code == 500


# ── /analyze/team ────────────────────────────────────────────────────────────

class TestAnalyzeTeam:
    def test_returns_synergy_result(self):
        mock_engine = MagicMock()
        mock_engine.analyze_team_synergy.return_value = {"synergy_percent": 72.5, "pairs": {}}
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/analyze/team", json={"team": ["Pikachu", "Charizard"]})
        assert resp.status_code == 200
        assert resp.json()["synergy_percent"] == 72.5

    def test_uses_top_n_from_request(self):
        mock_engine = MagicMock()
        mock_engine.analyze_team_synergy.return_value = {}
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/analyze/team", json={"team": ["A", "B"], "top_n": 5})
        assert resp.status_code == 200
        mock_engine.analyze_team_synergy.assert_called_once_with(["A", "B"])

    def test_500_when_no_raw_data(self):
        with patch("app.load_latest_external_raw", side_effect=Exception("No external_raw rows")):
            resp = client.post("/analyze/team", json={"team": ["Pikachu"]})
        assert resp.status_code == 500


# ── /recommend/teammate ──────────────────────────────────────────────────────

class TestRecommendTeammate:
    def test_returns_recommendations(self):
        mock_engine = MagicMock()
        mock_engine.recommend_teammate.return_value = {"recommendations": {"Garchomp": 0.8}}
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/recommend/teammate", json={"team": ["Pikachu"], "top_n": 3})
        assert resp.status_code == 200
        mock_engine.recommend_teammate.assert_called_once_with(["Pikachu"], top_n=3)

    def test_default_top_n_is_3(self):
        mock_engine = MagicMock()
        mock_engine.recommend_teammate.return_value = {}
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/recommend/teammate", json={"team": ["A"]})
        mock_engine.recommend_teammate.assert_called_once_with(["A"], top_n=3)

    def test_500_on_engine_error(self):
        with patch("app.load_latest_external_raw", side_effect=Exception("fail")):
            resp = client.post("/recommend/teammate", json={"team": ["A"]})
        assert resp.status_code == 500


# ── /recommend/build ─────────────────────────────────────────────────────────

class TestRecommendBuild:
    def test_returns_build_for_pokemon(self):
        mock_engine = MagicMock()
        mock_engine.recommend_build.return_value = {"moves": ["Thunderbolt"], "item": "Choice Specs"}
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/recommend/build", json={"name": "Pikachu"})
        assert resp.status_code == 200
        mock_engine.recommend_build.assert_called_once_with("Pikachu")

    def test_500_on_engine_error(self):
        with patch("app.load_latest_external_raw", side_effect=Exception("fail")):
            resp = client.post("/recommend/build", json={"name": "X"})
        assert resp.status_code == 500


# ── /recommend/builds ────────────────────────────────────────────────────────

class TestRecommendBuilds:
    def test_returns_teams(self):
        mock_engine = MagicMock()
        mock_engine.recommend_teams.return_value = [["A", "B", "C"]]
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/recommend/builds", json={"seeds": ["Pikachu"], "top_k": 2, "team_size": 6})
        assert resp.status_code == 200
        mock_engine.recommend_teams.assert_called_once_with(seeds=["Pikachu"], top_k=2, team_size=6)

    def test_defaults_are_applied(self):
        mock_engine = MagicMock()
        mock_engine.recommend_teams.return_value = []
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/recommend/builds", json={})
        mock_engine.recommend_teams.assert_called_once_with(seeds=[], top_k=3, team_size=6)

    def test_500_on_error(self):
        with patch("app.load_latest_external_raw", side_effect=Exception("fail")):
            resp = client.post("/recommend/builds", json={})
        assert resp.status_code == 500


# ── /store/synergy ───────────────────────────────────────────────────────────

class TestStoreSynergy:
    def _make_engine(self, score=0.5):
        import pandas as pd
        engine = MagicMock()
        engine.synergy_matrix = pd.DataFrame(
            [[0.0, score], [score, 0.0]],
            index=["Pikachu", "Charizard"],
            columns=["Pikachu", "Charizard"],
        )
        return engine

    def test_400_for_fewer_than_2_pokemon(self):
        mock_engine = MagicMock()
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/store/synergy", json={"team": ["Pikachu"]})
        assert resp.status_code == 400

    def test_inserts_pairs_into_db(self):
        mock_engine = self._make_engine(score=0.6)

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [
            (1,),   # id_a for Pikachu
            (6,),   # id_b for Charizard
            None,   # no existing synergy_data row
        ]
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        with patch("app.load_latest_external_raw", return_value=mock_engine), \
             patch("app.get_conn", return_value=mock_conn):
            resp = client.post("/store/synergy", json={"team": ["Pikachu", "Charizard"]})

        assert resp.status_code == 200
        data = resp.json()
        assert "inserted" in data

    def test_skips_pokemon_not_in_db(self):
        mock_engine = self._make_engine()

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [
            None,  # Pikachu not in pokemon table
            None,  # Charizard not in pokemon table
        ]
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        with patch("app.load_latest_external_raw", return_value=mock_engine), \
             patch("app.get_conn", return_value=mock_conn):
            resp = client.post("/store/synergy", json={"team": ["Pikachu", "Charizard"]})

        assert resp.status_code == 200
        assert resp.json()["skipped"] == 1

    def test_500_on_engine_error(self):
        with patch("app.load_latest_external_raw", side_effect=Exception("no data")):
            resp = client.post("/store/synergy", json={"team": ["A", "B"]})
        assert resp.status_code == 500


# ── /reload ──────────────────────────────────────────────────────────────────

class TestReload:
    def test_reloads_successfully(self):
        mock_engine = MagicMock()
        with patch("app.load_latest_external_raw", return_value=mock_engine):
            resp = client.post("/reload")
        assert resp.status_code == 200
        assert resp.json()["reloaded"] is True

    def test_500_when_no_raw_data(self):
        with patch("app.load_latest_external_raw", side_effect=Exception("No external_raw rows")):
            resp = client.post("/reload")
        assert resp.status_code == 500


# ── get_conn ─────────────────────────────────────────────────────────────────

class TestGetConn:
    def test_calls_psycopg2_connect(self):
        import psycopg2
        with patch("psycopg2.connect") as mock_connect:
            mock_connect.return_value = MagicMock()
            import app as app_module
            conn = app_module.get_conn()
            mock_connect.assert_called_once()


# ── load_latest_external_raw ──────────────────────────────────────────────────

class TestLoadLatestExternalRaw:
    def _make_mock_conn(self, fetchone_return):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = fetchone_return
        mock_conn = MagicMock()
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        return mock_conn

    def test_raises_when_no_rows(self):
        mock_conn = self._make_mock_conn(fetchone_return=None)
        import app as app_module
        with patch("app.get_conn", return_value=mock_conn):
            with pytest.raises(Exception, match="No external_raw rows"):
                app_module.load_latest_external_raw()

    def test_returns_cached_engine_when_id_matches(self):
        import app as app_module
        saved_engine = app_module._engine
        saved_id = app_module._raw_loaded_id
        try:
            mock_engine = MagicMock()
            app_module._engine = mock_engine
            app_module._raw_loaded_id = 99
            mock_conn = self._make_mock_conn(fetchone_return=(99, []))
            with patch("app.get_conn", return_value=mock_conn):
                result = app_module.load_latest_external_raw()
            assert result is mock_engine
        finally:
            app_module._engine = saved_engine
            app_module._raw_loaded_id = saved_id

    def test_creates_new_engine_when_id_differs(self):
        import app as app_module
        saved_engine = app_module._engine
        saved_id = app_module._raw_loaded_id
        try:
            app_module._engine = None
            app_module._raw_loaded_id = None
            mock_conn = self._make_mock_conn(fetchone_return=(55, [{"name": "pikachu", "team": []}]))
            with patch("app.get_conn", return_value=mock_conn), \
                 patch("app.PokemonAnalyticsEngine") as MockEngine:
                MockEngine.return_value = MagicMock()
                result = app_module.load_latest_external_raw()
            assert result is MockEngine.return_value
            assert app_module._raw_loaded_id == 55
        finally:
            app_module._engine = saved_engine
            app_module._raw_loaded_id = saved_id


# ── /store/synergy — extra branches ──────────────────────────────────────────

class TestStoreSynergyExtra:
    def _make_engine_for_extra(self):
        import pandas as pd
        engine = MagicMock()
        # Pikachu and Charizard in matrix; 'Unknown' is NOT in matrix
        engine.synergy_matrix = pd.DataFrame(
            [[0.0, 0.5], [0.5, 0.0]],
            index=["Pikachu", "Charizard"],
            columns=["Pikachu", "Charizard"],
        )
        return engine

    def test_updates_existing_synergy_row(self):
        """Covers the UPDATE branch when synergy_data row already exists."""
        mock_engine = self._make_engine_for_extra()

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [
            (1,),   # id_a for Pikachu
            (6,),   # id_b for Charizard
            (42,),  # existing synergy_data row id
        ]
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        with patch("app.load_latest_external_raw", return_value=mock_engine), \
             patch("app.get_conn", return_value=mock_conn):
            resp = client.post("/store/synergy", json={"team": ["Pikachu", "Charizard"]})

        assert resp.status_code == 200

    def test_score_fallback_when_neither_order_in_matrix(self):
        """Covers else: score = 0.0 when neither poke is in matrix."""
        import pandas as pd
        engine = MagicMock()
        engine.synergy_matrix = pd.DataFrame([], index=[], columns=[])

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [
            (1,),   # id_a for A
            (2,),   # id_b for B
            None,   # no existing row
        ]
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        with patch("app.load_latest_external_raw", return_value=engine), \
             patch("app.get_conn", return_value=mock_conn):
            resp = client.post("/store/synergy", json={"team": ["A", "B"]})

        assert resp.status_code == 200
