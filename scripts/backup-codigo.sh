#!/bin/bash
# ============================================
# SCRIPT DE BACKUP DE CÓDIGO - ANUSHKA HOGAR
# ============================================

set -e

# Configuración
PROJECT_DIR="/home/user/anushka-hogar"
BACKUP_DIR_AIDRIVE="/mnt/aidrive/backups"
BACKUP_DIR_LOCAL="/home/user/anushka-hogar/backups"
FECHA=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="anushka-hogar-codigo-backup-$FECHA.tar.gz"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔄 Iniciando backup del código de Anushka Hogar...${NC}"
echo "Fecha: $(date)"
echo ""

# Crear directorios si no existen
mkdir -p $BACKUP_DIR_AIDRIVE
mkdir -p $BACKUP_DIR_LOCAL

# Crear backup (excluyendo node_modules, .wrangler, dist, .git)
echo -e "${YELLOW}📦 Comprimiendo código fuente...${NC}"
cd /home/user
tar -czf "$BACKUP_DIR_LOCAL/$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='.wrangler' \
  --exclude='dist' \
  --exclude='backups/*.tar.gz' \
  --exclude='.git' \
  anushka-hogar/

BACKUP_SIZE=$(du -h "$BACKUP_DIR_LOCAL/$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ Backup local completado: $BACKUP_FILE (${BACKUP_SIZE})${NC}"

# Copiar a AI Drive
echo -e "${YELLOW}☁️  Copiando a AI Drive...${NC}"
cp "$BACKUP_DIR_LOCAL/$BACKUP_FILE" "$BACKUP_DIR_AIDRIVE/"
echo -e "${GREEN}   ✅ Backup en AI Drive guardado${NC}"

# Resumen
echo ""
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup de código completado${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo "Archivo: $BACKUP_FILE"
echo "Tamaño: $BACKUP_SIZE"
echo "Ubicaciones:"
echo "  - AI Drive: $BACKUP_DIR_AIDRIVE"
echo "  - Local: $BACKUP_DIR_LOCAL"
echo ""

# Log
LOG_FILE="$BACKUP_DIR_LOCAL/backup-codigo.log"
echo "$(date +%Y-%m-%d_%H:%M:%S) - Backup código: $BACKUP_FILE ($BACKUP_SIZE)" >> $LOG_FILE

exit 0
