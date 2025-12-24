-- Crear tabla factura_lineas
CREATE TABLE IF NOT EXISTS factura_lineas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER NOT NULL,
  concepto TEXT NOT NULL,
  cantidad REAL NOT NULL DEFAULT 1,
  unidad TEXT DEFAULT 'ud',
  precio_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  tipo TEXT DEFAULT 'otro',
  FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_factura_lineas_factura ON factura_lineas(factura_id);
