import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

const disenador = new Hono<{ Bindings: Bindings }>()

// ============================================
// CATÁLOGO DE TELAS
// ============================================

// GET - Obtener catálogo completo de telas
disenador.get('/telas', async (c) => {
  try {
    const categoria = c.req.query('categoria')
    const opacidad = c.req.query('opacidad')
    const disponible = c.req.query('disponible')
    
    let query = `
      SELECT t.*, c.nombre as categoria_nombre, c.color as categoria_color
      FROM catalogo_telas t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (categoria) {
      query += ` AND t.categoria_id = ?`
      params.push(parseInt(categoria))
    }
    
    if (opacidad) {
      query += ` AND t.opacidad = ?`
      params.push(opacidad)
    }
    
    if (disponible === 'true') {
      query += ` AND t.disponible = 1`
    }
    
    query += ` ORDER BY t.veces_usado DESC, t.nombre`
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all()
    
    return c.json(results)
  } catch (error) {
    console.error('Error obteniendo telas:', error)
    return c.json({ error: 'Error al obtener catálogo' }, 500)
  }
})

// GET - Obtener tela por ID
disenador.get('/telas/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const tela = await c.env.DB.prepare(`
      SELECT t.*, c.nombre as categoria_nombre
      FROM catalogo_telas t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      WHERE t.id = ?
    `).bind(id).first()
    
    if (!tela) {
      return c.json({ error: 'Tela no encontrada' }, 404)
    }
    
    return c.json(tela)
  } catch (error) {
    console.error('Error obteniendo tela:', error)
    return c.json({ error: 'Error al obtener tela' }, 500)
  }
})

// POST - Crear nueva tela (solo Ana Ramos)
disenador.post('/telas', async (c) => {
  try {
    const data = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO catalogo_telas (
        nombre, referencia, descripcion, categoria_id,
        composicion, ancho_rollo, peso_m2,
        opacidad, resistencia_luz, lavable, ignifugo,
        color_principal, color_hex, patron, textura,
        imagen_muestra_url, imagen_textura_url,
        precio_metro, stock_metros, disponible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.nombre,
      data.referencia,
      data.descripcion || null,
      data.categoria_id || null,
      data.composicion || null,
      data.ancho_rollo || 2.8,
      data.peso_m2 || null,
      data.opacidad || 'traslúcida',
      data.resistencia_luz || 'media',
      data.lavable ? 1 : 0,
      data.ignifugo ? 1 : 0,
      data.color_principal || null,
      data.color_hex || null,
      data.patron || 'liso',
      data.textura || 'lisa',
      data.imagen_muestra_url || null,
      data.imagen_textura_url || null,
      data.precio_metro,
      data.stock_metros || 0,
      data.disponible ? 1 : 0
    ).run()
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Tela creada correctamente' 
    })
  } catch (error) {
    console.error('Error creando tela:', error)
    return c.json({ error: 'Error al crear tela' }, 500)
  }
})

// ============================================
// PROYECTOS DE DISEÑO
// ============================================

// GET - Obtener todos los proyectos
disenador.get('/proyectos', async (c) => {
  try {
    const cliente_id = c.req.query('cliente_id')
    const estado = c.req.query('estado')
    
    let query = `
      SELECT p.*, 
             c.nombre as cliente_nombre,
             c.telefono as cliente_telefono
      FROM proyectos_diseno p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (cliente_id) {
      query += ` AND p.cliente_id = ?`
      params.push(parseInt(cliente_id))
    }
    
    if (estado) {
      query += ` AND p.estado = ?`
      params.push(estado)
    }
    
    query += ` ORDER BY p.created_at DESC`
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all()
    
    // Parse JSON fields
    const proyectos = results.map((p: any) => ({
      ...p,
      analisis_ia: p.analisis_ia ? JSON.parse(p.analisis_ia) : null,
      dimensiones_detectadas: p.dimensiones_detectadas ? JSON.parse(p.dimensiones_detectadas) : null,
      colores_predominantes: p.colores_predominantes ? JSON.parse(p.colores_predominantes) : null,
      imagenes_generadas: p.imagenes_generadas ? JSON.parse(p.imagenes_generadas) : null
    }))
    
    return c.json(proyectos)
  } catch (error) {
    console.error('Error obteniendo proyectos:', error)
    return c.json({ error: 'Error al obtener proyectos' }, 500)
  }
})

// GET - Obtener proyecto por ID
disenador.get('/proyectos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const proyecto = await c.env.DB.prepare(`
      SELECT p.*, 
             c.nombre as cliente_nombre,
             c.telefono as cliente_telefono,
             c.email as cliente_email
      FROM proyectos_diseno p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `).bind(id).first()
    
    if (!proyecto) {
      return c.json({ error: 'Proyecto no encontrado' }, 404)
    }
    
    // Parse JSON fields
    const proyectoCompleto = {
      ...proyecto,
      analisis_ia: proyecto.analisis_ia ? JSON.parse(proyecto.analisis_ia) : null,
      dimensiones_detectadas: proyecto.dimensiones_detectadas ? JSON.parse(proyecto.dimensiones_detectadas) : null,
      colores_predominantes: proyecto.colores_predominantes ? JSON.parse(proyecto.colores_predominantes) : null,
      imagenes_generadas: proyecto.imagenes_generadas ? JSON.parse(proyecto.imagenes_generadas) : null
    }
    
    return c.json(proyectoCompleto)
  } catch (error) {
    console.error('Error obteniendo proyecto:', error)
    return c.json({ error: 'Error al obtener proyecto' }, 500)
  }
})

// POST - Crear nuevo proyecto
disenador.post('/proyectos', async (c) => {
  try {
    const data = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO proyectos_diseno (
        cliente_id, nombre_proyecto, imagen_original_url, 
        imagen_original_r2_key, estado
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.cliente_id || null,
      data.nombre_proyecto || `Proyecto ${new Date().toLocaleDateString()}`,
      data.imagen_original_url,
      data.imagen_original_r2_key || null,
      'borrador'
    ).run()
    
    return c.json({ 
      success: true, 
      proyecto_id: result.meta.last_row_id,
      message: 'Proyecto creado correctamente' 
    })
  } catch (error) {
    console.error('Error creando proyecto:', error)
    return c.json({ error: 'Error al crear proyecto' }, 500)
  }
})

// PUT - Actualizar proyecto
disenador.put('/proyectos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    // Construir query dinámica
    const updates: string[] = []
    const params: any[] = []
    
    if (data.analisis_ia) {
      updates.push('analisis_ia = ?')
      params.push(JSON.stringify(data.analisis_ia))
    }
    
    if (data.dimensiones_detectadas) {
      updates.push('dimensiones_detectadas = ?')
      params.push(JSON.stringify(data.dimensiones_detectadas))
    }
    
    if (data.estilo_detectado) {
      updates.push('estilo_detectado = ?')
      params.push(data.estilo_detectado)
    }
    
    if (data.colores_predominantes) {
      updates.push('colores_predominantes = ?')
      params.push(JSON.stringify(data.colores_predominantes))
    }
    
    if (data.tela_nombre) {
      updates.push('tela_nombre = ?')
      params.push(data.tela_nombre)
    }
    
    if (data.tela_referencia) {
      updates.push('tela_referencia = ?')
      params.push(data.tela_referencia)
    }
    
    if (data.tela_precio_metro) {
      updates.push('tela_precio_metro = ?')
      params.push(data.tela_precio_metro)
    }
    
    if (data.tipo_cortina) {
      updates.push('tipo_cortina = ?')
      params.push(data.tipo_cortina)
    }
    
    if (data.forro_termico !== undefined) {
      updates.push('forro_termico = ?')
      params.push(data.forro_termico ? 1 : 0)
    }
    
    if (data.motorizada !== undefined) {
      updates.push('motorizada = ?')
      params.push(data.motorizada ? 1 : 0)
    }
    
    if (data.doble_cortina !== undefined) {
      updates.push('doble_cortina = ?')
      params.push(data.doble_cortina ? 1 : 0)
    }
    
    if (data.imagenes_generadas) {
      updates.push('imagenes_generadas = ?')
      params.push(JSON.stringify(data.imagenes_generadas))
    }
    
    if (data.imagen_seleccionada_url) {
      updates.push('imagen_seleccionada_url = ?')
      params.push(data.imagen_seleccionada_url)
    }
    
    if (data.metraje_calculado) {
      updates.push('metraje_calculado = ?')
      params.push(data.metraje_calculado)
    }
    
    if (data.precio_total) {
      updates.push('precio_total = ?')
      params.push(data.precio_total)
    }
    
    if (data.estado) {
      updates.push('estado = ?')
      params.push(data.estado)
    }
    
    if (data.presupuesto_id) {
      updates.push('presupuesto_id = ?')
      params.push(data.presupuesto_id)
    }
    
    if (updates.length === 0) {
      return c.json({ error: 'No hay datos para actualizar' }, 400)
    }
    
    updates.push('updated_at = datetime(\'now\')')
    params.push(id)
    
    const query = `UPDATE proyectos_diseno SET ${updates.join(', ')} WHERE id = ?`
    await c.env.DB.prepare(query).bind(...params).run()
    
    return c.json({ success: true, message: 'Proyecto actualizado correctamente' })
  } catch (error) {
    console.error('Error actualizando proyecto:', error)
    return c.json({ error: 'Error al actualizar proyecto' }, 500)
  }
})

// DELETE - Eliminar proyecto
disenador.delete('/proyectos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare(`DELETE FROM proyectos_diseno WHERE id = ?`).bind(id).run()
    return c.json({ success: true, message: 'Proyecto eliminado correctamente' })
  } catch (error) {
    console.error('Error eliminando proyecto:', error)
    return c.json({ error: 'Error al eliminar proyecto' }, 500)
  }
})

// ============================================
// ANÁLISIS CON IA
// ============================================

// POST - Analizar imagen con Gemini Vision
disenador.post('/analizar', async (c) => {
  try {
    const { imagen_url, proyecto_id } = await c.req.json()
    
    // TODO: Integrar Gemini Vision aquí
    // Por ahora devolvemos un análisis simulado
    
    const analisisSimulado = {
      ventanas: [{
        ubicacion: "pared frontal",
        ancho_aprox: 2.5,
        alto_aprox: 2.0,
        forma: "rectangular"
      }],
      estilo: "moderno",
      colores: ["#F5F5DC", "#36454F"],
      luz_natural: "alta",
      materiales: ["madera", "textil"],
      recomendaciones: ["Lino natural", "Algodón", "Seda"]
    }
    
    // Actualizar proyecto con análisis
    if (proyecto_id) {
      await c.env.DB.prepare(`
        UPDATE proyectos_diseno 
        SET analisis_ia = ?,
            dimensiones_detectadas = ?,
            estilo_detectado = ?,
            colores_predominantes = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        JSON.stringify(analisisSimulado),
        JSON.stringify({ ancho: 2.5, alto: 2.0 }),
        analisisSimulado.estilo,
        JSON.stringify(analisisSimulado.colores),
        proyecto_id
      ).run()
    }
    
    return c.json({
      success: true,
      analisis: analisisSimulado,
      mensaje: 'Análisis completado correctamente'
    })
  } catch (error) {
    console.error('Error analizando imagen:', error)
    return c.json({ error: 'Error al analizar imagen' }, 500)
  }
})

// ============================================
// GENERACIÓN DE VISUALIZACIONES
// ============================================

// POST - Generar visualizaciones con IA
disenador.post('/generar', async (c) => {
  try {
    const { proyecto_id, tela_id, tipo_cortina, opciones } = await c.req.json()
    
    // TODO: Integrar generación de imágenes con IA
    // Por ahora devolvemos URLs simuladas
    
    const imagenesSimuladas = [
      '/static/demo/cortina-diurna.jpg',
      '/static/demo/cortina-atardecer.jpg',
      '/static/demo/cortina-noche.jpg'
    ]
    
    // Actualizar proyecto con imágenes generadas
    if (proyecto_id) {
      await c.env.DB.prepare(`
        UPDATE proyectos_diseno 
        SET imagenes_generadas = ?,
            tipo_cortina = ?,
            forro_termico = ?,
            motorizada = ?,
            doble_cortina = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        JSON.stringify(imagenesSimuladas),
        tipo_cortina || null,
        opciones?.forro_termico ? 1 : 0,
        opciones?.motorizada ? 1 : 0,
        opciones?.doble_cortina ? 1 : 0,
        proyecto_id
      ).run()
      
      // Incrementar contador de uso de la tela
      if (tela_id) {
        await c.env.DB.prepare(`
          UPDATE catalogo_telas 
          SET veces_usado = veces_usado + 1 
          WHERE id = ?
        `).bind(tela_id).run()
      }
    }
    
    return c.json({
      success: true,
      imagenes: imagenesSimuladas,
      mensaje: 'Visualizaciones generadas correctamente',
      tiempo_generacion: 18.5
    })
  } catch (error) {
    console.error('Error generando visualizaciones:', error)
    return c.json({ error: 'Error al generar visualizaciones' }, 500)
  }
})

export default disenador
