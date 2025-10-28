-- ============================================
-- MIGRACIÓN 0003: CAMPOS CRM PARA CLIENTES
-- ============================================
-- Convierte la tabla clientes en un CRM completo
-- para trackear pipeline, presupuestos y seguimiento

-- ============================================
-- ESTADO DEL NEGOCIO / PIPELINE
-- ============================================

-- Estado actual en el pipeline de ventas
ALTER TABLE clientes ADD COLUMN estado_negocio TEXT DEFAULT 'prospecto' 
  CHECK(estado_negocio IN ('prospecto', 'presupuesto_enviado', 'en_curso', 'finalizado', 'cancelado'));

-- Tipo de relación comercial
ALTER TABLE clientes ADD COLUMN tipo_cliente TEXT DEFAULT 'puntual' 
  CHECK(tipo_cliente IN ('puntual', 'recurrente', 'contrato'));

-- Prioridad del cliente
ALTER TABLE clientes ADD COLUMN prioridad TEXT DEFAULT 'media' 
  CHECK(prioridad IN ('alta', 'media', 'baja'));

-- ============================================
-- PRESUPUESTOS Y OPORTUNIDADES
-- ============================================

-- Tiene presupuesto pendiente de respuesta
ALTER TABLE clientes ADD COLUMN presupuesto_pendiente INTEGER DEFAULT 0;

-- Monto del presupuesto enviado
ALTER TABLE clientes ADD COLUMN monto_presupuesto DECIMAL(10,2);

-- Fecha en que se envió el presupuesto
ALTER TABLE clientes ADD COLUMN fecha_presupuesto DATE;

-- Fecha esperada de respuesta
ALTER TABLE clientes ADD COLUMN fecha_respuesta_esperada DATE;

-- Probabilidad de cierre (0-100%)
ALTER TABLE clientes ADD COLUMN probabilidad_cierre INTEGER DEFAULT 50;

-- ============================================
-- SEGUIMIENTO COMERCIAL
-- ============================================

-- Última vez que contactamos al cliente
ALTER TABLE clientes ADD COLUMN fecha_ultimo_contacto DATE;

-- Medio del último contacto (llamada, email, whatsapp, visita)
ALTER TABLE clientes ADD COLUMN medio_ultimo_contacto TEXT;

-- Próxima acción a realizar
ALTER TABLE clientes ADD COLUMN proxima_accion TEXT;

-- Fecha programada para la próxima acción
ALTER TABLE clientes ADD COLUMN fecha_proxima_accion DATE;

-- Responsable del seguimiento
ALTER TABLE clientes ADD COLUMN responsable_seguimiento TEXT;

-- ============================================
-- INFORMACIÓN COMERCIAL ADICIONAL
-- ============================================

-- Notas comerciales (separadas de notas técnicas)
ALTER TABLE clientes ADD COLUMN notas_comerciales TEXT;

-- Origen del lead (web, referido, llamada fría, evento, etc.)
ALTER TABLE clientes ADD COLUMN origen_lead TEXT;

-- Cliente que lo refirió (si aplica)
ALTER TABLE clientes ADD COLUMN referido_por TEXT;

-- Valor estimado del cliente (lifetime value)
ALTER TABLE clientes ADD COLUMN valor_estimado DECIMAL(10,2);

-- Número de servicios contratados históricamente
ALTER TABLE clientes ADD COLUMN servicios_contratados INTEGER DEFAULT 0;

-- Fecha del último servicio realizado
ALTER TABLE clientes ADD COLUMN fecha_ultimo_servicio DATE;

-- ============================================
-- PREFERENCIAS Y SEGMENTACIÓN
-- ============================================

-- Servicios de interés (JSON array)
ALTER TABLE clientes ADD COLUMN servicios_interes TEXT;

-- Frecuencia preferida de servicio
ALTER TABLE clientes ADD COLUMN frecuencia_preferida TEXT;

-- Días/horarios preferidos
ALTER TABLE clientes ADD COLUMN horario_preferido TEXT;

-- Nivel de satisfacción general (1-5)
ALTER TABLE clientes ADD COLUMN satisfaccion_general INTEGER;

-- ============================================
-- ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clientes_estado_negocio ON clientes(estado_negocio);
CREATE INDEX IF NOT EXISTS idx_clientes_prioridad ON clientes(prioridad);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_cliente ON clientes(tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_presupuesto_pendiente ON clientes(presupuesto_pendiente);
CREATE INDEX IF NOT EXISTS idx_clientes_fecha_proxima_accion ON clientes(fecha_proxima_accion);
CREATE INDEX IF NOT EXISTS idx_clientes_origen_lead ON clientes(origen_lead);
CREATE INDEX IF NOT EXISTS idx_clientes_responsable ON clientes(responsable_seguimiento);

-- ============================================
-- VISTA PARA DASHBOARD CRM
-- ============================================

CREATE VIEW IF NOT EXISTS vista_pipeline_crm AS
SELECT 
  estado_negocio,
  COUNT(*) as total_clientes,
  COUNT(CASE WHEN presupuesto_pendiente = 1 THEN 1 END) as con_presupuesto,
  SUM(COALESCE(monto_presupuesto, 0)) as monto_total_pipeline,
  AVG(COALESCE(probabilidad_cierre, 0)) as probabilidad_promedio
FROM clientes
WHERE activo = 1
GROUP BY estado_negocio;

CREATE VIEW IF NOT EXISTS vista_clientes_accion_pendiente AS
SELECT 
  id,
  nombre,
  apellidos,
  telefono,
  estado_negocio,
  prioridad,
  proxima_accion,
  fecha_proxima_accion,
  responsable_seguimiento
FROM clientes
WHERE activo = 1 
  AND fecha_proxima_accion IS NOT NULL
  AND estado_negocio NOT IN ('finalizado', 'cancelado')
ORDER BY fecha_proxima_accion ASC;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

-- Esta migración convierte la tabla clientes en un CRM completo
-- Permite trackear:
-- 1. Pipeline de ventas (prospecto → presupuesto → en_curso → finalizado)
-- 2. Presupuestos pendientes y su seguimiento
-- 3. Tipo de relación comercial (puntual, recurrente, contrato)
-- 4. Prioridad y acciones de seguimiento
-- 5. Origen de leads y referidos
-- 6. Valor del cliente y histórico de servicios
