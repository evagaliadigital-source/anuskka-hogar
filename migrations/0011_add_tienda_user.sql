-- Agregar usuario de rol "tienda" para acceso operativo
-- Cambiar rol del usuario admin existente a "duena"
UPDATE usuarios SET rol = 'duena' WHERE email = 'anuskka@galia.com';

-- Crear usuario "tienda" con acceso limitado
INSERT INTO usuarios (email, password_hash, nombre, rol, activo) VALUES 
  ('tienda@anushkahogar.com', 'Tienda2025!', 'Tienda Anushka', 'tienda', 1);
