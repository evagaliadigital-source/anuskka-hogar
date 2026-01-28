-- Actualizar uno por uno para evitar constraint
UPDATE trabajos SET numero_trabajo = 'TEMP-001' WHERE id = 1;
UPDATE trabajos SET numero_trabajo = 'TEMP-002' WHERE id = 2;
UPDATE trabajos SET numero_trabajo = 'TEMP-003' WHERE id = 3;
UPDATE trabajos SET numero_trabajo = 'TEMP-004' WHERE id = 4;
UPDATE trabajos SET numero_trabajo = 'TEMP-005' WHERE id = 5;
UPDATE trabajos SET numero_trabajo = 'TEMP-006' WHERE id = 6;
UPDATE trabajos SET numero_trabajo = 'TEMP-007' WHERE id = 7;
UPDATE trabajos SET numero_trabajo = 'TEMP-008' WHERE id = 8;
UPDATE trabajos SET numero_trabajo = 'TEMP-009' WHERE id = 9;
UPDATE trabajos SET numero_trabajo = 'TEMP-010' WHERE id = 10;
UPDATE trabajos SET numero_trabajo = 'TEMP-011' WHERE id = 11;
UPDATE trabajos SET numero_trabajo = 'TEMP-012' WHERE id = 12;

-- Ahora asignar los números correctos
UPDATE trabajos SET numero_trabajo = 'TT-26-001' WHERE id = 1;
UPDATE trabajos SET numero_trabajo = 'TT-26-002' WHERE id = 2;
UPDATE trabajos SET numero_trabajo = 'TT-26-003' WHERE id = 3;
UPDATE trabajos SET numero_trabajo = 'TT-26-004' WHERE id = 4;
UPDATE trabajos SET numero_trabajo = 'TT-26-005' WHERE id = 5;
UPDATE trabajos SET numero_trabajo = 'TT-26-006' WHERE id = 6;
UPDATE trabajos SET numero_trabajo = 'TT-26-007' WHERE id = 7;
UPDATE trabajos SET numero_trabajo = 'TT-26-008' WHERE id = 8;
UPDATE trabajos SET numero_trabajo = 'TT-26-009' WHERE id = 9;
UPDATE trabajos SET numero_trabajo = 'TT-26-010' WHERE id = 10;
UPDATE trabajos SET numero_trabajo = 'TT-26-011' WHERE id = 11;
UPDATE trabajos SET numero_trabajo = 'TT-26-012' WHERE id = 12;

-- Eliminar columna temporal
ALTER TABLE trabajos DROP COLUMN numero_temp;

-- Verificar
SELECT id, numero_trabajo FROM trabajos WHERE categoria = 'tienda' ORDER BY id;
