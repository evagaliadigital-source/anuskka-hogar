-- ============================================
-- MIGRACIÓN 0036: NUEVO SISTEMA DE INVENTARIO
-- ============================================
-- Rediseño completo para tienda de cortinas y textil hogar
-- Soporta: categorías reales, variantes por medidas, códigos de proveedor

-- ============================================
-- 1. TABLA DE CATEGORÍAS (predefinidas)
-- ============================================
CREATE TABLE IF NOT EXISTS categorias_inventario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  categoria_padre_id INTEGER, -- Para subcategorías
  unidades_permitidas TEXT NOT NULL, -- JSON: ["metro","unidad","juego"]
  permite_variantes INTEGER DEFAULT 1, -- 1=sí, 0=no
  campos_requeridos TEXT, -- JSON: ["medidas","color"]
  orden INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1,
  FOREIGN KEY (categoria_padre_id) REFERENCES categorias_inventario(id)
);

-- Insertar categorías principales
INSERT INTO categorias_inventario (nombre, slug, unidades_permitidas, permite_variantes, orden) VALUES
('Telas por metro', 'telas-metro', '["metro","centimetro"]', 1, 1),
('Cortinas confeccionadas', 'cortinas-confeccionadas', '["unidad","par"]', 1, 2),
('Cojines', 'cojines', '["unidad"]', 1, 3),
('Ropa de cama', 'ropa-cama', '["unidad","juego"]', 1, 4),
('Baño', 'bano', '["unidad","juego"]', 1, 5),
('Mantas y plaids', 'mantas-plaids', '["unidad"]', 1, 6),
('Accesorios de cortina', 'accesorios-cortina', '["unidad","metro"]', 0, 7),
('Mercería y consumibles', 'merceria-consumibles', '["unidad","metro","rollo"]', 0, 8);

-- Insertar subcategorías (ejemplos)
INSERT INTO categorias_inventario (nombre, slug, categoria_padre_id, unidades_permitidas, permite_variantes, orden) VALUES
-- Cojines
('Fundas de cojín', 'fundas-cojin', 3, '["unidad"]', 1, 31),
('Rellenos de cojín', 'rellenos-cojin', 3, '["unidad"]', 1, 32),
('Cojines completos', 'cojines-completos', 3, '["unidad"]', 1, 33),

-- Ropa de cama
('Sábanas', 'sabanas', 4, '["unidad","juego"]', 1, 41),
('Fundas nórdicas', 'fundas-nordicas', 4, '["unidad","juego"]', 1, 42),
('Edredones', 'edredones', 4, '["unidad"]', 1, 43),

-- Baño
('Toallas', 'toallas', 5, '["unidad","juego"]', 1, 51),
('Alfombrillas de baño', 'alfombrillas-bano', 5, '["unidad"]', 1, 52),

-- Accesorios
('Barras y rieles', 'barras-rieles', 7, '["unidad","metro"]', 0, 71),
('Anillas y ganchos', 'anillas-ganchos', 7, '["unidad"]', 0, 72),

-- Telas por tipo
('Visillos', 'visillos', 1, '["metro"]', 0, 11),
('Telas opacas', 'telas-opacas', 1, '["metro"]', 0, 12),
('Lonetas', 'lonetas', 1, '["metro"]', 0, 13),
('Telas de exterior', 'telas-exterior', 1, '["metro"]', 0, 14);

-- ============================================
-- 2. TABLA DE PRODUCTOS BASE (sin variantes)
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL,
  descripcion TEXT,
  
  -- Si NO tiene variantes, estos campos aplican directamente
  precio_base REAL, -- Precio base si no hay variantes
  stock_actual REAL DEFAULT 0,
  stock_minimo REAL DEFAULT 0,
  unidad TEXT, -- metro, unidad, juego, etc.
  
  -- Información adicional
  imagen_url TEXT,
  notas TEXT,
  
  -- Control
  tiene_variantes INTEGER DEFAULT 0, -- 0=no, 1=sí
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (categoria_id) REFERENCES categorias_inventario(id)
);

-- ============================================
-- 3. TABLA DE VARIANTES (medidas, colores, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS producto_variantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  
  -- Atributos de la variante
  sku_interno TEXT UNIQUE, -- Generado automáticamente o manual
  nombre_variante TEXT, -- Ej: "45x45 cm - Blanco"
  
  -- Medidas (si aplica)
  medida_ancho REAL, -- en cm
  medida_alto REAL, -- en cm
  medida_texto TEXT, -- Ej: "90x90 cm"
  
  -- Otros atributos
  color TEXT,
  tejido TEXT,
  
  -- Stock y precio específicos
  precio REAL NOT NULL,
  stock_actual REAL DEFAULT 0,
  stock_minimo REAL DEFAULT 0,
  unidad TEXT NOT NULL,
  
  -- Control
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- ============================================
-- 4. TABLA DE PROVEEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar proveedor de ejemplo
INSERT INTO proveedores (nombre, contacto) VALUES ('Proveedor General', 'Sin datos');

-- ============================================
-- 5. TABLA DE CÓDIGOS EXTERNOS (clave para facturas)
-- ============================================
CREATE TABLE IF NOT EXISTS producto_codigos_externos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Puede ser producto o variante
  producto_id INTEGER,
  variante_id INTEGER,
  
  -- Proveedor y su código
  proveedor_id INTEGER NOT NULL,
  codigo_proveedor TEXT NOT NULL, -- El código que aparece en la factura
  
  -- Códigos de barras (opcional)
  ean TEXT,
  
  -- Información de compra
  coste_ultima_compra REAL,
  fecha_ultima_compra DATE,
  
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  
  -- Un código de proveedor es único por proveedor
  UNIQUE(proveedor_id, codigo_proveedor)
);

-- ============================================
-- 6. MIGRAR DATOS ANTIGUOS DE STOCK
-- ============================================
-- Migrar productos antiguos a la nueva tabla
INSERT INTO productos (nombre, categoria_id, descripcion, precio_base, stock_actual, stock_minimo, unidad, tiene_variantes, activo)
SELECT 
  nombre,
  (SELECT id FROM categorias_inventario WHERE slug = 'telas-metro' LIMIT 1) as categoria_id,
  descripcion,
  precio_unitario,
  cantidad_actual,
  cantidad_minima,
  CASE 
    WHEN unidad = 'Metro' THEN 'metro'
    WHEN unidad = 'Unidad' THEN 'unidad'
    ELSE 'unidad'
  END as unidad,
  0 as tiene_variantes,
  activo
FROM stock
WHERE NOT EXISTS (
  SELECT 1 FROM productos WHERE productos.nombre = stock.nombre
);

-- ============================================
-- 7. ÍNDICES PARA RENDIMIENTO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_variantes_producto ON producto_variantes(producto_id);
CREATE INDEX IF NOT EXISTS idx_codigos_proveedor ON producto_codigos_externos(proveedor_id, codigo_proveedor);
CREATE INDEX IF NOT EXISTS idx_codigos_ean ON producto_codigos_externos(ean);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);

-- ============================================
-- NOTA: NO BORRAMOS LA TABLA 'stock' ANTIGUA
-- La mantenemos por compatibilidad con trabajo_materiales
-- ============================================
