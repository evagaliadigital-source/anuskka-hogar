-- Migration: Link presupuestos con trabajos
-- Permite convertir presupuestos aceptados en trabajos

-- Agregar columna trabajo_id a presupuestos (nullable, para presupuestos sin trabajo aún)
ALTER TABLE presupuestos ADD COLUMN trabajo_id INTEGER DEFAULT NULL;

-- Agregar columna presupuesto_id a trabajos (nullable, para trabajos sin presupuesto)
ALTER TABLE trabajos ADD COLUMN presupuesto_id INTEGER DEFAULT NULL;

-- Crear índices para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_presupuestos_trabajo_id ON presupuestos(trabajo_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_presupuesto_id ON trabajos(presupuesto_id);
