-- Insertar facturas con cliente_id correcto
INSERT INTO facturas (cliente_id, trabajo_id, numero_factura, fecha_emision, estado, subtotal, iva, total, metodo_pago, fecha_pago) VALUES
(1, 1, 'FAC-2025-001', '2025-10-22', 'pagada', 350.00, 73.50, 423.50, 'transferencia', '2025-10-23'),
(1, 2, 'FAC-2025-002', '2025-10-19', 'pagada', 180.00, 37.80, 217.80, 'efectivo', '2025-10-19');
