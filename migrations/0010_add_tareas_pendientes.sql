-- Crear tabla de tareas pendientes
CREATE TABLE IF NOT EXISTS tareas_pendientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL, -- 'añadir_tela_stock', 'revisar_presupuesto', etc.
  titulo TEXT NOT NULL,
  descripcion TEXT,
  
  -- Datos relacionados (JSON flexible para diferentes tipos de tareas)
  datos_tarea TEXT, -- JSON: {tela_nombre, tela_precio, imagen_url, etc.}
  
  -- Estado
  estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_proceso', 'completada', 'cancelada'
  prioridad INTEGER DEFAULT 2, -- 1: alta, 2: media, 3: baja
  
  -- Referencias opcionales
  proyecto_id INTEGER,
  cliente_id INTEGER,
  
  -- Fechas
  fecha_limite DATETIME,
  completada_por TEXT, -- Nombre de quien la completó
  completada_en DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (proyecto_id) REFERENCES proyectos_diseno(id) ON DELETE SET NULL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas_pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_tipo ON tareas_pendientes(tipo);
CREATE INDEX IF NOT EXISTS idx_tareas_prioridad ON tareas_pendientes(prioridad);
CREATE INDEX IF NOT EXISTS idx_tareas_created ON tareas_pendientes(created_at DESC);
