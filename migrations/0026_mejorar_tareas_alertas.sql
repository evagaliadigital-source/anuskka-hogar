-- Añadir campos que faltan para gestión completa de tareas
-- (prioridad, fecha_limite, updated_at ya existen)
ALTER TABLE tareas_pendientes ADD COLUMN asignado_a INTEGER;
ALTER TABLE tareas_pendientes ADD COLUMN tiempo_estimado INTEGER; -- minutos
ALTER TABLE tareas_pendientes ADD COLUMN recordatorio_minutos INTEGER; -- minutos antes de vencimiento
ALTER TABLE tareas_pendientes ADD COLUMN notas TEXT;

-- Crear tabla para alertas/recordatorios de tareas
CREATE TABLE IF NOT EXISTS tareas_alertas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarea_id INTEGER NOT NULL,
  tipo_alerta TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  enviada INTEGER DEFAULT 0,
  fecha_programada DATETIME NOT NULL,
  fecha_enviada DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tarea_id) REFERENCES tareas_pendientes(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON tareas_pendientes(asignado_a);
CREATE INDEX IF NOT EXISTS idx_alertas_programadas ON tareas_alertas(fecha_programada, enviada);
