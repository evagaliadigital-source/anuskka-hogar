-- Insertar trabajos según schema real
INSERT INTO trabajos (cliente_id, descripcion, tipo_servicio, direccion, fecha_programada, fecha_inicio, fecha_finalizacion, duracion_estimada, duracion_real, estado, prioridad, coste_materiales, coste_mano_obra, precio_cliente, satisfaccion_cliente, empleada_id, notas) VALUES
(1, 'Instalación de cortinas salón', 'instalacion', 'Plaza España 8, Madrid', '2025-10-20 10:00:00', '2025-10-20 10:30:00', '2025-10-20 14:00:00', 240, 210, 'completado', 'alta', 100, 250, 350, 5, 1, 'Cliente muy satisfecho'),
(1, 'Confección de cojines decorativos', 'confeccion', 'Plaza España 8, Madrid', '2025-10-18 09:00:00', '2025-10-18 09:15:00', '2025-10-18 12:00:00', 180, 165, 'completado', 'normal', 50, 130, 180, 5, 1, 'Telas premium'),
(2, 'Reparación de cortinas', 'reparacion', 'Rúa Real 45, A Coruña', '2025-10-25 11:00:00', '2025-10-25 11:30:00', NULL, 120, 0, 'en_proceso', 'normal', 20, 100, 120, NULL, 1, 'En proceso'),
(3, 'Cortinas blackout dormitorio', 'instalacion', 'Passeig de Gràcia 78, Barcelona', '2025-10-29 10:00:00', NULL, NULL, 300, 0, 'pendiente', 'alta', 150, 300, 450, NULL, NULL, 'Cliente nuevo');
