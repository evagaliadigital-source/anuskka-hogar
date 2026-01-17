-- Tabla de tickets de soporte
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asunto TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad TEXT DEFAULT 'media' CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')),
  estado TEXT DEFAULT 'abierto' CHECK(estado IN ('abierto', 'en_proceso', 'resuelto', 'cerrado')),
  email_contacto TEXT NOT NULL,
  nombre_contacto TEXT,
  telefono_contacto TEXT,
  categoria TEXT DEFAULT 'otro' CHECK(categoria IN ('bug', 'mejora', 'pregunta', 'urgente', 'otro')),
  respuesta TEXT,
  respondido_por TEXT,
  respondido_en DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridad ON tickets(prioridad);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email_contacto);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);
