-- Actualizar formato de TT-26-001 a TT-26001 (eliminar guion del medio)
UPDATE trabajos 
SET numero_trabajo = REPLACE(numero_trabajo, 'TT-26-', 'TT-26')
WHERE categoria = 'tienda' AND numero_trabajo LIKE 'TT-26-%';

UPDATE trabajos 
SET numero_trabajo = REPLACE(numero_trabajo, 'TE-26-', 'TE-26')
WHERE categoria = 'externo' AND numero_trabajo LIKE 'TE-26-%';

-- Verificar resultado
SELECT id, numero_trabajo, categoria FROM trabajos ORDER BY id;
