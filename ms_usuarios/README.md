ms_usuarios
=============

Microservicio para gestión de equipos de usuario y edición de perfil.

Endpoints principales:
- `GET /api/teams` - lista equipos del usuario autenticado
- `POST /api/teams` - crea equipo (body: { name, format_id, pokemon: [{id,name}] })
- `GET /api/teams/:id` - ver equipo
- `PUT /api/teams/:id` - actualizar equipo
- `DELETE /api/teams/:id` - eliminar equipo
- `GET /api/users/me` - obtener perfil
- `PUT /api/users/me` - actualizar perfil

Autenticación: Bearer JWT (mismo `JWT_SECRET` que `ms_auth`).
