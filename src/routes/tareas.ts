import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

const tareas = new Hono<{ Bindings: Bindings }>()

// ============================================
// TAREAS PENDIENTES - ENDPOINTS CRUD COMPLETOS
// ============================================

// GET - Obtener todas las tareas (con filtros)
tareas.get('/', async (c) => {
  try {
    const estado = c.req.query('estado') || 'pendiente'
    const tipo = c.req.query('tipo')
    const prioridad = c.req.query('prioridad')
    const asignado_a = c.req.query('asignado_a')
    
    let query = `
      SELECT t.*,
             p.nombre_proyecto,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos,
             tr.tipo_servicio as trabajo_tipo,
             tr.estado as trabajo_estado
      FROM tareas_pendientes t
      LEFT JOIN proyectos_diseno p ON t.proyecto_id = p.id
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (estado && estado !== 'todas') {
      query += ` AND t.estado = ?`
      params.push(estado)
    }
    
    if (tipo) {
      query += ` AND t.tipo = ?`
      params.push(tipo)
    }
    
    if (prioridad) {
      query += ` AND t.prioridad = ?`
      params.push(parseInt(prioridad))
    }
    
    if (asignado_a) {
      query += ` AND t.asignado_a = ?`
      params.push(asignado_a)
    }
    
    query += ` ORDER BY t.prioridad ASC, t.fecha_limite ASC, t.created_at DESC`
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all()
    
    // Parse JSON fields
    const tareasConDatos = results.map((t: any) => ({
      ...t,
      datos_tarea: t.datos_tarea ? JSON.parse(t.datos_tarea) : null
    }))
    
    return c.json(tareasConDatos, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Error obteniendo tareas:', error)
    return c.json({ error: 'Error al obtener tareas' }, 500)
  }
})

// GET - Obtener contador de tareas pendientes por tipo
tareas.get('/contador', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_pendientes,
        SUM(CASE WHEN prioridad = 1 THEN 1 ELSE 0 END) as alta_prioridad,
        SUM(CASE WHEN tipo = 'añadir_tela_stock' THEN 1 ELSE 0 END) as telas_pendientes,
        SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN fecha_limite < date('now') AND estado != 'completada' THEN 1 ELSE 0 END) as vencidas
      FROM tareas_pendientes
      WHERE estado != 'completada'
    `).first()
    
    return c.json(result, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Error obteniendo contador:', error)
    return c.json({ error: 'Error al obtener contador' }, 500)
  }
})

// GET - Obtener tarea por ID
tareas.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const tarea = await c.env.DB.prepare(`
      SELECT t.*,
             p.nombre_proyecto,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos,
             tr.tipo_servicio as trabajo_tipo,
             tr.estado as trabajo_estado
      FROM tareas_pendientes t
      LEFT JOIN proyectos_diseno p ON t.proyecto_id = p.id
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE t.id = ?
    `).bind(id).first()
    
    if (!tarea) {
      return c.json({ error: 'Tarea no encontrada' }, 404)
    }
    
    const tareaCompleta = {
      ...tarea,
      datos_tarea: tarea.datos_tarea ? JSON.parse(tarea.datos_tarea) : null
    }
    
    return c.json(tareaCompleta, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Error obteniendo tarea:', error)
    return c.json({ error: 'Error al obtener tarea' }, 500)
  }
})

// POST - Crear nueva tarea
tareas.post('/', async (c) => {
  try {
    const data = await c.req.json()
    
    if (!data.tipo || !data.titulo) {
      return c.json({ error: 'Tipo y título son obligatorios' }, 400)
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO tareas_pendientes (
        tipo, titulo, descripcion, estado, prioridad,
        fecha_inicio, fecha_limite, fecha_recordatorio,
        proyecto_id, cliente_id, trabajo_id, asignado_a,
        tiempo_estimado, recordatorio_minutos, notas, notas_internas, datos_tarea
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.tipo,
      data.titulo,
      data.descripcion || null,
      data.estado || 'pendiente',
      data.prioridad || 2,
      data.fecha_inicio || null,
      data.fecha_limite || null,
      data.fecha_recordatorio || null,
      data.proyecto_id || null,
      data.cliente_id || null,
      data.trabajo_id || null,
      data.asignado_a || null,
      data.tiempo_estimado || null,
      data.recordatorio_minutos || null,
      data.notas || null,
      data.notas_internas || null,
      data.datos_tarea ? JSON.stringify(data.datos_tarea) : null
    ).run()
    
    // Crear alerta si tiene recordatorio
    if (data.recordatorio_minutos && data.fecha_limite) {
      try {
        const fechaLimite = new Date(data.fecha_limite)
        const fechaAlerta = new Date(fechaLimite.getTime() - (data.recordatorio_minutos * 60000))
        
        await c.env.DB.prepare(`
          INSERT INTO tareas_alertas (tarea_id, tipo_alerta, mensaje, fecha_programada)
          VALUES (?, 'recordatorio', ?, ?)
        `).bind(
          result.meta.last_row_id,
          `Recordatorio: ${data.titulo} (vence: ${fechaLimite.toLocaleString('es-ES')})`,
          fechaAlerta.toISOString()
        ).run()
      } catch (err) {
        console.error('Error creando alerta:', err)
        // No falla la creación de tarea si falla la alerta
      }
    }
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Tarea creada correctamente'
    })
  } catch (error) {
    console.error('Error creando tarea:', error)
    return c.json({ error: 'Error al crear tarea' }, 500)
  }
})

// PUT - Actualizar tarea completa
tareas.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const updates: string[] = []
    const params: any[] = []
    
    if (data.titulo !== undefined) {
      updates.push('titulo = ?')
      params.push(data.titulo)
    }
    
    if (data.descripcion !== undefined) {
      updates.push('descripcion = ?')
      params.push(data.descripcion)
    }
    
    if (data.estado !== undefined) {
      updates.push('estado = ?')
      params.push(data.estado)
      
      // Si se marca como completada, guardar timestamp
      if (data.estado === 'completada') {
        updates.push('completada_en = datetime(\'now\')')
        if (data.completada_por) {
          updates.push('completada_por = ?')
          params.push(data.completada_por)
        }
      }
    }
    
    if (data.prioridad !== undefined) {
      updates.push('prioridad = ?')
      params.push(data.prioridad)
    }
    
    if (data.fecha_limite !== undefined) {
      updates.push('fecha_limite = ?')
      params.push(data.fecha_limite)
    }
    
    if (data.fecha_inicio !== undefined) {
      updates.push('fecha_inicio = ?')
      params.push(data.fecha_inicio)
    }
    
    if (data.fecha_recordatorio !== undefined) {
      updates.push('fecha_recordatorio = ?')
      params.push(data.fecha_recordatorio)
    }
    
    if (data.asignado_a !== undefined) {
      updates.push('asignado_a = ?')
      params.push(data.asignado_a)
    }
    
    if (data.trabajo_id !== undefined) {
      updates.push('trabajo_id = ?')
      params.push(data.trabajo_id)
    }
    
    if (data.tiempo_estimado !== undefined) {
      updates.push('tiempo_estimado = ?')
      params.push(data.tiempo_estimado)
    }
    
    if (data.recordatorio_minutos !== undefined) {
      updates.push('recordatorio_minutos = ?')
      params.push(data.recordatorio_minutos)
    }
    
    if (data.notas !== undefined) {
      updates.push('notas = ?')
      params.push(data.notas)
    }
    
    if (data.notas_internas !== undefined) {
      updates.push('notas_internas = ?')
      params.push(data.notas_internas)
    }
    
    if (data.datos_tarea !== undefined) {
      updates.push('datos_tarea = ?')
      params.push(data.datos_tarea ? JSON.stringify(data.datos_tarea) : null)
    }
    
    if (updates.length === 0) {
      return c.json({ error: 'No hay datos para actualizar' }, 400)
    }
    
    updates.push('updated_at = datetime(\'now\')')
    params.push(id)
    
    const query = `UPDATE tareas_pendientes SET ${updates.join(', ')} WHERE id = ?`
    await c.env.DB.prepare(query).bind(...params).run()
    
    return c.json({ success: true, message: 'Tarea actualizada correctamente' })
  } catch (error) {
    console.error('Error actualizando tarea:', error)
    return c.json({ error: 'Error al actualizar tarea' }, 500)
  }
})

// PUT - Cambiar solo el estado de una tarea
tareas.put('/:id/estado', async (c) => {
  try {
    const id = c.req.param('id')
    const { estado, completada_por } = await c.req.json()
    
    let query = `UPDATE tareas_pendientes SET estado = ?, updated_at = datetime('now')`
    const params: any[] = [estado]
    
    if (estado === 'completada') {
      query += `, completada_en = datetime('now'), completada_por = ?`
      params.push(completada_por || 'Usuario')
    }
    
    query += ` WHERE id = ?`
    params.push(id)
    
    await c.env.DB.prepare(query).bind(...params).run()
    
    return c.json({ success: true, message: 'Estado actualizado' })
  } catch (error) {
    console.error('Error cambiando estado:', error)
    return c.json({ error: 'Error al cambiar estado' }, 500)
  }
})

// DELETE - Eliminar tarea
tareas.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Las alertas se eliminan automáticamente por CASCADE
    await c.env.DB.prepare(`
      DELETE FROM tareas_pendientes WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true, message: 'Tarea eliminada correctamente' })
  } catch (error) {
    console.error('Error eliminando tarea:', error)
    return c.json({ error: 'Error al eliminar tarea' }, 500)
  }
})

// ============================================
// CALENDARIO Y VISTAS TEMPORALES
// ============================================

// GET - Tareas para calendario (agrupadas por fecha)
tareas.get('/calendario/mes', async (c) => {
  try {
    const mes = c.req.query('mes') || (new Date().getMonth() + 1).toString()
    const anio = c.req.query('anio') || new Date().getFullYear().toString()
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        DATE(fecha_limite) as fecha,
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
        SUM(CASE WHEN prioridad = 1 THEN 1 ELSE 0 END) as alta_prioridad,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso
      FROM tareas_pendientes
      WHERE strftime('%Y', fecha_limite) = ?
        AND strftime('%m', fecha_limite) = ?
        AND fecha_limite IS NOT NULL
      GROUP BY DATE(fecha_limite)
      ORDER BY fecha
    `).bind(anio, mes.padStart(2, '0')).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error obteniendo calendario:', error)
    return c.json({ error: 'Error al obtener calendario' }, 500)
  }
})

// GET - Tareas de un día específico
tareas.get('/calendario/dia', async (c) => {
  try {
    const fecha = c.req.query('fecha') // formato: YYYY-MM-DD
    
    if (!fecha) {
      return c.json({ error: 'Fecha es obligatoria (formato YYYY-MM-DD)' }, 400)
    }
    
    const { results } = await c.env.DB.prepare(`
      SELECT t.*,
             p.nombre_proyecto,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos
      FROM tareas_pendientes t
      LEFT JOIN proyectos_diseno p ON t.proyecto_id = p.id
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      WHERE DATE(t.fecha_limite) = ?
      ORDER BY t.prioridad ASC, TIME(t.fecha_limite) ASC
    `).bind(fecha).all()
    
    const tareasConDatos = results.map((t: any) => ({
      ...t,
      datos_tarea: t.datos_tarea ? JSON.parse(t.datos_tarea) : null
    }))
    
    return c.json(tareasConDatos)
  } catch (error) {
    console.error('Error obteniendo tareas del día:', error)
    return c.json({ error: 'Error al obtener tareas' }, 500)
  }
})

// GET - Tareas de una semana específica
tareas.get('/calendario/semana', async (c) => {
  try {
    const fecha_inicio = c.req.query('fecha_inicio') // formato: YYYY-MM-DD
    const fecha_fin = c.req.query('fecha_fin')
    
    if (!fecha_inicio || !fecha_fin) {
      return c.json({ error: 'fecha_inicio y fecha_fin son obligatorias' }, 400)
    }
    
    const { results } = await c.env.DB.prepare(`
      SELECT t.*,
             p.nombre_proyecto,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos
      FROM tareas_pendientes t
      LEFT JOIN proyectos_diseno p ON t.proyecto_id = p.id
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      WHERE DATE(t.fecha_limite) BETWEEN ? AND ?
      ORDER BY DATE(t.fecha_limite), t.prioridad ASC
    `).bind(fecha_inicio, fecha_fin).all()
    
    const tareasConDatos = results.map((t: any) => ({
      ...t,
      datos_tarea: t.datos_tarea ? JSON.parse(t.datos_tarea) : null
    }))
    
    return c.json(tareasConDatos)
  } catch (error) {
    console.error('Error obteniendo tareas de la semana:', error)
    return c.json({ error: 'Error al obtener tareas' }, 500)
  }
})

// ============================================
// SISTEMA DE ALERTAS Y RECORDATORIOS
// ============================================

// GET - Alertas pendientes (para mostrar en campana)
tareas.get('/alertas/pendientes', async (c) => {
  try {
    const ahora = new Date().toISOString()
    
    const { results } = await c.env.DB.prepare(`
      SELECT a.*, t.titulo as tarea_titulo, t.prioridad
      FROM tareas_alertas a
      JOIN tareas_pendientes t ON a.tarea_id = t.id
      WHERE a.enviada = 0
        AND a.fecha_programada <= ?
        AND t.estado != 'completada'
      ORDER BY a.fecha_programada ASC
      LIMIT 50
    `).bind(ahora).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error obteniendo alertas:', error)
    return c.json({ error: 'Error al obtener alertas' }, 500)
  }
})

// PUT - Marcar alerta como enviada
tareas.put('/alertas/:id/marcar', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      UPDATE tareas_alertas 
      SET enviada = 1, fecha_enviada = datetime('now')
      WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error marcando alerta:', error)
    return c.json({ error: 'Error al marcar alerta' }, 500)
  }
})

// POST - Procesar alertas automáticas (llamado periódicamente)
tareas.post('/alertas/procesar', async (c) => {
  try {
    const ahora = new Date()
    
    // Buscar tareas sin alerta que estén próximas a vencer
    const { results: tareasSinAlerta } = await c.env.DB.prepare(`
      SELECT t.id, t.titulo, t.prioridad, t.fecha_limite, t.recordatorio_minutos
      FROM tareas_pendientes t
      LEFT JOIN tareas_alertas a ON t.id = a.tarea_id
      WHERE t.estado != 'completada'
        AND t.fecha_limite IS NOT NULL
        AND t.recordatorio_minutos IS NOT NULL
        AND a.id IS NULL
    `).all()
    
    let alertasCreadas = 0
    
    for (const tarea of tareasSinAlerta) {
      const fechaLimite = new Date(tarea.fecha_limite)
      const minutosAntes = tarea.recordatorio_minutos || 60
      const fechaAlerta = new Date(fechaLimite.getTime() - (minutosAntes * 60000))
      
      // Solo crear alerta si aún no ha pasado la fecha de alerta
      if (fechaAlerta > ahora) {
        await c.env.DB.prepare(`
          INSERT INTO tareas_alertas (tarea_id, tipo_alerta, mensaje, fecha_programada)
          VALUES (?, 'recordatorio', ?, ?)
        `).bind(
          tarea.id,
          `Recordatorio: ${tarea.titulo} (vence: ${fechaLimite.toLocaleString('es-ES')})`,
          fechaAlerta.toISOString()
        ).run()
        
        alertasCreadas++
      }
    }
    
    // Marcar alertas que ya deben ser enviadas y crear avisos
    const { results: alertasAEnviar } = await c.env.DB.prepare(`
      SELECT a.*, t.titulo as tarea_titulo, t.prioridad
      FROM tareas_alertas a
      JOIN tareas_pendientes t ON a.tarea_id = t.id
      WHERE a.enviada = 0
        AND a.fecha_programada <= ?
        AND t.estado != 'completada'
    `).bind(ahora.toISOString()).all()
    
    let avisosCreados = 0
    
    for (const alerta of alertasAEnviar) {
      // Crear aviso en el sistema
      await c.env.DB.prepare(`
        INSERT INTO avisos (tipo, titulo, mensaje, prioridad)
        VALUES ('tarea_recordatorio', ?, ?, ?)
      `).bind(
        `📋 ${alerta.tarea_titulo}`,
        alerta.mensaje,
        alerta.prioridad || 2
      ).run()
      
      // Marcar alerta como enviada
      await c.env.DB.prepare(`
        UPDATE tareas_alertas 
        SET enviada = 1, fecha_enviada = datetime('now')
        WHERE id = ?
      `).bind(alerta.id).run()
      
      avisosCreados++
    }
    
    return c.json({ 
      success: true, 
      alertas_creadas: alertasCreadas,
      avisos_creados: avisosCreados,
      mensaje: `Procesadas ${alertasCreadas} alertas nuevas y ${avisosCreados} avisos enviados`
    })
  } catch (error) {
    console.error('Error procesando alertas:', error)
    return c.json({ error: 'Error al procesar alertas' }, 500)
  }
})

// ============================================
// TAREA ESPECIAL: AÑADIR TELA A STOCK
// ============================================

// POST - Completar tarea de "añadir tela a stock" (crear tela y marcar tarea completada)
tareas.post('/:id/completar-tela', async (c) => {
  try {
    const id = c.req.param('id')
    const dataTela = await c.req.json()
    
    // Obtener tarea
    const tarea: any = await c.env.DB.prepare(`
      SELECT * FROM tareas_pendientes WHERE id = ? AND tipo = 'añadir_tela_stock'
    `).bind(id).first()
    
    if (!tarea) {
      return c.json({ error: 'Tarea no encontrada' }, 404)
    }
    
    const datos = JSON.parse(tarea.datos_tarea)
    
    // Crear tela en catálogo
    const resultTela = await c.env.DB.prepare(`
      INSERT INTO catalogo_telas (
        nombre, referencia, descripcion, categoria_id,
        composicion, ancho_rollo, peso_m2,
        opacidad, resistencia_luz, lavable, ignifugo,
        color_principal, color_hex, patron, textura,
        imagen_muestra_url, imagen_textura_url,
        precio_metro, stock_metros, disponible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dataTela.nombre || datos.tela_nombre,
      dataTela.referencia || `CUSTOM-${Date.now()}`,
      dataTela.descripcion || `Tela personalizada añadida desde proyecto`,
      dataTela.categoria_id || 1,
      dataTela.composicion || 'Sin especificar',
      dataTela.ancho_rollo || 2.8,
      dataTela.peso_m2 || null,
      dataTela.opacidad || 'traslúcida',
      dataTela.resistencia_luz || 'media',
      dataTela.lavable !== undefined ? (dataTela.lavable ? 1 : 0) : 1,
      dataTela.ignifugo !== undefined ? (dataTela.ignifugo ? 1 : 0) : 0,
      dataTela.color_principal || 'Sin especificar',
      dataTela.color_hex || '#CCCCCC',
      dataTela.patron || 'liso',
      dataTela.textura || 'lisa',
      datos.imagen_url || dataTela.imagen_muestra_url || null,
      null,
      dataTela.precio_metro || datos.tela_precio || 25,
      dataTela.stock_metros || 0,
      dataTela.disponible !== undefined ? (dataTela.disponible ? 1 : 0) : 1
    ).run()
    
    // Marcar tarea como completada
    await c.env.DB.prepare(`
      UPDATE tareas_pendientes 
      SET estado = 'completada',
          completada_en = datetime('now'),
          completada_por = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(dataTela.completada_por || 'Ana Ramos', id).run()
    
    return c.json({ 
      success: true, 
      tela_id: resultTela.meta.last_row_id,
      message: 'Tela añadida al catálogo y tarea completada' 
    })
  } catch (error) {
    console.error('Error completando tarea:', error)
    return c.json({ error: 'Error al completar tarea' }, 500)
  }
})

// GET - Obtener alertas de tareas
tareas.get('/alertas', async (c) => {
  try {
    const hoy = new Date()
    const hoyStr = hoy.toISOString().split('T')[0]
    const mañana = new Date(hoy)
    mañana.setDate(mañana.getDate() + 1)
    const mañanaStr = mañana.toISOString().split('T')[0]
    const en2dias = new Date(hoy)
    en2dias.setDate(en2dias.getDate() + 2)
    const en2diasStr = en2dias.toISOString().split('T')[0]
    
    // Tareas retrasadas (fecha_limite pasada y NO completada)
    const retrasadas = await c.env.DB.prepare(`
      SELECT t.*, 
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos,
             tr.tipo_servicio as trabajo_tipo
      FROM tareas_pendientes t
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE t.fecha_limite < ?
        AND t.estado != 'completada'
        AND t.estado != 'cancelada'
      ORDER BY t.fecha_limite ASC, t.prioridad ASC
      LIMIT 20
    `).bind(hoyStr).all()
    
    // Tareas urgentes HOY
    const urgentesHoy = await c.env.DB.prepare(`
      SELECT t.*,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos,
             tr.tipo_servicio as trabajo_tipo
      FROM tareas_pendientes t
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE t.fecha_limite = ?
        AND t.estado != 'completada'
        AND t.estado != 'cancelada'
      ORDER BY t.prioridad ASC
      LIMIT 20
    `).bind(hoyStr).all()
    
    // Tareas próximas (24-48h)
    const proximas = await c.env.DB.prepare(`
      SELECT t.*,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos,
             tr.tipo_servicio as trabajo_tipo
      FROM tareas_pendientes t
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE t.fecha_limite > ?
        AND t.fecha_limite <= ?
        AND t.estado != 'completada'
        AND t.estado != 'cancelada'
      ORDER BY t.fecha_limite ASC, t.prioridad ASC
      LIMIT 20
    `).bind(hoyStr, en2diasStr).all()
    
    // Tareas sin fecha asignada
    const sinFecha = await c.env.DB.prepare(`
      SELECT t.*,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos,
             tr.tipo_servicio as trabajo_tipo
      FROM tareas_pendientes t
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE (t.fecha_limite IS NULL OR t.fecha_limite = '')
        AND t.estado != 'completada'
        AND t.estado != 'cancelada'
      ORDER BY t.prioridad ASC, t.created_at DESC
      LIMIT 20
    `).all()
    
    // Recordatorios de hoy
    const recordatoriosHoy = await c.env.DB.prepare(`
      SELECT t.*,
             cl.nombre as cliente_nombre,
             cl.apellidos as cliente_apellidos,
             tr.tipo_servicio as trabajo_tipo
      FROM tareas_pendientes t
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE t.fecha_recordatorio = ?
        AND t.recordatorio_enviado = 0
        AND t.estado != 'completada'
        AND t.estado != 'cancelada'
      ORDER BY t.prioridad ASC
      LIMIT 20
    `).bind(hoyStr).all()
    
    return c.json({
      retrasadas: retrasadas.results || [],
      urgentesHoy: urgentesHoy.results || [],
      proximas: proximas.results || [],
      sinFecha: sinFecha.results || [],
      recordatoriosHoy: recordatoriosHoy.results || [],
      total: (retrasadas.results?.length || 0) + 
             (urgentesHoy.results?.length || 0) + 
             (recordatoriosHoy.results?.length || 0)
    }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Error obteniendo alertas:', error)
    return c.json({ error: 'Error al obtener alertas' }, 500)
  }
})

// GET /tareas/resumen-diario - Resumen diario para alerta de las 9:00 AM
tareas.get('/resumen-diario', async (c) => {
  try {
    const hoy = new Date().toISOString().split('T')[0]
    
    // Tareas que vencen hoy
    const tareasHoy = await c.env.DB.prepare(`
      SELECT t.*, 
             cl.nombre as cliente_nombre,
             tr.descripcion as trabajo_descripcion
      FROM tareas_pendientes t
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE date(t.fecha_limite) = date(?)
        AND t.estado != 'completada'
        AND t.estado != 'cancelada'
      ORDER BY t.fecha_limite ASC, t.prioridad ASC
    `).bind(hoy).all()
    
    // Trabajos que vencen hoy
    const trabajosHoy = await c.env.DB.prepare(`
      SELECT tr.*,
             cl.nombre as cliente_nombre,
             cl.telefono as cliente_telefono,
             cl.email as cliente_email
      FROM trabajos tr
      LEFT JOIN clientes cl ON tr.cliente_id = cl.id
      WHERE date(tr.fecha_programada) = date(?)
        AND tr.estado != 'completado'
        AND tr.estado != 'cancelado'
      ORDER BY tr.fecha_programada ASC
    `).bind(hoy).all()
    
    // Todas las tareas pendientes (sin completar)
    const tareasPendientes = await c.env.DB.prepare(`
      SELECT t.*, 
             cl.nombre as cliente_nombre,
             tr.descripcion as trabajo_descripcion
      FROM tareas_pendientes t
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      LEFT JOIN trabajos tr ON t.trabajo_id = tr.id
      WHERE t.estado != 'completada'
        AND t.estado != 'cancelada'
      ORDER BY 
        CASE 
          WHEN t.fecha_limite IS NULL THEN 1
          ELSE 0
        END,
        t.fecha_limite ASC,
        t.prioridad ASC
      LIMIT 20
    `).all()
    
    // Todos los trabajos pendientes
    const trabajosPendientes = await c.env.DB.prepare(`
      SELECT tr.*,
             cl.nombre as cliente_nombre,
             cl.telefono as cliente_telefono
      FROM trabajos tr
      LEFT JOIN clientes cl ON tr.cliente_id = cl.id
      WHERE tr.estado != 'completado'
        AND tr.estado != 'cancelado'
      ORDER BY 
        CASE 
          WHEN tr.fecha_programada IS NULL THEN 1
          ELSE 0
        END,
        tr.fecha_programada ASC
      LIMIT 20
    `).all()
    
    return c.json({
      fecha: hoy,
      tareasHoy: tareasHoy.results || [],
      trabajosHoy: trabajosHoy.results || [],
      tareasPendientes: tareasPendientes.results || [],
      trabajosPendientes: trabajosPendientes.results || [],
      totalHoy: (tareasHoy.results?.length || 0) + (trabajosHoy.results?.length || 0),
      totalPendientes: (tareasPendientes.results?.length || 0) + (trabajosPendientes.results?.length || 0)
    }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  } catch (error) {
    console.error('Error obteniendo resumen diario:', error)
    return c.json({ error: 'Error al obtener resumen diario' }, 500)
  }
})

export default tareas
