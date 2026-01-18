-- Migration: Sistema de auditoría y seguridad
-- Description: Tabla para registrar todos los cambios y accesos

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  accion TEXT NOT NULL, -- 'login', 'crear', 'editar', 'eliminar', 'ver'
  tabla TEXT NOT NULL,  -- 'clientes', 'trabajos', 'tareas', etc.
  registro_id INTEGER,
  detalles TEXT,
  datos_anteriores TEXT, -- JSON con datos antes del cambio
  datos_nuevos TEXT,     -- JSON con datos después del cambio
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(created_at);

-- Tabla de consentimientos RGPD
CREATE TABLE IF NOT EXISTS consentimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,
  tipo TEXT NOT NULL, -- 'privacidad', 'marketing', 'comunicaciones'
  aceptado INTEGER DEFAULT 0,
  fecha_aceptacion DATETIME,
  ip_address TEXT,
  user_agent TEXT,
  version_politica TEXT, -- v1.0, v2.0, etc.
  revocado INTEGER DEFAULT 0,
  fecha_revocacion DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Índices para consentimientos
CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente ON consentimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_consentimientos_tipo ON consentimientos(tipo);

-- Tabla de solicitudes RGPD (derecho al olvido, portabilidad, etc.)
CREATE TABLE IF NOT EXISTS solicitudes_rgpd (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,
  tipo TEXT NOT NULL, -- 'acceso', 'rectificacion', 'supresion', 'portabilidad', 'oposicion'
  estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_proceso', 'completada', 'rechazada'
  motivo_rechazo TEXT,
  fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_completada DATETIME,
  usuario_procesador_id INTEGER,
  notas TEXT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_procesador_id) REFERENCES usuarios(id)
);

-- Índices para solicitudes RGPD
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON solicitudes_rgpd(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_rgpd(estado);
