-- Migration: Añadir sistema de categorías para stock

-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  color TEXT DEFAULT '#6B7280',
  icono TEXT DEFAULT 'fa-box',
  activo INTEGER DEFAULT 1,
  orden INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías por defecto para cortinajes
INSERT INTO categorias (nombre, descripcion, color, icono, orden) VALUES
  ('Telas', 'Telas y tejidos para cortinas', '#3B82F6', 'fa-cut', 1),
  ('Rieles y Barras', 'Sistemas de sujeción y guías', '#8B5CF6', 'fa-grip-lines', 2),
  ('Accesorios', 'Ganchos, anillas, soportes', '#10B981', 'fa-paperclip', 3),
  ('Forros', 'Forros térmicos y blackout', '#F59E0B', 'fa-layer-group', 4),
  ('Confección', 'Materiales de confección', '#EF4444', 'fa-scissors', 5),
  ('Instalación', 'Herramientas y materiales de instalación', '#6366F1', 'fa-tools', 6),
  ('Otros', 'Productos varios', '#6B7280', 'fa-ellipsis-h', 99);

-- Añadir columna categoria_id a tabla stock
ALTER TABLE stock ADD COLUMN categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_stock_categoria ON stock(categoria_id);

-- Actualizar productos existentes a categoría "Otros" por defecto
UPDATE stock 
SET categoria_id = (SELECT id FROM categorias WHERE nombre = 'Otros' LIMIT 1)
WHERE categoria_id IS NULL;
