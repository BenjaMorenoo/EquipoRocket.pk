#!/bin/bash

# Docker Deployment Helper Script for EquipoRocket.pk
# This script provides convenient commands for managing the Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Commands
case "${1}" in
    up)
        print_header "Starting EquipoRocket Services"
        docker-compose up -d
        print_success "All services started"
        echo ""
        echo "Frontend: http://localhost:3000"
        echo "Auth API: http://localhost:3001"
        echo "Pokemon API: http://localhost:3002"
        echo "Users API: http://localhost:3003"
        ;;
    
    down)
        print_header "Stopping EquipoRocket Services"
        docker-compose down
        print_success "All services stopped"
        ;;
    
    clean)
        print_header "Cleaning EquipoRocket Services"
        print_warning "This will remove all containers and volumes"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            print_success "All services and data removed"
        else
            echo "Cancelled"
        fi
        ;;
    
    logs)
        service="${2:-}"
        if [ -z "$service" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f "$service"
        fi
        ;;
    
    status)
        print_header "Service Status"
        docker-compose ps
        ;;
    
    build)
        print_header "Building Images"
        docker-compose build --no-cache
        print_success "Build completed"
        ;;
    
    rebuild)
        print_header "Rebuilding and Restarting Services"
        docker-compose up -d --build
        print_success "Services rebuilt and restarted"
        ;;
    
    restart)
        service="${2:-}"
        if [ -z "$service" ]; then
            print_header "Restarting All Services"
            docker-compose restart
            print_success "All services restarted"
        else
            print_header "Restarting $service"
            docker-compose restart "$service"
            print_success "$service restarted"
        fi
        ;;
    
    shell)
        service="${2:-frontend}"
        print_header "Accessing $service Shell"
        docker-compose exec "$service" sh
        ;;
    
    test)
        print_header "Testing Service Connectivity"
        
        echo "Testing Frontend..."
        if curl -s http://localhost:3000 > /dev/null; then
            print_success "Frontend is responding"
        else
            print_error "Frontend is not responding"
        fi
        
        echo "Testing Auth API..."
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            print_success "Auth API is responding"
        else
            print_warning "Auth API health check not available"
        fi
        
        echo "Testing Pokemon API..."
        if curl -s http://localhost:3002/health > /dev/null 2>&1; then
            print_success "Pokemon API is responding"
        else
            print_warning "Pokemon API health check not available"
        fi
        
        echo "Testing Users API..."
        if curl -s http://localhost:3003/health > /dev/null 2>&1; then
            print_success "Users API is responding"
        else
            print_warning "Users API health check not available"
        fi
        
        echo "Testing Database..."
        if docker exec postgres pg_isready -U postgres > /dev/null 2>&1; then
            print_success "Database is responding"
        else
            print_error "Database is not responding"
        fi
        ;;
    
    help)
        print_header "EquipoRocket Docker Helper Commands"
        echo ""
        echo "Usage: ./docker-helper.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  up                 Start all services"
        echo "  down               Stop all services"
        echo "  clean              Stop and remove all services and volumes"
        echo "  status             Show status of all services"
        echo "  logs [service]     Show logs (all services or specific)"
        echo "  build              Build all Docker images"
        echo "  rebuild            Rebuild and restart all services"
        echo "  restart [service]  Restart services (all or specific)"
        echo "  shell [service]    Access container shell (default: frontend)"
        echo "  test               Test connectivity to all services"
        echo "  help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./docker-helper.sh up"
        echo "  ./docker-helper.sh logs frontend"
        echo "  ./docker-helper.sh restart ms_pokemon"
        echo "  ./docker-helper.sh shell ms_usuarios"
        ;;
    
    *)
        print_error "Unknown command: $1"
        echo "Run './docker-helper.sh help' for available commands"
        exit 1
        ;;
esac
