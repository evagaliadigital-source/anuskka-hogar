-- Índices para búsquedas en stock
CREATE INDEX IF NOT EXISTS idx_stock_codigo ON stock(codigo);
CREATE INDEX IF NOT EXISTS idx_stock_categoria_id ON stock(categoria_id);
CREATE INDEX IF NOT EXISTS idx_stock_nombre ON stock(nombre);

-- Trigger para actualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_stock_timestamp 
AFTER UPDATE ON stock
FOR EACH ROW
BEGIN
  UPDATE stock SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
