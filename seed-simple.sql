-- Solo 2 trabajos completados para cliente 1
INSERT INTO trabajos (cliente_id, empleada_id, descripcion, tipo_servicio, direccion, fecha_programada, fecha_inicio, fecha_finalizacion, duracion_estimada, duracion_real, estado, prioridad, coste_materiales, coste_mano_obra, precio_cliente, satisfaccion_cliente, notas) VALUES
(1, 1, 'Instalación de cortinas salón', 'instalacion', 'Plaza España 8, Madrid', '2025-10-20 10:00:00', '2025-10-20 10:30:00', '2025-10-20 14:00:00', 240, 210, 'completado', 'alta', 100, 250, 350, 5, 'Cliente muy satisfecho'),
(1, 1, 'Confección de cojines decorativos', 'confeccion', 'Plaza España 8, Madrid', '2025-10-18 09:00:00', '2025-10-18 09:15:00', '2025-10-18 12:00:00', 180, 165, 'completado', 'normal', 50, 130, 180, 5, 'Telas premium'),
(1, 1, 'Reparación de cortinas', 'reparacion', 'Plaza España 8, Madrid', '2025-10-25 11:00:00', '2025-10-25 11:30:00', NULL, 120, 0, 'en_proceso', 'normal', 20, 100, 120, NULL, 'En proceso'),
(1, NULL, 'Cortinas blackout dormitorio', 'instalacion', 'Plaza España 8, Madrid', '2025-10-29 10:00:00', NULL, NULL, 300, 0, 'pendiente', 'alta', 150, 300, 450, NULL, 'Cliente nuevo');

-- 2 facturas con pagos
INSERT INTO facturas (cliente_id, trabajo_id, numero_factura, fecha_emision, estado, subtotal, iva, total, metodo_pago, fecha_pago) VALUES
(1, 1, 'FAC-2025-001', '2025-10-22', 'pagada', 350.00, 73.50, 423.50, 'transferencia', '2025-10-23'),
(1, 2, 'FAC-2025-002', '2025-10-19', 'pagada', 180.00, 37.80, 217.80, 'efectivo', '2025-10-19');
