-- Crear usuario de prueba
-- Email: ana@anushkahogar.com
-- Password: anushka2026
-- Rol: admin (acceso completo)

INSERT INTO usuarios (email, password_hash, nombre, rol, activo, created_at)
VALUES (
  'ana@anushkahogar.com',
  '$2a$10$YourHashedPasswordHere',
  'Ana Ramos',
  'admin',
  1,
  datetime('now')
);
