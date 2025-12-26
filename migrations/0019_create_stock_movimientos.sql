-- Crear tabla de movimientos de stock para trazabilidad
CREATE TABLE IF NOT EXISTS stock_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo TEXT,
  usuario_id INTEGER,
  documento_url TEXT, -- URL del documento asociado (factura, Excel, PDF)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id) REFERENCES stock(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices para búsquedas y reportes
CREATE INDEX IF NOT EXISTS idx_movimientos_stock ON stock_movimientos(stock_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON stock_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON stock_movimientos(created_at);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario ON stock_movimientos(usuario_id);
