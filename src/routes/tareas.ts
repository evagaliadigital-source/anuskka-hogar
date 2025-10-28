import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

const tareas = new Hono<{ Bindings: Bindings }>()

// ============================================
// TAREAS PENDIENTES
// ============================================

// GET - Obtener todas las tareas (con filtros)
tareas.get('/', async (c) => {
  try {
    const estado = c.req.query('estado') || 'pendiente'
    const tipo = c.req.query('tipo')
    const prioridad = c.req.query('prioridad')
    
    let query = `
      SELECT t.*,
             p.nombre_proyecto,
             cl.nombre as cliente_nombre
      FROM tareas_pendientes t
      LEFT JOIN proyectos_diseno p ON t.proyecto_id = p.id
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
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
    
    query += ` ORDER BY t.prioridad ASC, t.created_at DESC`
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all()
    
    // Parse JSON fields
    const tareasConDatos = results.map((t: any) => ({
      ...t,
      datos_tarea: t.datos_tarea ? JSON.parse(t.datos_tarea) : null
    }))
    
    return c.json(tareasConDatos)
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
        SUM(CASE WHEN tipo = 'añadir_tela_stock' THEN 1 ELSE 0 END) as telas_pendientes
      FROM tareas_pendientes
      WHERE estado = 'pendiente'
    `).first()
    
    return c.json(result)
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
             cl.nombre as cliente_nombre
      FROM tareas_pendientes t
      LEFT JOIN proyectos_diseno p ON t.proyecto_id = p.id
      LEFT JOIN clientes cl ON t.cliente_id = cl.id
      WHERE t.id = ?
    `).bind(id).first()
    
    if (!tarea) {
      return c.json({ error: 'Tarea no encontrada' }, 404)
    }
    
    const tareaCompleta = {
      ...tarea,
      datos_tarea: tarea.datos_tarea ? JSON.parse(tarea.datos_tarea) : null
    }
    
    return c.json(tareaCompleta)
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
        tipo, titulo, descripcion, datos_tarea,
        estado, prioridad, proyecto_id, cliente_id, fecha_limite
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.tipo,
      data.titulo,
      data.descripcion || null,
      data.datos_tarea ? JSON.stringify(data.datos_tarea) : null,
      data.estado || 'pendiente',
      data.prioridad || 2,
      data.proyecto_id || null,
      data.cliente_id || null,
      data.fecha_limite || null
    ).run()
    
    return c.json({ 
      success: true, 
      tarea_id: result.meta.last_row_id,
      message: 'Tarea creada correctamente' 
    })
  } catch (error) {
    console.error('Error creando tarea:', error)
    return c.json({ error: 'Error al crear tarea' }, 500)
  }
})

// PUT - Actualizar tarea (marcar completada, cambiar estado, etc.)
tareas.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const updates: string[] = []
    const params: any[] = []
    
    if (data.estado) {
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
    
    if (data.titulo) {
      updates.push('titulo = ?')
      params.push(data.titulo)
    }
    
    if (data.descripcion !== undefined) {
      updates.push('descripcion = ?')
      params.push(data.descripcion)
    }
    
    if (data.prioridad !== undefined) {
      updates.push('prioridad = ?')
      params.push(data.prioridad)
    }
    
    if (data.datos_tarea) {
      updates.push('datos_tarea = ?')
      params.push(JSON.stringify(data.datos_tarea))
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

// DELETE - Eliminar tarea
tareas.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare(`DELETE FROM tareas_pendientes WHERE id = ?`).bind(id).run()
    return c.json({ success: true, message: 'Tarea eliminada correctamente' })
  } catch (error) {
    console.error('Error eliminando tarea:', error)
    return c.json({ error: 'Error al eliminar tarea' }, 500)
  }
})

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
      dataTela.categoria_id || 1, // Default: Telas
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

export default tareas
