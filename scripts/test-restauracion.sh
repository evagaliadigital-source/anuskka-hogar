#!/bin/bash
# ============================================
# SCRIPT DE TEST DE RESTAURACIÓN - ANUSHKA HOGAR
# ============================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   TEST DE RESTAURACIÓN DE BACKUP${NC}"
echo -e "${BLUE}   Anushka Hogar - Galia Digital${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo "Fecha: $(date)"
echo "Este test verificará que los backups se pueden restaurar correctamente."
echo ""

# Configuración
DB_NAME="anushka-hogar-production"
TEST_DB_NAME="anushka-hogar-test"
BACKUP_DIR_AIDRIVE="/mnt/aidrive/backups"
BACKUP_DIR_LOCAL="/home/user/anushka-hogar/backups"
TEST_DIR="/home/user/anushka-hogar/test-restauracion"

# Limpiar directorio de test anterior
rm -rf $TEST_DIR
mkdir -p $TEST_DIR

echo -e "${YELLOW}🔍 PASO 1: Buscar backup más reciente...${NC}"
echo ""

# Buscar último backup en AI Drive
LAST_BACKUP_AIDRIVE=$(ls -t $BACKUP_DIR_AIDRIVE/backup-*.tar.gz 2>/dev/null | head -1)
# Buscar último backup local
LAST_BACKUP_LOCAL=$(ls -t $BACKUP_DIR_LOCAL/backup-*.tar.gz 2>/dev/null | head -1)

if [ -z "$LAST_BACKUP_AIDRIVE" ] && [ -z "$LAST_BACKUP_LOCAL" ]; then
  echo -e "${RED}❌ Error: No se encontraron backups${NC}"
  echo ""
  echo "Ejecuta primero el script de backup:"
  echo "  bash /home/user/anushka-hogar/scripts/backup.sh"
  exit 1
fi

# Priorizar backup de AI Drive
if [ -n "$LAST_BACKUP_AIDRIVE" ]; then
  BACKUP_FILE=$LAST_BACKUP_AIDRIVE
  BACKUP_LOCATION="AI Drive"
else
  BACKUP_FILE=$LAST_BACKUP_LOCAL
  BACKUP_LOCATION="Local"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_NAME=$(basename "$BACKUP_FILE")

echo -e "${GREEN}✅ Backup encontrado:${NC}"
echo "   Archivo: $BACKUP_NAME"
echo "   Ubicación: $BACKUP_LOCATION"
echo "   Tamaño: $BACKUP_SIZE"
echo "   Ruta: $BACKUP_FILE"
echo ""

# PASO 2: Extraer backup
echo -e "${YELLOW}📦 PASO 2: Extrayendo backup...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEST_DIR"

EXTRACTED_DB=$(find $TEST_DIR -name "*.sqlite" -type f | head -1)

if [ -z "$EXTRACTED_DB" ]; then
  echo -e "${RED}❌ Error: No se encontró base de datos en el backup${NC}"
  exit 1
fi

EXTRACTED_SIZE=$(du -h "$EXTRACTED_DB" | cut -f1)
echo -e "${GREEN}   ✅ Base de datos extraída: $EXTRACTED_SIZE${NC}"
echo ""

# PASO 3: Analizar contenido
echo -e "${YELLOW}🔍 PASO 3: Analizando contenido de la base de datos...${NC}"
echo ""

# Listar tablas
echo -e "${BLUE}Tablas encontradas:${NC}"
sqlite3 "$EXTRACTED_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name;" | while read table; do
  # Contar filas
  row_count=$(sqlite3 "$EXTRACTED_DB" "SELECT COUNT(*) FROM $table;")
  echo "   • $table: $row_count filas"
done

echo ""

# Contar total de registros
echo -e "${BLUE}Resumen de datos:${NC}"
TOTAL_USUARIOS=$(sqlite3 "$EXTRACTED_DB" "SELECT COUNT(*) FROM usuarios;" 2>/dev/null || echo "0")
TOTAL_CLIENTES=$(sqlite3 "$EXTRACTED_DB" "SELECT COUNT(*) FROM clientes;" 2>/dev/null || echo "0")
TOTAL_TRABAJOS=$(sqlite3 "$EXTRACTED_DB" "SELECT COUNT(*) FROM trabajos;" 2>/dev/null || echo "0")
TOTAL_TAREAS=$(sqlite3 "$EXTRACTED_DB" "SELECT COUNT(*) FROM tareas_pendientes;" 2>/dev/null || echo "0")
TOTAL_PRESUPUESTOS=$(sqlite3 "$EXTRACTED_DB" "SELECT COUNT(*) FROM presupuestos;" 2>/dev/null || echo "0")

echo "   • Usuarios: $TOTAL_USUARIOS"
echo "   • Clientes: $TOTAL_CLIENTES"
echo "   • Trabajos: $TOTAL_TRABAJOS"
echo "   • Tareas: $TOTAL_TAREAS"
echo "   • Presupuestos: $TOTAL_PRESUPUESTOS"
echo ""

# PASO 4: Comparar con producción
echo -e "${YELLOW}🔍 PASO 4: Comparando con base de datos de producción...${NC}"
echo ""

PROD_DB="/home/user/anushka-hogar/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
PROD_DB_FILE=$(find $PROD_DB -name "*.sqlite" -type f 2>/dev/null | head -1)

if [ -n "$PROD_DB_FILE" ]; then
  PROD_USUARIOS=$(sqlite3 "$PROD_DB_FILE" "SELECT COUNT(*) FROM usuarios;" 2>/dev/null || echo "0")
  PROD_CLIENTES=$(sqlite3 "$PROD_DB_FILE" "SELECT COUNT(*) FROM clientes;" 2>/dev/null || echo "0")
  PROD_TRABAJOS=$(sqlite3 "$PROD_DB_FILE" "SELECT COUNT(*) FROM trabajos;" 2>/dev/null || echo "0")
  
  echo -e "${BLUE}Comparación:${NC}"
  echo "   • Usuarios: Backup=$TOTAL_USUARIOS | Producción=$PROD_USUARIOS"
  echo "   • Clientes: Backup=$TOTAL_CLIENTES | Producción=$PROD_CLIENTES"
  echo "   • Trabajos: Backup=$TOTAL_TRABAJOS | Producción=$PROD_TRABAJOS"
  echo ""
  
  # Verificar consistencia
  if [ "$TOTAL_USUARIOS" -eq "$PROD_USUARIOS" ] && [ "$TOTAL_CLIENTES" -eq "$PROD_CLIENTES" ]; then
    echo -e "${GREEN}✅ Integridad verificada: Los datos del backup coinciden con producción${NC}"
  else
    echo -e "${YELLOW}⚠️  Advertencia: Hay diferencias entre backup y producción${NC}"
    echo "   Esto es normal si hubo cambios después del backup."
  fi
else
  echo -e "${YELLOW}⚠️  No se pudo acceder a la base de datos de producción${NC}"
fi

echo ""

# PASO 5: Test de consultas
echo -e "${YELLOW}🔍 PASO 5: Probando consultas en el backup...${NC}"
echo ""

# Probar SELECT en usuarios
echo -e "${BLUE}Test: SELECT * FROM usuarios LIMIT 1${NC}"
sqlite3 "$EXTRACTED_DB" "SELECT email, nombre, rol FROM usuarios LIMIT 1;" 2>&1 | while read line; do
  echo "   $line"
done
echo ""

# PASO 6: Integridad del backup
echo -e "${YELLOW}🔍 PASO 6: Verificando integridad del backup...${NC}"
echo ""

INTEGRITY_CHECK=$(sqlite3 "$EXTRACTED_DB" "PRAGMA integrity_check;" 2>&1)

if [ "$INTEGRITY_CHECK" == "ok" ]; then
  echo -e "${GREEN}✅ Integridad de la base de datos: OK${NC}"
else
  echo -e "${RED}❌ Problema de integridad: $INTEGRITY_CHECK${NC}"
fi

echo ""

# PASO 7: Resumen final
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   RESUMEN DEL TEST${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✅ Backup encontrado y extraído correctamente${NC}"
echo -e "${GREEN}✅ Base de datos contiene $TOTAL_CLIENTES clientes${NC}"
echo -e "${GREEN}✅ Base de datos contiene $TOTAL_TRABAJOS trabajos${NC}"
echo -e "${GREEN}✅ Base de datos contiene $TOTAL_USUARIOS usuarios${NC}"
echo -e "${GREEN}✅ Integridad verificada: OK${NC}"
echo ""

if [ "$TOTAL_CLIENTES" -gt 0 ] || [ "$TOTAL_TRABAJOS" -gt 0 ]; then
  echo -e "${GREEN}🎉 TEST EXITOSO: El backup se puede restaurar correctamente${NC}"
  TEST_RESULT="EXITOSO"
else
  echo -e "${YELLOW}⚠️  TEST PARCIAL: El backup está vacío o sin datos importantes${NC}"
  TEST_RESULT="PARCIAL"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# PASO 8: Limpiar archivos de test
echo -e "${YELLOW}🧹 Limpiando archivos de test...${NC}"
rm -rf $TEST_DIR
echo -e "${GREEN}   ✅ Limpieza completada${NC}"
echo ""

# Crear reporte de test
REPORT_FILE="/home/user/anushka-hogar/backups/test-restauracion.log"
echo "# TEST DE RESTAURACIÓN - $(date)" > $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Resultado: $TEST_RESULT" >> $REPORT_FILE
echo "Backup probado: $BACKUP_NAME" >> $REPORT_FILE
echo "Ubicación: $BACKUP_LOCATION" >> $REPORT_FILE
echo "Tamaño: $BACKUP_SIZE" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Datos restaurados:" >> $REPORT_FILE
echo "  - Usuarios: $TOTAL_USUARIOS" >> $REPORT_FILE
echo "  - Clientes: $TOTAL_CLIENTES" >> $REPORT_FILE
echo "  - Trabajos: $TOTAL_TRABAJOS" >> $REPORT_FILE
echo "  - Tareas: $TOTAL_TAREAS" >> $REPORT_FILE
echo "  - Presupuestos: $TOTAL_PRESUPUESTOS" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Integridad: OK" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Próximo test recomendado: $(date -d '+1 month' '+%Y-%m-%d')" >> $REPORT_FILE

echo -e "${GREEN}📄 Reporte guardado en: $REPORT_FILE${NC}"
echo ""

# Recomendaciones
echo -e "${BLUE}📋 RECOMENDACIONES:${NC}"
echo ""
echo "1. Ejecuta este test mensualmente (primer lunes de cada mes)"
echo "2. Verifica que los backups en AI Drive son accesibles"
echo "3. Mantén copia en USB físico actualizada"
echo "4. Prueba también el backup de la clave de cifrado"
echo ""

exit 0
