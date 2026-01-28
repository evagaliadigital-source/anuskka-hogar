-- Paso 1: Añadir columna temporal
ALTER TABLE trabajos ADD COLUMN numero_temp TEXT;

-- Paso 2: Generar números con formato TT-26-001 (3 dígitos)
UPDATE trabajos SET numero_temp = 'TT-26-' || substr('000' || id, -3) WHERE categoria = 'tienda';

-- Paso 3: Verificar
SELECT id, numero_trabajo, numero_temp FROM trabajos WHERE categoria = 'tienda' ORDER BY id;
