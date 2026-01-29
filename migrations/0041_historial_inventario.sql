-- Migración: Crear tabla de historial de modificaciones de inventario
-- Fecha: 2026-01-29

-- Tabla para registrar cambios en productos
CREATE TABLE IF NOT EXISTS inventario_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  variante_id INTEGER,
  usuario_id INTEGER NOT NULL,
  usuario_nombre TEXT NOT NULL,
  usuario_rol TEXT NOT NULL,
  
  -- Tipo de acción
  accion TEXT NOT NULL, -- 'crear', 'editar', 'actualizar_stock', 'eliminar'
  
  -- Campos modificados (JSON string con antes/después)
  cambios TEXT, -- JSON: {"campo": {"antes": valor, "despues": valor}}
  
  -- Detalles específicos
  stock_anterior REAL,
  stock_nuevo REAL,
  motivo TEXT,
  
  -- Timestamp
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_historial_producto ON inventario_historial(producto_id);
CREATE INDEX IF NOT EXISTS idx_historial_variante ON inventario_historial(variante_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON inventario_historial(fecha_modificacion);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON inventario_historial(usuario_id);
