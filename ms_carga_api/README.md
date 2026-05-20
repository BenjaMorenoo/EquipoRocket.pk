Documentación del microservicio `ms_carga_api`

Este servicio descarga un JSON desde una API externa (por defecto la URL en `.env`) y almacena dos cosas en la base de datos `equiporocketDb`:

- El `payload` completo en una tabla `external_raw` (columna `payload` como JSONB).
- Intentos de normalizar e insertar datos en tablas existentes (`types`, `pokemon`, ...). El mapeo es conservador y puede requerir ajustes según la estructura exacta del JSON externo.

Requisitos
- Python 3.10+
- Crear y activar un entorno virtual (ejemplo abajo)

Instalación y entorno virtual

```bash
cd ms_carga_api
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# o Windows cmd
.\.venv\Scripts\activate.bat
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# editar .env si es necesario (PGHOST, PGPASSWORD, API_URL)
```

Ejecutar el servicio

```bash
# en entorno virtual
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# o desde el contenedor (si tienes Postgres corriendo y accesible):
# curl -X POST "http://localhost:8000/load" -H "Content-Type: application/json" -d "{ \"url\": \"<la_url_o_use_default>\" }"
```

Uso
- `POST /load` con body JSON opcional `{ "url": "https://..." }` descarga la URL, guarda el JSON y trata de insertar datos normalizados.

Uso con Docker Compose

```bash
cd ms_carga_api
docker compose up --build
```

Esto levantará un contenedor `postgres` y el servicio `ms_carga_api`. El servicio esperará a que Postgres acepte conexiones y luego arrancará `uvicorn`.

Nota sobre redes Docker

Este servicio está diseñado para unirse a la red Docker externa `equiporocket-net` para comunicarse con otros microservicios como `ms_db`. Si estás usando composes separados, crea la red una sola vez con los scripts en la raíz del repositorio:

PowerShell:

```powershell
.\scripts\create_network.ps1
```

Bash:

```bash
./scripts/create_network.sh
```

Si en lugar de red externa prefieres levantar varios compose juntos, puedes combinar archivos con:

```bash
docker compose -f ms_db/docker-compose.yml -f ms_carga_api/docker-compose.yml up --build
```

