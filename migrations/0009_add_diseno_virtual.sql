-- Tabla para proyectos de diseño virtual
CREATE TABLE IF NOT EXISTS proyectos_diseno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,
  nombre_proyecto TEXT NOT NULL,
  imagen_original_url TEXT NOT NULL,
  imagen_original_r2_key TEXT,
  
  -- Análisis de IA
  analisis_ia TEXT, -- JSON con análisis de Gemini Vision
  dimensiones_detectadas TEXT, -- JSON: {ancho: 2.5, alto: 2.0}
  estilo_detectado TEXT, -- moderno, clásico, rústico, etc.
  colores_predominantes TEXT, -- JSON: ["#FFFFFF", "#F5F5DC"]
  
  -- Configuración elegida
  tela_nombre TEXT,
  tela_referencia TEXT,
  tela_precio_metro REAL,
  tipo_cortina TEXT, -- ondas_francesas, panel_japones, pliegues_rectos, estor
  forro_termico INTEGER DEFAULT 0,
  motorizada INTEGER DEFAULT 0,
  doble_cortina INTEGER DEFAULT 0,
  
  -- Resultados generados
  imagenes_generadas TEXT, -- JSON array con URLs de las 3 opciones
  imagen_seleccionada_url TEXT,
  imagen_seleccionada_r2_key TEXT,
  
  -- Cálculos automáticos
  metraje_calculado REAL,
  precio_tela REAL,
  precio_accesorios REAL,
  precio_instalacion REAL,
  precio_total REAL,
  
  -- Estado y seguimiento
  estado TEXT DEFAULT 'borrador', -- borrador, compartido, presupuestado, cerrado
  presupuesto_id INTEGER,
  compartido_whatsapp INTEGER DEFAULT 0,
  compartido_email TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id) ON DELETE SET NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_proyectos_diseno_cliente ON proyectos_diseno(cliente_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_diseno_estado ON proyectos_diseno(estado);
CREATE INDEX IF NOT EXISTS idx_proyectos_diseno_created ON proyectos_diseno(created_at);

-- Tabla para catálogo de telas (ampliación del stock)
CREATE TABLE IF NOT EXISTS catalogo_telas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_id INTEGER, -- Si viene del stock existente
  nombre TEXT NOT NULL,
  referencia TEXT UNIQUE,
  descripcion TEXT,
  categoria_id INTEGER,
  
  -- Características técnicas
  composicion TEXT, -- 100% poliéster, lino/algodón, etc.
  ancho_rollo REAL DEFAULT 2.8, -- metros
  peso_m2 REAL, -- gramos por m²
  
  -- Propiedades
  opacidad TEXT, -- transparente, traslúcida, opaca, blackout
  resistencia_luz TEXT, -- baja, media, alta
  lavable INTEGER DEFAULT 1,
  ignifugo INTEGER DEFAULT 0,
  
  -- Visual
  color_principal TEXT, -- Nombre del color
  color_hex TEXT, -- Código hexadecimal
  patron TEXT, -- liso, estampado, rayas, etc.
  textura TEXT, -- lisa, rugosa, satinada, etc.
  imagen_muestra_url TEXT, -- URL de imagen de la tela
  imagen_textura_url TEXT, -- URL para aplicar en generación IA
  
  -- Precio y disponibilidad
  precio_metro REAL NOT NULL,
  stock_metros REAL DEFAULT 0,
  disponible INTEGER DEFAULT 1,
  
  -- Popularidad
  veces_usado INTEGER DEFAULT 0,
  rating_promedio REAL DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (stock_id) REFERENCES stock(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Índices para catálogo
CREATE INDEX IF NOT EXISTS idx_catalogo_telas_categoria ON catalogo_telas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_telas_disponible ON catalogo_telas(disponible);
CREATE INDEX IF NOT EXISTS idx_catalogo_telas_opacidad ON catalogo_telas(opacidad);

-- Insertar telas de ejemplo (basadas en las categorías existentes)
INSERT INTO catalogo_telas (nombre, referencia, descripcion, categoria_id, composicion, opacidad, color_principal, color_hex, patron, textura, precio_metro, stock_metros, imagen_muestra_url) VALUES
  -- Telas categoría "Telas" (id=1)
  ('Lino Natural Beige', 'LN-BG-001', 'Lino 100% natural, perfecto para salones con luz natural', 1, '100% Lino', 'traslúcida', 'Beige', '#F5F5DC', 'liso', 'rugosa', 28.50, 150.0, '/static/telas/lino-beige.jpg'),
  ('Terciopelo Gris Antracita', 'TV-GR-002', 'Terciopelo pesado, elegante y opaco', 1, '100% Poliéster', 'opaca', 'Gris', '#36454F', 'liso', 'aterciopelada', 42.00, 80.0, '/static/telas/terciopelo-gris.jpg'),
  ('Algodón Blanco Roto', 'AG-BL-003', 'Algodón suave, ideal para ambientes frescos', 1, '100% Algodón', 'traslúcida', 'Blanco', '#FFFFF0', 'liso', 'lisa', 22.00, 200.0, '/static/telas/algodon-blanco.jpg'),
  ('Seda Champagne', 'SD-CH-004', 'Seda natural con caída elegante', 1, '100% Seda', 'traslúcida', 'Champagne', '#F7E7CE', 'liso', 'satinada', 65.00, 50.0, '/static/telas/seda-champagne.jpg'),
  
  -- Forros categoría "Forros" (id=4)
  ('Forro Térmico Blanco', 'FR-TR-001', 'Forro térmico aislante, reduce temperatura hasta 5°C', 4, 'Poliéster + Espuma', 'opaca', 'Blanco', '#FFFFFF', 'liso', 'acolchada', 15.00, 300.0, '/static/telas/forro-termico.jpg'),
  ('Blackout Total Negro', 'BL-NG-002', 'Bloqueo de luz 100%, ideal para dormitorios', 4, 'Poliéster revestido', 'blackout', 'Negro', '#000000', 'liso', 'lisa', 18.50, 250.0, '/static/telas/blackout-negro.jpg'),
  ('Blackout Gris Perla', 'BL-GP-003', 'Blackout elegante para salones', 4, 'Poliéster revestido', 'blackout', 'Gris', '#D3D3D3', 'liso', 'lisa', 18.50, 200.0, '/static/telas/blackout-gris.jpg');

-- Trigger para actualizar updated_at en proyectos_diseno
CREATE TRIGGER IF NOT EXISTS update_proyectos_diseno_timestamp 
AFTER UPDATE ON proyectos_diseno
BEGIN
  UPDATE proyectos_diseno SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en catalogo_telas
CREATE TRIGGER IF NOT EXISTS update_catalogo_telas_timestamp 
AFTER UPDATE ON catalogo_telas
BEGIN
  UPDATE catalogo_telas SET updated_at = datetime('now') WHERE id = NEW.id;
END;
