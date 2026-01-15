-- Añadir campo trabajo_id a tareas_pendientes
ALTER TABLE tareas_pendientes ADD COLUMN trabajo_id INTEGER REFERENCES trabajos(id);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tareas_trabajo_id ON tareas_pendientes(trabajo_id);
