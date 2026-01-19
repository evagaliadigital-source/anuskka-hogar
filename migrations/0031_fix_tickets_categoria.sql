-- Arreglar valores de categoría en tabla tickets para que coincidan con el frontend
-- Los valores anteriores eran: bug, mejora, pregunta, urgente, otro
-- Los nuevos valores son: consulta, soporte, reclamo, sugerencia, otro

-- 1. Crear nueva tabla temporal con los valores correctos
CREATE TABLE IF NOT EXISTS tickets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asunto TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad TEXT DEFAULT 'media' CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')),
  estado TEXT DEFAULT 'abierto' CHECK(estado IN ('abierto', 'en_proceso', 'resuelto', 'cerrado')),
  email_contacto TEXT NOT NULL,
  nombre_contacto TEXT,
  telefono_contacto TEXT,
  categoria TEXT DEFAULT 'otro' CHECK(categoria IN ('consulta', 'soporte', 'reclamo', 'sugerencia', 'otro')),
  respuesta TEXT,
  respondido_por TEXT,
  respondido_en DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Copiar datos existentes (si los hay), mapeando las categorías antiguas a las nuevas
INSERT INTO tickets_new (
  id, asunto, descripcion, prioridad, estado, 
  email_contacto, nombre_contacto, telefono_contacto, categoria,
  respuesta, respondido_por, respondido_en, created_at, updated_at
)
SELECT 
  id, asunto, descripcion, prioridad, estado,
  email_contacto, nombre_contacto, telefono_contacto,
  CASE 
    WHEN categoria = 'bug' THEN 'soporte'
    WHEN categoria = 'mejora' THEN 'sugerencia'
    WHEN categoria = 'pregunta' THEN 'consulta'
    WHEN categoria = 'urgente' THEN 'consulta'
    ELSE 'otro'
  END as categoria,
  respuesta, respondido_por, respondido_en, created_at, updated_at
FROM tickets;

-- 3. Eliminar tabla antigua
DROP TABLE tickets;

-- 4. Renombrar tabla nueva
ALTER TABLE tickets_new RENAME TO tickets;

-- 5. Recrear índices
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridad ON tickets(prioridad);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email_contacto);
CREATE INDEX IF NOT EXISTS idx_tickets_categoria ON tickets(categoria);
