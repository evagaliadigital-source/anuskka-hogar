#!/bin/bash

# Script de backup completo de la base de datos de Anushka Hogar
# Fecha: $(date '+%Y-%m-%d %H:%M:%S')

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/backup-anushka-${TIMESTAMP}.sql"

mkdir -p ${BACKUP_DIR}

echo "🔄 Iniciando backup de base de datos remota..."
echo "📅 Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Crear archivo SQL con cabecera
cat > ${BACKUP_FILE} << 'SQLHEADER'
-- =====================================================
-- BACKUP BASE DE DATOS ANUSHKA HOGAR
-- Generado automáticamente
-- =====================================================

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

SQLHEADER

echo "-- Fecha backup: $(date '+%Y-%m-%d %H:%M:%S')" >> ${BACKUP_FILE}
echo "" >> ${BACKUP_FILE}

# Lista de tablas a respaldar (excluyendo tablas del sistema)
TABLES=(
  "clientes"
  "empleadas"
  "trabajos"
  "trabajo_materiales"
  "facturas"
  "factura_lineas"
  "incidencias_clientes"
  "registro_horas"
  "evaluaciones"
  "presupuestos"
  "presupuesto_lineas"
  "configuracion_empresa"
  "trabajo_fases"
  "categorias"
  "proyectos_diseno"
  "catalogo_telas"
  "tareas_pendientes"
  "tareas_alertas"
  "historial_movimientos"
  "usuarios"
  "stock_categorias"
  "stock_movimientos"
  "stock"
  "avisos"
  "conversaciones_ia"
  "notas"
)

# Backup de cada tabla
for TABLE in "${TABLES[@]}"; do
  echo "📦 Respaldando tabla: ${TABLE}..."
  
  # Obtener esquema de la tabla
  npx wrangler d1 execute anushka-hogar-production --remote \
    --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='${TABLE}';" \
    --json 2>/dev/null | jq -r '.[0].results[0].sql' >> ${BACKUP_FILE} 2>/dev/null
  
  echo ";" >> ${BACKUP_FILE}
  echo "" >> ${BACKUP_FILE}
  
  # Obtener datos de la tabla
  npx wrangler d1 execute anushka-hogar-production --remote \
    --command="SELECT * FROM ${TABLE};" \
    --json 2>/dev/null | jq -r '.[0].results[] | 
      "INSERT INTO '${TABLE}' VALUES(" + 
      ([.[] | if type == "string" then "\"" + . + "\"" elif . == null then "NULL" else tostring end] | join(",")) + 
      ");"' >> ${BACKUP_FILE} 2>/dev/null
  
  echo "" >> ${BACKUP_FILE}
done

# Cerrar transacción
echo "COMMIT;" >> ${BACKUP_FILE}
echo "PRAGMA foreign_keys=ON;" >> ${BACKUP_FILE}

# Comprimir backup
echo ""
echo "🗜️  Comprimiendo backup..."
gzip -c ${BACKUP_FILE} > ${BACKUP_FILE}.gz

# Tamaño de archivos
SIZE_SQL=$(ls -lh ${BACKUP_FILE} | awk '{print $5}')
SIZE_GZ=$(ls -lh ${BACKUP_FILE}.gz | awk '{print $5}')

echo ""
echo "✅ Backup completado exitosamente!"
echo ""
echo "📁 Archivos generados:"
echo "   - SQL sin comprimir: ${BACKUP_FILE} (${SIZE_SQL})"
echo "   - SQL comprimido:    ${BACKUP_FILE}.gz (${SIZE_GZ})"
echo ""
echo "📊 Estadísticas:"
TOTAL_LINES=$(wc -l < ${BACKUP_FILE})
echo "   - Total de líneas: ${TOTAL_LINES}"
echo "   - Total de tablas: ${#TABLES[@]}"
echo ""
echo "🔗 Para descargar, copia el backup a public/static/:"
echo "   cp ${BACKUP_FILE}.gz public/static/backup-latest.sql.gz"
