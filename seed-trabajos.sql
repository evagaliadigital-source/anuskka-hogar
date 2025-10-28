-- Insertar algunos trabajos de prueba
INSERT INTO trabajos (cliente_id, descripcion, tipo_servicio, estado, fecha_inicio, fecha_estimada_fin, empleada_id, horas_estimadas, horas_reales, precio_total, prioridad, ubicacion, notas) VALUES
(1, 'Instalación de cortinas salón', 'instalacion', 'completado', '2025-10-20', '2025-10-22', 1, 4, 3.5, 350.00, 'alta', 'Madrid', 'Cliente muy satisfecho'),
(1, 'Confección de cojines decorativos', 'confeccion', 'completado', '2025-10-18', '2025-10-19', 1, 3, 3, 180.00, 'media', 'Madrid', 'Telas premium'),
(2, 'Reparación de cortinas', 'reparacion', 'en_proceso', '2025-10-25', '2025-10-28', 1, 2, 0, 120.00, 'media', 'A Coruña', 'En proceso'),
(3, 'Cortinas blackout dormitorio', 'instalacion', 'pendiente', '2025-10-29', '2025-11-02', NULL, 5, 0, 450.00, 'alta', 'Barcelona', 'Cliente nuevo'),
(1, 'Limpieza de alfombra', 'limpieza', 'completado', '2025-10-15', '2025-10-15', 1, 2, 1.5, 80.00, 'baja', 'Madrid', 'Alfombra persa');
