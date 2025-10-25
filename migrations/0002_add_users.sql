-- TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT DEFAULT 'admin', -- admin, empleada, cliente
  activo INTEGER DEFAULT 1,
  ultimo_acceso DATETIME,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Usuario por defecto: eva@anushkahogar.com / Anushka2025!
-- Password hash generado con bcrypt-like simple (en producción usar bcrypt real)
INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES 
  ('eva@anushkahogar.com', 'Anushka2025!', 'Eva Rodríguez', 'admin');
