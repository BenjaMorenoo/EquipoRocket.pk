ms_asistencia

FastAPI microservice providing assisted team-building recommendations based on external_raw data stored in the main DB (table `external_raw`).

Endpoints:
- GET /health
- POST /analyze/team { team: ["Pikachu","Charizard"] }
- POST /recommend/teammate { team: [...], top_n: 3 }
- POST /recommend/build { name: "Pikachu" }
- POST /reload  (force reload from DB)

Env vars (via .env or Docker):
- PGHOST, PGPORT, PGUSER, PGPASSWORD, DB_NAME

Build & run (local):

python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8005

Docker:

docker build -t ms_asistencia:local .
docker run -e PGHOST=host.docker.internal -e PGPASSWORD=... -p 8005:8005 ms_asistencia:local
