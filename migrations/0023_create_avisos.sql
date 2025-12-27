-- Tabla de avisos/notificaciones
CREATE TABLE IF NOT EXISTS avisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL, -- 'stock_bajo', 'stock_agotado', 'pedido_sin_stock', etc.
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  entidad_tipo TEXT, -- 'stock', 'presupuesto', 'factura'
  entidad_id INTEGER, -- ID de la entidad relacionada
  prioridad TEXT DEFAULT 'media', -- 'alta', 'media', 'baja'
  leido INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  leido_at DATETIME
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_avisos_leido ON avisos(leido);
CREATE INDEX IF NOT EXISTS idx_avisos_tipo ON avisos(tipo);
CREATE INDEX IF NOT EXISTS idx_avisos_prioridad ON avisos(prioridad);
CREATE INDEX IF NOT EXISTS idx_avisos_entidad ON avisos(entidad_tipo, entidad_id);
