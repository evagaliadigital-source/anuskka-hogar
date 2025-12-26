-- Crear tabla de categorías de stock con prefijos
CREATE TABLE IF NOT EXISTS stock_categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  prefijo TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías por defecto
INSERT OR IGNORE INTO stock_categorias (nombre, prefijo, descripcion, ultimo_numero) VALUES 
  ('Telas', 'TEL', 'Telas y tejidos para cortinas', 0),
  ('Materiales', 'MAT', 'Materiales de confección (hilos, cremalleras, etc.)', 0),
  ('Accesorios', 'ACC', 'Accesorios decorativos (alzapaños, borlas, etc.)', 0),
  ('Mecanismos', 'MEC', 'Mecanismos y rieles para instalación', 0),
  ('Herramientas', 'HER', 'Herramientas de trabajo', 0);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_stock_categorias_prefijo ON stock_categorias(prefijo);
