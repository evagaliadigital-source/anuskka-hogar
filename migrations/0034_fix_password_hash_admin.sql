-- Migration: Corregir password hash del usuario admin
-- Description: La migración 0033 intercambió los hashes por error
-- El usuario admin (Ana Ramos) tenía el hash de '1984' en lugar del de '881917176'

-- Hash correcto para '881917176'
UPDATE usuarios 
SET password_hash = '$2b$10$bEZd7FUYOhEbS80T9dH/6uG4mx9zGHxlb5NmLU3tw3RvhK2Xcrc1G'
WHERE email = 'anuskkahogar@gmail.com' 
  AND nombre = 'Ana Ramos' 
  AND rol = 'admin';

-- Verificación
SELECT email, nombre, rol, 'Password: 881917176' as password_correcto
FROM usuarios 
WHERE email = 'anuskkahogar@gmail.com' AND rol = 'admin';
