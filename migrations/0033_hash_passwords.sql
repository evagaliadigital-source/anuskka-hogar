-- Migration: Hashear passwords existentes con bcrypt
-- Description: Convertir passwords en texto plano a bcrypt hash

-- Passwords hasheados con bcrypt (salt rounds = 10):
-- '1984' → $2b$10$DmOgHKqCC40ZR6E1mxwZGuFnRqOuVaC9m56LZtahNxz6G7Ai2VAai
-- '881917176' → $2b$10$bEZd7FUYOhEbS80T9dH/6uG4mx9zGHxlb5NmLU3tw3RvhK2Xcrc1G

UPDATE usuarios 
SET password_hash = '$2b$10$DmOgHKqCC40ZR6E1mxwZGuFnRqOuVaC9m56LZtahNxz6G7Ai2VAai'
WHERE email = 'anuskkahogar@gmail.com' AND nombre = 'Ana Ramos';

UPDATE usuarios 
SET password_hash = '$2b$10$bEZd7FUYOhEbS80T9dH/6uG4mx9zGHxlb5NmLU3tw3RvhK2Xcrc1G'
WHERE email = 'anuskkahogar@gmail.com' AND nombre = 'Tienda Anushka';

-- Verificación: Los passwords ya no son legibles
SELECT id, email, nombre, rol, 
       substr(password_hash, 1, 20) || '...' as password_hash_preview 
FROM usuarios;
