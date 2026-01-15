-- Añadir campo nombre_empleada para asignación simple (sin FK)
-- Similar a asignado_a en tareas_pendientes
ALTER TABLE trabajos ADD COLUMN nombre_empleada TEXT NULL;

-- Copiar nombres existentes de empleadas (si hay datos)
UPDATE trabajos 
SET nombre_empleada = (
  SELECT nombre || ' ' || apellidos 
  FROM empleadas 
  WHERE empleadas.id = trabajos.empleada_id
)
WHERE empleada_id IS NOT NULL;
