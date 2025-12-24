-- Añadir estado 'finalizado' al CHECK constraint de presupuestos
-- SQLite no soporta ALTER CHECK, así que recreamos la tabla

-- 0. Eliminar vistas primero
DROP VIEW IF EXISTS vista_presupuestos_completos;
DROP VIEW IF EXISTS vista_resumen_presupuestos;

-- 1. Crear tabla temporal con nuevo CHECK
CREATE TABLE presupuestos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  numero_presupuesto TEXT UNIQUE NOT NULL,
  fecha_emision DATE NOT NULL DEFAULT (date('now')),
  fecha_validez DATE,
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'enviado', 'aceptado', 'rechazado', 'vencido', 'finalizado')),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  metros_tela REAL,
  tipo_tela TEXT,
  precio_metro_tela REAL,
  materiales_adicionales TEXT,
  coste_materiales_adicionales REAL,
  requiere_instalacion INTEGER DEFAULT 1,
  horas_instalacion REAL,
  precio_hora_instalacion REAL,
  horas_confeccion REAL,
  precio_hora_confeccion REAL,
  subtotal_tela REAL,
  subtotal_materiales REAL,
  subtotal_instalacion REAL,
  subtotal_confeccion REAL,
  subtotal REAL NOT NULL,
  porcentaje_iva REAL DEFAULT 21,
  importe_iva REAL,
  total REAL NOT NULL,
  descuento_porcentaje REAL DEFAULT 0,
  descuento_importe REAL DEFAULT 0,
  notas TEXT,
  condiciones TEXT,
  forma_pago TEXT,
  fecha_envio DATE,
  fecha_respuesta DATE,
  motivo_rechazo TEXT,
  creado_por TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion DATETIME,
  trabajo_id INTEGER DEFAULT NULL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- 2. Copiar datos existentes
INSERT INTO presupuestos_new SELECT * FROM presupuestos;

-- 3. Eliminar tabla antigua
DROP TABLE presupuestos;

-- 4. Renombrar nueva tabla
ALTER TABLE presupuestos_new RENAME TO presupuestos;

-- 5. Recrear índices
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_fecha ON presupuestos(fecha_emision);

-- 6. Recrear vista completa
CREATE VIEW vista_presupuestos_completos AS
SELECT 
  p.*,
  c.nombre as cliente_nombre,
  c.apellidos as cliente_apellidos,
  c.telefono as cliente_telefono,
  c.email as cliente_email,
  c.direccion as cliente_direccion
FROM presupuestos p
LEFT JOIN clientes c ON p.cliente_id = c.id;

-- 7. Recrear vista resumen
CREATE VIEW vista_resumen_presupuestos AS
SELECT 
  estado,
  COUNT(*) as total_presupuestos,
  SUM(total) as importe_total,
  AVG(total) as importe_promedio
FROM presupuestos
GROUP BY estado;
