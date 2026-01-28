-- Paso 1: Copiar de temporal a principal
UPDATE trabajos SET numero_trabajo = numero_temp WHERE categoria = 'tienda' AND numero_temp IS NOT NULL;

-- Paso 2: Eliminar columna temporal
ALTER TABLE trabajos DROP COLUMN numero_temp;

-- Paso 3: Verificar resultado final
SELECT id, numero_trabajo, categoria, tipo_servicio FROM trabajos WHERE categoria = 'tienda' ORDER BY id;
