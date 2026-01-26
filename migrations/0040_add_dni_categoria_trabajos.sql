-- Migración 0040: Añadir DNI a clientes y categoría a trabajos con numeración

-- 1. Añadir columna DNI a clientes
ALTER TABLE clientes ADD COLUMN dni TEXT;

-- 2. Añadir columna categoria a trabajos (tienda/externo)
ALTER TABLE trabajos ADD COLUMN categoria TEXT DEFAULT 'tienda';

-- 3. Crear índice en categoría para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_trabajos_categoria ON trabajos(categoria);
