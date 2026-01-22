-- Migración 0038: Hacer precio_cliente opcional (nullable)

-- SQLite no permite ALTER COLUMN, así que necesitamos recrear la tabla

-- 1. Eliminar vista que depende de trabajos
DROP VIEW IF EXISTS vista_trabajos_con_fases;

-- 2. Crear tabla temporal con la nueva estructura (SIN fecha_limite que no existe en producción)
CREATE TABLE trabajos_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    empleada_id INTEGER,
    tipo_servicio TEXT,
    descripcion TEXT,
    direccion TEXT,
    fecha_programada TEXT,
    fecha_inicio TEXT,
    fecha_finalizacion TEXT,
    duracion_estimada INTEGER,
    duracion_real INTEGER,
    estado TEXT DEFAULT 'pendiente',
    prioridad TEXT DEFAULT 'normal',
    coste_materiales REAL DEFAULT 0,
    coste_mano_obra REAL DEFAULT 0,
    precio_cliente REAL,  -- YA NO ES NOT NULL
    notas TEXT,
    satisfaccion_cliente INTEGER,
    fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
    presupuesto_id INTEGER,
    nombre_empleada TEXT,
    numero_trabajo TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    FOREIGN KEY (empleada_id) REFERENCES empleadas (id)
);

-- 3. Copiar datos de la tabla original
INSERT INTO trabajos_new 
SELECT 
    id, cliente_id, empleada_id, tipo_servicio, descripcion, direccion,
    fecha_programada, fecha_inicio, fecha_finalizacion, duracion_estimada, duracion_real,
    estado, prioridad, coste_materiales, coste_mano_obra, precio_cliente, notas,
    satisfaccion_cliente, fecha_creacion, presupuesto_id, nombre_empleada, numero_trabajo
FROM trabajos;

-- 4. Eliminar tabla original
DROP TABLE trabajos;

-- 5. Renombrar tabla nueva
ALTER TABLE trabajos_new RENAME TO trabajos;

-- 6. Recrear índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_trabajos_numero_trabajo ON trabajos(numero_trabajo);

-- 7. Recrear vista
CREATE VIEW IF NOT EXISTS vista_trabajos_con_fases AS
SELECT 
  t.*,
  c.nombre as cliente_nombre,
  c.apellidos as cliente_apellidos,
  e.nombre as empleada_nombre,
  e.apellidos as empleada_apellidos,
  (SELECT COUNT(*) FROM trabajo_fases WHERE trabajo_id = t.id) as total_fases,
  (SELECT COUNT(*) FROM trabajo_fases WHERE trabajo_id = t.id AND estado = 'completado') as fases_completadas,
  (SELECT fase FROM trabajo_fases WHERE trabajo_id = t.id AND estado = 'en_proceso' ORDER BY orden LIMIT 1) as fase_actual
FROM trabajos t
LEFT JOIN clientes c ON t.cliente_id = c.id
LEFT JOIN empleadas e ON t.empleada_id = e.id;
