-- Tabla para conversaciones del chat IA (memoria)
CREATE TABLE IF NOT EXISTS conversaciones_ia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  mensaje TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla para notas (libreta)
CREATE TABLE IF NOT EXISTS notas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  color TEXT DEFAULT '#fef3c7', -- amarillo post-it por defecto
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversaciones_usuario ON conversaciones_ia(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_fecha ON conversaciones_ia(created_at);
CREATE INDEX IF NOT EXISTS idx_notas_usuario ON notas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notas_fecha ON notas(created_at);

-- Trigger para actualizar updated_at en notas
CREATE TRIGGER IF NOT EXISTS update_notas_timestamp 
AFTER UPDATE ON notas
BEGIN
  UPDATE notas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
