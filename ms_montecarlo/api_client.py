"""Cliente simple para descargar y mapear los datos de la API de Pikalytics."""
import requests


def fetch_api(url, timeout=15):
    """Descarga la respuesta JSON desde la API dada y la devuelve como objeto Python.

    Lanza requests.HTTPError si la petición falla.
    """
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json()


def list_pokemon_entries(api_json):
    """Normaliza la respuesta y devuelve una lista de entradas de Pokémon.

    La API puede devolver una lista directamente; en ese caso la devolvemos.
    Si viene un diccionario con una clave de lista común, intentamos usarla.
    """
    if isinstance(api_json, list):
        return api_json
    if isinstance(api_json, dict):
        # claves comunes en respuestas de Pikalytics
        for k in ("pokemon", "data", "results", "entries"):
            if k in api_json and isinstance(api_json[k], list):
                return api_json[k]
        # si el dict parece ser ya la entrada de un pokémon, envuélvelo
        return [api_json]
    return []
