#!/bin/bash

# Gali-Parse Monitoring and Maintenance Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="gali-parse"
APP_DIR="/opt/$APP_NAME"
APP_USER="gali-parse"

echo -e "${BLUE}📊 Gali-Parse Monitoring and Maintenance${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  status                  Show application status"
    echo "  health                  Perform health check"
    echo "  logs                    Show application logs"
    echo "  metrics                 Show performance metrics"
    echo "  cleanup                 Clean up old files"
    echo "  backup                  Create data backup"
    echo "  restart                 Restart application"
    echo "  update                  Update application"
    echo "  monitor                 Start continuous monitoring"
    echo ""
    echo "Options:"
    echo "  --help                  Show this help message"
    echo "  --tail                  Follow logs (for logs command)"
    echo "  --days N                Number of days for cleanup (default: 30)"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs --tail"
    echo "  $0 cleanup --days 7"
    echo "  $0 monitor"
}

# Function to show application status
show_status() {
    echo -e "${YELLOW}📋 Application Status${NC}"
    echo -e "${BLUE}===================${NC}"
    
    # PM2 Status
    echo -e "\n${GREEN}PM2 Process Status:${NC}"
    pm2 status gali-parse 2>/dev/null || echo "  Application not running"
    
    # Service Status
    echo -e "\n${GREEN}System Services:${NC}"
    echo "  Nginx: $(systemctl is-active nginx 2>/dev/null || echo 'inactive')"
    echo "  Fail2Ban: $(systemctl is-active fail2ban 2>/dev/null || echo 'inactive')"
    
    # Port Status
    echo -e "\n${GREEN}Port Status:${NC}"
    local http_port=$(grep '^HTTP_PORT=' "$APP_DIR/env.production" 2>/dev/null | cut -d'=' -f2 || echo '3001')
    local tcp_port=$(grep '^TCP_PORT=' "$APP_DIR/env.production" 2>/dev/null | cut -d'=' -f2 || echo '3003')
    
    if netstat -tlnp | grep -q ":$http_port "; then
        echo "  HTTP Port $http_port: ✅ Active"
    else
        echo "  HTTP Port $http_port: ❌ Not listening"
    fi
    
    if netstat -tlnp | grep -q ":$tcp_port "; then
        echo "  TCP Port $tcp_port: ✅ Active"
    else
        echo "  TCP Port $tcp_port: ❌ Not listening"
    fi
    
    # Disk Usage
    echo -e "\n${GREEN}Disk Usage:${NC}"
    df -h "$APP_DIR" | tail -1 | awk '{print "  Application: " $3 " / " $2 " (" $5 " used)"}'
    df -h / | tail -1 | awk '{print "  System Root: " $3 " / " $2 " (" $5 " used)"}'
    
    # Memory Usage
    echo -e "\n${GREEN}Memory Usage:${NC}"
    free -h | grep "Mem:" | awk '{print "  Total: " $2 ", Used: " $3 ", Available: " $7}'
    
    # Load Average
    echo -e "\n${GREEN}System Load:${NC}"
    uptime | awk -F'load average:' '{print "  " $2}'
}

# Function to perform health check
perform_health_check() {
    echo -e "${YELLOW}🏥 Health Check${NC}"
    echo -e "${BLUE}===============${NC}"
    
    local http_port=$(grep '^HTTP_PORT=' "$APP_DIR/env.production" 2>/dev/null | cut -d'=' -f2 || echo '3001')
    local server_ip=$(hostname -I | awk '{print $1}')
    
    # Check HTTP endpoint
    echo -e "\n${GREEN}HTTP Health Check:${NC}"
    if curl -s -f "http://localhost:$http_port/api/auth/check" > /dev/null 2>&1; then
        echo "  ✅ HTTP API responding"
    else
        echo "  ❌ HTTP API not responding"
    fi
    
    # Check database
    echo -e "\n${GREEN}Database Health Check:${NC}"
    if [ -f "$APP_DIR/backend/data/prod.sqlite" ]; then
        local db_size=$(du -h "$APP_DIR/backend/data/prod.sqlite" | cut -f1)
        echo "  ✅ Database file exists (Size: $db_size)"
    else
        echo "  ❌ Database file not found"
    fi
    
    # Check logs for errors
    echo -e "\n${GREEN}Error Check:${NC}"
    local error_count=$(pm2 logs gali-parse --lines 100 2>/dev/null | grep -i error | wc -l)
    if [ $error_count -eq 0 ]; then
        echo "  ✅ No recent errors found"
    else
        echo "  ⚠️  Found $error_count recent errors"
    fi
    
    # Check disk space
    echo -e "\n${GREEN}Disk Space Check:${NC}"
    local disk_usage=$(df "$APP_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $disk_usage -lt 80 ]; then
        echo "  ✅ Disk usage: ${disk_usage}%"
    elif [ $disk_usage -lt 90 ]; then
        echo "  ⚠️  Disk usage: ${disk_usage}% (Warning)"
    else
        echo "  ❌ Disk usage: ${disk_usage}% (Critical)"
    fi
    
    # Check memory usage
    echo -e "\n${GREEN}Memory Check:${NC}"
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ $mem_usage -lt 80 ]; then
        echo "  ✅ Memory usage: ${mem_usage}%"
    elif [ $mem_usage -lt 90 ]; then
        echo "  ⚠️  Memory usage: ${mem_usage}% (Warning)"
    else
        echo "  ❌ Memory usage: ${mem_usage}% (Critical)"
    fi
}

# Function to show logs
show_logs() {
    local follow_flag=""
    
    # Check for --tail flag
    for arg in "$@"; do
        if [ "$arg" = "--tail" ]; then
            follow_flag="--tail"
            break
        fi
    done
    
    echo -e "${YELLOW}📋 Application Logs${NC}"
    echo -e "${BLUE}==================${NC}"
    
    if [ "$follow_flag" = "--tail" ]; then
        echo -e "${GREEN}Following logs (Ctrl+C to stop):${NC}"
        pm2 logs gali-parse --tail
    else
        echo -e "${GREEN}Recent logs (last 50 lines):${NC}"
        pm2 logs gali-parse --lines 50
    fi
}

# Function to show metrics
show_metrics() {
    echo -e "${YELLOW}📊 Performance Metrics${NC}"
    echo -e "${BLUE}=====================${NC}"
    
    # PM2 Metrics
    echo -e "\n${GREEN}PM2 Process Metrics:${NC}"
    pm2 show gali-parse 2>/dev/null | grep -E "(uptime|restarts|cpu|memory)" || echo "  Process not found"
    
    # System Metrics
    echo -e "\n${GREEN}System Metrics:${NC}"
    echo "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "  Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
    echo "  Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    
    # Network Connections
    echo -e "\n${GREEN}Network Connections:${NC}"
    local http_port=$(grep '^HTTP_PORT=' "$APP_DIR/env.production" 2>/dev/null | cut -d'=' -f2 || echo '3001')
    local tcp_port=$(grep '^TCP_PORT=' "$APP_DIR/env.production" 2>/dev/null | cut -d'=' -f2 || echo '3003')
    
    local http_connections=$(netstat -an | grep ":$http_port " | wc -l)
    local tcp_connections=$(netstat -an | grep ":$tcp_port " | wc -l)
    
    echo "  HTTP Connections: $http_connections"
    echo "  TCP Connections: $tcp_connections"
    
    # Disk I/O
    echo -e "\n${GREEN}Disk I/O:${NC}"
    iostat -x 1 1 2>/dev/null | tail -n +4 | head -1 | awk '{print "  Read: " $4 " KB/s, Write: " $5 " KB/s"}' || echo "  iostat not available"
}

# Function to clean up old files
cleanup_files() {
    local days=30
    
    # Parse --days argument
    for arg in "$@"; do
        if [[ $arg == --days=* ]]; then
            days=${arg#*=}
        elif [ "$arg" = "--days" ]; then
            # Next argument should be the number
            continue
        elif [[ $arg =~ ^[0-9]+$ ]] && [ "$1" = "--days" ]; then
            days=$arg
        fi
    done
    
    echo -e "${YELLOW}🧹 Cleaning up files older than $days days${NC}"
    echo -e "${BLUE}===========================================${NC}"
    
    # Clean up logs
    echo -e "\n${GREEN}Cleaning log files:${NC}"
    find "$APP_DIR/logs" -name "*.log" -type f -mtime +$days -exec rm -f {} \; 2>/dev/null || true
    echo "  ✅ Log files older than $days days removed"
    
    # Clean up exports
    echo -e "\n${GREEN}Cleaning export files:${NC}"
    find "$APP_DIR/backend/exports" -name "*.pfsl" -type f -mtime +$days -exec rm -f {} \; 2>/dev/null || true
    echo "  ✅ Export files older than $days days removed"
    
    # Clean up backups
    echo -e "\n${GREEN}Cleaning backup files:${NC}"
    find "$APP_DIR/backups" -name "*.tar.gz" -type f -mtime +$days -exec rm -f {} \; 2>/dev/null || true
    echo "  ✅ Backup files older than $days days removed"
    
    # Clean up temporary files
    echo -e "\n${GREEN}Cleaning temporary files:${NC}"
    find "$APP_DIR" -name "*.tmp" -type f -mtime +1 -exec rm -f {} \; 2>/dev/null || true
    find "$APP_DIR" -name ".DS_Store" -type f -exec rm -f {} \; 2>/dev/null || true
    echo "  ✅ Temporary files removed"
    
    echo -e "\n${GREEN}✅ Cleanup completed${NC}"
}

# Function to create backup
create_backup() {
    echo -e "${YELLOW}💾 Creating Data Backup${NC}"
    echo -e "${BLUE}======================${NC}"
    
    local backup_dir="$APP_DIR/backups"
    local backup_file="data-backup-$(date +%Y-%m-%d-%H%M%S).tar.gz"
    
    sudo mkdir -p "$backup_dir"
    
    # Create backup
    sudo tar -czf "$backup_dir/$backup_file" \
        -C "$APP_DIR" backend/data \
        -C "$APP_DIR" backend/exports \
        -C "$APP_DIR" env.production \
        2>/dev/null || true
    
    sudo chown "$APP_USER:$APP_USER" "$backup_dir/$backup_file"
    
    local backup_size=$(du -h "$backup_dir/$backup_file" | cut -f1)
    echo -e "${GREEN}✅ Backup created: $backup_dir/$backup_file (Size: $backup_size)${NC}"
}

# Function to restart application
restart_application() {
    echo -e "${YELLOW}🔄 Restarting Application${NC}"
    echo -e "${BLUE}=========================${NC}"
    
    # Restart PM2 application
    pm2 restart gali-parse
    echo -e "${GREEN}✅ PM2 application restarted${NC}"
    
    # Reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded${NC}"
    
    # Wait a moment for services to start
    sleep 3
    
    # Check status
    echo -e "\n${GREEN}Service Status:${NC}"
    pm2 status gali-parse
    
    echo -e "\n${GREEN}✅ Application restart completed${NC}"
}

# Function to start continuous monitoring
start_monitoring() {
    echo -e "${YELLOW}📊 Starting Continuous Monitoring${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo -e "${GREEN}Monitoring started. Press Ctrl+C to stop.${NC}\n"
    
    while true; do
        clear
        echo -e "${BLUE}📊 Gali-Parse Live Monitoring - $(date)${NC}"
        echo -e "${BLUE}===========================================${NC}\n"
        
        # Show status
        show_status
        
        echo -e "\n${YELLOW}Press Ctrl+C to stop monitoring${NC}"
        sleep 10
    done
}

# Main script logic
case "${1:-}" in
    "status")
        show_status
        ;;
    "health")
        perform_health_check
        ;;
    "logs")
        show_logs "$@"
        ;;
    "metrics")
        show_metrics
        ;;
    "cleanup")
        cleanup_files "$@"
        ;;
    "backup")
        create_backup
        ;;
    "restart")
        restart_application
        ;;
    "monitor")
        start_monitoring
        ;;
    "--help"|"-h"|"help")
        show_usage
        ;;
    "")
        echo -e "${RED}❌ No command specified${NC}"
        show_usage
        exit 1
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        show_usage
        exit 1
        ;;
esac
