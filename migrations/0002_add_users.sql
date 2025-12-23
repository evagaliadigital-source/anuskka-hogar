-- TABLA DE USUARIOS
-- Sin restricción UNIQUE en email para permitir mismo email con diferentes passwords/roles
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT DEFAULT 'admin', -- admin, tienda, empleada, cliente
  activo INTEGER DEFAULT 1,
  ultimo_acceso DATETIME,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Usuarios por defecto con mismo email, diferentes contraseñas
-- anuskkahogar@gmail.com + 1984 → Ana Ramos (admin)
-- anuskkahogar@gmail.com + 881917176 → Tienda Anushka (tienda)
INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES 
  ('anuskkahogar@gmail.com', '1984', 'Ana Ramos', 'admin'),
  ('anuskkahogar@gmail.com', '881917176', 'Tienda Anushka', 'tienda');
