#!/bin/bash
# ============================================
# SCRIPT DE BACKUP AUTOMÁTICO - ANUSHKA HOGAR
# ============================================

set -e

# Configuración
DB_NAME="anushka-hogar-production"
BACKUP_DIR="/mnt/aidrive/backups"
FECHA=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="backup-anushka-$FECHA.sql"
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

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Exportar todas las tablas
echo -e "${YELLOW}📊 Exportando datos...${NC}"

# Lista de tablas a exportar
TABLES=(
  "usuarios"
  "clientes"
  "trabajos"
  "tareas_pendientes"
  "presupuestos"
  "presupuesto_lineas"
  "proyectos_diseno"
  "facturas"
  "factura_lineas"
  "stock"
  "stock_categorias"
  "stock_movimientos"
  "catalogo_telas"
  "empleadas"
  "registro_horas"
  "evaluaciones"
  "avisos"
  "tickets"
  "notas"
  "conversaciones_ia"
  "incidencias_clientes"
  "historial_movimientos"
  "configuracion_empresa"
  "trabajo_fases"
  "trabajo_materiales"
  "tareas_alertas"
  "categorias"
  "auditoria"
  "consentimientos"
  "solicitudes_rgpd"
)

# Crear archivo de backup
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
touch $BACKUP_PATH

echo "-- Backup Anushka Hogar" >> $BACKUP_PATH
echo "-- Fecha: $(date)" >> $BACKUP_PATH
echo "-- Base de datos: $DB_NAME" >> $BACKUP_PATH
echo "" >> $BACKUP_PATH

# Exportar cada tabla
TOTAL_ROWS=0
for TABLE in "${TABLES[@]}"; do
  echo -e "${YELLOW}  Exportando tabla: $TABLE${NC}"
  
  # Obtener conteo de filas
  ROW_COUNT=$(npx wrangler d1 execute $DB_NAME --local \
    --command="SELECT COUNT(*) as count FROM $TABLE" \
    --json 2>&1 | grep -o '"count":[0-9]*' | head -1 | grep -o '[0-9]*')
  
  # Si ROW_COUNT está vacío, asignar 0
  if [ -z "$ROW_COUNT" ]; then
    ROW_COUNT=0
  fi
  
  if [ "$ROW_COUNT" -gt 0 ]; then
    # Exportar esquema de la tabla
    echo "-- Tabla: $TABLE ($ROW_COUNT filas)" >> $BACKUP_PATH
    npx wrangler d1 execute $DB_NAME --local \
      --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='$TABLE'" \
      --json >> "$BACKUP_PATH.schema" 2>/dev/null || true
    
    if [ -f "$BACKUP_PATH.schema" ]; then
      cat "$BACKUP_PATH.schema" >> $BACKUP_PATH
      rm "$BACKUP_PATH.schema"
    fi
    
    # Exportar datos en formato JSON
    npx wrangler d1 execute $DB_NAME --local \
      --command="SELECT * FROM $TABLE" \
      --json >> "$BACKUP_PATH.tmp" 2>/dev/null || true
    
    if [ -f "$BACKUP_PATH.tmp" ]; then
      cat "$BACKUP_PATH.tmp" >> $BACKUP_PATH
      echo "" >> $BACKUP_PATH
      rm "$BACKUP_PATH.tmp"
    fi
    
    TOTAL_ROWS=$((TOTAL_ROWS + ROW_COUNT))
    echo -e "     ✅ $ROW_COUNT filas exportadas"
  else
    echo "     ⚠️  Tabla vacía o no existe"
  fi
done

echo ""
echo -e "${GREEN}📊 Total de filas exportadas: $TOTAL_ROWS${NC}"

# Comprimir backup
echo -e "${YELLOW}📦 Comprimiendo backup...${NC}"
gzip $BACKUP_PATH

BACKUP_PATH_GZ="$BACKUP_PATH.gz"
BACKUP_SIZE=$(du -h "$BACKUP_PATH_GZ" | cut -f1)

echo -e "${GREEN}✅ Backup completado: $BACKUP_FILE.gz (${BACKUP_SIZE})${NC}"

# Copiar backup también a directorio local (doble respaldo)
LOCAL_BACKUP_DIR="/home/user/anushka-hogar/backups"
mkdir -p $LOCAL_BACKUP_DIR
echo -e "${YELLOW}📋 Copiando backup a directorio local...${NC}"
cp "$BACKUP_PATH_GZ" "$LOCAL_BACKUP_DIR/"
echo -e "${GREEN}   ✅ Copia local guardada en: $LOCAL_BACKUP_DIR${NC}"

# Limpiar backups antiguos (> 30 días)
echo -e "${YELLOW}🧹 Limpiando backups antiguos (> $RETENTION_DAYS días)...${NC}"
DELETED=$(find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo -e "${GREEN}   Eliminados: $DELETED backups${NC}"

# Listar backups existentes
echo ""
echo -e "${GREEN}📁 Backups disponibles:${NC}"
ls -lh $BACKUP_DIR/backup-*.sql.gz 2>/dev/null | awk '{print "   " $9 " - " $5}' || echo "   No hay backups"

# Resumen
echo ""
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backup completado exitosamente${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo "Archivo: $BACKUP_FILE.gz"
echo "Tamaño: $BACKUP_SIZE"
echo "Ubicación: $BACKUP_DIR"
echo "Retención: $RETENTION_DAYS días"
echo ""

# Crear archivo de log
LOG_FILE="$BACKUP_DIR/backup.log"
echo "$(date +%Y-%m-%d_%H:%M:%S) - Backup completado: $BACKUP_FILE.gz ($BACKUP_SIZE)" >> $LOG_FILE

exit 0
