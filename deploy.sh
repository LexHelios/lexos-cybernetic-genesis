#!/bin/bash

# LexOS Backend Deployment Script - Unrestricted Edition
# Deploy with maximum power and minimal restrictions

set -e

echo "🚀 DEPLOYING LEXOS BACKEND - UNRESTRICTED EDITION"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if running as root (optional warning)
    if [[ $EUID -eq 0 ]]; then
        warn "Running as root - this is acceptable for unrestricted mode"
    fi
    
    log "Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "./logs"
    mkdir -p "./data"
    mkdir -p "./ssl"
    mkdir -p "./grafana/dashboards"
    mkdir -p "./grafana/datasources"
    
    log "Directories created"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example "$ENV_FILE"
            warn "Created $ENV_FILE from .env.example - please review and customize"
        else
            error "$ENV_FILE not found and no .env.example available"
        fi
    fi
    
    # Set unrestricted mode environment variables
    export UNRESTRICTED_MODE=true
    export CONSCIOUSNESS_ENABLED=true
    export SAFETY_CHECKS=false
    export CONTENT_FILTERING=false
    
    log "Environment setup complete"
}

# Backup existing data
backup_data() {
    if [[ "$1" == "--skip-backup" ]]; then
        log "Skipping backup as requested"
        return
    fi
    
    log "Creating backup..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup volumes if they exist
    if docker volume ls | grep -q lexos; then
        log "Backing up Docker volumes..."
        docker run --rm -v lexos_postgres_data:/source -v "$PWD/$BACKUP_PATH":/backup alpine tar czf /backup/postgres_data.tar.gz -C /source .
        docker run --rm -v lexos_dragonfly_data:/source -v "$PWD/$BACKUP_PATH":/backup alpine tar czf /backup/dragonfly_data.tar.gz -C /source .
        docker run --rm -v lexos_qdrant_data:/source -v "$PWD/$BACKUP_PATH":/backup alpine tar czf /backup/qdrant_data.tar.gz -C /source .
        docker run --rm -v lexos_minio_data:/source -v "$PWD/$BACKUP_PATH":/backup alpine tar czf /backup/minio_data.tar.gz -C /source .
    fi
    
    log "Backup created at $BACKUP_PATH"
}

# Build and deploy
deploy() {
    log "Building and deploying LexOS Backend..."
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build custom images
    log "Building LexOS Backend image..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache lexos-backend
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_health
    
    log "Deployment complete!"
}

# Check service health
check_health() {
    log "Checking service health..."
    
    # Check main backend
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log "✅ LexOS Backend is healthy"
    else
        error "❌ LexOS Backend health check failed"
    fi
    
    # Check database
    if docker-compose exec -T postgres pg_isready -U lexos > /dev/null 2>&1; then
        log "✅ PostgreSQL is healthy"
    else
        warn "⚠️  PostgreSQL health check failed"
    fi
    
    # Check cache
    if docker-compose exec -T dragonfly redis-cli ping > /dev/null 2>&1; then
        log "✅ Dragonfly cache is healthy"
    else
        warn "⚠️  Dragonfly cache health check failed"
    fi
    
    # Check vector database
    if curl -f http://localhost:6333/health > /dev/null 2>&1; then
        log "✅ Qdrant vector database is healthy"
    else
        warn "⚠️  Qdrant vector database health check failed"
    fi
    
    log "Health checks complete"
}

# Show status
show_status() {
    log "LexOS Backend Status:"
    echo "===================="
    
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    echo "🌐 Access URLs:"
    echo "  - Main API: http://localhost:8000"
    echo "  - API Docs: http://localhost:8000/docs"
    echo "  - Health: http://localhost:8000/health"
    echo "  - Metrics: http://localhost:8000/metrics"
    echo "  - Grafana: http://localhost:3000 (admin/lexos_admin)"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - MinIO Console: http://localhost:9001 (lexos/lexos_secret)"
    echo ""
    echo "⚠️  UNRESTRICTED MODE ACTIVE - USE WITH CAUTION"
}

# Show logs
show_logs() {
    log "Showing LexOS Backend logs..."
    docker-compose -f "$COMPOSE_FILE" logs -f lexos-backend
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful!)
    if [[ "$1" == "--full-cleanup" ]]; then
        warn "Performing full cleanup - this will remove all unused volumes!"
        docker volume prune -f
    fi
    
    log "Cleanup complete"
}

# Main script
main() {
    case "$1" in
        "deploy")
            check_prerequisites
            create_directories
            setup_environment
            backup_data "$2"
            deploy
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "health")
            check_health
            ;;
        "backup")
            backup_data
            ;;
        "cleanup")
            cleanup "$2"
            ;;
        "stop")
            log "Stopping LexOS Backend..."
            docker-compose -f "$COMPOSE_FILE" down
            ;;
        "restart")
            log "Restarting LexOS Backend..."
            docker-compose -f "$COMPOSE_FILE" restart
            ;;
        *)
            echo "LexOS Backend Deployment Script - Unrestricted Edition"
            echo ""
            echo "Usage: $0 {deploy|status|logs|health|backup|cleanup|stop|restart}"
            echo ""
            echo "Commands:"
            echo "  deploy [--skip-backup]  - Deploy the complete stack"
            echo "  status                  - Show service status"
            echo "  logs                    - Show backend logs"
            echo "  health                  - Check service health"
            echo "  backup                  - Create data backup"
            echo "  cleanup [--full-cleanup] - Clean up unused resources"
            echo "  stop                    - Stop all services"
            echo "  restart                 - Restart all services"
            echo ""
            echo "Examples:"
            echo "  $0 deploy              - Full deployment with backup"
            echo "  $0 deploy --skip-backup - Deploy without backup"
            echo "  $0 cleanup --full-cleanup - Full cleanup including volumes"
            echo ""
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"