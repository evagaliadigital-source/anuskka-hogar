-- Añadir stock_id a presupuesto_lineas para vincular con inventario
ALTER TABLE presupuesto_lineas ADD COLUMN stock_id INTEGER REFERENCES stock(id);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_presupuesto_lineas_stock_id ON presupuesto_lineas(stock_id);
