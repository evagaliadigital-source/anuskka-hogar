-- Hacer categoria TEXT opcional (ya no es obligatorio)
-- SQLite no permite ALTER COLUMN, así que creamos una nueva tabla y migramos

-- 1. Crear tabla temporal con el nuevo schema
CREATE TABLE stock_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT,
  categoria_id INTEGER,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT, -- Ya no obligatorio
  unidad TEXT NOT NULL,
  cantidad_actual REAL NOT NULL DEFAULT 0,
  cantidad_minima REAL NOT NULL DEFAULT 10,
  precio_unitario REAL NOT NULL,
  precio_compra REAL DEFAULT 0,
  precio_venta REAL DEFAULT 0,
  proveedor TEXT,
  ubicacion TEXT,
  fecha_ultima_compra DATE,
  imagen_url TEXT,
  documento_url TEXT,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES stock_categorias(id)
);

-- 2. Copiar datos existentes
INSERT INTO stock_new SELECT 
  id, codigo, categoria_id, nombre, descripcion, categoria, unidad,
  cantidad_actual, cantidad_minima, precio_unitario, precio_compra, precio_venta,
  proveedor, ubicacion, fecha_ultima_compra, imagen_url, documento_url,
  activo, created_at, updated_at
FROM stock;

-- 3. Eliminar tabla vieja
DROP TABLE stock;

-- 4. Renombrar tabla nueva
ALTER TABLE stock_new RENAME TO stock;

-- 5. Recrear índices
CREATE INDEX IF NOT EXISTS idx_stock_codigo ON stock(codigo);
CREATE INDEX IF NOT EXISTS idx_stock_categoria_id ON stock(categoria_id);
CREATE INDEX IF NOT EXISTS idx_stock_nombre ON stock(nombre);

-- 6. Recrear trigger
CREATE TRIGGER IF NOT EXISTS update_stock_timestamp 
AFTER UPDATE ON stock
FOR EACH ROW
BEGIN
  UPDATE stock SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
