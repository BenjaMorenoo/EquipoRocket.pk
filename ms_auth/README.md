# ms_auth (registro)

Este microservicio expone solo `POST /api/auth/register` para crear usuarios.

Uso con Docker (asume que `ms_db` está levantado en la red `equiporocket-net`):

1. Copiar ejemplo de variables de entorno:

```bash
cp .env.example .env
# editar .env y poner DB_PASSWORD correcto
```

2. Crear la red si no existe:

```bash
./scripts/create_network.sh
# o en PowerShell: .\scripts\create_network.ps1
```

3. Levantar `ms_auth`:

```bash
cd ms_auth
docker compose up -d --build
```

4. Probar registro:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"prueba","email":"prueba@example.com","password":"secret"}'
```
