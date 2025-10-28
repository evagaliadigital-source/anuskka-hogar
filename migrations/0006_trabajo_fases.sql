-- Migration: Sistema de fases para trabajos
-- Permite tracking de Pedidos → Confección → Instalación

CREATE TABLE IF NOT EXISTS trabajo_fases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trabajo_id INTEGER NOT NULL,
  fase TEXT NOT NULL CHECK(fase IN ('pedidos', 'confeccion', 'instalacion')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'en_proceso', 'completado')),
  orden INTEGER NOT NULL,
  fecha_inicio DATETIME,
  fecha_completado DATETIME,
  notas TEXT,
  FOREIGN KEY (trabajo_id) REFERENCES trabajos(id) ON DELETE CASCADE,
  UNIQUE(trabajo_id, fase)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_trabajo_fases_trabajo_id ON trabajo_fases(trabajo_id);
CREATE INDEX IF NOT EXISTS idx_trabajo_fases_estado ON trabajo_fases(estado);

-- Vista para ver trabajos con sus fases
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
