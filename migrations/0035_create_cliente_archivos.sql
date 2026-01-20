-- Crear tabla para archivos de clientes
CREATE TABLE IF NOT EXISTS cliente_archivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tipo_archivo TEXT NOT NULL, -- 'pdf', 'image', 'doc', etc
  mime_type TEXT,
  url_r2 TEXT NOT NULL,
  size_bytes INTEGER,
  subido_por TEXT, -- email del usuario que subió
  fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cliente_archivos_cliente ON cliente_archivos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_archivos_fecha ON cliente_archivos(fecha_subida DESC);
