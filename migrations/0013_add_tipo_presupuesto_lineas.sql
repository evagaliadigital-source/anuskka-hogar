-- ============================================
-- MIGRACIÓN 0013: Agregar columna tipo a presupuesto_lineas
-- ============================================

-- Agregar columna tipo para clasificar líneas (tela, material, confeccion, instalacion)
ALTER TABLE presupuesto_lineas ADD COLUMN tipo TEXT DEFAULT 'otro';

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_presupuesto_lineas_tipo ON presupuesto_lineas(tipo);
