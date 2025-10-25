-- DATOS DE EJEMPLO PARA ANUSHKA HOGAR

-- Clientes
INSERT OR IGNORE INTO clientes (nombre, apellidos, telefono, email, direccion, ciudad, codigo_postal) VALUES 
  ('María', 'García López', '611234567', 'maria.garcia@email.com', 'Calle Mayor 15, 3º B', 'Madrid', '28001'),
  ('Juan', 'Martínez Sánchez', '622345678', 'juan.martinez@email.com', 'Av. Constitución 42', 'Madrid', '28002'),
  ('Ana', 'Rodríguez Pérez', '633456789', 'ana.rodriguez@email.com', 'Plaza España 8', 'Madrid', '28008'),
  ('Carlos', 'López Fernández', '644567890', 'carlos.lopez@email.com', 'Calle Alcalá 120', 'Madrid', '28009'),
  ('Laura', 'Sánchez Ruiz', '655678901', 'laura.sanchez@email.com', 'Gran Vía 55, 5º A', 'Madrid', '28013');

-- Empleadas
INSERT OR IGNORE INTO empleadas (nombre, apellidos, telefono, email, dni, fecha_contratacion, salario_hora, especialidades, calificacion) VALUES 
  ('Carmen', 'Torres Díaz', '666111222', 'carmen.torres@anushka.com', '12345678A', '2024-01-15', 12.50, '["limpieza", "plancha", "cocina"]', 4.8),
  ('Rosa', 'Jiménez Moreno', '666222333', 'rosa.jimenez@anushka.com', '23456789B', '2024-02-01', 13.00, '["limpieza", "organizacion"]', 4.9),
  ('Elena', 'Navarro Gil', '666333444', 'elena.navarro@anushka.com', '34567890C', '2024-03-10', 11.50, '["plancha", "limpieza"]', 4.5),
  ('Isabel', 'Romero Castro', '666444555', 'isabel.romero@anushka.com', '45678901D', '2024-04-05', 12.00, '["mantenimiento", "limpieza"]', 4.7);

-- Stock
INSERT OR IGNORE INTO stock (nombre, categoria, unidad, cantidad_actual, cantidad_minima, precio_unitario, proveedor) VALUES 
  ('Detergente multiusos', 'limpieza', 'litros', 25, 10, 3.50, 'Limpieza Pro SA'),
  ('Lejía', 'limpieza', 'litros', 15, 8, 2.80, 'Limpieza Pro SA'),
  ('Limpiacristales', 'limpieza', 'litros', 12, 10, 4.20, 'Limpieza Pro SA'),
  ('Bayetas microfibra', 'limpieza', 'unidades', 45, 20, 1.50, 'Suministros Hogar SL'),
  ('Fregonas', 'limpieza', 'unidades', 8, 5, 8.90, 'Suministros Hogar SL'),
  ('Guantes desechables', 'proteccion', 'cajas', 18, 10, 5.50, 'Suministros Hogar SL'),
  ('Bolsas basura (50L)', 'limpieza', 'rollos', 22, 15, 6.80, 'Suministros Hogar SL'),
  ('Ambientador', 'limpieza', 'unidades', 30, 15, 2.90, 'Limpieza Pro SA'),
  ('Desatascador', 'mantenimiento', 'unidades', 4, 3, 12.50, 'Ferretería Central'),
  ('Cinta aislante', 'mantenimiento', 'rollos', 10, 5, 3.20, 'Ferretería Central');

-- Trabajos
INSERT OR IGNORE INTO trabajos (cliente_id, empleada_id, tipo_servicio, descripcion, direccion, fecha_programada, duracion_estimada, estado, precio_cliente, prioridad) VALUES 
  (1, 1, 'limpieza_completa', 'Limpieza integral del hogar', 'Calle Mayor 15, 3º B', '2025-10-26 09:00:00', 180, 'pendiente', 75.00, 'normal'),
  (2, 2, 'plancha', 'Servicio de plancha (20 piezas)', 'Av. Constitución 42', '2025-10-26 11:00:00', 120, 'pendiente', 35.00, 'normal'),
  (3, 1, 'limpieza_basica', 'Limpieza básica semanal', 'Plaza España 8', '2025-10-27 10:00:00', 120, 'pendiente', 45.00, 'normal'),
  (4, 3, 'mantenimiento', 'Revisión grifería y pequeñas reparaciones', 'Calle Alcalá 120', '2025-10-28 09:30:00', 90, 'pendiente', 55.00, 'alta'),
  (5, 2, 'limpieza_completa', 'Limpieza profunda post-mudanza', 'Gran Vía 55, 5º A', '2025-10-28 14:00:00', 240, 'pendiente', 120.00, 'urgente');

-- Facturas
INSERT OR IGNORE INTO facturas (cliente_id, trabajo_id, numero_factura, fecha_emision, subtotal, iva, total, estado) VALUES 
  (1, 1, 'AH-2025-001', '2025-10-26', 75.00, 15.75, 90.75, 'pendiente'),
  (2, 2, 'AH-2025-002', '2025-10-26', 35.00, 7.35, 42.35, 'pendiente');

-- Incidencias (ejemplo)
INSERT OR IGNORE INTO incidencias_clientes (cliente_id, tipo, descripcion, estado, prioridad) VALUES 
  (1, 'consulta', 'Cliente pregunta por servicios adicionales de jardinería', 'abierta', 'baja');

-- Registro de horas (ejemplo histórico)
INSERT OR IGNORE INTO registro_horas (empleada_id, fecha, horas_trabajadas, tipo) VALUES 
  (1, '2025-10-21', 8, 'trabajo'),
  (1, '2025-10-22', 7.5, 'trabajo'),
  (2, '2025-10-21', 8, 'trabajo'),
  (2, '2025-10-22', 8, 'trabajo'),
  (3, '2025-10-21', 6, 'trabajo'),
  (4, '2025-10-22', 7, 'trabajo');
