# Equipo Rocket - Guía de Despliegue de Microservicios

Este proyecto está estructurado utilizando una arquitectura de microservicios. Cada componente cuenta con su propio entorno aislado mediante **Docker**, y todos se comunican de forma interna a través de una red dedicada de Docker.



## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu sistema:
* [Docker Desktop](https://www.docker.com/products/docker-desktop) (con soporte para Docker Compose V2).
* Una terminal (PowerShell, Bash o CMD).



## Pasos para Arrancar el Proyecto

Para que el ecosistema funcione correctamente, es **estrictamente necesario** seguir el orden de los pasos descritos a continuación.

### Paso 1: Crear la Red Virtual de Docker
Los microservicios necesitan comunicarse entre sí de forma interna. Para ello, se debe crear primero una red compartida. 

Hemos incluido un script automatizado que se encarga de este proceso. Desde la raíz del proyecto, ejecuta:

* **En Linux/macOS:**
  ```bash
  bash ./scripts/create-network.sh

Para comprobar que la red se creó correctamente bajo el nombre configurado, ejecuta el siguiente comando: 
*```docker network ls

### Paso 2: Levantar los Microservicios y el Frontend
Cada microservicio y la aplicación del frontend residen en su propia carpeta independiente y contienen su propio archivo docker-compose.yml.

Por cada contenedor que desees iniciar, navega a su respectiva carpeta y ejecuta el comando de encendido:


#### 1. Navegar a la carpeta del servicio (Ejemplo con el frontend)
cd Frontend_EquipoRocket.pk

#### 2. Descargar la imagen y levantar el contenedor en segundo plano
docker compose up -d

Si necesitas detener los servicios, ingresa a la carpeta del servicio que quieras apagar y ejecuta:

    
    bash docker compose down