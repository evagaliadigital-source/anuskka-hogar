import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

const presupuestos = new Hono<{ Bindings: Bindings }>()

// ============================================
// API ENDPOINTS - PRESUPUESTOS
// ============================================

// Obtener todos los presupuestos (con filtros opcionales)
presupuestos.get('/', async (c) => {
  const clienteId = c.req.query('cliente_id')
  const estado = c.req.query('estado')
  
  let query = 'SELECT * FROM vista_presupuestos_completos WHERE 1=1'
  const params: any[] = []
  
  if (clienteId) {
    query += ' AND cliente_id = ?'
    params.push(clienteId)
  }
  
  if (estado) {
    query += ' AND estado = ?'
    params.push(estado)
  }
  
  query += ' ORDER BY fecha_emision DESC'
  
  const stmt = c.env.DB.prepare(query)
  const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all()
  
  return c.json(results)
})

// Obtener un presupuesto específico
presupuestos.get('/:id', async (c) => {
  const id = c.req.param('id')
  
  // Obtener datos del presupuesto
  const presupuesto = await c.env.DB.prepare(`
    SELECT * FROM vista_presupuestos_completos WHERE id = ?
  `).bind(id).first()
  
  if (!presupuesto) {
    return c.json({ error: 'Presupuesto no encontrado' }, 404)
  }
  
  // Obtener líneas del presupuesto
  const { results: lineas } = await c.env.DB.prepare(`
    SELECT * FROM presupuesto_lineas 
    WHERE presupuesto_id = ? 
    ORDER BY id
  `).bind(id).all()
  
  return c.json({ ...presupuesto, lineas })
})

// Crear nuevo presupuesto
presupuestos.post('/', async (c) => {
  const data = await c.req.json()
  
  // Extraer líneas
  const lineas = data.lineas || []
  
  // PROTECCIÓN ANTI-NaN: Filtrar líneas válidas (pero permitir cantidad=0 si es válida)
  const lineasValidas = lineas.filter((linea: any) => {
    const cantidad = parseFloat(linea.metros || linea.cantidad || linea.horas || 0)
    const precio = parseFloat(linea.precio || 0)
    // Solo validar que NO sean NaN (permitir 0)
    return !isNaN(cantidad) && !isNaN(precio) && (cantidad !== 0 || precio !== 0)
  })
  
  // Calcular totales
  const subtotal = lineasValidas.reduce((sum: number, linea: any) => {
    const cantidad = parseFloat(linea.metros || linea.cantidad || linea.horas || 0)
    const precio = parseFloat(linea.precio || 0)
    const lineaSubtotal = cantidad * precio
    return sum + (isNaN(lineaSubtotal) ? 0 : lineaSubtotal)
  }, 0)
  
  const descuento = data.descuento_porcentaje ? (subtotal * data.descuento_porcentaje / 100) : 0
  const subtotalConDescuento = subtotal - descuento
  const porcentajeIva = data.porcentaje_iva || 21
  const importeIva = subtotalConDescuento * (porcentajeIva / 100)
  const total = subtotalConDescuento + importeIva
  
  // Generar número de presupuesto
  const year = new Date().getFullYear()
  const { results: existentes } = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM presupuestos 
    WHERE numero_presupuesto LIKE ?
  `).bind(`${year}-%`).all()
  
  const numeroSecuencial = (existentes[0]?.total || 0) + 1
  const numeroPresupuesto = `${year}-${String(numeroSecuencial).padStart(4, '0')}`
  
  // Insertar presupuesto
  const resultPresupuesto = await c.env.DB.prepare(`
    INSERT INTO presupuestos (
      cliente_id, numero_presupuesto, fecha_emision, estado, titulo, descripcion,
      subtotal, descuento_porcentaje, descuento_importe, porcentaje_iva, importe_iva, total,
      notas, condiciones, forma_pago
    ) VALUES (?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.cliente_id,
    numeroPresupuesto,
    data.estado || 'pendiente',
    data.titulo,
    data.descripcion || '',
    subtotal,
    data.descuento_porcentaje || 0,
    descuento,
    porcentajeIva,
    importeIva,
    total,
    data.notas || '',
    data.condiciones || '',
    data.forma_pago || ''
  ).run()
  
  const presupuestoId = resultPresupuesto.meta.last_row_id
  
  // Insertar líneas VÁLIDAS
  for (const linea of lineasValidas) {
    const cantidad = parseFloat(linea.metros || linea.cantidad || linea.horas || 0)
    const precioUnitario = parseFloat(linea.precio || 0)
    const subtotalLinea = cantidad * precioUnitario
    
    // Protección final: NO insertar si el cálculo da NaN
    if (isNaN(subtotalLinea) || isNaN(cantidad) || isNaN(precioUnitario)) {
      continue
    }
    
    let unidad = 'unidad'
    if (linea.metros) unidad = 'metros'
    else if (linea.horas) unidad = 'horas'
    else if (linea.cantidad) unidad = linea.unidad || 'unidad'
    
    await c.env.DB.prepare(`
      INSERT INTO presupuesto_lineas (
        presupuesto_id, tipo, concepto, cantidad, unidad, precio_unitario, subtotal, detalles
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      presupuestoId,
      linea.tipo || 'otro',
      linea.concepto,
      cantidad,
      unidad,
      precioUnitario,
      subtotalLinea,
      linea.detalles || ''
    ).run()
  }
  
  return c.json({ 
    success: true, 
    id: presupuestoId,
    numero_presupuesto: numeroPresupuesto
  })
})

// Actualizar presupuesto completo
presupuestos.put('/:id', async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  
  // Extraer líneas
  const lineas = data.lineas || []
  
  // PROTECCIÓN ANTI-NaN: Filtrar líneas válidas (pero permitir cantidad=0 si es válida)
  const lineasValidas = lineas.filter((linea: any) => {
    const cantidad = parseFloat(linea.metros || linea.cantidad || linea.horas || 0)
    const precio = parseFloat(linea.precio || 0)
    // Solo validar que NO sean NaN (permitir 0)
    return !isNaN(cantidad) && !isNaN(precio) && (cantidad !== 0 || precio !== 0)
  })
  
  // Si NO vienen líneas VÁLIDAS, obtener las existentes para no recalcular
  let subtotal = 0
  let recalcular = lineasValidas.length > 0
  
  if (recalcular) {
    // Calcular totales con las nuevas líneas VÁLIDAS
    subtotal = lineasValidas.reduce((sum: number, linea: any) => {
      const cantidad = parseFloat(linea.metros || linea.cantidad || linea.horas || 0)
      const precio = parseFloat(linea.precio || 0)
      const lineaSubtotal = cantidad * precio
      // Protección adicional: verificar que el resultado no sea NaN
      return sum + (isNaN(lineaSubtotal) ? 0 : lineaSubtotal)
    }, 0)
  } else {
    // Mantener subtotal existente (no recalcular)
    const presupuestoActual = await c.env.DB.prepare(`
      SELECT subtotal FROM presupuestos WHERE id = ?
    `).bind(id).first()
    subtotal = presupuestoActual?.subtotal || 0
  }
  
  const descuento = data.descuento_porcentaje ? (subtotal * data.descuento_porcentaje / 100) : 0
  const subtotalConDescuento = subtotal - descuento
  const porcentajeIva = data.porcentaje_iva || 21
  const importeIva = subtotalConDescuento * (porcentajeIva / 100)
  const total = subtotalConDescuento + importeIva
  
  // Actualizar presupuesto
  await c.env.DB.prepare(`
    UPDATE presupuestos SET
      cliente_id = ?,
      estado = ?,
      titulo = ?,
      descripcion = ?,
      subtotal = ?,
      descuento_porcentaje = ?,
      descuento_importe = ?,
      porcentaje_iva = ?,
      importe_iva = ?,
      total = ?,
      notas = ?,
      condiciones = ?,
      forma_pago = ?
    WHERE id = ?
  `).bind(
    data.cliente_id,
    data.estado || 'pendiente',
    data.titulo,
    data.descripcion || '',
    subtotal,
    data.descuento_porcentaje || 0,
    descuento,
    porcentajeIva,
    importeIva,
    total,
    data.notas || '',
    data.condiciones || '',
    data.forma_pago || '',
    id
  ).run()
  
  // PROTECCIÓN: Solo eliminar y reinsertar líneas si vienen líneas VÁLIDAS
  if (recalcular && lineasValidas.length > 0) {
    // Eliminar líneas existentes
    await c.env.DB.prepare(`
      DELETE FROM presupuesto_lineas WHERE presupuesto_id = ?
    `).bind(id).run()
    
    // Insertar líneas nuevas VÁLIDAS
    for (const linea of lineasValidas) {
    const cantidad = parseFloat(linea.metros || linea.cantidad || linea.horas || 0)
    const precioUnitario = parseFloat(linea.precio || 0)
    const subtotalLinea = cantidad * precioUnitario
    
    // Protección final: NO insertar si el cálculo da NaN
    if (isNaN(subtotalLinea) || isNaN(cantidad) || isNaN(precioUnitario)) {
      continue
    }
    
    let unidad = 'unidad'
    if (linea.metros) unidad = 'metros'
    else if (linea.horas) unidad = 'horas'
    else if (linea.cantidad) unidad = linea.unidad || 'unidad'
    
    await c.env.DB.prepare(`
      INSERT INTO presupuesto_lineas (
        presupuesto_id, tipo, concepto, cantidad, unidad, precio_unitario, subtotal, detalles
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      linea.tipo || 'otro',
      linea.concepto,
      cantidad,
      unidad,
      precioUnitario,
      subtotalLinea,
      linea.detalles || ''
    ).run()
  }
  } // Fin de if (recalcular && lineas.length > 0)
  
  return c.json({ success: true })
})

// Actualizar estado de presupuesto
presupuestos.put('/:id/estado', async (c) => {
  const id = c.req.param('id')
  const { estado } = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE presupuestos SET estado = ? WHERE id = ?
  `).bind(estado, id).run()
  
  return c.json({ success: true })
})

// Eliminar presupuesto
presupuestos.delete('/:id', async (c) => {
  const id = c.req.param('id')
  
  // Las líneas se eliminan automáticamente por CASCADE
  await c.env.DB.prepare(`
    DELETE FROM presupuestos WHERE id = ?
  `).bind(id).run()
  
  return c.json({ success: true })
})

// Convertir presupuesto aceptado a trabajo
presupuestos.post('/:id/convertir-a-trabajo', async (c) => {
  const id = c.req.param('id')
  
  // Verificar que el presupuesto existe y está aceptado
  const presupuesto = await c.env.DB.prepare(`
    SELECT p.*, c.nombre as cliente_nombre, c.apellidos as cliente_apellidos
    FROM presupuestos p
    JOIN clientes c ON p.cliente_id = c.id
    WHERE p.id = ?
  `).bind(id).first()
  
  if (!presupuesto) {
    return c.json({ error: 'Presupuesto no encontrado' }, 404)
  }
  
  if (presupuesto.estado !== 'aceptado') {
    return c.json({ error: 'Solo se pueden convertir presupuestos aceptados' }, 400)
  }
  
  if (presupuesto.trabajo_id) {
    return c.json({ error: 'Este presupuesto ya tiene un trabajo asociado', trabajo_id: presupuesto.trabajo_id }, 400)
  }
  
  // Obtener líneas del presupuesto para generar descripción detallada
  const { results: lineas } = await c.env.DB.prepare(`
    SELECT * FROM presupuesto_lineas WHERE presupuesto_id = ? ORDER BY tipo, id
  `).bind(id).all()
  
  // Construir descripción del trabajo con las fases
  let descripcion = `PRESUPUESTO: ${presupuesto.numero_presupuesto}\n\n`
  
  const telas = lineas.filter((l: any) => l.tipo === 'tela')
  const materiales = lineas.filter((l: any) => l.tipo === 'material')
  const confeccion = lineas.filter((l: any) => l.tipo === 'confeccion')
  const instalacion = lineas.filter((l: any) => l.tipo === 'instalacion')
  
  if (telas.length > 0) {
    descripcion += '📐 TELAS:\n'
    telas.forEach((t: any) => descripcion += `- ${t.concepto}: ${t.cantidad}m\n`)
    descripcion += '\n'
  }
  
  if (materiales.length > 0) {
    descripcion += '🔧 MATERIALES:\n'
    materiales.forEach((m: any) => descripcion += `- ${m.concepto}: ${m.cantidad} ${m.unidad}\n`)
    descripcion += '\n'
  }
  
  if (confeccion.length > 0) {
    descripcion += '✂️ CONFECCIÓN:\n'
    confeccion.forEach((c: any) => descripcion += `- ${c.concepto}: ${c.cantidad}h\n`)
    descripcion += '\n'
  }
  
  if (instalacion.length > 0) {
    descripcion += '🔨 INSTALACIÓN:\n'
    instalacion.forEach((i: any) => descripcion += `- ${i.concepto}: ${i.cantidad}h\n`)
    descripcion += '\n'
  }
  
  descripcion += `\nTOTAL: €${presupuesto.total}`
  
  // Calcular duración estimada (suma de horas de confección e instalación)
  const horasTotales = [...confeccion, ...instalacion].reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.cantidad) || 0)
  }, 0)
  const duracionMinutos = horasTotales * 60
  
  // Obtener dirección del cliente
  const cliente = await c.env.DB.prepare(`
    SELECT direccion FROM clientes WHERE id = ?
  `).bind(presupuesto.cliente_id).first()
  
  // Crear el trabajo
  const trabajoResult = await c.env.DB.prepare(`
    INSERT INTO trabajos (
      cliente_id, tipo_servicio, descripcion, direccion, estado, prioridad, 
      duracion_estimada, presupuesto_id, fecha_programada, precio_cliente
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `).bind(
    presupuesto.cliente_id,
    'cortinas', // Tipo de servicio por defecto
    descripcion,
    cliente?.direccion || 'Por definir',
    'pendiente',
    'normal',
    duracionMinutos,
    id,
    presupuesto.total
  ).run()
  
  const trabajoId = trabajoResult.meta.last_row_id
  
  // Crear las 4 fases del trabajo (TODAS pendientes - control manual)
  const fases = [
    { fase: 'mediciones', orden: 1, estado: 'pendiente' },
    { fase: 'pedidos', orden: 2, estado: 'pendiente' },
    { fase: 'confeccion', orden: 3, estado: 'pendiente' },
    { fase: 'instalacion', orden: 4, estado: 'pendiente' }
  ]
  
  for (const f of fases) {
    await c.env.DB.prepare(`
      INSERT INTO trabajo_fases (trabajo_id, fase, orden, estado, personal_id, fecha_inicio)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      trabajoId,
      f.fase,
      f.orden,
      f.estado,
      null, // Sin personal asignado por defecto
      null  // Todas empiezan sin fecha de inicio
    ).run()
  }
  
  // Actualizar presupuesto con el trabajo_id
  await c.env.DB.prepare(`
    UPDATE presupuestos SET trabajo_id = ? WHERE id = ?
  `).bind(trabajoId, id).run()
  
  return c.json({ 
    success: true, 
    trabajo_id: trabajoId,
    message: 'Trabajo creado correctamente con 4 fases (Mediciones, Pedidos, Confección, Instalación)'
  })
})

// Obtener configuración de empresa
presupuestos.get('/configuracion-empresa', async (c) => {
  const empresa = await c.env.DB.prepare(`
    SELECT * FROM configuracion_empresa WHERE id = 1
  `).first()
  
  return c.json(empresa || {})
})

export default presupuestos
