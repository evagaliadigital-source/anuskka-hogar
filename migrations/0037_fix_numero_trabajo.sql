-- Migración 0037: Añadir y poblar numero_trabajo

-- 1. Añadir columna numero_trabajo si no existe
ALTER TABLE trabajos ADD COLUMN numero_trabajo TEXT;

-- 2. Generar numero_trabajo para todos los registros (incluso los que lo tienen NULL)
-- Formato: T-YYYY-ID (simple y garantiza unicidad)
UPDATE trabajos 
SET numero_trabajo = 'T-' || strftime('%Y', COALESCE(fecha_creacion, CURRENT_TIMESTAMP)) || '-' || printf('%04d', id)
WHERE numero_trabajo IS NULL OR numero_trabajo = '';

-- 3. Crear índice único en numero_trabajo
CREATE UNIQUE INDEX IF NOT EXISTS idx_trabajos_numero_trabajo ON trabajos(numero_trabajo);
