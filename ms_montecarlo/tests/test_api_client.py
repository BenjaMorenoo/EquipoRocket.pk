"""Tests para api_client.py — cubre fetch_api y list_pokemon_entries."""
import pytest
from unittest.mock import MagicMock, patch
import api_client


class TestFetchApi:
    def test_returns_json_on_success(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = [{"name": "pikachu"}]
        with patch("api_client.requests.get", return_value=mock_resp) as mock_get:
            result = api_client.fetch_api("http://example.com/api")
        mock_get.assert_called_once_with("http://example.com/api", timeout=15)
        mock_resp.raise_for_status.assert_called_once()
        assert result == [{"name": "pikachu"}]

    def test_raises_on_http_error(self):
        import requests
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = requests.HTTPError("404")
        with patch("api_client.requests.get", return_value=mock_resp):
            with pytest.raises(requests.HTTPError):
                api_client.fetch_api("http://example.com/bad")

    def test_custom_timeout(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        with patch("api_client.requests.get", return_value=mock_resp) as mock_get:
            api_client.fetch_api("http://x.com", timeout=5)
        mock_get.assert_called_once_with("http://x.com", timeout=5)


class TestListPokemonEntries:
    def test_list_input_returned_as_is(self):
        data = [{"name": "bulbasaur"}, {"name": "ivysaur"}]
        result = api_client.list_pokemon_entries(data)
        assert result == data

    def test_dict_with_pokemon_key(self):
        data = {"pokemon": [{"name": "charmander"}]}
        result = api_client.list_pokemon_entries(data)
        assert result == [{"name": "charmander"}]

    def test_dict_with_data_key(self):
        data = {"data": [{"name": "squirtle"}]}
        result = api_client.list_pokemon_entries(data)
        assert result == [{"name": "squirtle"}]

    def test_dict_with_results_key(self):
        data = {"results": [{"name": "caterpie"}]}
        result = api_client.list_pokemon_entries(data)
        assert result == [{"name": "caterpie"}]

    def test_dict_with_entries_key(self):
        data = {"entries": [{"name": "metapod"}]}
        result = api_client.list_pokemon_entries(data)
        assert result == [{"name": "metapod"}]

    def test_dict_without_known_key_wraps_as_entry(self):
        data = {"name": "pikachu", "id": 25}
        result = api_client.list_pokemon_entries(data)
        assert result == [data]

    def test_neither_list_nor_dict_returns_empty(self):
        assert api_client.list_pokemon_entries("string") == []
        assert api_client.list_pokemon_entries(42) == []
        assert api_client.list_pokemon_entries(None) == []
