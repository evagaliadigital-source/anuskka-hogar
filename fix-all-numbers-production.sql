-- Eliminar el trabajo T-0013 (ID 13)
DELETE FROM trabajos WHERE id = 13;

-- Verificar que todos tengan TT-26-XXX
SELECT id, numero_trabajo FROM trabajos ORDER BY id;
