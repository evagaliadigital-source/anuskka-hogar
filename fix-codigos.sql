-- Script para renumerar códigos de trabajos por orden de creación

-- Primero, ver los trabajos actuales ordenados por ID
SELECT id, numero_trabajo, categoria, created_at 
FROM trabajos 
ORDER BY id;

-- Actualizar códigos de EXTERNO (TE-26XXX) en orden de creación
UPDATE trabajos 
SET numero_trabajo = 'TE-26' || substr('000' || (
  SELECT COUNT(*) 
  FROM trabajos t2 
  WHERE t2.categoria = 'externo' 
  AND t2.id <= trabajos.id
), -3)
WHERE categoria = 'externo';

-- Actualizar códigos de TIENDA (TT-26XXX) en orden de creación
UPDATE trabajos 
SET numero_trabajo = 'TT-26' || substr('000' || (
  SELECT COUNT(*) 
  FROM trabajos t2 
  WHERE t2.categoria = 'tienda' 
  AND t2.id <= trabajos.id
), -3)
WHERE categoria = 'tienda';

-- Verificar el resultado
SELECT id, numero_trabajo, categoria, cliente_id, created_at 
FROM trabajos 
ORDER BY id;
