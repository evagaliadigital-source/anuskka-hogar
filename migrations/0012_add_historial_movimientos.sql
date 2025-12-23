-- ============================================
-- MIGRACIÓN: Historial de Movimientos (Auditoría)
-- ============================================
-- Tabla para registrar TODAS las acciones importantes del sistema
-- Solo visible para rol "duena" (Ana Ramos)
-- Permite rastrear quién hizo qué, cuándo y desde dónde

CREATE TABLE IF NOT EXISTS historial_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_email TEXT NOT NULL,
  usuario_nombre TEXT,
  usuario_rol TEXT,
  accion TEXT NOT NULL,  -- 'crear', 'editar', 'eliminar', 'login', 'logout'
  seccion TEXT NOT NULL,  -- 'clientes', 'presupuestos', 'trabajos', 'personal', 'stock', 'tareas', 'facturas', 'disenador'
  entidad_tipo TEXT,  -- 'cliente', 'presupuesto', 'trabajo', etc.
  entidad_id INTEGER,  -- ID del registro afectado
  detalles_json TEXT,  -- JSON con datos adicionales (cambios específicos)
  ip_address TEXT,  -- IP del usuario (si está disponible)
  user_agent TEXT,  -- Navegador/dispositivo
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para búsquedas rápidas
  FOREIGN KEY (usuario_email) REFERENCES usuarios(email)
);

-- Índices para filtrado eficiente
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial_movimientos(usuario_email);
CREATE INDEX IF NOT EXISTS idx_historial_accion ON historial_movimientos(accion);
CREATE INDEX IF NOT EXISTS idx_historial_seccion ON historial_movimientos(seccion);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_movimientos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_entidad ON historial_movimientos(entidad_tipo, entidad_id);

-- Registros de ejemplo (para testing) - REMOVIDOS para producción
-- INSERT INTO historial_movimientos (usuario_email, usuario_nombre, usuario_rol, accion, seccion, entidad_tipo, entidad_id, detalles_json) VALUES
--   ('anuskka@galia.com', 'Ana Ramos', 'duena', 'login', 'sistema', NULL, NULL, '{"mensaje":"Inicio de sesión exitoso"}'),
--   ('tienda@anushkahogar.com', 'Tienda Anushka', 'tienda', 'login', 'sistema', NULL, NULL, '{"mensaje":"Inicio de sesión exitoso"}'),
--   ('anuskka@galia.com', 'Ana Ramos', 'duena', 'crear', 'clientes', 'cliente', 1, '{"nombre":"Cliente Demo","telefono":"123456789"}');
