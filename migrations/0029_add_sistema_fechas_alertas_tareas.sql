-- Añadir sistema completo de fechas y alertas para tareas

-- Añadir campo fecha_inicio
ALTER TABLE tareas_pendientes ADD COLUMN fecha_inicio TEXT;

-- Añadir campo fecha_recordatorio
ALTER TABLE tareas_pendientes ADD COLUMN fecha_recordatorio TEXT;

-- Añadir campo para tracking de recordatorios enviados
ALTER TABLE tareas_pendientes ADD COLUMN recordatorio_enviado INTEGER DEFAULT 0;

-- Añadir campo para notas de la tarea
ALTER TABLE tareas_pendientes ADD COLUMN notas_internas TEXT;

-- Índices para mejorar consultas de alertas
CREATE INDEX IF NOT EXISTS idx_tareas_fecha_limite ON tareas_pendientes(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_tareas_fecha_inicio ON tareas_pendientes(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_tareas_fecha_recordatorio ON tareas_pendientes(fecha_recordatorio);
CREATE INDEX IF NOT EXISTS idx_tareas_estado_fecha ON tareas_pendientes(estado, fecha_limite);
