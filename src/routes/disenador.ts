import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
  GEMINI_API_KEY: string;
  FAL_API_KEY: string;
  IMAGES: R2Bucket;
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
    const { imagen_base64, proyecto_id } = await c.req.json()
    
    if (!imagen_base64) {
      return c.json({ error: 'Imagen no proporcionada' }, 400)
    }
    
    const apiKey = c.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-api-key-here') {
      // Modo desarrollo sin API key - usar análisis simulado
      console.warn('⚠️ GEMINI_API_KEY no configurada, usando análisis simulado')
      return usarAnalisisSimulado(c, proyecto_id)
    }
    
    // Extraer solo el base64 sin el prefijo data:image/...
    const base64Data = imagen_base64.includes('base64,') 
      ? imagen_base64.split('base64,')[1] 
      : imagen_base64
    
    // Llamar a Gemini Vision API
    const prompt = `Analiza esta imagen de una habitación para diseñar cortinas. Proporciona:

1. **Ventanas detectadas**: Para cada ventana, indica:
   - Ubicación en la habitación
   - Dimensiones aproximadas (ancho y alto en metros)
   - Forma (rectangular, arqueada, etc.)

2. **Estilo del espacio**: Describe el estilo decorativo (moderno, clásico, minimalista, rústico, etc.)

3. **Colores predominantes**: Lista 2-4 colores principales en formato hexadecimal

4. **Nivel de luz natural**: (baja, media, alta)

5. **Materiales visibles**: (madera, metal, textil, vidrio, etc.)

6. **Recomendaciones de telas**: Sugiere 3-4 tipos de telas que combinen bien (Lino, Algodón, Terciopelo, Seda, Blackout, etc.)

Responde SOLO en formato JSON válido siguiendo esta estructura:
{
  "ventanas": [{"ubicacion": "string", "ancho_aprox": number, "alto_aprox": number, "forma": "string"}],
  "estilo": "string",
  "colores": ["#RRGGBB"],
  "luz_natural": "string",
  "materiales": ["string"],
  "recomendaciones": ["string"]
}`
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }]
        })
      }
    )
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('Error de Gemini API:', errorData)
      return c.json({ error: 'Error al analizar imagen con IA' }, 500)
    }
    
    const result = await response.json()
    const textoRespuesta = result.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!textoRespuesta) {
      console.error('Respuesta vacía de Gemini')
      return usarAnalisisSimulado(c, proyecto_id)
    }
    
    // Extraer JSON de la respuesta (Gemini a veces envuelve el JSON en markdown)
    let analisis
    try {
      const jsonMatch = textoRespuesta.match(/\{[\s\S]*\}/)
      analisis = JSON.parse(jsonMatch ? jsonMatch[0] : textoRespuesta)
    } catch (parseError) {
      console.error('Error parseando respuesta de Gemini:', parseError)
      console.log('Respuesta recibida:', textoRespuesta)
      return usarAnalisisSimulado(c, proyecto_id)
    }
    
    // Validar estructura del análisis
    if (!analisis.ventanas || !analisis.estilo || !analisis.colores) {
      console.error('Análisis incompleto:', analisis)
      return usarAnalisisSimulado(c, proyecto_id)
    }
    
    // Extraer dimensiones de la primera ventana
    const ventanaPrincipal = analisis.ventanas[0]
    const dimensiones = {
      ancho: ventanaPrincipal?.ancho_aprox || 2.5,
      alto: ventanaPrincipal?.alto_aprox || 2.0
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
        JSON.stringify(analisis),
        JSON.stringify(dimensiones),
        analisis.estilo,
        JSON.stringify(analisis.colores),
        proyecto_id
      ).run()
    }
    
    return c.json({
      success: true,
      analisis: analisis,
      mensaje: 'Análisis completado con Gemini Vision'
    })
  } catch (error) {
    console.error('Error analizando imagen:', error)
    return c.json({ error: 'Error al analizar imagen' }, 500)
  }
})

// Función auxiliar para análisis simulado (desarrollo sin API key)
function usarAnalisisSimulado(c: any, proyecto_id: any) {
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
  
  // Actualizar proyecto con análisis simulado
  if (proyecto_id) {
    c.env.DB.prepare(`
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
    mensaje: '⚠️ Análisis simulado (configura GEMINI_API_KEY para análisis real)'
  })
}

// ============================================
// GENERACIÓN DE VISUALIZACIONES
// ============================================

// POST - Generar visualizaciones con IA (Flux Pro Ultra)
disenador.post('/generar', async (c) => {
  try {
    const { proyecto_id, tela_nombre, tela_descripcion, tipo_cortina, opciones, imagen_original_url } = await c.req.json()
    
    if (!imagen_original_url) {
      return c.json({ error: 'Imagen original no proporcionada' }, 400)
    }
    
    const apiKey = c.env.FAL_API_KEY
    const tiempoInicio = Date.now()
    
    // Verificar API key
    if (!apiKey || apiKey === 'your-fal-api-key-here') {
      console.warn('⚠️ FAL_API_KEY no configurada, usando imágenes simuladas')
      return usarImagenesSimuladas(c, proyecto_id, tipo_cortina, opciones)
    }
    
    // Construir prompt optimizado para cortinas fotorealistas
    const tiposPrompt = {
      'ondas_francesas': 'elegant French pleat curtains with soft flowing waves',
      'paneles_japoneses': 'modern Japanese panel curtains, minimalist and sleek',
      'pliegues_rectos': 'classic straight pleat curtains with clean lines',
      'estor_enrollable': 'contemporary roller blinds, smooth and modern',
      'estor_plegable': 'Roman shade blinds with horizontal folds',
      'otros': 'elegant custom curtains'
    }
    
    const tipoDesc = tiposPrompt[tipo_cortina as keyof typeof tiposPrompt] || 'elegant curtains'
    const forroDesc = opciones?.forro_termico ? 'with thermal lining' : ''
    const telaDesc = tela_descripcion || tela_nombre || 'fabric'
    
    const prompt = `Professional interior design photograph of ${tipoDesc} ${forroDesc}. The curtains are made of ${telaDesc}. Photorealistic, high-end residential interior, natural lighting, sharp details, modern elegant style, magazine quality photography. The curtains should perfectly fit the window and complement the room's existing decor. Ultra-high quality, 8K resolution.`
    
    console.log('🎨 Generando con Flux Pro Ultra...')
    console.log('📝 Prompt:', prompt)
    
    // Llamar a Fal.ai - Flux Pro Ultra
    const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: imagen_original_url,
        num_images: 1,
        guidance_scale: 3.5,
        num_inference_steps: 28,
        safety_tolerance: 2,
        output_format: 'jpeg',
        aspect_ratio: '16:9',
        raw: false
      })
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('Error de Fal.ai:', errorData)
      return usarImagenesSimuladas(c, proyecto_id, tipo_cortina, opciones)
    }
    
    const result = await response.json()
    console.log('✅ Respuesta de Fal.ai:', result)
    
    // Fal.ai devuelve la imagen generada en result.images[0].url
    const imagenGeneradaUrl = result.images?.[0]?.url
    
    if (!imagenGeneradaUrl) {
      console.error('No se generó imagen')
      return usarImagenesSimuladas(c, proyecto_id, tipo_cortina, opciones)
    }
    
    // TODO: Descargar y subir a R2 para permanencia
    // Por ahora usamos la URL de Fal.ai (expira en 24h)
    const imagenes = [imagenGeneradaUrl]
    
    const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(1)
    
    // Actualizar proyecto con imágenes generadas
    if (proyecto_id) {
      await c.env.DB.prepare(`
        UPDATE proyectos_diseno 
        SET imagenes_generadas = ?,
            tipo_cortina = ?,
            forro_termico = ?,
            motorizada = ?,
            doble_cortina = ?,
            tela_nombre = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        JSON.stringify(imagenes),
        tipo_cortina || null,
        opciones?.forro_termico ? 1 : 0,
        opciones?.motorizada ? 1 : 0,
        opciones?.doble_cortina ? 1 : 0,
        tela_nombre || null,
        proyecto_id
      ).run()
    }
    
    return c.json({
      success: true,
      imagenes: imagenes,
      mensaje: `Visualización generada con Flux Pro Ultra en ${tiempoTotal}s`,
      tiempo_generacion: parseFloat(tiempoTotal),
      modelo: 'flux-pro-ultra'
    })
  } catch (error) {
    console.error('Error generando visualizaciones:', error)
    return c.json({ error: 'Error al generar visualizaciones' }, 500)
  }
})

// Función auxiliar para imágenes simuladas (desarrollo sin API key)
function usarImagenesSimuladas(c: any, proyecto_id: any, tipo_cortina: any, opciones: any) {
  const imagenesSimuladas = [
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200',
    'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200',
    'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=1200'
  ]
  
  // Actualizar proyecto con imágenes simuladas
  if (proyecto_id) {
    c.env.DB.prepare(`
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
  }
  
  return c.json({
    success: true,
    imagenes: imagenesSimuladas,
    mensaje: '⚠️ Imágenes simuladas de Unsplash (configura FAL_API_KEY para generación real)',
    tiempo_generacion: 0.1,
    modelo: 'simulado'
  })
}

export default disenador
