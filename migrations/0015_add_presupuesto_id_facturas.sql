-- Añadir columna presupuesto_id a facturas
ALTER TABLE facturas ADD COLUMN presupuesto_id INTEGER;

-- Añadir otras columnas necesarias
ALTER TABLE facturas ADD COLUMN porcentaje_iva REAL DEFAULT 21;
ALTER TABLE facturas ADD COLUMN importe_iva REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN descuento_porcentaje REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN forma_pago TEXT;
ALTER TABLE facturas ADD COLUMN condiciones TEXT;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_facturas_presupuesto ON facturas(presupuesto_id);
