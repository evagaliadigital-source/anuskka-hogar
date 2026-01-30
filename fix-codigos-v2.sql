-- Renumerar códigos de trabajos por orden de ID

-- Ver estado actual
SELECT id, numero_trabajo, categoria FROM trabajos ORDER BY id;

-- Actualizar EXTERNO (TE-26XXX)
UPDATE trabajos 
SET numero_trabajo = 'TE-26' || substr('000' || (
  SELECT COUNT(*) 
  FROM trabajos t2 
  WHERE t2.categoria = 'externo' 
  AND t2.id <= trabajos.id
), -3)
WHERE categoria = 'externo';

-- Actualizar TIENDA (TT-26XXX)
UPDATE trabajos 
SET numero_trabajo = 'TT-26' || substr('000' || (
  SELECT COUNT(*) 
  FROM trabajos t2 
  WHERE t2.categoria = 'tienda' 
  AND t2.id <= trabajos.id
), -3)
WHERE categoria = 'tienda';

-- Ver resultado
SELECT id, numero_trabajo, categoria FROM trabajos ORDER BY id;
