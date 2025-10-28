-- Migration: Añadir fase "mediciones" y asignación de personal a fases
-- 1. Añade nueva fase "mediciones" como primera fase
-- 2. Añade campo personal_id a trabajo_fases para asignar responsable

-- Paso 1: Eliminar vista primero (depende de la tabla)
DROP VIEW IF EXISTS vista_trabajos_con_fases;

-- Paso 2: Crear nueva tabla con la estructura actualizada
CREATE TABLE IF NOT EXISTS trabajo_fases_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trabajo_id INTEGER NOT NULL,
  fase TEXT NOT NULL CHECK(fase IN ('mediciones', 'pedidos', 'confeccion', 'instalacion')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'en_proceso', 'completado')),
  orden INTEGER NOT NULL,
  personal_id INTEGER,
  fecha_inicio DATETIME,
  fecha_completado DATETIME,
  notas TEXT,
  FOREIGN KEY (trabajo_id) REFERENCES trabajos(id) ON DELETE CASCADE,
  FOREIGN KEY (personal_id) REFERENCES empleadas(id) ON DELETE SET NULL,
  UNIQUE(trabajo_id, fase)
);

-- Paso 3: Copiar datos existentes (ajustando orden +1 para hacer espacio a mediciones)
INSERT INTO trabajo_fases_new (id, trabajo_id, fase, estado, orden, personal_id, fecha_inicio, fecha_completado, notas)
SELECT 
  id, 
  trabajo_id, 
  fase, 
  estado, 
  orden + 1, -- Shift orden: pedidos pasa de 1 a 2, confeccion de 2 a 3, instalacion de 3 a 4
  NULL as personal_id, -- Por defecto sin asignar
  fecha_inicio, 
  fecha_completado, 
  notas
FROM trabajo_fases;

-- Paso 4: Eliminar tabla vieja
DROP TABLE trabajo_fases;

-- Paso 5: Renombrar nueva tabla
ALTER TABLE trabajo_fases_new RENAME TO trabajo_fases;

-- Paso 6: Recrear índices
CREATE INDEX IF NOT EXISTS idx_trabajo_fases_trabajo_id ON trabajo_fases(trabajo_id);
CREATE INDEX IF NOT EXISTS idx_trabajo_fases_estado ON trabajo_fases(estado);
CREATE INDEX IF NOT EXISTS idx_trabajo_fases_personal_id ON trabajo_fases(personal_id);

-- Paso 7: Insertar fase "mediciones" para trabajos existentes (orden 1)
INSERT INTO trabajo_fases (trabajo_id, fase, estado, orden, personal_id, fecha_inicio, fecha_completado, notas)
SELECT 
  DISTINCT trabajo_id,
  'mediciones' as fase,
  'pendiente' as estado,
  1 as orden,
  NULL as personal_id,
  NULL as fecha_inicio,
  NULL as fecha_completado,
  'Fase añadida automáticamente por migración' as notas
FROM trabajo_fases
WHERE trabajo_id NOT IN (
  SELECT trabajo_id FROM trabajo_fases WHERE fase = 'mediciones'
);

-- Paso 8: Recrear vista con las 4 fases

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
