
#!/bin/bash

# LexOS Database Backup Script
# Creates automated backups of the SQLite database with rotation

BACKUP_DIR="/home/ubuntu/lexos-cybernetic-genesis/backups"
DB_PATH="/home/ubuntu/lexos-cybernetic-genesis/backend/data/lexos.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/lexos_backup_$TIMESTAMP.db"
LOG_FILE="/var/log/lexos-backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to create backup
create_backup() {
    log_message "Starting database backup..."
    
    if [ ! -f "$DB_PATH" ]; then
        log_message "ERROR: Database file not found at $DB_PATH"
        return 1
    fi
    
    # Create backup using SQLite backup command for consistency
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
    
    if [ $? -eq 0 ]; then
        # Compress the backup
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        
        # Verify backup integrity
        if [ -f "$BACKUP_FILE" ]; then
            local backup_size=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
            log_message "SUCCESS: Backup created successfully ($backup_size bytes): $BACKUP_FILE"
            return 0
        else
            log_message "ERROR: Backup file not found after creation"
            return 1
        fi
    else
        log_message "ERROR: Failed to create database backup"
        return 1
    fi
}

# Function to rotate old backups
rotate_backups() {
    log_message "Rotating old backups..."
    
    # Keep last 7 daily backups
    find "$BACKUP_DIR" -name "lexos_backup_*.db.gz" -mtime +7 -delete
    
    # Keep last 4 weekly backups (older than 7 days but newer than 28 days)
    find "$BACKUP_DIR" -name "lexos_backup_*.db.gz" -mtime +28 -delete
    
    local remaining_backups=$(find "$BACKUP_DIR" -name "lexos_backup_*.db.gz" | wc -l)
    log_message "Backup rotation complete. $remaining_backups backups remaining."
}

# Function to verify database integrity
verify_database() {
    log_message "Verifying database integrity..."
    
    local integrity_check=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null)
    
    if [ "$integrity_check" = "ok" ]; then
        log_message "Database integrity check passed"
        return 0
    else
        log_message "WARNING: Database integrity check failed: $integrity_check"
        return 1
    fi
}

# Function to get database statistics
get_db_stats() {
    if [ -f "$DB_PATH" ]; then
        local db_size=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null)
        local table_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null)
        local user_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null)
        local agent_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM agents;" 2>/dev/null)
        
        log_message "Database stats: Size=${db_size} bytes, Tables=${table_count}, Users=${user_count}, Agents=${agent_count}"
    fi
}

# Function to create emergency backup
emergency_backup() {
    log_message "Creating emergency backup..."
    local emergency_file="$BACKUP_DIR/lexos_emergency_$(date +%s).db"
    
    cp "$DB_PATH" "$emergency_file" 2>/dev/null
    if [ $? -eq 0 ]; then
        gzip "$emergency_file"
        log_message "Emergency backup created: ${emergency_file}.gz"
    else
        log_message "ERROR: Failed to create emergency backup"
    fi
}

# Main execution
main() {
    log_message "=== LexOS Database Backup Started ==="
    
    # Check if database is locked (backup during low activity)
    local lock_check=$(sqlite3 "$DB_PATH" "BEGIN IMMEDIATE; ROLLBACK;" 2>&1)
    if [[ "$lock_check" == *"database is locked"* ]]; then
        log_message "WARNING: Database is locked, waiting 30 seconds..."
        sleep 30
    fi
    
    # Verify database integrity before backup
    if ! verify_database; then
        emergency_backup
        log_message "ERROR: Database integrity check failed, emergency backup created"
        exit 1
    fi
    
    # Get database statistics
    get_db_stats
    
    # Create backup
    if create_backup; then
        # Rotate old backups
        rotate_backups
        log_message "=== Backup process completed successfully ==="
    else
        log_message "=== Backup process failed ==="
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "emergency")
        emergency_backup
        ;;
    "verify")
        verify_database
        ;;
    "stats")
        get_db_stats
        ;;
    *)
        main
        ;;
esac
