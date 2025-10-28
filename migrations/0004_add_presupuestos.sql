-- ============================================
-- MIGRACIÓN 0004: TABLA PRESUPUESTOS
-- ============================================
-- Sistema de presupuestos para trabajos de cortinas/textiles
-- Con datos fiscales de Anushka Hogar

-- ============================================
-- TABLA PRESUPUESTOS
-- ============================================

CREATE TABLE IF NOT EXISTS presupuestos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Vinculación
  cliente_id INTEGER NOT NULL,
  
  -- Número de presupuesto (formato: PRE-2025-001)
  numero_presupuesto TEXT UNIQUE NOT NULL,
  
  -- Fechas
  fecha_emision DATE NOT NULL DEFAULT (date('now')),
  fecha_validez DATE, -- Hasta cuándo es válido el presupuesto
  
  -- Estado del presupuesto
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'enviado', 'aceptado', 'rechazado', 'vencido')),
  
  -- Descripción general del trabajo
  titulo TEXT NOT NULL,
  descripcion TEXT,
  
  -- DATOS ESPECÍFICOS DE CORTINAS/TEXTILES
  -- Medidas y materiales
  metros_tela REAL, -- Metros de tela necesarios
  tipo_tela TEXT, -- Tipo/nombre de la tela
  precio_metro_tela REAL, -- Precio por metro de tela
  
  -- Materiales adicionales (JSON o texto)
  materiales_adicionales TEXT, -- Rieles, soportes, accesorios, etc.
  coste_materiales_adicionales REAL,
  
  -- Instalación
  requiere_instalacion INTEGER DEFAULT 1, -- ¿Incluye instalación?
  horas_instalacion REAL, -- Horas estimadas de instalación
  precio_hora_instalacion REAL, -- Precio por hora de mano de obra
  
  -- Mano de obra adicional (confección, costura)
  horas_confeccion REAL,
  precio_hora_confeccion REAL,
  
  -- CÁLCULOS FINANCIEROS
  subtotal_tela REAL, -- metros_tela * precio_metro_tela
  subtotal_materiales REAL, -- coste_materiales_adicionales
  subtotal_instalacion REAL, -- horas_instalacion * precio_hora_instalacion
  subtotal_confeccion REAL, -- horas_confeccion * precio_hora_confeccion
  
  subtotal REAL NOT NULL, -- Suma de todos los subtotales
  porcentaje_iva REAL DEFAULT 21, -- IVA estándar en España
  importe_iva REAL, -- subtotal * (porcentaje_iva/100)
  total REAL NOT NULL, -- subtotal + importe_iva
  
  -- Descuento (opcional)
  descuento_porcentaje REAL DEFAULT 0,
  descuento_importe REAL DEFAULT 0,
  
  -- Notas y condiciones
  notas TEXT, -- Notas internas
  condiciones TEXT, -- Condiciones del presupuesto
  forma_pago TEXT, -- Efectivo, Transferencia, etc.
  
  -- Seguimiento
  fecha_envio DATE, -- Cuándo se envió al cliente
  fecha_respuesta DATE, -- Cuándo respondió el cliente
  motivo_rechazo TEXT, -- Si lo rechazó, por qué
  
  -- Control
  creado_por TEXT, -- Usuario que creó el presupuesto
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion DATETIME,
  
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- ============================================
-- TABLA LÍNEAS DE PRESUPUESTO (Opcional - para presupuestos multi-concepto)
-- ============================================

CREATE TABLE IF NOT EXISTS presupuesto_lineas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  presupuesto_id INTEGER NOT NULL,
  
  concepto TEXT NOT NULL, -- Descripción del concepto
  cantidad REAL NOT NULL DEFAULT 1,
  unidad TEXT, -- metros, unidades, horas, etc.
  precio_unitario REAL NOT NULL,
  subtotal REAL NOT NULL, -- cantidad * precio_unitario
  
  -- Detalles específicos (opcional)
  detalles TEXT, -- JSON con información adicional
  
  orden INTEGER DEFAULT 0, -- Para ordenar las líneas
  
  FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id) ON DELETE CASCADE
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_fecha_emision ON presupuestos(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_presupuestos_numero ON presupuestos(numero_presupuesto);
CREATE INDEX IF NOT EXISTS idx_presupuesto_lineas_presupuesto ON presupuesto_lineas(presupuesto_id);

-- ============================================
-- VISTA: PRESUPUESTOS CON DATOS DE CLIENTE
-- ============================================

CREATE VIEW IF NOT EXISTS vista_presupuestos_completos AS
SELECT 
  p.*,
  c.nombre as cliente_nombre,
  c.apellidos as cliente_apellidos,
  c.telefono as cliente_telefono,
  c.email as cliente_email,
  c.direccion as cliente_direccion,
  c.ciudad as cliente_ciudad,
  c.codigo_postal as cliente_codigo_postal
FROM presupuestos p
INNER JOIN clientes c ON p.cliente_id = c.id;

-- ============================================
-- VISTA: RESUMEN PRESUPUESTOS POR ESTADO
-- ============================================

CREATE VIEW IF NOT EXISTS vista_resumen_presupuestos AS
SELECT 
  estado,
  COUNT(*) as total_presupuestos,
  SUM(total) as importe_total,
  AVG(total) as importe_promedio
FROM presupuestos
GROUP BY estado;

-- ============================================
-- TRIGGER: AUTO-CALCULAR TOTALES
-- ============================================

-- Trigger para calcular automáticamente los totales antes de insertar
CREATE TRIGGER IF NOT EXISTS calcular_totales_presupuesto_insert
BEFORE INSERT ON presupuestos
FOR EACH ROW
BEGIN
  -- Calcular subtotales individuales
  UPDATE presupuestos SET
    subtotal_tela = COALESCE(NEW.metros_tela * NEW.precio_metro_tela, 0),
    subtotal_materiales = COALESCE(NEW.coste_materiales_adicionales, 0),
    subtotal_instalacion = COALESCE(NEW.horas_instalacion * NEW.precio_hora_instalacion, 0),
    subtotal_confeccion = COALESCE(NEW.horas_confeccion * NEW.precio_hora_confeccion, 0)
  WHERE id = NEW.id;
END;

-- ============================================
-- DATOS DE EMPRESA (Para plantillas)
-- ============================================

CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nombre_empresa TEXT DEFAULT 'Anushka Hogar',
  direccion TEXT DEFAULT 'Av. de Monelos 109',
  codigo_postal TEXT DEFAULT '15008',
  ciudad TEXT DEFAULT 'A Coruña',
  telefono TEXT,
  email TEXT,
  web TEXT,
  
  -- Condiciones por defecto para presupuestos
  condiciones_generales TEXT DEFAULT 'Presupuesto válido por 30 días. Pago: 50% señal, 50% al finalizar.',
  
  -- IVA por defecto
  iva_defecto REAL DEFAULT 21,
  
  CHECK (id = 1) -- Solo permite un registro
);

-- Insertar datos de empresa
INSERT OR REPLACE INTO configuracion_empresa (id, nombre_empresa, direccion, codigo_postal, ciudad, condiciones_generales)
VALUES (
  1,
  'Anushka Hogar',
  'Av. de Monelos 109',
  '15008',
  'A Coruña',
  'Presupuesto válido por 30 días desde la fecha de emisión.
Forma de pago: 50% de señal al aceptar el presupuesto, 50% restante al finalizar la instalación.
Los materiales quedan sujetos a disponibilidad del proveedor.
Garantía de 1 año en instalación y confección.'
);

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

-- Esta migración crea el sistema completo de presupuestos para Anushka Hogar
-- Incluye:
-- 1. Tabla presupuestos con campos específicos para cortinas/textiles
-- 2. Tabla opcional de líneas de presupuesto (para presupuestos detallados)
-- 3. Vistas para reportes y consultas rápidas
-- 4. Configuración de empresa para plantillas
-- 5. Triggers para cálculos automáticos (preparado para futuro)
