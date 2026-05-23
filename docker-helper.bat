@echo off
REM Docker Deployment Helper Script for EquipoRocket.pk (Windows)
REM This script provides convenient commands for managing the Docker deployment

setlocal enabledelayedexpansion

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

if "%1"=="" (
    echo Use docker-helper.bat help for available commands
    exit /b 1
)

if "%1"=="up" (
    echo Starting EquipoRocket Services...
    docker-compose up -d
    if errorlevel 1 goto error
    echo.
    echo Frontend:       http://localhost:3000
    echo Auth API:       http://localhost:3001
    echo Pokemon API:    http://localhost:3002
    echo Users API:      http://localhost:3003
    echo Data Loading:   http://localhost:3004
    echo Monte Carlo:    http://localhost:3005
    echo Attendance:     http://localhost:3006
    echo Database:       localhost:5432
    goto :eof
)

if "%1"=="down" (
    echo Stopping EquipoRocket Services...
    docker-compose down
    if errorlevel 1 goto error
    goto :eof
)

if "%1"=="clean" (
    echo Stopping and removing all services and volumes...
    docker-compose down -v
    if errorlevel 1 goto error
    goto :eof
)

if "%1"=="logs" (
    if "%2"=="" (
        docker-compose logs -f
    ) else (
        docker-compose logs -f %2
    )
    goto :eof
)

if "%1"=="status" (
    docker-compose ps
    goto :eof
)

if "%1"=="build" (
    echo Building Docker images...
    docker-compose build --no-cache
    if errorlevel 1 goto error
    goto :eof
)

if "%1"=="rebuild" (
    echo Rebuilding and restarting services...
    docker-compose up -d --build
    if errorlevel 1 goto error
    goto :eof
)

if "%1"=="restart" (
    if "%2"=="" (
        echo Restarting all services...
        docker-compose restart
    ) else (
        echo Restarting %2...
        docker-compose restart %2
    )
    if errorlevel 1 goto error
    goto :eof
)

if "%1"=="shell" (
    set "service=frontend"
    if not "%2"=="" set "service=%2"
    docker-compose exec %service% sh
    goto :eof
)

if "%1"=="test" (
    echo Testing service connectivity...
    echo.
    echo Testing Frontend...
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing; write-host 'Frontend is responding' -ForegroundColor Green } catch { write-host 'Frontend is not responding' -ForegroundColor Red }"
    
    echo Testing Auth API...
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing; write-host 'Auth API is responding' -ForegroundColor Green } catch { write-host 'Auth API health check not available' -ForegroundColor Yellow }"
    
    echo Testing Pokemon API...
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:3002/health' -UseBasicParsing; write-host 'Pokemon API is responding' -ForegroundColor Green } catch { write-host 'Pokemon API health check not available' -ForegroundColor Yellow }"
    
    echo Testing Users API...
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:3003/health' -UseBasicParsing; write-host 'Users API is responding' -ForegroundColor Green } catch { write-host 'Users API health check not available' -ForegroundColor Yellow }"
    
    echo Testing Database...
    docker exec postgres pg_isready -U postgres >nul 2>&1
    if errorlevel 0 (
        echo Database is responding
    ) else (
        echo Database is not responding
    )
    goto :eof
)

if "%1"=="help" (
    echo.
    echo EquipoRocket Docker Helper Commands
    echo ====================================
    echo.
    echo Usage: docker-helper.bat [command] [options]
    echo.
    echo Commands:
    echo   up                 Start all services
    echo   down               Stop all services
    echo   clean              Stop and remove all services and volumes
    echo   status             Show status of all services
    echo   logs [service]     Show logs (all services or specific^)
    echo   build              Build all Docker images
    echo   rebuild            Rebuild and restart all services
    echo   restart [service]  Restart services (all or specific^)
    echo   shell [service]    Access container shell (default: frontend^)
    echo   test               Test connectivity to all services
    echo   help               Show this help message
    echo.
    echo Examples:
    echo   docker-helper.bat up
    echo   docker-helper.bat logs frontend
    echo   docker-helper.bat restart ms_pokemon
    echo   docker-helper.bat shell ms_usuarios
    echo.
    goto :eof
)

echo Unknown command: %1
echo Run "docker-helper.bat help" for available commands
exit /b 1

:error
echo Error executing command
exit /b 1
