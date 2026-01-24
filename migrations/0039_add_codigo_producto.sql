-- Migración 0039: Añadir código de producto automático por categoría

-- 1. Añadir columna codigo_producto
ALTER TABLE productos ADD COLUMN codigo_producto TEXT UNIQUE;

-- 2. Generar códigos para productos existentes
-- Formato: PREFIJO-NNNN (ej: TOA-0001, COJ-0001)
-- Usando el id del producto como número secuencial temporal
UPDATE productos 
SET codigo_producto = (
  CASE 
    WHEN categoria_id = 1 THEN 'TEL-' || printf('%04d', id)   -- Telas por metro
    WHEN categoria_id = 2 THEN 'COR-' || printf('%04d', id)   -- Cortinas confeccionadas
    WHEN categoria_id = 3 THEN 'COJ-' || printf('%04d', id)   -- Cojines
    WHEN categoria_id = 4 THEN 'CAM-' || printf('%04d', id)   -- Ropa de cama
    WHEN categoria_id = 5 THEN 'BAN-' || printf('%04d', id)   -- Baño
    WHEN categoria_id = 6 THEN 'MAN-' || printf('%04d', id)   -- Mantas y plaids
    WHEN categoria_id = 7 THEN 'ACC-' || printf('%04d', id)   -- Accesorios
    WHEN categoria_id = 8 THEN 'MER-' || printf('%04d', id)   -- Mercería
    WHEN categoria_id = 19 THEN 'COJ-' || printf('%04d', id)  -- Cojines (categoría 19)
    WHEN categoria_id = 20 THEN 'TOA-' || printf('%04d', id)  -- Toallas (categoría 20)
    ELSE 'PRO-' || printf('%04d', id)                         -- Otros
  END
)
WHERE codigo_producto IS NULL;

-- 3. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo_producto);
