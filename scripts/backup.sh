#!/bin/bash
# ============================================
# SCRIPT DE BACKUP SIMPLE - ANUSHKA HOGAR
# ============================================

set -e

# Configuración
DB_NAME="anushka-hogar-production"
BACKUP_DIR_AIDRIVE="/mnt/aidrive/backups"
BACKUP_DIR_LOCAL="/home/user/anushka-hogar/backups"
FECHA=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="backup-anushka-$FECHA"
RETENTION_DAYS=30

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Iniciando backup de Anushka Hogar...${NC}"
echo "Fecha: $(date)"
echo "Base de datos: $DB_NAME"
echo ""

# Crear directorios de backups si no existen
mkdir -p $BACKUP_DIR_AIDRIVE
mkdir -p $BACKUP_DIR_LOCAL

# Obtener la ubicación de la base de datos SQLite local
WRANGLER_DIR="/home/user/anushka-hogar/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
DB_FILE=$(find $WRANGLER_DIR -name "*.sqlite" -type f 2>/dev/null | head -1)

if [ -z "$DB_FILE" ]; then
  echo -e "${RED}❌ Error: No se encontró la base de datos SQLite${NC}"
  exit 1
fi

echo -e "${YELLOW}📊 Base de datos encontrada: $DB_FILE${NC}"

# Obtener tamaño de la base de datos
DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
echo -e "${YELLOW}💾 Tamaño de la base de datos: $DB_SIZE${NC}"
echo ""

# Copiar archivo de base de datos directamente
echo -e "${YELLOW}📋 Copiando base de datos...${NC}"
cp "$DB_FILE" "$BACKUP_DIR_LOCAL/$BACKUP_FILE.sqlite"

# Comprimir backup
echo -e "${YELLOW}📦 Comprimiendo backup...${NC}"
tar -czf "$BACKUP_DIR_LOCAL/$BACKUP_FILE.tar.gz" -C "$BACKUP_DIR_LOCAL" "$BACKUP_FILE.sqlite"
rm "$BACKUP_DIR_LOCAL/$BACKUP_FILE.sqlite"

BACKUP_SIZE=$(du -h "$BACKUP_DIR_LOCAL/$BACKUP_FILE.tar.gz" | cut -f1)
echo -e "${GREEN}✅ Backup local completado: $BACKUP_FILE.tar.gz (${BACKUP_SIZE})${NC}"

# Copiar a AI Drive
echo -e "${YELLOW}☁️  Copiando a AI Drive...${NC}"
cp "$BACKUP_DIR_LOCAL/$BACKUP_FILE.tar.gz" "$BACKUP_DIR_AIDRIVE/"
echo -e "${GREEN}   ✅ Backup en AI Drive guardado${NC}"

# Limpiar backups antiguos (> 30 días)
echo -e "${YELLOW}🧹 Limpiando backups antiguos (> $RETENTION_DAYS días)...${NC}"

# Limpiar en AI Drive
DELETED_AIDRIVE=$(find $BACKUP_DIR_AIDRIVE -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l)
echo -e "${GREEN}   AI Drive: Eliminados $DELETED_AIDRIVE backups${NC}"

# Limpiar local
DELETED_LOCAL=$(find $BACKUP_DIR_LOCAL -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l)
echo -e "${GREEN}   Local: Eliminados $DELETED_LOCAL backups${NC}"

# Listar backups existentes
echo ""
echo -e "${GREEN}📁 Backups disponibles en AI Drive:${NC}"
ls -lh $BACKUP_DIR_AIDRIVE/backup-*.tar.gz 2>/dev/null | awk '{print "   " $9 " - " $5}' || echo "   No hay backups"

echo ""
echo -e "${GREEN}📁 Backups disponibles localmente:${NC}"
ls -lh $BACKUP_DIR_LOCAL/backup-*.tar.gz 2>/dev/null | awk '{print "   " $9 " - " $5}' || echo "   No hay backups"

# Resumen
echo ""
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup completado exitosamente${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo "Archivo: $BACKUP_FILE.tar.gz"
echo "Tamaño: $BACKUP_SIZE"
echo "Ubicaciones:"
echo "  - AI Drive: $BACKUP_DIR_AIDRIVE"
echo "  - Local: $BACKUP_DIR_LOCAL"
echo "Retención: $RETENTION_DAYS días"
echo "Base de datos original: $DB_SIZE"
echo ""

# Crear archivo de log
LOG_FILE_AIDRIVE="$BACKUP_DIR_AIDRIVE/backup.log"
LOG_FILE_LOCAL="$BACKUP_DIR_LOCAL/backup.log"
echo "$(date +%Y-%m-%d_%H:%M:%S) - Backup completado: $BACKUP_FILE.tar.gz ($BACKUP_SIZE) - DB: $DB_SIZE" >> $LOG_FILE_AIDRIVE
echo "$(date +%Y-%m-%d_%H:%M:%S) - Backup completado: $BACKUP_FILE.tar.gz ($BACKUP_SIZE) - DB: $DB_SIZE" >> $LOG_FILE_LOCAL

exit 0
