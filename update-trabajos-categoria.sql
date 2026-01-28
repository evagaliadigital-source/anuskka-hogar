-- Script para actualizar trabajos existentes con categoría y número

-- 1. Primero, asignar categoría "tienda" a todos los trabajos que no tienen
UPDATE trabajos 
SET categoria = 'tienda' 
WHERE categoria IS NULL OR categoria = '';

-- 2. Generar números TT-XXXX para trabajos de tienda
-- Usamos el año actual y el ID del trabajo
UPDATE trabajos 
SET numero_trabajo = 'TT-' || strftime('%Y', COALESCE(fecha_programada, fecha_creacion)) || '-' || printf('%04d', id)
WHERE categoria = 'tienda' AND (numero_trabajo IS NULL OR numero_trabajo = '');

-- 3. Verificar resultados
SELECT 
  id,
  numero_trabajo,
  categoria,
  tipo_servicio,
  fecha_programada
FROM trabajos 
ORDER BY id 
LIMIT 10;
