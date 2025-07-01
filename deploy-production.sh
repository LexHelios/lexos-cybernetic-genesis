#!/bin/bash

# LexOS Genesis Production Deployment Script
# This script deploys the application to the production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if production environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Production environment file ($ENV_FILE) not found"
        log_info "Please copy .env.production.example to .env.production and configure it"
        exit 1
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Production compose file ($COMPOSE_FILE) not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current deployment
backup_current() {
    log_info "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup volumes if they exist
    if docker volume ls | grep -q "lexos"; then
        log_info "Backing up Docker volumes..."
        docker run --rm -v postgres_data:/source -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /source .
        docker run --rm -v redis_data:/source -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/redis_data.tar.gz -C /source .
        docker run --rm -v grafana_data:/source -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/grafana_data.tar.gz -C /source .
    fi
    
    # Backup configuration files
    cp "$ENV_FILE" "$BACKUP_DIR/"
    cp "$COMPOSE_FILE" "$BACKUP_DIR/"
    
    log_success "Backup created at $BACKUP_DIR"
}

# Validate environment configuration
validate_environment() {
    log_info "Validating environment configuration..."
    
    # Source the environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check critical environment variables
    REQUIRED_VARS=(
        "DATABASE_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "SESSION_SECRET"
        "GRAFANA_ADMIN_PASSWORD"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
        
        # Check if it's still a placeholder
        if [[ "${!var}" == *"CHANGE_THIS"* ]]; then
            log_error "Environment variable $var still contains placeholder value"
            exit 1
        fi
    done
    
    log_success "Environment validation passed"
}

# Pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    log_success "Images pulled successfully"
}

# Build custom images
build_images() {
    log_info "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    log_success "Images built successfully"
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."
    
    # Start infrastructure services first
    log_info "Starting infrastructure services (PostgreSQL, Redis)..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 30
    
    # Start monitoring services
    log_info "Starting monitoring services..."
    docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana jaeger
    
    # Start application services
    log_info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d backend-1 backend-2 backend-3 frontend
    
    # Start reverse proxy
    log_info "Starting reverse proxy..."
    docker-compose -f "$COMPOSE_FILE" up -d nginx
    
    log_success "All services deployed"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    # Wait for services to start
    sleep 60
    
    # Check backend health
    for i in {1..3}; do
        port=$((3000 + i))
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            log_success "Backend-$i health check passed"
        else
            log_warning "Backend-$i health check failed"
        fi
    done
    
    # Check frontend
    if curl -f -s "http://localhost:8080" > /dev/null; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed"
    fi
    
    # Check monitoring services
    if curl -f -s "http://localhost:9090" > /dev/null; then
        log_success "Prometheus health check passed"
    else
        log_warning "Prometheus health check failed"
    fi
    
    if curl -f -s "http://localhost:3000" > /dev/null; then
        log_success "Grafana health check passed"
    else
        log_warning "Grafana health check failed"
    fi
    
    if curl -f -s "http://localhost:16686" > /dev/null; then
        log_success "Jaeger health check passed"
    else
        log_warning "Jaeger health check failed"
    fi
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    log_info "Service URLs:"
    echo "  Frontend: http://147.185.40.39:20065"
    echo "  Backend API: http://147.185.40.39:20067"
    echo "  Prometheus: http://147.185.40.39:20061"
    echo "  Grafana: http://147.185.40.39:20064"
    echo "  Jaeger: http://147.185.40.39:20062"
    echo ""
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting LexOS Genesis production deployment..."
    
    check_prerequisites
    validate_environment
    backup_current
    pull_images
    build_images
    deploy_services
    health_check
    show_status
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Please verify all services are working correctly"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log_info "Stopping all services..."
        docker-compose -f "$COMPOSE_FILE" down
        log_success "All services stopped"
        ;;
    "restart")
        log_info "Restarting all services..."
        docker-compose -f "$COMPOSE_FILE" restart
        log_success "All services restarted"
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "status")
        show_status
        ;;
    "backup")
        backup_current
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|status|backup|health}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show logs (optionally specify service)"
        echo "  status  - Show deployment status"
        echo "  backup  - Create backup only"
        echo "  health  - Run health checks only"
        exit 1
        ;;
esac