import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import presupuestos from './routes/presupuestos'
import disenador from './routes/disenador'
import tareas from './routes/tareas'
import uploads from './routes/uploads'

type Bindings = {
  DB: D1Database;
  GEMINI_API_KEY: string;
  FAL_API_KEY: string;
  IMAGES: R2Bucket;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files - Cloudflare Pages sirve desde /public automáticamente
app.use('/static/*', serveStatic({ root: './' }))

// ============================================
// API ENDPOINTS - AUTENTICACIÓN
// ============================================

// Login - Soporta mismo email con diferentes contraseñas
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    // Buscar usuario por email Y password (permite mismo email, diferentes roles)
    const usuario = await c.env.DB.prepare(`
      SELECT * FROM usuarios WHERE email = ? AND password_hash = ? AND activo = 1
    `).bind(email, password).first()
    
    if (!usuario) {
      return c.json({ success: false, message: 'Credenciales inválidas' }, 401)
    }
    
    // Actualizar último acceso
    await c.env.DB.prepare(`
      UPDATE usuarios SET ultimo_acceso = datetime('now') WHERE id = ?
    `).bind(usuario.id).run()
    
    return c.json({ 
      success: true, 
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error en login:', error)
    return c.json({ success: false, message: 'Error en el servidor' }, 500)
  }
})

// ============================================
// API ENDPOINTS - CLIENTES
// ============================================

// Obtener todos los clientes
app.get('/api/clientes', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre
  `).all()
  return c.json(results)
})

// Obtener cliente por ID con historial
app.get('/api/clientes/:id', async (c) => {
  const id = c.req.param('id')
  
  const cliente = await c.env.DB.prepare(`
    SELECT * FROM clientes WHERE id = ?
  `).bind(id).first()
  
  const trabajos = await c.env.DB.prepare(`
    SELECT t.*, e.nombre as empleada_nombre, e.apellidos as empleada_apellidos
    FROM trabajos t
    LEFT JOIN empleadas e ON t.empleada_id = e.id
    WHERE t.cliente_id = ?
    ORDER BY t.fecha_programada DESC
  `).bind(id).all()
  
  const facturas = await c.env.DB.prepare(`
    SELECT * FROM facturas WHERE cliente_id = ? ORDER BY fecha_emision DESC
  `).bind(id).all()
  
  const incidencias = await c.env.DB.prepare(`
    SELECT * FROM incidencias_clientes WHERE cliente_id = ? ORDER BY fecha_creacion DESC
  `).bind(id).all()
  
  return c.json({
    cliente,
    trabajos: trabajos.results,
    facturas: facturas.results,
    incidencias: incidencias.results
  })
})

// Crear cliente
app.post('/api/clientes', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO clientes (nombre, apellidos, telefono, email, direccion, ciudad, codigo_postal, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email || null,
    data.direccion, data.ciudad, data.codigo_postal || null, data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar cliente
app.put('/api/clientes/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE clientes 
    SET nombre = ?, apellidos = ?, telefono = ?, email = ?, 
        direccion = ?, ciudad = ?, codigo_postal = ?, notas = ?
    WHERE id = ?
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email,
    data.direccion, data.ciudad, data.codigo_postal, data.notas, id
  ).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - PERSONAL
// ============================================

// Obtener todo el personal
app.get('/api/personal', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM empleadas WHERE activa = 1 ORDER BY nombre
  `).all()
  return c.json(results)
})

// Obtener personal por ID
app.get('/api/personal/:id', async (c) => {
  const id = c.req.param('id')
  
  const personal = await c.env.DB.prepare(`
    SELECT * FROM empleadas WHERE id = ?
  `).bind(id).first()
  
  const trabajos = await c.env.DB.prepare(`
    SELECT t.*, c.nombre as cliente_nombre, c.apellidos as cliente_apellidos
    FROM trabajos t
    LEFT JOIN clientes c ON t.cliente_id = c.id
    WHERE t.empleada_id = ?
    ORDER BY t.fecha_programada DESC
    LIMIT 20
  `).bind(id).all()
  
  const horas = await c.env.DB.prepare(`
    SELECT * FROM registro_horas 
    WHERE empleada_id = ? 
    ORDER BY fecha DESC LIMIT 30
  `).bind(id).all()
  
  const evaluaciones = await c.env.DB.prepare(`
    SELECT * FROM evaluaciones 
    WHERE empleada_id = ? 
    ORDER BY fecha DESC LIMIT 10
  `).bind(id).all()
  
  return c.json({
    personal,
    trabajos: trabajos.results,
    horas: horas.results,
    evaluaciones: evaluaciones.results
  })
})

// Crear personal
app.post('/api/personal', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO empleadas (nombre, apellidos, telefono, email, dni, fecha_contratacion, 
                          salario_hora, especialidades, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email || null, data.dni,
    data.fecha_contratacion || null, data.salario_hora || null, 
    JSON.stringify(data.especialidades || []), data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar personal
app.put('/api/personal/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE empleadas 
    SET nombre = ?, apellidos = ?, telefono = ?, email = ?, 
        salario_hora = ?, especialidades = ?, notas = ?
    WHERE id = ?
  `).bind(
    data.nombre, data.apellidos, data.telefono, data.email,
    data.salario_hora || null, JSON.stringify(data.especialidades || []), 
    data.notas, id
  ).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - TRABAJOS
// ============================================

// Obtener todos los trabajos
app.get('/api/trabajos', async (c) => {
  const estado = c.req.query('estado')
  const fecha = c.req.query('fecha')
  
  let query = `
    SELECT t.*, 
           c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
           e.nombre as empleada_nombre, e.apellidos as empleada_apellidos
    FROM trabajos t
    LEFT JOIN clientes c ON t.cliente_id = c.id
    LEFT JOIN empleadas e ON t.empleada_id = e.id
    WHERE 1=1
  `
  const bindings: any[] = []
  
  if (estado) {
    query += ' AND t.estado = ?'
    bindings.push(estado)
  }
  
  if (fecha) {
    query += ' AND DATE(t.fecha_programada) = ?'
    bindings.push(fecha)
  }
  
  query += ' ORDER BY t.fecha_programada DESC'
  
  const { results } = await c.env.DB.prepare(query).bind(...bindings).all()
  return c.json(results)
})

// Obtener un trabajo específico
app.get('/api/trabajos/:id', async (c) => {
  const id = c.req.param('id')
  
  const trabajo = await c.env.DB.prepare(`
    SELECT t.*, 
           c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
           e.nombre as empleada_nombre, e.apellidos as empleada_apellidos
    FROM trabajos t
    LEFT JOIN clientes c ON t.cliente_id = c.id
    LEFT JOIN empleadas e ON t.empleada_id = e.id
    WHERE t.id = ?
  `).bind(id).first()
  
  if (!trabajo) {
    return c.json({ error: 'Trabajo no encontrado' }, 404)
  }
  
  return c.json(trabajo)
})

// Crear trabajo
app.post('/api/trabajos', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO trabajos (cliente_id, empleada_id, tipo_servicio, descripcion, direccion,
                         fecha_programada, duracion_estimada, estado, prioridad, precio_cliente, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.cliente_id, data.empleada_id || null, data.tipo_servicio, data.descripcion || null,
    data.direccion, data.fecha_programada, data.duracion_estimada || 120,
    data.estado || 'pendiente', data.prioridad || 'normal', data.precio_cliente, data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar trabajo
app.put('/api/trabajos/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE trabajos 
    SET empleada_id = ?, tipo_servicio = ?, descripcion = ?, fecha_programada = ?,
        duracion_estimada = ?, estado = ?, prioridad = ?, precio_cliente = ?, 
        fecha_inicio = ?, fecha_finalizacion = ?, duracion_real = ?, satisfaccion_cliente = ?, notas = ?
    WHERE id = ?
  `).bind(
    data.empleada_id, data.tipo_servicio, data.descripcion, data.fecha_programada,
    data.duracion_estimada, data.estado, data.prioridad, data.precio_cliente,
    data.fecha_inicio || null, data.fecha_finalizacion || null, data.duracion_real || null,
    data.satisfaccion_cliente || null, data.notas, id
  ).run()
  
  return c.json({ success: true })
})

// Cambiar estado de trabajo (simplificado, sin auto-factura)
app.put('/api/trabajos/:id/estado', async (c) => {
  const id = c.req.param('id')
  const { estado } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE trabajos SET estado = ? WHERE id = ?
  `).bind(estado, id).run()
  
  return c.json({ success: true })
})

// Obtener tareas de un trabajo específico
app.get('/api/trabajos/:id/tareas', async (c) => {
  const trabajoId = c.req.param('id')
  
  try {
    const tareas = await c.env.DB.prepare(`
      SELECT t.*,
             p.nombre_proyecto,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos
      FROM tareas_pendientes t
      LEFT JOIN proyectos_diseno p ON t.proyecto_id = p.id
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      WHERE t.trabajo_id = ?
      ORDER BY 
        CASE t.estado
          WHEN 'pendiente' THEN 1
          WHEN 'en_proceso' THEN 2
          WHEN 'completada' THEN 3
          ELSE 4
        END,
        t.prioridad ASC,
        t.created_at DESC
    `).bind(trabajoId).all()
    
    // Parsear datos_tarea JSON si existe
    const tareasFormateadas = tareas.results.map((t: any) => ({
      ...t,
      datos_tarea: t.datos_tarea ? JSON.parse(t.datos_tarea) : null
    }))
    
    return c.json(tareasFormateadas)
  } catch (error) {
    console.error('Error obteniendo tareas del trabajo:', error)
    return c.json({ error: 'Error al obtener tareas' }, 500)
  }
})

// Generar factura desde trabajo/presupuesto
app.post('/api/trabajos/:id/generar-factura', async (c) => {
  const trabajoId = c.req.param('id')
  
  // Obtener trabajo con presupuesto completo
  const trabajo = await c.env.DB.prepare(`
    SELECT t.*, p.*, 
           c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
           c.direccion as cliente_direccion, c.ciudad as cliente_ciudad,
           c.codigo_postal as cliente_codigo_postal, c.email as cliente_email
    FROM trabajos t
    JOIN presupuestos p ON t.presupuesto_id = p.id
    JOIN clientes c ON t.cliente_id = c.id
    WHERE t.id = ?
  `).bind(trabajoId).first()
  
  if (!trabajo) {
    return c.json({ error: 'Trabajo o presupuesto no encontrado' }, 404)
  }
  
  // Verificar si ya existe factura para este presupuesto
  const facturaExistente = await c.env.DB.prepare(`
    SELECT id FROM facturas WHERE presupuesto_id = ?
  `).bind(trabajo.presupuesto_id).first()
  
  if (facturaExistente) {
    return c.json({ error: 'Ya existe una factura para este presupuesto', factura_id: facturaExistente.id }, 400)
  }
  
  // Generar número de factura
  const year = new Date().getFullYear()
  const { results: existentes } = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM facturas WHERE numero_factura LIKE ?
  `).bind(`${year}-%`).all()
  
  const numeroSecuencial = (existentes[0]?.total || 0) + 1
  const numeroFactura = `${year}-${String(numeroSecuencial).padStart(3, '0')}`
  
  // Crear factura con datos del presupuesto
  const resultFactura = await c.env.DB.prepare(`
    INSERT INTO facturas (
      cliente_id, trabajo_id, presupuesto_id, numero_factura, fecha_emision,
      concepto, subtotal, descuento_porcentaje, descuento_importe, 
      porcentaje_iva, importe_iva, total, estado, forma_pago, notas
    ) VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
  `).bind(
    trabajo.cliente_id,
    trabajoId,
    trabajo.presupuesto_id,
    numeroFactura,
    trabajo.titulo || 'Servicios prestados',
    trabajo.subtotal,
    trabajo.descuento_porcentaje || 0,
    trabajo.descuento_importe || 0,
    trabajo.porcentaje_iva || 21,
    trabajo.importe_iva,
    trabajo.total,
    trabajo.forma_pago || '',
    `Factura generada automáticamente desde presupuesto ${trabajo.numero_presupuesto}`
  ).run()
  
  const facturaId = resultFactura.meta.last_row_id
  
  // Copiar líneas del presupuesto a líneas de factura
  const { results: lineasPresupuesto } = await c.env.DB.prepare(`
    SELECT * FROM presupuesto_lineas WHERE presupuesto_id = ?
  `).bind(trabajo.presupuesto_id).all()
  
  for (const linea of lineasPresupuesto) {
    await c.env.DB.prepare(`
      INSERT INTO factura_lineas (
        factura_id, concepto, cantidad, unidad, precio_unitario, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      facturaId,
      linea.concepto,
      linea.cantidad,
      linea.unidad,
      linea.precio_unitario,
      linea.subtotal
    ).run()
  }
  
  return c.json({
    success: true,
    factura_id: facturaId,
    numero_factura: numeroFactura,
    message: `Factura ${numeroFactura} creada correctamente`
  })
})

// Obtener fases de un trabajo (con info de personal asignado)
app.get('/api/trabajos/:id/fases', async (c) => {
  const id = c.req.param('id')
  
  const { results } = await c.env.DB.prepare(`
    SELECT 
      f.*,
      p.nombre as personal_nombre,
      p.apellidos as personal_apellidos
    FROM trabajo_fases f
    LEFT JOIN empleadas p ON f.personal_id = p.id
    WHERE f.trabajo_id = ? 
    ORDER BY f.orden
  `).bind(id).all()
  
  return c.json(results)
})

// Actualizar estado de una fase (CONTROL MANUAL + ASIGNAR PERSONAL)
app.put('/api/trabajos/:id/fases/:fase_id', async (c) => {
  const trabajoId = c.req.param('id')
  const faseId = c.req.param('fase_id')
  const { estado, notas, personal_id } = await c.req.json()
  
  // Obtener info de la fase actual
  const faseActual = await c.env.DB.prepare(`
    SELECT * FROM trabajo_fases WHERE id = ?
  `).bind(faseId).first()
  
  if (!faseActual) {
    return c.json({ error: 'Fase no encontrada' }, 404)
  }
  
  // Actualizar la fase (control manual total + asignación de personal)
  const now = new Date().toISOString()
  await c.env.DB.prepare(`
    UPDATE trabajo_fases 
    SET estado = ?,
        notas = ?,
        personal_id = ?,
        fecha_inicio = COALESCE(fecha_inicio, ?),
        fecha_completado = CASE WHEN ? = 'completado' THEN ? ELSE NULL END
    WHERE id = ?
  `).bind(
    estado, 
    notas !== undefined ? notas : faseActual.notas, 
    personal_id !== undefined ? personal_id : faseActual.personal_id,
    now, 
    estado, 
    now, 
    faseId
  ).run()
  
  // Verificar si TODAS las fases están completadas
  const { results: todasFases } = await c.env.DB.prepare(`
    SELECT COUNT(*) as total, 
           SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completadas
    FROM trabajo_fases 
    WHERE trabajo_id = ?
  `).bind(trabajoId).all()
  
  const stats = todasFases[0] as any
  
  // Si todas las fases están completadas, marcar trabajo como completado
  if (stats.total === stats.completadas) {
    await c.env.DB.prepare(`
      UPDATE trabajos 
      SET estado = 'completado',
          fecha_finalizacion = ?
      WHERE id = ?
    `).bind(now, trabajoId).run()
  } else {
    // Si alguna fase volvió a pendiente, marcar trabajo como en_proceso
    await c.env.DB.prepare(`
      UPDATE trabajos 
      SET estado = 'en_proceso',
          fecha_finalizacion = NULL
      WHERE id = ?
    `).bind(trabajoId).run()
  }
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - STOCK
// ============================================

// ============================================
// API ENDPOINTS - CATEGORÍAS
// ============================================

// Obtener todas las categorías
app.get('/api/categorias', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM categorias WHERE activo = 1 ORDER BY orden, nombre
  `).all()
  return c.json(results)
})

// Crear categoría
app.post('/api/categorias', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO categorias (nombre, descripcion, color, icono, orden)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    data.nombre, 
    data.descripcion || null, 
    data.color || '#6B7280',
    data.icono || 'fa-box',
    data.orden || 0
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar categoría
app.put('/api/categorias/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE categorias 
    SET nombre = ?, descripcion = ?, color = ?, icono = ?, orden = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    data.nombre, 
    data.descripcion, 
    data.color,
    data.icono,
    data.orden,
    id
  ).run()
  
  return c.json({ success: true })
})

// Eliminar categoría (soft delete)
app.delete('/api/categorias/:id', async (c) => {
  const id = c.req.param('id')
  
  // Verificar si hay productos usando esta categoría
  const productosConCategoria = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM stock WHERE categoria_id = ? AND activo = 1
  `).bind(id).first()
  
  if (productosConCategoria && productosConCategoria.total > 0) {
    return c.json({ 
      success: false, 
      message: `No se puede eliminar. Hay ${productosConCategoria.total} producto(s) usando esta categoría.` 
    }, 400)
  }
  
  await c.env.DB.prepare(`
    UPDATE categorias SET activo = 0 WHERE id = ?
  `).bind(id).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - STOCK
// ============================================

// Obtener todo el stock
app.get('/api/stock', async (c) => {
  const bajo_stock = c.req.query('bajo_stock')
  const categoria_id = c.req.query('categoria_id')
  
  let query = `
    SELECT s.*, 
           c.nombre as categoria_nombre,
           c.color as categoria_color,
           c.icono as categoria_icono
    FROM stock s
    LEFT JOIN categorias c ON s.categoria_id = c.id
    WHERE s.activo = 1
  `
  
  if (bajo_stock === 'true') {
    query += ' AND s.cantidad_actual <= s.cantidad_minima'
  }
  
  if (categoria_id) {
    query += ` AND s.categoria_id = ${parseInt(categoria_id)}`
  }
  
  query += ' ORDER BY c.orden, s.nombre'
  
  const { results } = await c.env.DB.prepare(query).all()
  return c.json(results)
})

// Crear item de stock
app.post('/api/stock', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO stock (nombre, descripcion, categoria, categoria_id, unidad, cantidad_actual, 
                      cantidad_minima, precio_unitario, proveedor, ubicacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nombre, 
    data.descripcion || null, 
    data.categoria || null, 
    data.categoria_id || null,
    data.unidad,
    data.cantidad_actual, 
    data.cantidad_minima, 
    data.precio_unitario,
    data.proveedor || null, 
    data.ubicacion || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// Actualizar stock
app.put('/api/stock/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE stock 
    SET nombre = ?, descripcion = ?, categoria = ?, categoria_id = ?, unidad = ?, 
        cantidad_actual = ?, cantidad_minima = ?, precio_unitario = ?,
        proveedor = ?, ubicacion = ?
    WHERE id = ?
  `).bind(
    data.nombre, 
    data.descripcion, 
    data.categoria || null, 
    data.categoria_id || null,
    data.unidad,
    data.cantidad_actual, 
    data.cantidad_minima, 
    data.precio_unitario,
    data.proveedor, 
    data.ubicacion, 
    id
  ).run()
  
  return c.json({ success: true })
})

// ============================================
// API ENDPOINTS - DASHBOARD / MÉTRICAS
// ============================================

app.get('/api/dashboard', async (c) => {
  // Trabajos activos (pendientes + en proceso)
  const trabajosActivos = await c.env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM trabajos
    WHERE estado IN ('pendiente', 'en_proceso')
  `).first()
  
  // Presupuestos pendientes (pendientes + enviados)
  const presupuestosPendientes = await c.env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM presupuestos
    WHERE estado IN ('pendiente', 'enviado')
  `).first()
  
  // Fases en proceso
  const fasesEnProceso = await c.env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM trabajo_fases
    WHERE estado = 'en_proceso'
  `).first()
  
  // Trabajos completados este mes
  const trabajosCompletadosMes = await c.env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM trabajos
    WHERE estado = 'completado'
    AND strftime('%Y-%m', fecha_finalizacion) = strftime('%Y-%m', 'now')
  `).first()
  
  // Trabajos por estado (últimos 30 días)
  const trabajosPorEstado = await c.env.DB.prepare(`
    SELECT estado, COUNT(*) as total
    FROM trabajos
    WHERE fecha_creacion >= date('now', '-30 days')
    GROUP BY estado
    ORDER BY 
      CASE estado 
        WHEN 'pendiente' THEN 1 
        WHEN 'en_proceso' THEN 2 
        WHEN 'completado' THEN 3 
        WHEN 'cancelado' THEN 4 
      END
  `).all()
  
  // Resumen de fases activas
  const fasesResumen = await c.env.DB.prepare(`
    SELECT f.fase, COUNT(*) as total
    FROM trabajo_fases f
    JOIN trabajos t ON f.trabajo_id = t.id
    WHERE f.estado IN ('en_proceso', 'pendiente')
    AND t.estado IN ('pendiente', 'en_proceso')
    GROUP BY f.fase
    ORDER BY f.orden
  `).all()
  
  // Presupuestos por estado
  const presupuestosPorEstado = await c.env.DB.prepare(`
    SELECT estado, COUNT(*) as total
    FROM presupuestos
    WHERE fecha_emision >= date('now', '-90 days')
    GROUP BY estado
    ORDER BY 
      CASE estado 
        WHEN 'pendiente' THEN 1 
        WHEN 'enviado' THEN 2 
        WHEN 'aceptado' THEN 3 
        WHEN 'rechazado' THEN 4 
      END
  `).all()
  
  // Ingresos por día (últimos 7 días) - para métricas
  const ingresosDiarios = await c.env.DB.prepare(`
    SELECT DATE(fecha_pago) as fecha, SUM(total) as total
    FROM facturas
    WHERE estado = 'pagada' AND fecha_pago >= date('now', '-7 days')
    GROUP BY DATE(fecha_pago)
    ORDER BY fecha
  `).all()
  
  return c.json({
    trabajos_activos: trabajosActivos?.total || 0,
    presupuestos_pendientes: presupuestosPendientes?.total || 0,
    fases_en_proceso: fasesEnProceso?.total || 0,
    trabajos_completados_mes: trabajosCompletadosMes?.total || 0,
    trabajos_por_estado: trabajosPorEstado.results,
    fases_resumen: fasesResumen.results,
    presupuestos_por_estado: presupuestosPorEstado.results,
    ingresos_diarios: ingresosDiarios.results
  })
})

// ============================================
// API ENDPOINTS - FACTURAS
// ============================================

app.get('/api/facturas', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT f.*, c.nombre as cliente_nombre, c.apellidos as cliente_apellidos
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    ORDER BY f.fecha_emision DESC
  `).all()
  return c.json(results)
})

// Obtener una factura específica con líneas
app.get('/api/facturas/:id', async (c) => {
  const id = c.req.param('id')
  
  // Obtener factura con título del presupuesto
  const factura = await c.env.DB.prepare(`
    SELECT f.*, 
           c.nombre as cliente_nombre, c.apellidos as cliente_apellidos,
           c.direccion as cliente_direccion, c.email as cliente_email, c.telefono as cliente_telefono,
           p.titulo as presupuesto_titulo, p.numero_presupuesto
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    LEFT JOIN presupuestos p ON f.presupuesto_id = p.id
    WHERE f.id = ?
  `).bind(id).first()
  
  if (!factura) {
    return c.json({ error: 'Factura no encontrada' }, 404)
  }
  
  // Obtener líneas
  const { results: lineas } = await c.env.DB.prepare(`
    SELECT * FROM factura_lineas WHERE factura_id = ? ORDER BY id
  `).bind(id).all()
  
  return c.json({ ...factura, lineas })
})

// Eliminar factura
app.delete('/api/facturas/:id', async (c) => {
  const id = c.req.param('id')
  
  // Las líneas se eliminan automáticamente por CASCADE
  await c.env.DB.prepare(`
    DELETE FROM facturas WHERE id = ?
  `).bind(id).run()
  
  return c.json({ success: true })
})

app.post('/api/facturas', async (c) => {
  const data = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO facturas (cliente_id, trabajo_id, numero_factura, fecha_emision,
                         fecha_vencimiento, subtotal, iva, total, estado, metodo_pago, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.cliente_id, data.trabajo_id || null, data.numero_factura, data.fecha_emision,
    data.fecha_vencimiento || null, data.subtotal, data.iva || 0, data.total,
    data.estado || 'pendiente', data.metodo_pago || null, data.notas || null
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...data })
})

// ============================================
// API ENDPOINTS - REPORTES
// ============================================

app.get('/api/reportes/mensual', async (c) => {
  const mes = c.req.query('mes') || new Date().toISOString().slice(0, 7)
  
  // Resumen financiero
  const financiero = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_facturas,
      SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as ingresos,
      SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as pendiente_cobro
    FROM facturas
    WHERE strftime('%Y-%m', fecha_emision) = ?
  `).bind(mes).first()
  
  // Trabajos realizados
  const trabajos = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
      AVG(CASE WHEN satisfaccion_cliente IS NOT NULL THEN satisfaccion_cliente END) as satisfaccion
    FROM trabajos
    WHERE strftime('%Y-%m', fecha_programada) = ?
  `).bind(mes).first()
  
  // Horas trabajadas
  const horas = await c.env.DB.prepare(`
    SELECT e.nombre, e.apellidos, SUM(rh.horas_trabajadas) as total_horas
    FROM registro_horas rh
    JOIN empleadas e ON rh.empleada_id = e.id
    WHERE strftime('%Y-%m', rh.fecha) = ?
    GROUP BY e.id
    ORDER BY total_horas DESC
  `).bind(mes).all()
  
  // Servicios más demandados
  const servicios = await c.env.DB.prepare(`
    SELECT tipo_servicio, COUNT(*) as total, SUM(precio_cliente) as ingresos
    FROM trabajos
    WHERE strftime('%Y-%m', fecha_programada) = ?
    GROUP BY tipo_servicio
    ORDER BY total DESC
  `).bind(mes).all()
  
  return c.json({
    mes,
    financiero,
    trabajos,
    horas: horas.results,
    servicios: servicios.results
  })
})

// ============================================
// API ENDPOINTS - CONSULTOR IA
// ============================================

// Chat con GALI (Consultora IA)
app.post('/api/chat', async (c) => {
  try {
    const { message, context } = await c.req.json()
    
    // Sistema prompt de GALI
    const systemPrompt = `Eres GALI (Gestora y Asesora para Líderes de Instalación), una consultora experta especializada en:

1. NEGOCIO DE CORTINAS Y CONFECCIÓN:
   - Cálculo de metraje y materiales para cortinas
   - Técnicas de confección profesional
   - Instalación de rieles, barras y sistemas de sujeción
   - Tipos de telas, forros térmicos y blackout
   - Propuestas comerciales y presupuestos
   - Tendencias en decoración de interiores
   - Tips para maximizar ventas

2. FACTURACIÓN Y VERIFACTÜ:
   - Facturación electrónica con VerificaTu (sistema español)
   - Normativa fiscal para autónomos y empresas
   - IVA, retenciones y obligaciones tributarias
   - Gestión de cobros y pagos
   - Documentación contable

3. GESTIÓN DE CLIENTES:
   - Fidelización y seguimiento
   - Manejo de objeciones
   - Técnicas de cierre de venta
   - Gestión de reclamaciones
   - Seguimiento post-venta

4. USO DE LA HERRAMIENTA ANUSHKA HOGAR:
   - Gestión de clientes y contactos
   - Creación de presupuestos profesionales
   - Control de inventario (stock)
   - Sistema de categorías dinámicas
   - Seguimiento de trabajos
   - Facturación integrada
   - Reportes y análisis

Tu estilo de comunicación:
- Directa, práctica y orientada a resultados
- Empática con los desafíos del día a día
- Usa ejemplos concretos del sector
- Da consejos accionables inmediatamente
- Formato claro con bullets y números cuando sea apropiado
- Lenguaje cercano y profesional (tuteo)

IMPORTANTE: Si te preguntan sobre la herramienta, da instrucciones paso a paso claras.`

    // Contexto adicional de la herramienta
    const toolContext = context ? JSON.stringify(context) : ''
    
    // Simulación de respuesta (en producción, aquí irías a OpenAI/Anthropic)
    const userMessage = message.toLowerCase()
    let response = ''
    
    // Respuestas inteligentes basadas en keywords
    if (userMessage.includes('metraje') || userMessage.includes('calcul') || userMessage.includes('medir')) {
      response = `📏 **Cálculo de Metraje para Cortinas**

**Fórmula básica:**
1. **Ancho**: Mide el ancho de la ventana/riel
   - Multiplica x2 o x2.5 para caída natural
   - Cortina standard: ancho ventana x2
   - Cortina con mucha caída: x2.5 o x3

2. **Alto**: Mide desde el riel hasta donde quieres que llegue
   - Añade 15-20cm para dobladillos
   - Si va del techo al suelo: altura total + 20cm

3. **Ejemplo práctico:**
   - Ventana: 2m ancho x 2.5m alto
   - Tela necesaria: (2m x 2.5) x 2.7m (alto+dobladillo) = **13.5 metros lineales**

💡 **Tips profesionales:**
- Siempre suma 10% extra por errores y encogimiento
- Para confección francesa, multiplica x2.5 el ancho
- Anota el "rapport" (patrón repetitivo) si la tela lo tiene

¿Necesitas ayuda con algún cálculo específico?`
    } 
    else if (userMessage.includes('verificatu') || userMessage.includes('factura') || userMessage.includes('fiscal')) {
      response = `📄 **VerificaTu - Facturación Electrónica**

**¿Qué es VerificaTu?**
Sistema de la Agencia Tributaria para facturación electrónica obligatorio desde 2025.

**Pasos para implementarlo:**
1. **Alta en el sistema:**
   - Accede a Sede Electrónica AEAT
   - Certificado digital o Cl@ve
   - Activa el servicio VerificaTu

2. **Facturación con VerificaTu:**
   - Cada factura debe enviarse a AEAT en 4 días
   - Formato XML estándar
   - Código QR obligatorio

3. **En Anushka Hogar:**
   - Ve a **Facturación** → **Nueva Factura**
   - Rellena datos del cliente y servicios
   - El sistema genera el XML automáticamente
   - Descarga PDF con código QR incluido

💡 **Consejos prácticos:**
- Usa software homologado (como este)
- Guarda XML de cada factura 4 años
- Revisa numeración correlativa
- Backup mensual de facturas

¿Tienes dudas sobre alguna factura específica?`
    }
    else if (userMessage.includes('venta') || userMessage.includes('cerrar') || userMessage.includes('cliente')) {
      response = `💰 **Tips para Cerrar Más Ventas de Cortinas**

**1. Descubre la necesidad real:**
- "¿Qué problema buscas resolver?" (luz, privacidad, decoración)
- "¿Qué estilo tienes en mente?"
- Escucha activamente antes de proponer

**2. Presenta 3 opciones (Bueno - Mejor - Premium):**
- Opción 1: Básica funcional (80€/m²)
- Opción 2: Calidad media + extras (120€/m²) ⭐ MÁS VENDIDA
- Opción 3: Premium con todo incluido (180€/m²)

**3. Técnica del "Sí escalonado":**
- "¿Te gusta esta tela?" → Sí
- "¿El color combina con tu salón?" → Sí
- "¿Te gustaría que lo instalemos el martes?" → Sí ✅

**4. Maneja objeciones con empatía:**
- "Es caro" → "Entiendo, ¿qué presupuesto tenías en mente?" + muestra valor/durabilidad
- "Lo pienso" → "Por supuesto, ¿qué aspecto te genera dudas?"

**5. Cierre profesional:**
- Usa la herramienta para generar presupuesto en el momento
- PDF profesional impresiona
- "¿Confirmamos para esta semana o prefieres la siguiente?"

💡 **Usa el sistema:**
**Presupuestos** → Nuevo → Genera PDF profesional con logo

¿Quieres que te ayude con alguna objeción específica?`
    }
    else if (userMessage.includes('herramienta') || userMessage.includes('sistema') || userMessage.includes('usar') || userMessage.includes('cómo')) {
      response = `🛠️ **Guía Rápida de Anushka Hogar**

**FLUJO COMPLETO:**

**1. CLIENTE NUEVO:**
   - **Clientes** → **Nuevo Cliente**
   - Rellena: Nombre, teléfono, dirección
   - Guarda → Aparece en tu lista

**2. CREAR PRESUPUESTO:**
   - **Presupuestos** → **Nuevo Presupuesto**
   - Selecciona el cliente
   - Añade líneas:
     * **Telas**: Metros, precio/metro
     * **Materiales**: Rieles, accesorios
     * **Confección**: Horas de trabajo
     * **Instalación**: Tiempo estimado
   - Sistema calcula total con IVA
   - **Descargar PDF** → Envía al cliente

**3. CLIENTE ACEPTA → CREAR TRABAJO:**
   - **Trabajos** → **Nuevo Trabajo**
   - Asocia al cliente
   - Asigna fecha y personal
   - Estado: Pendiente → En proceso → Completado

**4. GESTIÓN DE STOCK:**
   - **Stock** → Ver inventario
   - **Categorías** para organizar (Telas, Rieles, etc.)
   - Alertas de stock bajo automáticas
   - **Filtrar por categoría** para encontrar rápido

**5. FACTURAR:**
   - **Facturación** → **Nueva Factura**
   - Selecciona cliente y trabajo
   - Genera XML para VerificaTu
   - PDF con código QR incluido

**💡 ATAJOS ÚTILES:**
- Dashboard muestra todo en un vistazo
- Click en cualquier cliente → Ver historial completo
- Reportes → Análisis mensual automático

¿Sobre qué parte necesitas más detalles?`
    }
    else if (userMessage.includes('categoría') || userMessage.includes('stock') || userMessage.includes('inventario')) {
      response = `📦 **Sistema de Categorías en Stock**

**GESTIÓN DE CATEGORÍAS:**

**1. Crear/Editar Categorías:**
   - **Stock** → **Categorías** (botón verde)
   - **Nueva Categoría** → Rellena:
     * Nombre (ej: "Telas", "Rieles")
     * Descripción
     * Color personalizado (para badges)
     * Icono Font Awesome
     * Orden de visualización

**2. Categorías Pre-cargadas:**
   - 🔵 **Telas** (fa-cut)
   - 🟣 **Rieles y Barras** (fa-grip-lines)
   - 🟢 **Accesorios** (fa-paperclip)
   - 🟠 **Forros** (fa-layer-group)
   - 🔴 **Confección** (fa-scissors)
   - 🔵 **Instalación** (fa-tools)
   - ⚪ **Otros** (fa-ellipsis-h)

**3. Añadir Productos a Categoría:**
   **MÉTODO 1**: Desde categorías
   - En cada tarjeta → **Añadir Artículo en [Categoría]**
   - Formulario se abre con categoría pre-seleccionada
   
   **MÉTODO 2**: Desde stock
   - **Nuevo Artículo** → Selecciona categoría del dropdown

**4. Filtrar Inventario:**
   - Dropdown "Filtrar por categoría"
   - Ver solo productos de una categoría
   - Badges visuales con colores

💡 **Ventajas:**
- Organización clara por tipo
- Búsqueda rápida
- Badges visuales en listado
- Reportes por categoría

¿Necesitas ayuda configurando tus categorías?`
    }
    else if (userMessage.includes('hola') || userMessage.includes('ayuda') || userMessage.includes('qué puedes')) {
      response = `¡Hola! 👋 Soy GALI, tu consultora especializada.

**Puedo ayudarte con:**

🪡 **Negocio de Cortinas:**
- Cálculo de metraje y materiales
- Técnicas de confección e instalación
- Propuestas comerciales
- Tips de venta

📄 **Facturación:**
- VerificaTu y normativa fiscal
- Gestión de cobros
- IVA y obligaciones tributarias

👥 **Gestión de Clientes:**
- Fidelización y seguimiento
- Manejo de objeciones
- Técnicas de cierre

🛠️ **Uso de la Herramienta:**
- Guía paso a paso
- Mejores prácticas
- Optimización de flujos

**Preguntas frecuentes:**
- "¿Cómo calculo el metraje para cortinas?"
- "¿Qué es VerificaTu y cómo lo uso?"
- "Dame tips para cerrar más ventas"
- "¿Cómo gestiono mejor el stock?"

¿En qué te puedo ayudar hoy?`
    }
    else {
      // Respuesta genérica inteligente
      response = `Entiendo tu consulta sobre "${message}".

Como consultora especializada en el sector de cortinas y gestión administrativa, puedo ayudarte de forma más específica si me das más detalles.

**Algunas preguntas para orientarte mejor:**
- ¿Es sobre confección/instalación de cortinas?
- ¿Tiene que ver con facturación o VerificaTu?
- ¿Necesitas ayuda con la gestión de clientes?
- ¿Quieres saber cómo usar alguna función del sistema?

O puedes probar con preguntas como:
- "¿Cómo calculo metraje de cortinas?"
- "Explícame VerificaTu"
- "Tips para vender más"
- "¿Cómo usar el sistema de presupuestos?"

¿Cómo puedo ayudarte mejor? 😊`
    }
    
    // Guardar conversación en la base de datos
    try {
      await c.env.DB.prepare(`
        INSERT INTO conversaciones_ia (mensaje, respuesta)
        VALUES (?, ?)
      `).bind(message, response).run()
    } catch (dbError) {
      console.error('Error guardando conversación:', dbError)
      // No fallar si no se puede guardar
    }
    
    return c.json({ 
      success: true, 
      response: response,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error en chat:', error)
    return c.json({ 
      success: false, 
      response: 'Lo siento, hubo un error. Por favor intenta de nuevo.' 
    }, 500)
  }
})

// ============================================
// API ENDPOINTS - HISTORIAL DE MOVIMIENTOS
// ============================================
// Solo accesible por rol "duena" (Ana Ramos)

// Registrar acción en historial
app.post('/api/historial', async (c) => {
  try {
    const { usuario_email, usuario_nombre, usuario_rol, accion, seccion, entidad_tipo, entidad_id, detalles } = await c.req.json()
    
    // Validar datos obligatorios
    if (!usuario_email || !accion || !seccion) {
      return c.json({ error: 'Datos incompletos' }, 400)
    }
    
    // Obtener IP y User Agent de headers
    const ip_address = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const user_agent = c.req.header('User-Agent') || 'unknown'
    
    const result = await c.env.DB.prepare(`
      INSERT INTO historial_movimientos (
        usuario_email, usuario_nombre, usuario_rol, 
        accion, seccion, entidad_tipo, entidad_id, 
        detalles_json, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      usuario_email,
      usuario_nombre || null,
      usuario_rol || null,
      accion,
      seccion,
      entidad_tipo || null,
      entidad_id || null,
      detalles ? JSON.stringify(detalles) : null,
      ip_address,
      user_agent
    ).run()
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Acción registrada en historial' 
    })
  } catch (error) {
    console.error('Error registrando en historial:', error)
    return c.json({ error: 'Error al registrar acción' }, 500)
  }
})

// Obtener historial completo (con filtros)
app.get('/api/historial', async (c) => {
  try {
    const usuario = c.req.query('usuario')
    const accion = c.req.query('accion')
    const seccion = c.req.query('seccion')
    const fecha_desde = c.req.query('fecha_desde')
    const fecha_hasta = c.req.query('fecha_hasta')
    const limit = parseInt(c.req.query('limit') || '100')
    const offset = parseInt(c.req.query('offset') || '0')
    
    let query = `
      SELECT * FROM historial_movimientos
      WHERE 1=1
    `
    const params: any[] = []
    
    if (usuario) {
      query += ` AND usuario_email = ?`
      params.push(usuario)
    }
    
    if (accion) {
      query += ` AND accion = ?`
      params.push(accion)
    }
    
    if (seccion) {
      query += ` AND seccion = ?`
      params.push(seccion)
    }
    
    if (fecha_desde) {
      query += ` AND created_at >= ?`
      params.push(fecha_desde)
    }
    
    if (fecha_hasta) {
      query += ` AND created_at <= ?`
      params.push(fecha_hasta)
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all()
    
    // Parse JSON fields
    const movimientos = results.map((m: any) => ({
      ...m,
      detalles: m.detalles_json ? JSON.parse(m.detalles_json) : null
    }))
    
    // Contar total de registros (para paginación)
    let countQuery = `SELECT COUNT(*) as total FROM historial_movimientos WHERE 1=1`
    const countParams: any[] = []
    
    if (usuario) {
      countQuery += ` AND usuario_email = ?`
      countParams.push(usuario)
    }
    if (accion) {
      countQuery += ` AND accion = ?`
      countParams.push(accion)
    }
    if (seccion) {
      countQuery += ` AND seccion = ?`
      countParams.push(seccion)
    }
    if (fecha_desde) {
      countQuery += ` AND created_at >= ?`
      countParams.push(fecha_desde)
    }
    if (fecha_hasta) {
      countQuery += ` AND created_at <= ?`
      countParams.push(fecha_hasta)
    }
    
    const countStmt = c.env.DB.prepare(countQuery)
    const countResult = countParams.length > 0
      ? await countStmt.bind(...countParams).first()
      : await countStmt.first()
    
    return c.json({
      movimientos: movimientos,
      total: countResult?.total || 0,
      limit: limit,
      offset: offset
    })
  } catch (error) {
    console.error('Error obteniendo historial:', error)
    return c.json({ error: 'Error al obtener historial' }, 500)
  }
})

// Obtener estadísticas del historial
app.get('/api/historial/stats', async (c) => {
  try {
    // Total de acciones por usuario
    const porUsuario = await c.env.DB.prepare(`
      SELECT usuario_email, usuario_nombre, COUNT(*) as total
      FROM historial_movimientos
      GROUP BY usuario_email
      ORDER BY total DESC
    `).all()
    
    // Total de acciones por tipo
    const porAccion = await c.env.DB.prepare(`
      SELECT accion, COUNT(*) as total
      FROM historial_movimientos
      GROUP BY accion
      ORDER BY total DESC
    `).all()
    
    // Total de acciones por sección
    const porSeccion = await c.env.DB.prepare(`
      SELECT seccion, COUNT(*) as total
      FROM historial_movimientos
      GROUP BY seccion
      ORDER BY total DESC
    `).all()
    
    // Actividad por día (últimos 30 días)
    const porDia = await c.env.DB.prepare(`
      SELECT DATE(created_at) as fecha, COUNT(*) as total
      FROM historial_movimientos
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `).all()
    
    return c.json({
      por_usuario: porUsuario.results,
      por_accion: porAccion.results,
      por_seccion: porSeccion.results,
      por_dia: porDia.results
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return c.json({ error: 'Error al obtener estadísticas' }, 500)
  }
})

// ============================================
// STOCK - Gestión de Inventario
// ============================================

// Obtener todas las categorías de stock
app.get('/api/stock/categorias', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM stock_categorias ORDER BY nombre
    `).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    return c.json({ error: 'Error al obtener categorías' }, 500)
  }
})

// Generar código automático para stock
async function generarCodigoStock(db: any, categoriaId: number): Promise<string> {
  // Obtener prefijo y último número de la categoría
  const categoria = await db.prepare(`
    SELECT prefijo, ultimo_numero FROM stock_categorias WHERE id = ?
  `).bind(categoriaId).first()
  
  if (!categoria) {
    throw new Error('Categoría no encontrada')
  }
  
  const nuevoNumero = categoria.ultimo_numero + 1
  const codigo = `${categoria.prefijo}-${String(nuevoNumero).padStart(4, '0')}`
  
  // Actualizar último número en la categoría
  await db.prepare(`
    UPDATE stock_categorias SET ultimo_numero = ? WHERE id = ?
  `).bind(nuevoNumero, categoriaId).run()
  
  return codigo
}

// Obtener todo el stock
app.get('/api/stock', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        s.*,
        sc.nombre as categoria_nombre,
        sc.prefijo as categoria_prefijo
      FROM stock s
      LEFT JOIN stock_categorias sc ON s.categoria_id = sc.id
      ORDER BY s.created_at DESC
    `).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error al obtener stock:', error)
    return c.json({ error: 'Error al obtener stock' }, 500)
  }
})

// Obtener stock por ID
app.get('/api/stock/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const stock = await c.env.DB.prepare(`
      SELECT 
        s.*,
        sc.nombre as categoria_nombre,
        sc.prefijo as categoria_prefijo
      FROM stock s
      LEFT JOIN stock_categorias sc ON s.categoria_id = sc.id
      WHERE s.id = ?
    `).bind(id).first()
    
    if (!stock) {
      return c.json({ error: 'Item no encontrado' }, 404)
    }
    
    return c.json(stock)
  } catch (error) {
    console.error('Error al obtener item:', error)
    return c.json({ error: 'Error al obtener item' }, 500)
  }
})

// Crear nuevo item de stock
app.post('/api/stock', async (c) => {
  try {
    const data = await c.req.json()
    
    // Generar código automático
    const codigo = await generarCodigoStock(c.env.DB, data.categoria_id)
    
    const result = await c.env.DB.prepare(`
      INSERT INTO stock (
        codigo, categoria_id, nombre, descripcion, unidad,
        precio_compra, precio_venta, cantidad_actual, cantidad_minima,
        proveedor, imagen_url, documento_url, fecha_ultima_compra
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      codigo,
      data.categoria_id,
      data.nombre,
      data.descripcion || null,
      data.unidad || 'unidad',
      data.precio_compra || 0,
      data.precio_venta || 0,
      data.cantidad_actual || 0,
      data.cantidad_minima || 10,
      data.proveedor || null,
      data.imagen_url || null,
      data.documento_url || null,
      data.fecha_ultima_compra || null
    ).run()
    
    // Registrar movimiento si hay cantidad inicial
    if (data.cantidad_actual && data.cantidad_actual > 0) {
      await c.env.DB.prepare(`
        INSERT INTO stock_movimientos (
          stock_id, tipo, cantidad, stock_anterior, stock_nuevo,
          motivo, documento_url
        ) VALUES (?, 'entrada', ?, 0, ?, 'Stock inicial', ?)
      `).bind(
        result.meta.last_row_id,
        data.cantidad_actual,
        data.cantidad_actual,
        data.documento_url || null
      ).run()
    }
    
    return c.json({ 
      id: result.meta.last_row_id, 
      codigo,
      ...data 
    })
  } catch (error) {
    console.error('Error al crear item:', error)
    return c.json({ error: 'Error al crear item' }, 500)
  }
})

// Actualizar item de stock
app.put('/api/stock/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE stock SET
        nombre = ?,
        descripcion = ?,
        unidad = ?,
        precio_compra = ?,
        precio_venta = ?,
        cantidad_minima = ?,
        proveedor = ?,
        imagen_url = ?,
        documento_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.nombre,
      data.descripcion,
      data.unidad,
      data.precio_compra,
      data.precio_venta,
      data.cantidad_minima,
      data.proveedor,
      data.imagen_url,
      data.documento_url,
      id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error al actualizar item:', error)
    return c.json({ error: 'Error al actualizar item' }, 500)
  }
})

// Eliminar item de stock
app.delete('/api/stock/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      DELETE FROM stock WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar item:', error)
    return c.json({ error: 'Error al eliminar item' }, 500)
  }
})

// Ajustar stock (entrada/salida)
app.post('/api/stock/:id/ajustar', async (c) => {
  try {
    const id = c.req.param('id')
    const { tipo, cantidad, motivo, documento_url } = await c.req.json()
    
    // Obtener stock actual
    const stock = await c.env.DB.prepare(`
      SELECT cantidad_actual FROM stock WHERE id = ?
    `).bind(id).first()
    
    if (!stock) {
      return c.json({ error: 'Item no encontrado' }, 404)
    }
    
    const stockAnterior = stock.cantidad_actual
    let stockNuevo = stockAnterior
    
    if (tipo === 'entrada') {
      stockNuevo = stockAnterior + cantidad
    } else if (tipo === 'salida') {
      stockNuevo = Math.max(0, stockAnterior - cantidad)
    } else if (tipo === 'ajuste') {
      stockNuevo = cantidad
    }
    
    // Actualizar stock
    await c.env.DB.prepare(`
      UPDATE stock SET cantidad_actual = ? WHERE id = ?
    `).bind(stockNuevo, id).run()
    
    // Registrar movimiento
    await c.env.DB.prepare(`
      INSERT INTO stock_movimientos (
        stock_id, tipo, cantidad, stock_anterior, stock_nuevo,
        motivo, documento_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      tipo,
      cantidad,
      stockAnterior,
      stockNuevo,
      motivo || null,
      documento_url || null
    ).run()
    
    return c.json({ 
      success: true,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo
    })
  } catch (error) {
    console.error('Error al ajustar stock:', error)
    return c.json({ error: 'Error al ajustar stock' }, 500)
  }
})

// Obtener movimientos de un item
app.get('/api/stock/:id/movimientos', async (c) => {
  try {
    const id = c.req.param('id')
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM stock_movimientos
      WHERE stock_id = ?
      ORDER BY created_at DESC
    `).bind(id).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error al obtener movimientos:', error)
    return c.json({ error: 'Error al obtener movimientos' }, 500)
  }
})

// Importación masiva de stock desde Excel/CSV
app.post('/api/stock/importar', async (c) => {
  try {
    const { items, documento_url } = await c.req.json()
    
    const resultados = []
    
    for (const item of items) {
      try {
        // Generar código automático
        const codigo = await generarCodigoStock(c.env.DB, item.categoria_id)
        
        const result = await c.env.DB.prepare(`
          INSERT INTO stock (
            codigo, categoria_id, nombre, descripcion, unidad,
            precio_compra, precio_venta, cantidad_actual, cantidad_minima,
            proveedor, imagen_url, documento_url, fecha_ultima_compra
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          codigo,
          item.categoria_id,
          item.nombre,
          item.descripcion || null,
          item.unidad || 'unidad',
          item.precio_compra || 0,
          item.precio_venta || 0,
          item.cantidad_actual || 0,
          item.cantidad_minima || 10,
          item.proveedor || null,
          item.imagen_url || null,
          documento_url || null,
          item.fecha_ultima_compra || null
        ).run()
        
        // Registrar movimiento si hay cantidad
        if (item.cantidad_actual && item.cantidad_actual > 0) {
          await c.env.DB.prepare(`
            INSERT INTO stock_movimientos (
              stock_id, tipo, cantidad, stock_anterior, stock_nuevo,
              motivo, documento_url
            ) VALUES (?, 'entrada', ?, 0, ?, 'Importación masiva', ?)
          `).bind(
            result.meta.last_row_id,
            item.cantidad_actual,
            item.cantidad_actual,
            documento_url || null
          ).run()
        }
        
        resultados.push({ 
          success: true,
          codigo,
          nombre: item.nombre
        })
      } catch (error) {
        resultados.push({ 
          success: false,
          nombre: item.nombre,
          error: error.message
        })
      }
    }
    
    return c.json({ 
      success: true,
      total: items.length,
      exitosos: resultados.filter(r => r.success).length,
      fallidos: resultados.filter(r => !r.success).length,
      resultados
    })
  } catch (error) {
    console.error('Error en importación masiva:', error)
    return c.json({ error: 'Error en importación masiva' }, 500)
  }
})

// ============================================
// AVISOS / NOTIFICACIONES
// ============================================

// Obtener todos los avisos (con filtro opcional)
app.get('/api/avisos', async (c) => {
  const { leido, tipo, prioridad } = c.req.query()
  
  let sql = 'SELECT * FROM avisos WHERE 1=1'
  const bindings: any[] = []
  
  if (leido !== undefined) {
    sql += ' AND leido = ?'
    bindings.push(leido === 'true' ? 1 : 0)
  }
  
  if (tipo) {
    sql += ' AND tipo = ?'
    bindings.push(tipo)
  }
  
  if (prioridad) {
    sql += ' AND prioridad = ?'
    bindings.push(prioridad)
  }
  
  sql += ' ORDER BY created_at DESC'
  
  const { results } = await c.env.DB.prepare(sql).bind(...bindings).all()
  return c.json(results)
})

// Obtener contador de avisos no leídos
app.get('/api/avisos/contador', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM avisos WHERE leido = 0
  `).first() as any
  
  return c.json({ total: result.total })
})

// Marcar aviso como leído
app.put('/api/avisos/:id/leer', async (c) => {
  const id = c.req.param('id')
  
  await c.env.DB.prepare(`
    UPDATE avisos SET leido = 1, leido_at = datetime('now') WHERE id = ?
  `).bind(id).run()
  
  return c.json({ success: true })
})

// Marcar todos los avisos como leídos
app.put('/api/avisos/leer-todos', async (c) => {
  await c.env.DB.prepare(`
    UPDATE avisos SET leido = 1, leido_at = datetime('now') WHERE leido = 0
  `).run()
  
  return c.json({ success: true })
})

// Eliminar aviso
app.delete('/api/avisos/:id', async (c) => {
  const id = c.req.param('id')
  
  await c.env.DB.prepare(`
    DELETE FROM avisos WHERE id = ?
  `).bind(id).run()
  
  return c.json({ success: true })
})

// ============================================
// NOTAS - LIBRETA DE APUNTES
// ============================================

// Obtener todas las notas del usuario
app.get('/api/notas', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM notas ORDER BY updated_at DESC
    `).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error obteniendo notas:', error)
    return c.json({ error: 'Error al obtener notas' }, 500)
  }
})

// Crear nueva nota
app.post('/api/notas', async (c) => {
  try {
    const { titulo, contenido, color } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO notas (titulo, contenido, color)
      VALUES (?, ?, ?)
    `).bind(titulo, contenido, color || '#fef3c7').run()
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Error creando nota:', error)
    return c.json({ error: 'Error al crear nota' }, 500)
  }
})

// Actualizar nota
app.put('/api/notas/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { titulo, contenido, color } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE notas SET titulo = ?, contenido = ?, color = ?
      WHERE id = ?
    `).bind(titulo, contenido, color, id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error actualizando nota:', error)
    return c.json({ error: 'Error al actualizar nota' }, 500)
  }
})

// Eliminar nota
app.delete('/api/notas/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      DELETE FROM notas WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error eliminando nota:', error)
    return c.json({ error: 'Error al eliminar nota' }, 500)
  }
})

// ============================================
// CONVERSACIONES IA - MEMORIA DEL CHAT
// ============================================

// Obtener historial de conversaciones
app.get('/api/conversaciones', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM conversaciones_ia 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(limit).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error)
    return c.json({ error: 'Error al obtener conversaciones' }, 500)
  }
})

// Guardar conversación
app.post('/api/conversaciones', async (c) => {
  try {
    const { mensaje, respuesta } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO conversaciones_ia (mensaje, respuesta)
      VALUES (?, ?)
    `).bind(mensaje, respuesta).run()
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Error guardando conversación:', error)
    return c.json({ error: 'Error al guardar conversación' }, 500)
  }
})

// Guardar conversación como nota
app.post('/api/conversaciones/:id/guardar-nota', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Obtener la conversación
    const conversacion = await c.env.DB.prepare(`
      SELECT * FROM conversaciones_ia WHERE id = ?
    `).bind(id).first() as any
    
    if (!conversacion) {
      return c.json({ error: 'Conversación no encontrada' }, 404)
    }
    
    // Crear nota con la conversación
    const titulo = conversacion.mensaje.substring(0, 50) + '...'
    const contenido = `TÚ: ${conversacion.mensaje}\n\nGAL IA: ${conversacion.respuesta}`
    
    const result = await c.env.DB.prepare(`
      INSERT INTO notas (titulo, contenido, color)
      VALUES (?, ?, ?)
    `).bind(titulo, contenido, '#dbeafe').run()
    
    return c.json({ 
      success: true, 
      nota_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Error guardando conversación como nota:', error)
    return c.json({ error: 'Error al guardar como nota' }, 500)
  }
})

// ============================================
// MOUNT EXTERNAL ROUTES
// ============================================
app.route('/api/presupuestos', presupuestos)
app.route('/api/disenador', disenador)
app.route('/api/tareas', tareas)
app.route('/api/uploads', uploads)

// ============================================
// FRONTEND - HTML
// ============================================

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anushka Hogar - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'brand-orange': '#C89116',
                        'brand-orange-dark': '#a07512',
                        'brand-orange-light': '#f0dbb5'
                    }
                }
            }
        }
    </script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <!-- jsPDF para generación de PDFs -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
    <!-- JSZip para generar archivos ZIP -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .tab-button.active { 
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            border-bottom: 3px solid #C89116;
        }
        /* Custom brand colors */
        .bg-brand-orange { background-color: #C89116; }
        .text-brand-orange { color: #C89116; }
        .border-brand-orange { border-color: #C89116; }
        .hover\:bg-brand-orange-dark:hover { background-color: #a07512; }
        .bg-brand-orange-light { background-color: #f0dbb5; }
        
        /* GAL IA Float Button Animation */
        @keyframes float-pulse {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        #galia-float-btn {
            animation: float-pulse 3s ease-in-out infinite;
        }
        #galia-float-btn:hover {
            animation: none;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-md sticky top-0 z-50">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <img src="/static/logo.jpg" alt="Anushka Hogar" class="h-16 object-contain">
                </div>
                <div class="flex items-center space-x-4">
                    <!-- Botón de Avisos -->
                    <button onclick="toggleAvisos()" class="relative bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-all">
                        <i class="fas fa-bell text-xl"></i>
                        <span id="avisos-badge" class="hidden absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">0</span>
                    </button>
                    
                    <div class="text-right">
                        <p class="text-sm text-gray-600">Bienvenida</p>
                        <p class="font-semibold text-gray-800">Admin</p>
                    </div>
                    <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all">
                        <i class="fas fa-sign-out-alt mr-2"></i>Salir
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Panel de Avisos (flotante) -->
    <div id="avisos-panel" class="hidden fixed top-20 right-6 w-96 max-h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
        <div class="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-4 flex items-center justify-between">
            <h3 class="text-lg font-bold">
                <i class="fas fa-bell mr-2"></i>Avisos
            </h3>
            <div class="flex items-center space-x-2">
                <button onclick="marcarTodosLeidos()" class="text-sm hover:bg-white/20 px-3 py-1 rounded transition-all">
                    <i class="fas fa-check-double mr-1"></i>Marcar todos
                </button>
                <button onclick="toggleAvisos()" class="hover:bg-white/20 p-2 rounded transition-all">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        
        <div id="avisos-lista" class="overflow-y-auto max-h-[500px] p-4">
            <!-- Avisos se cargan dinámicamente -->
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="container mx-auto px-6 mt-6">
        <div class="bg-white rounded-xl shadow-md p-2 flex flex-wrap gap-2">
            <button onclick="showTab('dashboard')" class="tab-button active px-6 py-3 rounded-lg font-medium transition-all">
                <i class="fas fa-chart-line mr-2"></i>Dashboard
            </button>
            <button onclick="showTab('clientes')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-users mr-2"></i>Clientes
            </button>
            <button onclick="showTab('trabajos')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-briefcase mr-2"></i>Trabajos
            </button>
            <button id="tareas-btn" onclick="showTab('tareas')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100 relative">
                <i class="fas fa-clipboard-list mr-2"></i>Tareas
                <span id="tareas-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">0</span>
            </button>
            <button onclick="showTab('stock')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-boxes mr-2"></i>Stock
            </button>
            <button onclick="showTab('presupuestos')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-file-alt mr-2"></i>Presupuestos
            </button>
            <button onclick="showTab('facturas')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-file-invoice-dollar mr-2"></i>Facturación
            </button>
            <button onclick="showTab('personal')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-user-tie mr-2"></i>Personal
            </button>
            <button onclick="showTab('reportes')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-chart-bar mr-2"></i>Reportes
            </button>
            <button onclick="showTab('historial')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100" data-tab="historial">
                <i class="fas fa-history mr-2"></i>Historial
            </button>
            <!-- Consultor IA ahora disponible vía botón flotante GAL IA 🐙 -->
            <button onclick="showTab('disenador')" class="tab-button px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                <i class="fas fa-magic mr-2"></i>Diseñador Virtual
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-6">
        
        <!-- DASHBOARD TAB -->
        <div id="dashboard-tab" class="tab-content active">
            <!-- KPI Cards - Enfoque Operacional -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Trabajos Activos</p>
                            <p class="text-2xl font-bold text-brand-orange" id="kpi-trabajos">0</p>
                        </div>
                        <div class="bg-brand-orange-light p-3 rounded-full">
                            <i class="fas fa-tasks text-brand-orange text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Presupuestos Pendientes</p>
                            <p class="text-2xl font-bold text-brand-orange" id="kpi-presupuestos">0</p>
                        </div>
                        <div class="bg-brand-orange-light p-3 rounded-full">
                            <i class="fas fa-file-alt text-brand-orange text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Fases en Proceso</p>
                            <p class="text-2xl font-bold text-amber-600" id="kpi-fases">0</p>
                        </div>
                        <div class="bg-amber-100 p-3 rounded-full">
                            <i class="fas fa-stream text-amber-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-all" onclick="switchTab('tareas-tab', 'tareas-btn')">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Tareas Pendientes</p>
                            <p class="text-2xl font-bold text-red-600" id="kpi-tareas">0</p>
                            <p class="text-xs text-gray-500 mt-1" id="kpi-tareas-detalle">0 telas custom</p>
                        </div>
                        <div class="bg-red-100 p-3 rounded-full">
                            <i class="fas fa-clipboard-list text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts - Operaciones -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">
                        <i class="fas fa-briefcase text-brand-orange mr-2"></i>Trabajos por Estado
                    </h3>
                    <canvas id="chartTrabajos"></canvas>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">
                        <i class="fas fa-tasks text-amber-600 mr-2"></i>Fases Activas
                    </h3>
                    <canvas id="chartFases"></canvas>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">
                        <i class="fas fa-file-invoice text-brand-orange mr-2"></i>Presupuestos por Estado
                    </h3>
                    <canvas id="chartPresupuestos"></canvas>
                </div>
            </div>
        </div>

        <!-- CLIENTES TAB -->
        <div id="clientes-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                    <button onclick="showClienteForm()" class="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nuevo Cliente
                    </button>
                </div>
                <div id="clientes-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- TRABAJOS TAB -->
        <div id="trabajos-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Trabajos</h2>
                    <button onclick="showTrabajoForm()" class="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nuevo Trabajo
                    </button>
                </div>
                
                <!-- Filtros -->
                <div class="mb-6 flex gap-4">
                    <select id="filter-estado" onchange="loadTrabajos()" class="px-4 py-2 border rounded-lg">
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                    <input type="date" id="filter-fecha" onchange="loadTrabajos()" class="px-4 py-2 border rounded-lg">
                </div>
                
                <div id="trabajos-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- PERSONAL TAB -->
        <div id="personal-tab" class="tab-content">
            <!-- Sub-navegación de pestañas -->
            <div class="bg-white rounded-xl shadow-md p-2 mb-6 flex gap-2">
                <button onclick="showPersonalSubTab('nuevo')" id="personal-subtab-nuevo" class="personal-subtab active px-6 py-3 rounded-lg font-medium transition-all bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                    <i class="fas fa-plus-circle mr-2"></i>Nuevo Personal
                </button>
                <button onclick="showPersonalSubTab('gestion')" id="personal-subtab-gestion" class="personal-subtab px-6 py-3 rounded-lg font-medium transition-all text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-users mr-2"></i>Gestión de Personal
                </button>
            </div>
            
            <!-- SUBTAB: NUEVO PERSONAL -->
            <div id="personal-subtab-nuevo-content" class="personal-subtab-content active">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-6">
                        <i class="fas fa-user-plus text-brand-orange mr-2"></i>Añadir Nuevo Personal
                    </h3>
                    <div id="personal-form-container"></div>
                </div>
            </div>
            
            <!-- SUBTAB: GESTIÓN DE PERSONAL -->
            <div id="personal-subtab-gestion-content" class="personal-subtab-content" style="display: none;">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-6">
                        <i class="fas fa-users-cog text-brand-orange mr-2"></i>Personal Registrado
                    </h3>
                    <div id="personal-lista" class="overflow-x-auto"></div>
                </div>
            </div>
        </div>

        <!-- STOCK TAB -->
        <div id="stock-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-boxes text-brand-orange mr-2"></i>
                        Control de Inventario
                    </h2>
                    <div class="flex gap-3">
                        <button onclick="showGestionCategorias()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            <i class="fas fa-tags mr-2"></i>Categorías
                        </button>
                        <button onclick="loadStock(true)" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                            <i class="fas fa-exclamation-circle mr-2"></i>Bajo Stock
                        </button>
                        <button onclick="showImportarStock()" class="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all">
                            <i class="fas fa-file-upload mr-2"></i>Importar Masivo
                        </button>
                        <button onclick="showStockForm()" class="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                            <i class="fas fa-plus mr-2"></i>Nuevo Artículo
                        </button>
                    </div>
                </div>
                
                <!-- Filtro por categoría -->
                <div class="mb-4">
                    <label class="text-sm font-medium text-gray-700 mr-3">Filtrar por categoría:</label>
                    <select id="filter-categoria" onchange="loadStock(false)" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
                        <option value="">Todas las categorías</option>
                    </select>
                </div>
                
                <div id="stock-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- FACTURAS TAB -->
        <div id="facturas-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Facturación</h2>
                    <button onclick="showFacturaForm()" class="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nueva Factura
                    </button>
                </div>
                <div id="facturas-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- REPORTES TAB -->
        <div id="reportes-tab" class="tab-content">
            <!-- Gráfica de Ingresos -->
            <div class="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-chart-line text-green-600 mr-2"></i>
                    Análisis de Ingresos
                </h2>
                <div class="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">Ingresos Últimos 7 Días</h3>
                    <canvas id="chartIngresos"></canvas>
                </div>
            </div>
            
            <!-- Reportes Mensuales -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-file-invoice text-brand-orange mr-2"></i>
                        Reportes Mensuales
                    </h2>
                    <input type="month" id="reporte-mes" onchange="loadReporte()" 
                           class="px-4 py-2 border rounded-lg" value="${new Date().toISOString().slice(0, 7)}">
                </div>
                <div id="reporte-contenido"></div>
            </div>
        </div>

        <!-- PRESUPUESTOS TAB -->
        <div id="presupuestos-tab" class="tab-content">
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Gestión de Presupuestos</h2>
                    <button onclick="showPresupuestoForm()" class="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>Nuevo Presupuesto
                    </button>
                </div>
                <div class="mb-6 flex gap-4">
                    <select id="filter-estado-presupuesto" onchange="loadPresupuestos()" class="px-4 py-2 border rounded-lg">
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="enviado">Enviado</option>
                        <option value="aceptado">Aceptado</option>
                        <option value="rechazado">Rechazado</option>
                    </select>
                </div>
                <div id="presupuestos-lista" class="overflow-x-auto"></div>
            </div>
        </div>

        <!-- CONSULTOR IA TAB -->
        <div id="consultor-tab" class="tab-content">
            <div class="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-2xl overflow-hidden h-[calc(100vh-250px)] flex flex-col border border-gray-200">
                <!-- Header del Chat -->
                <div class="bg-gradient-to-r from-teal-700 via-blue-900 to-purple-800 p-8">
                    <div class="flex items-center gap-4">
                        <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
                            <img src="/static/galia-pulpo.png" alt="GAL IA" class="w-full h-full object-contain">
                        </div>
                        <div class="text-white">
                            <h2 class="text-3xl font-bold tracking-tight">GAL IA - Tu Consultora</h2>
                            <p class="text-teal-200 text-sm font-medium mt-1">Experta en Cortinas • Gestión • Innovación</p>
                        </div>
                    </div>
                    <div class="mt-6 flex flex-wrap gap-3">
                        <span class="bg-white/25 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-white/35 transition-all">
                            <i class="fas fa-cut mr-2"></i>Experta en Cortinas
                        </span>
                        <span class="bg-white/25 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-white/35 transition-all">
                            <i class="fas fa-file-invoice mr-2"></i>Facturación y VerificaTu
                        </span>
                        <span class="bg-white/25 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-white/35 transition-all">
                            <i class="fas fa-users mr-2"></i>Gestión de Clientes
                        </span>
                        <span class="bg-white/25 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-white/35 transition-all">
                            <i class="fas fa-lightbulb mr-2"></i>Tips y Mejoras
                        </span>
                    </div>
                </div>

                <!-- Área de Mensajes -->
                <div id="chat-messages" class="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
                    <!-- Mensaje de Bienvenida -->
                    <div class="mb-4">
                        <div class="flex items-start gap-3">
                            <div class="w-12 h-12 bg-gradient-to-br from-teal-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md p-1">
                                <img src="/static/galia-pulpo.png" alt="GAL IA" class="w-full h-full object-contain">
                            </div>
                            <div class="bg-white rounded-2xl p-6 shadow-lg max-w-3xl border-l-4 border-teal-500">
                                <p class="text-gray-800 mb-3 text-lg">
                                    ¡Hola! Soy <strong class="text-teal-700">GAL IA</strong> 🐙, tu consultora especializada en cortinas y gestión administrativa. 👋
                                </p>
                                <p class="text-gray-700 mb-3">
                                    Puedo ayudarte con:
                                </p>
                                <ul class="list-disc list-inside text-gray-700 space-y-1 mb-3">
                                    <li><strong>Negocio de Cortinas</strong>: Confección, instalación, propuestas comerciales, tips de venta</li>
                                    <li><strong>Facturación</strong>: VerificaTu, normativa fiscal, gestión de cobros</li>
                                    <li><strong>Gestión de Clientes</strong>: Fidelización, seguimiento, presupuestos</li>
                                    <li><strong>Uso de la Herramienta</strong>: Guía completa, mejores prácticas, optimización</li>
                                </ul>
                                <p class="text-gray-600 text-sm italic">
                                    💡 Pregúntame lo que quieras sobre tu negocio, facturación o cómo usar mejor el sistema.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Área de Input -->
                <div class="border-t bg-white p-4">
                    <div class="flex gap-3">
                        <input 
                            type="text" 
                            id="chat-input" 
                            placeholder="Escribe tu consulta aquí... (ej: ¿Cómo calculo el metraje para cortinas?)"
                            class="flex-1 px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                            onkeypress="if(event.key==='Enter') sendMessage()"
                        >
                        <button 
                            onclick="sendMessage()" 
                            class="bg-gradient-to-r from-teal-600 to-purple-700 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
                        >
                            <i class="fas fa-paper-plane mr-2"></i>Enviar
                        </button>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <button onclick="sendQuickQuestion('¿Cómo calculo el metraje de cortinas?')" class="text-sm bg-gradient-to-r from-teal-50 to-purple-50 hover:from-teal-100 hover:to-purple-100 px-4 py-2 rounded-full text-teal-800 font-medium border border-teal-200 hover:border-teal-400 transition-all">
                            📏 Calcular metraje
                        </button>
                        <button onclick="sendQuickQuestion('¿Qué es VerificaTu y cómo lo uso?')" class="text-sm bg-gradient-to-r from-teal-50 to-purple-50 hover:from-teal-100 hover:to-purple-100 px-4 py-2 rounded-full text-teal-800 font-medium border border-teal-200 hover:border-teal-400 transition-all">
                            📄 VerificaTu
                        </button>
                        <button onclick="sendQuickQuestion('Dame tips para cerrar más ventas')" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-700">
                            💰 Tips de venta
                        </button>
                        <button onclick="sendQuickQuestion('¿Cómo gestiono mejor mis clientes?')" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-700">
                            👥 Gestión clientes
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAREAS PENDIENTES TAB -->
        <div id="tareas-tab" class="tab-content">
            <div class="space-y-6">
                
                <!-- Header con estadísticas -->
                <div class="bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl shadow-lg p-8 text-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                                <i class="fas fa-clipboard-list text-teal-600 text-3xl"></i>
                            </div>
                            <div>
                                <h1 class="text-3xl font-bold">Gestión de Tareas</h1>
                                <p class="text-teal-100 mt-2">Organiza, programa y completa tus tareas</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-6 text-center">
                            <div>
                                <p class="text-sm text-teal-100">Pendientes</p>
                                <p class="text-3xl font-bold" id="tareas-count-pendientes">0</p>
                            </div>
                            <div>
                                <p class="text-sm text-teal-100">En Proceso</p>
                                <p class="text-3xl font-bold" id="tareas-count-proceso">0</p>
                            </div>
                            <div>
                                <p class="text-sm text-teal-100">🔥 Urgentes</p>
                                <p class="text-3xl font-bold" id="tareas-count-urgentes">0</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Barra de acciones y vistas -->
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex flex-wrap gap-4 items-center justify-between">
                        <!-- Selector de vista -->
                        <div class="flex gap-2">
                            <button onclick="cambiarVistaTareas('lista')" id="vista-lista-btn" class="vista-tareas-btn bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-all">
                                <i class="fas fa-list mr-2"></i>Lista
                            </button>
                            <button onclick="cambiarVistaTareas('kanban')" id="vista-kanban-btn" class="vista-tareas-btn bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-all">
                                <i class="fas fa-columns mr-2"></i>Kanban
                            </button>
                            <button onclick="cambiarVistaTareas('calendario')" id="vista-calendario-btn" class="vista-tareas-btn bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-all">
                                <i class="fas fa-calendar-alt mr-2"></i>Calendario
                            </button>
                        </div>
                        
                        <!-- Filtros rápidos -->
                        <div class="flex gap-3 items-center">
                            <select id="filtro-prioridad-tareas" onchange="loadTareas()" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
                                <option value="">Todas las prioridades</option>
                                <option value="1">🔥 Alta</option>
                                <option value="2">🟡 Media</option>
                                <option value="3">🟢 Baja</option>
                            </select>
                            
                            <select id="filtro-asignado-tareas" onchange="loadTareas()" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
                                <option value="">Todos los asignados</option>
                                <option value="Ana Ramos">Ana Ramos</option>
                                <option value="Lourdes">Lourdes</option>
                                <option value="Tienda">Tienda</option>
                            </select>
                            
                            <button onclick="showNuevaTarea()" class="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-all shadow-md">
                                <i class="fas fa-plus mr-2"></i>Nueva Tarea
                            </button>
                        </div>
                    </div>
                </div>

                <!-- VISTA LISTA -->
                <div id="vista-tareas-lista" class="vista-tareas-content">
                    <div class="space-y-4" id="tareas-lista">
                        <!-- Se llena dinámicamente -->
                    </div>
                    <div id="tareas-empty" class="hidden text-center py-12">
                        <i class="fas fa-check-circle text-6xl text-green-300 mb-4"></i>
                        <p class="text-gray-500 text-lg">🎉 ¡No hay tareas pendientes!</p>
                        <p class="text-gray-400">Todo está al día</p>
                    </div>
                </div>

                <!-- VISTA KANBAN -->
                <div id="vista-tareas-kanban" class="vista-tareas-content hidden">
                    <div class="grid grid-cols-3 gap-6">
                        <!-- Columna Pendiente -->
                        <div class="bg-gray-50 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="font-bold text-gray-700 flex items-center gap-2">
                                    <i class="fas fa-circle text-yellow-500 text-xs"></i>
                                    Pendientes
                                </h3>
                                <span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium" id="kanban-count-pendiente">0</span>
                            </div>
                            <div id="kanban-pendiente" class="space-y-3 min-h-[500px]">
                                <!-- Tareas pendientes -->
                            </div>
                        </div>

                        <!-- Columna En Proceso -->
                        <div class="bg-gray-50 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="font-bold text-gray-700 flex items-center gap-2">
                                    <i class="fas fa-circle text-blue-500 text-xs"></i>
                                    En Proceso
                                </h3>
                                <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium" id="kanban-count-en_proceso">0</span>
                            </div>
                            <div id="kanban-en_proceso" class="space-y-3 min-h-[500px]">
                                <!-- Tareas en proceso -->
                            </div>
                        </div>

                        <!-- Columna Completada -->
                        <div class="bg-gray-50 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="font-bold text-gray-700 flex items-center gap-2">
                                    <i class="fas fa-circle text-green-500 text-xs"></i>
                                    Completadas
                                </h3>
                                <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium" id="kanban-count-completada">0</span>
                            </div>
                            <div id="kanban-completada" class="space-y-3 min-h-[500px]">
                                <!-- Tareas completadas -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- VISTA CALENDARIO -->
                <div id="vista-tareas-calendario" class="vista-tareas-content hidden">
                    <div class="bg-white rounded-xl shadow-md p-6">
                        <!-- Header del calendario -->
                        <div class="flex items-center justify-between mb-6">
                            <button onclick="cambiarMesCalendario(-1)" class="p-2 hover:bg-gray-100 rounded-lg">
                                <i class="fas fa-chevron-left text-gray-600"></i>
                            </button>
                            <h3 class="text-2xl font-bold text-gray-800" id="calendario-mes-titulo">
                                <!-- Mes y año actual -->
                            </h3>
                            <button onclick="cambiarMesCalendario(1)" class="p-2 hover:bg-gray-100 rounded-lg">
                                <i class="fas fa-chevron-right text-gray-600"></i>
                            </button>
                        </div>

                        <!-- Días de la semana -->
                        <div class="grid grid-cols-7 gap-2 mb-2">
                            <div class="text-center font-medium text-gray-600 py-2">Lun</div>
                            <div class="text-center font-medium text-gray-600 py-2">Mar</div>
                            <div class="text-center font-medium text-gray-600 py-2">Mié</div>
                            <div class="text-center font-medium text-gray-600 py-2">Jue</div>
                            <div class="text-center font-medium text-gray-600 py-2">Vie</div>
                            <div class="text-center font-medium text-gray-600 py-2">Sáb</div>
                            <div class="text-center font-medium text-gray-600 py-2">Dom</div>
                        </div>

                        <!-- Grid del calendario -->
                        <div id="calendario-grid" class="grid grid-cols-7 gap-2">
                            <!-- Se llena dinámicamente -->
                        </div>
                    </div>

                    <!-- Tareas del día seleccionado -->
                    <div id="calendario-tareas-dia" class="hidden bg-white rounded-xl shadow-md p-6 mt-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4" id="calendario-dia-titulo">
                            <!-- Fecha seleccionada -->
                        </h3>
                        <div id="calendario-tareas-lista" class="space-y-3">
                            <!-- Tareas del día -->
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- NOTAS TAB -->
        <div id="notas-tab" class="tab-content">
            <div class="mb-6 flex items-center justify-between">
                <h2 class="text-3xl font-bold text-gray-800">
                    <i class="fas fa-sticky-note mr-3 text-yellow-500"></i>
                    Notas
                </h2>
                <button onclick="nuevaNota()" class="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all">
                    <i class="fas fa-plus mr-2"></i>Nueva Nota
                </button>
            </div>

            <div id="notas-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Las notas se cargan dinámicamente -->
            </div>
        </div>

        <!-- DISEÑADOR VIRTUAL TAB -->
        <div id="disenador-tab" class="tab-content">
            <div class="space-y-6">
                
                <!-- Header con instrucciones - ELEGANTE GRIS PASTEL -->
                <div class="bg-gradient-to-br from-gray-100 via-gray-50 to-stone-100 rounded-xl shadow-lg p-8 border border-gray-200">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-16 h-16 bg-gradient-to-br from-amber-100 to-stone-200 rounded-full flex items-center justify-center shadow-md">
                            <i class="fas fa-pencil-ruler text-amber-600 text-3xl"></i>
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold text-gray-800">Diseñador Virtual de Cortinas</h1>
                            <p class="text-gray-600">Visualiza cómo quedarán las cortinas en el espacio real usando IA</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-5 gap-3 mt-6">
                        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                            <i class="fas fa-upload text-2xl mb-2 text-amber-600"></i>
                            <p class="text-sm text-gray-700 font-medium">1. Sube foto</p>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                            <i class="fas fa-search text-2xl mb-2 text-amber-600"></i>
                            <p class="text-sm text-gray-700 font-medium">2. IA analiza</p>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                            <i class="fas fa-swatchbook text-2xl mb-2 text-amber-600"></i>
                            <p class="text-sm text-gray-700 font-medium">3. Tipo cortina</p>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                            <i class="fas fa-palette text-2xl mb-2 text-amber-600"></i>
                            <p class="text-sm text-gray-700 font-medium">4. Elige tela</p>
                        </div>
                        <div class="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                            <i class="fas fa-eye text-2xl mb-2 text-amber-600"></i>
                            <p class="text-sm text-gray-700 font-medium">5. Visualiza</p>
                        </div>
                    </div>
                </div>

                <!-- Galería de proyectos existentes -->
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-folder-open text-amber-600 mr-2"></i>
                            Mis Proyectos
                        </h2>
                        <button onclick="showNuevoProyecto()" class="bg-brand-orange hover:bg-brand-orange-dark text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                            <i class="fas fa-plus mr-2"></i>Nuevo Proyecto
                        </button>
                    </div>
                    <div id="proyectos-galeria" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Se carga dinámicamente -->
                    </div>
                </div>

                <!-- Área de trabajo del proyecto (inicialmente oculta) -->
                <div id="proyecto-workspace" class="hidden space-y-6">
                    
                    <!-- Paso 1: Upload de imagen -->
                    <div id="step-upload" class="bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-bold mb-4">
                            <i class="fas fa-upload text-amber-600 mr-2"></i>
                            Paso 1: Sube la foto del espacio
                        </h3>
                        
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-amber-500 transition-all cursor-pointer" 
                             id="upload-zone"
                             onclick="document.getElementById('file-input').click()">
                            <input type="file" id="file-input" accept="image/*" class="hidden" onchange="handleFileUpload(event)">
                            <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                            <p class="text-xl text-gray-600 mb-2">Arrastra una imagen aquí o haz click para seleccionar</p>
                            <p class="text-sm text-gray-500">Formatos: JPG, PNG (máx. 10MB)</p>
                        </div>
                        
                        <div id="image-preview" class="hidden mt-6">
                            <img id="preview-img" src="" alt="Preview" class="w-full max-h-96 object-contain rounded-lg">
                            <div class="flex gap-3 mt-4">
                                <button id="btn-analizar" class="flex-1 bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700">
                                    <i class="fas fa-magic mr-2"></i>Analizar con IA
                                </button>
                                <button onclick="resetUpload()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
                                    Cambiar Imagen
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Paso 2: Análisis IA (se muestra después del análisis) -->
                    <div id="step-analisis" class="hidden bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-bold mb-4">
                            <i class="fas fa-brain text-amber-600 mr-2"></i>
                            Paso 2: Análisis del Espacio
                        </h3>
                        <div id="analisis-resultado" class="space-y-4">
                            <!-- Se llena dinámicamente -->
                        </div>
                        
                        <!-- Botones de navegación -->
                        <div class="mt-6 flex gap-3 justify-center">
                            <button onclick="volverAPaso(1)" class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                                <i class="fas fa-arrow-left mr-2"></i>Volver
                            </button>
                            <button onclick="mostrarSeleccionTipo()" class="bg-brand-orange hover:bg-brand-orange-dark text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                                <i class="fas fa-arrow-right mr-2"></i>Continuar: Elegir Tipo de Cortina
                            </button>
                        </div>
                    </div>

                    <!-- Paso 3: Tipo de Confección -->
                    <div id="step-tipo-cortina" class="hidden bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-bold mb-6">
                            <i class="fas fa-swatchbook text-amber-600 mr-2"></i>
                            Paso 3: Elige el Tipo de Cortina
                        </h3>
                        <p class="text-gray-600 mb-6">Selecciona el estilo de confección que mejor se adapte a tu espacio:</p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            
                            <!-- Onda Perfecta -->
                            <div onclick="seleccionarTipoCortina('ondas_francesas', 'Onda Perfecta')" 
                                 class="tipo-cortina-card border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-amber-600 hover:shadow-lg transition-all">
                                <div class="text-5xl mb-3 text-center">🌊</div>
                                <h4 class="font-bold text-lg mb-2 text-center">Onda Perfecta</h4>
                                <p class="text-sm text-gray-600 mb-3">Elegancia clásica con caída ondulada suave y uniforme</p>
                                <div class="text-xs text-amber-600 font-medium">
                                    <i class="fas fa-check mr-1"></i>Ideal para: Salones, dormitorios principales
                                </div>
                            </div>
                            
                            <!-- Paneles Japoneses -->
                            <div onclick="seleccionarTipoCortina('panel_japones', 'Paneles Japoneses')" 
                                 class="tipo-cortina-card border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-amber-600 hover:shadow-lg transition-all">
                                <div class="text-5xl mb-3 text-center">🎋</div>
                                <h4 class="font-bold text-lg mb-2 text-center">Paneles Japoneses</h4>
                                <p class="text-sm text-gray-600 mb-3">Diseño minimalista con paneles deslizantes planos</p>
                                <div class="text-xs text-amber-600 font-medium">
                                    <i class="fas fa-check mr-1"></i>Ideal para: Espacios modernos, grandes ventanales
                                </div>
                            </div>
                            
                            <!-- Pliegues Rectos -->
                            <div onclick="seleccionarTipoCortina('pliegues_rectos', 'Pliegues Rectos')" 
                                 class="tipo-cortina-card border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-amber-600 hover:shadow-lg transition-all">
                                <div class="text-5xl mb-3 text-center">📏</div>
                                <h4 class="font-bold text-lg mb-2 text-center">Pliegues Rectos</h4>
                                <p class="text-sm text-gray-600 mb-3">Líneas verticales limpias y aspecto estructurado</p>
                                <div class="text-xs text-amber-600 font-medium">
                                    <i class="fas fa-check mr-1"></i>Ideal para: Oficinas, espacios contemporáneos
                                </div>
                            </div>
                            
                            <!-- Estor Enrollable -->
                            <div onclick="seleccionarTipoCortina('estor_enrollable', 'Estor Enrollable')" 
                                 class="tipo-cortina-card border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-amber-600 hover:shadow-lg transition-all">
                                <div class="text-5xl mb-3 text-center">📜</div>
                                <h4 class="font-bold text-lg mb-2 text-center">Estor Enrollable</h4>
                                <p class="text-sm text-gray-600 mb-3">Solución compacta y funcional que se enrolla verticalmente</p>
                                <div class="text-xs text-amber-600 font-medium">
                                    <i class="fas fa-check mr-1"></i>Ideal para: Cocinas, baños, espacios reducidos
                                </div>
                            </div>
                            
                            <!-- Estor Plegable -->
                            <div onclick="seleccionarTipoCortina('estor_plegable', 'Estor Plegable')" 
                                 class="tipo-cortina-card border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-amber-600 hover:shadow-lg transition-all">
                                <div class="text-5xl mb-3 text-center">🪗</div>
                                <h4 class="font-bold text-lg mb-2 text-center">Estor Plegable</h4>
                                <p class="text-sm text-gray-600 mb-3">Se recoge en pliegues horizontales tipo acordeón</p>
                                <div class="text-xs text-amber-600 font-medium">
                                    <i class="fas fa-check mr-1"></i>Ideal para: Ventanas pequeñas, estilo romántico
                                </div>
                            </div>
                            
                            <!-- Otros / Personalizado -->
                            <div onclick="seleccionarTipoCortina('otros', 'Otros')" 
                                 class="tipo-cortina-card border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-amber-600 hover:shadow-lg transition-all">
                                <div class="text-5xl mb-3 text-center">✨</div>
                                <h4 class="font-bold text-lg mb-2 text-center">Otros / Personalizado</h4>
                                <p class="text-sm text-gray-600 mb-3">Confección especial o diseño personalizado</p>
                                <div class="text-xs text-amber-600 font-medium">
                                    <i class="fas fa-check mr-1"></i>Consulta con nuestro equipo
                                </div>
                            </div>
                            
                        </div>
                        
                        <div id="tipo-seleccionado-info" class="hidden mt-6 p-4 bg-stone-50 rounded-lg border-2 border-stone-200">
                            <p class="text-sm text-gray-600">Tipo seleccionado:</p>
                            <p id="tipo-seleccionado-nombre" class="text-lg font-bold text-amber-600"></p>
                            
                            <div class="mt-4 flex gap-3">
                                <button onclick="volverAPaso(2)" class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                                    <i class="fas fa-arrow-left mr-2"></i>Volver
                                </button>
                                <button id="btn-continuar-telas" onclick="continuarATelas()" class="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
                                    <i class="fas fa-arrow-right mr-2"></i>Continuar: Elegir Tela
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Paso 4: Selección de tela y opciones -->
                    <div id="step-configuracion" class="hidden bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-bold mb-6">
                            <i class="fas fa-palette text-amber-600 mr-2"></i>
                            Paso 4: Diseña tus Cortinas
                        </h3>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            <!-- Columna 1: Catálogo de Telas -->
                            <div class="lg:col-span-2">
                                <!-- Opción: Subir Tela Nueva -->
                                <div class="mb-6 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 class="font-bold text-gray-800">
                                            <i class="fas fa-upload text-brand-orange mr-2"></i>
                                            ¿No encuentras la tela? Súbela aquí
                                        </h4>
                                        <button onclick="toggleSubirTela()" id="btn-toggle-subir" class="text-brand-orange hover:text-brand-orange-dark text-sm font-medium">
                                            <i class="fas fa-chevron-down"></i> Mostrar
                                        </button>
                                    </div>
                                    
                                    <div id="form-subir-tela" class="hidden space-y-3">
                                        <div class="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 transition-all cursor-pointer"
                                             onclick="document.getElementById('tela-file-input').click()">
                                            <input type="file" id="tela-file-input" accept="image/*" class="hidden" onchange="handleTelaUpload(event)">
                                            <i class="fas fa-image text-4xl text-gray-400 mb-2"></i>
                                            <p class="text-sm text-gray-600">Click para subir imagen de la tela</p>
                                        </div>
                                        
                                        <div id="tela-preview" class="hidden">
                                            <img id="tela-preview-img" src="" alt="Preview" class="w-full h-32 object-cover rounded-lg mb-2">
                                            <input type="text" id="tela-nombre-input" placeholder="Nombre de la tela" class="w-full px-3 py-2 border rounded-lg mb-2">
                                            <input type="number" id="tela-precio-input" placeholder="Precio por m² (€)" step="0.01" class="w-full px-3 py-2 border rounded-lg mb-2">
                                            
                                            <label class="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                                                <input type="checkbox" id="tela-es-stock" class="w-4 h-4">
                                                <span class="text-sm">
                                                    <i class="fas fa-warehouse text-amber-600 mr-1"></i>
                                                    ¿Es de nuestro stock?
                                                </span>
                                            </label>
                                            
                                            <div class="flex gap-2 mt-3">
                                                <button onclick="usarTelaSubida()" class="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900">
                                                    <i class="fas fa-check mr-2"></i>Usar Esta Tela
                                                </button>
                                                <button onclick="cancelarTelaSubida()" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Catálogo existente -->
                                <div class="mb-4 flex gap-3">
                                    <select id="filter-opacidad" onchange="filtrarTelas()" class="px-4 py-2 border rounded-lg">
                                        <option value="">Todas las opacidades</option>
                                        <option value="transparente">Transparente</option>
                                        <option value="traslúcida">Traslúcida</option>
                                        <option value="opaca">Opaca</option>
                                        <option value="blackout">Blackout</option>
                                    </select>
                                    <select id="filter-categoria-tela" onchange="filtrarTelas()" class="px-4 py-2 border rounded-lg">
                                        <option value="">Todas las categorías</option>
                                        <!-- Se llena dinámicamente -->
                                    </select>
                                </div>
                                
                                <div id="catalogo-telas" class="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                                    <!-- Se carga dinámicamente -->
                                </div>
                            </div>
                            
                            <!-- Columna 2: Opciones y Resumen -->
                            <div class="space-y-6">
                                
                                <!-- Tela seleccionada -->
                                <div id="tela-seleccionada" class="border rounded-lg p-4 bg-stone-50">
                                    <p class="text-sm text-gray-600 mb-2">Tela seleccionada:</p>
                                    <p id="tela-nombre" class="font-bold text-lg">Ninguna</p>
                                    <p id="tela-precio" class="text-amber-600">-</p>
                                </div>
                                
                                <!-- Tipo de cortina (read-only, ya seleccionado en paso 3) -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Cortina</label>
                                    <select id="tipo-cortina" class="w-full px-4 py-2 border rounded-lg bg-gray-50" disabled>
                                        <option value="ondas_francesas">Onda Perfecta</option>
                                        <option value="panel_japones">Paneles Japoneses</option>
                                        <option value="pliegues_rectos">Pliegues Rectos</option>
                                        <option value="estor_enrollable">Estor Enrollable</option>
                                        <option value="estor_plegable">Estor Plegable</option>
                                        <option value="otros">Otros / Personalizado</option>
                                    </select>
                                    <p class="text-xs text-gray-500 mt-1">
                                        <i class="fas fa-check-circle text-green-600 mr-1"></i>Seleccionado en el paso anterior
                                    </p>
                                </div>
                                
                                <!-- Botones de navegación -->
                                <div class="flex gap-3">
                                    <button onclick="volverAPaso(3)" class="px-6 py-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                                        <i class="fas fa-arrow-left mr-2"></i>Volver
                                    </button>
                                    <button onclick="generarVisualizaciones()" id="btn-generar" 
                                            class="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white px-6 py-4 rounded-lg font-medium hover:shadow-lg transition-all cursor-pointer">
                                        <i class="fas fa-magic mr-2"></i>Generar Visualizaciones
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Paso 5: Resultados (galería de imágenes generadas) -->
                    <div id="step-resultados" class="hidden bg-white rounded-xl shadow-md p-6">
                        <h3 class="text-xl font-bold mb-6">
                            <i class="fas fa-images text-amber-600 mr-2"></i>
                            Paso 5: Visualizaciones Generadas
                        </h3>
                        
                        <div class="grid grid-cols-2 gap-6 mb-6">
                            <div class="text-center">
                                <p class="text-sm text-gray-600 mb-2">Imagen Original</p>
                                <img id="resultado-original" src="" alt="Original" class="w-full rounded-lg border">
                            </div>
                            <div class="text-center">
                                <p class="text-sm text-gray-600 mb-2">Con Cortinas</p>
                                <img id="resultado-generado" src="" alt="Generado" class="w-full rounded-lg border">
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-4 mb-6">
                            <button onclick="mostrarVariante(0)" class="border-2 border-amber-600 rounded-lg p-2 hover:bg-stone-50">
                                <img id="variante-0" src="" alt="Diurna" class="w-full rounded">
                                <p class="text-sm mt-1">☀️ Diurna</p>
                            </button>
                            <button onclick="mostrarVariante(1)" class="border-2 border-transparent rounded-lg p-2 hover:bg-stone-50">
                                <img id="variante-1" src="" alt="Atardecer" class="w-full rounded">
                                <p class="text-sm mt-1">🌅 Atardecer</p>
                            </button>
                            <button onclick="mostrarVariante(2)" class="border-2 border-transparent rounded-lg p-2 hover:bg-stone-50">
                                <img id="variante-2" src="" alt="Noche" class="w-full rounded">
                                <p class="text-sm mt-1">🌙 Noche</p>
                            </button>
                        </div>
                        
                        <div class="flex gap-3">
                            <button onclick="generarPresupuesto()" class="flex-1 bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900">
                                <i class="fas fa-file-invoice-dollar mr-2"></i>Generar Presupuesto
                            </button>
                            <button onclick="compartirProyecto()" class="flex-1 bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900">
                                <i class="fas fa-share-alt mr-2"></i>Compartir
                            </button>
                            <button onclick="resetProyecto()" class="px-6 py-3 border rounded-lg hover:bg-gray-50">
                                <i class="fas fa-redo mr-2"></i>Nuevo
                            </button>
                        </div>
                    </div>
                    
                </div>
                
            </div>
        </div>

    </div>

    <!-- 📝 NOTAS - Botón Flotante (Lado Izquierdo) -->
    <button id="notas-float-btn" onclick="abrirNotasFlotante()" 
            class="fixed bottom-8 left-8 w-20 h-20 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center hover:shadow-yellow-500/50"
            title="Notas rápidas">
        <i class="fas fa-sticky-note text-white text-3xl"></i>
    </button>

    <!-- 🐙 GAL IA - Asistente Flotante (Lado Derecho) -->
    <button id="galia-float-btn" onclick="openGalIA()" 
            class="fixed bottom-8 right-8 w-20 h-20 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 bg-white p-2 hover:animate-none"
            title="¡Hola! Soy GAL IA, tu asistente virtual">
        <img src="/static/galia-pulpo.png" alt="GAL IA" class="w-full h-full object-contain">
        <span id="galia-badge" class="hidden absolute -top-2 -right-2 bg-brand-orange text-white text-sm rounded-full w-7 h-7 flex items-center justify-center font-bold shadow-lg">!</span>
    </button>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <!-- SheetJS para parsear Excel -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="/static/app-final.js?v=${Date.now()}"></script>
</body>
</html>
  `)
})

export default app
